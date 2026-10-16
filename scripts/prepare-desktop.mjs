/**
 * After `next build` (output: standalone), copy static assets + drizzle
 * into `.next/standalone` so Electron / portable EXE can run it.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const publicSrc = path.join(root, "public");
const drizzleSrc = path.join(root, "drizzle");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("Standalone build not found. Run: npm run build");
  process.exit(1);
}

// Ensure native module matches system/bundled Node (not Electron ABI)
console.log("Rebuilding better-sqlite3 for Node...");
execSync("npm rebuild better-sqlite3", { stdio: "inherit", cwd: root });

copyDir(staticSrc, path.join(standalone, ".next", "static"));
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(standalone, "public"));
}
copyDir(drizzleSrc, path.join(standalone, "drizzle"));

for (const dep of ["better-sqlite3", "bindings", "file-uri-to-path"]) {
  const s = path.join(root, "node_modules", dep);
  const d = path.join(standalone, "node_modules", dep);
  if (!fs.existsSync(s)) continue;
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  copyDir(s, d);
}

// Never ship previous Electron outputs inside the server bundle
for (const junk of ["dist-desktop", "dist", ".git"]) {
  const p = path.join(standalone, junk);
  if (fs.existsSync(p)) {
    console.log("Removing from standalone:", junk);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

console.log("Desktop prepare OK:", standalone);
