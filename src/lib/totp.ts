import { TOTP, Secret } from "otpauth";

const ISSUER = "Hesabdari";

export function createTotpSetup(email: string, existingSecret?: string | null) {
  const secret = existingSecret
    ? Secret.fromBase32(existingSecret)
    : new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const totp = new TOTP({
    secret: Secret.fromBase32(secretBase32),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}
