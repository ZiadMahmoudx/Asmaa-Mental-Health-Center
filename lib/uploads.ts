import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { sha256Hex } from "@/lib/auth/password";
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  AllowedReceiptMimeType,
  RECEIPT_MAGIC_NUMBERS,
} from "@/lib/constants";

/**
 * Payment-receipt storage.
 *
 * Threat model for this endpoint - a patient uploads an arbitrary file that an
 * admin will later open in a browser:
 *   - Receipts are written OUTSIDE `public/`, so nothing uploaded is ever served
 *     as a static asset, and an uploaded `.html` or `.svg` can never execute on
 *     the clinic's origin. Reading goes through /api/receipts/[proofId], which
 *     authorises the caller first.
 *   - The declared Content-Type is not trusted: the first bytes of the file are
 *     matched against known magic numbers.
 *   - Filenames from the client are discarded entirely and replaced with a UUID,
 *     which removes path traversal (`../../.env`), null bytes, and Windows
 *     reserved device names in one step.
 *   - Size is capped before the buffer is materialised.
 */

export interface StoredReceipt {
  /** Storage key persisted in PaymentProof.receiptImageUrl, e.g. "2026/08/uuid.jpg". */
  storageKey: string;
  mimeType: AllowedReceiptMimeType;
  sizeBytes: number;
  sha256: string;
}

export type ReceiptUploadError =
  | "EMPTY"
  | "TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "CONTENT_MISMATCH"
  | "WRITE_FAILED";

export type ReceiptUploadResult =
  | { ok: true; receipt: StoredReceipt }
  | { ok: false; reason: ReceiptUploadError };

const EXTENSION_BY_MIME: Record<AllowedReceiptMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function matchesMagic(bytes: Uint8Array, mimeType: AllowedReceiptMimeType): boolean {
  const signatures = RECEIPT_MAGIC_NUMBERS[mimeType];
  const matchesPrefix = signatures.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
  if (!matchesPrefix) return false;

  // WebP is a RIFF container; "RIFF" alone would also match .wav or .avi.
  if (mimeType === "image/webp") {
    return (
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
    );
  }

  return true;
}

/** Sniff the real type from the leading bytes, ignoring what the client claimed. */
function sniffMimeType(bytes: Uint8Array): AllowedReceiptMimeType | null {
  for (const mimeType of ALLOWED_RECEIPT_MIME_TYPES) {
    if (matchesMagic(bytes, mimeType)) return mimeType;
  }
  return null;
}

function uploadRoot(): string {
  return path.resolve(process.cwd(), env.UPLOAD_DIR);
}

/**
 * Validate and persist an uploaded receipt.
 * Returns a typed failure rather than throwing, so the calling action can map it
 * onto a bilingual form error.
 */
export async function storeReceipt(file: File): Promise<ReceiptUploadResult> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    return { ok: false, reason: "EMPTY" };
  }
  if (file.size > env.MAX_RECEIPT_BYTES) {
    return { ok: false, reason: "TOO_LARGE" };
  }
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as AllowedReceiptMimeType)) {
    return { ok: false, reason: "UNSUPPORTED_TYPE" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Guard again after materialising: `file.size` is client-reported metadata.
  if (buffer.byteLength === 0) return { ok: false, reason: "EMPTY" };
  if (buffer.byteLength > env.MAX_RECEIPT_BYTES) return { ok: false, reason: "TOO_LARGE" };

  const sniffed = sniffMimeType(buffer.subarray(0, 16));
  if (!sniffed) return { ok: false, reason: "CONTENT_MISMATCH" };
  if (sniffed !== file.type) return { ok: false, reason: "CONTENT_MISMATCH" };

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storageKey = `${yearMonth}/${randomUUID()}.${EXTENSION_BY_MIME[sniffed]}`;
  const absolutePath = path.join(uploadRoot(), storageKey);

  try {
    await mkdir(path.dirname(absolutePath), { recursive: true });
    // wx: never silently overwrite an existing receipt.
    await writeFile(absolutePath, buffer, { flag: "wx" });
  } catch (error) {
    console.error("[uploads] failed to persist receipt", error);
    return { ok: false, reason: "WRITE_FAILED" };
  }

  return {
    ok: true,
    receipt: {
      storageKey,
      mimeType: sniffed,
      sizeBytes: buffer.byteLength,
      sha256: sha256Hex(buffer),
    },
  };
}

/**
 * Resolve a storage key to an absolute path, refusing anything that escapes the
 * upload root. Defence in depth: keys are generated server-side, but this route
 * is the one place a database value becomes a filesystem path.
 */
export function resolveReceiptPath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes("\0")) return null;

  const root = uploadRoot();
  const resolved = path.resolve(root, storageKey);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;

  return resolved.startsWith(rootWithSep) ? resolved : null;
}

export async function readReceipt(storageKey: string): Promise<Buffer | null> {
  const absolutePath = resolveReceiptPath(storageKey);
  if (!absolutePath) return null;
  try {
    return await readFile(absolutePath);
  } catch {
    return null;
  }
}

/** Best-effort cleanup used when the database write fails after a file write. */
export async function deleteReceipt(storageKey: string): Promise<void> {
  const absolutePath = resolveReceiptPath(storageKey);
  if (!absolutePath) return;
  try {
    await unlink(absolutePath);
  } catch {
    /* already gone - nothing to clean up */
  }
}

/** Bilingual copy for each upload failure, reused by the payment action. */
export const RECEIPT_ERROR_MESSAGES: Record<ReceiptUploadError, { ar: string; en: string }> = {
  EMPTY: {
    ar: "لم يتم اختيار ملف الإيصال، أو أن الملف فارغ.",
    en: "No receipt file was selected, or the file is empty.",
  },
  TOO_LARGE: {
    ar: `حجم الملف أكبر من الحد المسموح (${Math.floor(env.MAX_RECEIPT_BYTES / 1_048_576)} ميجابايت).`,
    en: `The file exceeds the ${Math.floor(env.MAX_RECEIPT_BYTES / 1_048_576)} MB limit.`,
  },
  UNSUPPORTED_TYPE: {
    ar: "صيغة الملف غير مدعومة. يُقبل فقط: JPG أو PNG أو WEBP أو PDF.",
    en: "Unsupported file type. Only JPG, PNG, WEBP or PDF are accepted.",
  },
  CONTENT_MISMATCH: {
    ar: "محتوى الملف لا يطابق صيغته المعلنة. يرجى رفع صورة أو ملف PDF سليم للإيصال.",
    en: "The file content does not match its declared type. Please upload a valid receipt image or PDF.",
  },
  WRITE_FAILED: {
    ar: "تعذّر حفظ الإيصال على الخادم. يرجى المحاولة مرة أخرى.",
    en: "Could not save the receipt on the server. Please try again.",
  },
};
