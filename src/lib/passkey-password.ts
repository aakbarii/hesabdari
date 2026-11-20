import bcrypt from "bcryptjs";

// Legacy password hashes belong to the retired password-only flow.
const PREFIX = "passkey-password:";

export function hasPasskeyPassword(hash: string | null) {
  return hash?.startsWith(PREFIX) === true;
}

export function validNewPasskeyPassword(value: string) {
  return Array.from(value).length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
}

export async function hashPasskeyPassword(value: string) {
  return PREFIX + await bcrypt.hash(value, 12);
}

export function verifyPasskeyPassword(value: string | undefined, hash: string) {
  return value !== undefined && Buffer.byteLength(value, "utf8") <= 72
    ? bcrypt.compare(value, hash.slice(PREFIX.length))
    : Promise.resolve(false);
}
