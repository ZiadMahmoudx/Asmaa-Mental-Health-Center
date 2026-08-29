import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { timingSafeEqual, createHash, randomBytes } from "node:crypto";

/**
 * Argon2id password hashing.
 *
 * Parameters follow the OWASP Password Storage Cheat Sheet second recommended
 * configuration (19 MiB memory, 2 iterations, 1 degree of parallelism), which is
 * the balance point for a Node server that also handles request traffic.
 *
 * `algorithm: 2` is Argon2id. The literal is used rather than the library's
 * `Algorithm` enum because that is an ambient `const enum`, which TypeScript
 * cannot inline under `isolatedModules` - the mode Next.js requires.
 */
const ARGON2_ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2_ID,
  memoryCost: 19_456, // KiB = 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * A pre-computed hash of a random throwaway password. Used to burn the same
 * amount of CPU when the email does not exist, so response timing does not
 * disclose which addresses are registered.
 */
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash(randomBytes(32).toString("hex"), ARGON2_OPTIONS);
  }
  return dummyHashPromise;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Verify a password against a stored argon2id digest.
 * Returns false (never throws) on a malformed digest so a corrupted row cannot
 * turn into a 500 on the login route.
 */
export async function verifyPassword(
  storedHash: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Constant-work verification for the "user not found" branch of login.
 * Always resolves false, but only after doing the same argon2 work as a real
 * verification, defeating user-enumeration by response time.
 */
export async function fakeVerifyPassword(plainPassword: string): Promise<false> {
  await verify(await getDummyHash(), plainPassword).catch(() => false);
  return false;
}

/** 256 bits of CSPRNG entropy, URL-safe, for session and CSRF tokens. */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** SHA-256 hex digest. Tokens are high-entropy, so a fast hash is appropriate. */
export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Length-safe constant-time comparison for hex digests and opaque tokens. */
export function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // Still burn a comparison so the mismatch length is not timing-visible.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/** Numeric OTP for the phone-verification path (kept ready for an SMS provider). */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  // Rejection sampling keeps the distribution uniform across the digit range.
  let value: number;
  do {
    value = randomBytes(4).readUInt32BE(0);
  } while (value >= Math.floor(0xffffffff / max) * max);
  return String(value % max).padStart(digits, "0");
}
