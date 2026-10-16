/**
 * electron-builder excludes node_modules from extraResources by default.
 * After packaging win-unpacked, copy them in, then rebuild portable if needed.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const root = process.cwd();
const srcNm = path.join(root, ".next", "standalone", "node_modules");
const destServer = path.join(
  root,
  "dist-desktop",
  "win-unpacked",
  "resources",
  "server"
);
const destNm = path.join(destServer, "node_modules");

if (!fs.existsSync(path.join(destServer, "server.js"))) {
  console.error("Packaged server not found:", destServer);
  process.exit(1);
}

if (!fs.existsSync(srcNm)) {
  console.error("Standalone node_modules missing. Run desktop:prepare first.");
  process.exit(1);
}

if (fs.existsSync(destNm)) {
  fs.rmSync(destNm, { recursive: true, force: true });
}

console.log("Copying node_modules into packaged server...");
fs.cpSync(srcNm, destNm, { recursive: true });
console.log("OK:", destNm);

// Also ensure drizzle + static exist
const drizzleSrc = path.join(root, ".next", "standalone", "drizzle");
const drizzleDest = path.join(destServer, "drizzle");
if (fs.existsSync(drizzleSrc) && !fs.existsSync(drizzleDest)) {
  fs.cpSync(drizzleSrc, drizzleDest, { recursive: true });
}

// Strip accidental nested build outputs (causes NSIS mmap failures / multi-GB installers)
for (const junk of ["dist-desktop", "dist", ".git"]) {
  const p = path.join(destServer, junk);
  if (fs.existsSync(p)) {
    console.log("Removing nested junk from packaged server:", junk);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

console.log("Pack fix complete.");
