import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { readReceipt } from "@/lib/uploads";
import { recordAudit } from "@/lib/security/audit";

/**
 * Authorised delivery of a payment receipt.
 *
 * Receipts are stored outside `public/`, so this handler is the only way to read
 * one. It answers three questions before touching the filesystem: is the caller
 * signed in, is this receipt theirs (or are they an admin), and does the stored
 * key still resolve inside the upload root.
 *
 * The response is deliberately hostile to the browser: `no-store` so a shared
 * clinic workstation does not keep a patient's bank screenshot in its disk
 * cache, `nosniff` plus a locked-down CSP so a crafted file cannot execute, and
 * `inline` only for the image and PDF types the upload validator already
 * enforced.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ proofId: string }> },
) {
  const { proofId } = await context.params;

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const proof = await prisma.paymentProof.findUnique({
    where: { id: proofId },
    select: {
      id: true,
      receiptImageUrl: true,
      receiptMimeType: true,
      appointment: { select: { patientId: true } },
    },
  });

  // Same 404 for "does not exist" and "not yours": a distinguishable response
  // would let anyone probe which receipt ids are real.
  const isOwner = proof?.appointment.patientId === auth.user.id;
  const isAdmin = auth.user.role === "ADMIN";

  if (!proof || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const file = await readReceipt(proof.receiptImageUrl);
  if (!file) {
    console.error("[receipts] stored file missing for proof", proof.id);
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (isAdmin) {
    await recordAudit({
      actorId: auth.user.id,
      action: "RECEIPT_VIEWED",
      entityType: "PaymentProof",
      entityId: proof.id,
    });
  }

  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": proof.receiptMimeType,
      "Content-Length": String(file.byteLength),
      "Content-Disposition": `inline; filename="receipt-${proof.id}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
      "Referrer-Policy": "no-referrer",
    },
  });
}
