import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id mit OWASP-Empfehlung (m=19 MiB, t=2, p=1)
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const hashPassword = (password: string) => hash(password, OPTIONS);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Dummy-Hash für konstante Antwortzeiten bei unbekannten E-Mail-Adressen. */
let dummy: string | null = null;
export async function dummyVerify(password: string) {
  dummy ??= await hashPassword("dummy-password-for-timing");
  await verifyPassword(dummy, password);
}
