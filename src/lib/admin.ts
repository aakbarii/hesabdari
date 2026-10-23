import { createHash, timingSafeEqual } from "node:crypto";

/** The administrator is identified by the ADMIN_EMAIL environment variable. */
function configuredAdminEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return value ? value : null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = configuredAdminEmail();
  return Boolean(admin && email && email.trim().toLowerCase() === admin);
}

/** Roles are resolved on the server, never from registration/profile payloads. */
export function getUserRole(email: string | null | undefined): "admin" | "user" {
  return isAdminEmail(email) ? "admin" : "user";
}

/** The legacy workspace can only be claimed when an administrator is configured. */
export function isAdminSetupAvailable(): boolean {
  return configuredAdminEmail() !== null && Boolean(process.env.ADMIN_SETUP_TOKEN?.trim());
}

/** Claiming the initial administrator requires a secret supplied by the server owner. */
export function isValidAdminSetupToken(token: string | undefined): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN?.trim();
  if (!expected || !token) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(expected), digest(token));
}
