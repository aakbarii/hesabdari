/** The administrator is identified by the ADMIN_EMAIL environment variable. */
function configuredAdminEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return value ? value : null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = configuredAdminEmail();
  return Boolean(admin && email && email.trim().toLowerCase() === admin);
}

/** The legacy workspace can only be claimed when an administrator is configured. */
export function isAdminSetupAvailable(): boolean {
  return configuredAdminEmail() !== null;
}
