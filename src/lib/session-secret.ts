import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

let cachedSecret: string | undefined;

/** A local install needs a durable, unpredictable key even without an env file. */
export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET?.trim()) return process.env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const dataDir = process.env.HESABDARI_DATA_DIR || path.join(
    /* turbopackIgnore: true */ process.env.HESABDARI_ROOT || process.cwd(), "data",
  );
  mkdirSync(dataDir, { recursive: true });
  const secretPath = path.join(dataDir, ".session-secret");
  try {
    writeFileSync(secretPath, randomBytes(48).toString("base64url"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const secret = readFileSync(secretPath, "utf8").trim();
  if (secret.length < 32) throw new Error("Invalid session key: configure SESSION_SECRET");
  cachedSecret = secret;
  return secret;
}
