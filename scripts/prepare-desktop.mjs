/**
 * After `next build` (output: standalone), copy static assets + drizzle
 * into `.next/standalone` so Electron / portable EXE can run it.
 */
import fs from "fs";
import path from "path";
import { cleanDesktopBundle } from "./clean-desktop-bundle.mjs";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const publicSrc = path.join(root, "public");
const drizzleSrc = path.join(root, "drizzle");
const desktopApp = path.join(root, "build-resources", "desktop-app");

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

copyDir(staticSrc, path.join(standalone, ".next", "static"));
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(standalone, "public"));
}
copyDir(drizzleSrc, path.join(standalone, "drizzle"));

// libSQL ships prebuilt native binaries, so no rebuild step is needed for the bundled Node.
for (const dep of ["@libsql", "libsql"]) {
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

cleanDesktopBundle(standalone);

// Electron's main process uses only built-ins; the web dependencies already live
// in the standalone server. Keep a small app manifest to avoid bundling twice.
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
copyDir(path.join(root, "electron"), path.join(desktopApp, "electron"));
fs.writeFileSync(path.join(desktopApp, "package.json"), JSON.stringify({
  name: "ravaal-desktop",
  version: metadata.version,
  description: metadata.description,
  author: metadata.author,
  main: "electron/main.cjs",
}, null, 2));
const electronVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules", "electron", "package.json"), "utf8")).version;
const desktopConfig = fs.readFileSync(path.join(root, "electron-builder.yml"), "utf8")
  .replace("app: build-resources/desktop-app", "app: .")
  .replace("output: dist-desktop", "output: ../../dist-desktop")
  .replace("buildResources: build-resources", "buildResources: ..")
  .replace("from: .next/standalone", "from: ../../.next/standalone")
  .replace("from: build-resources/node", "from: ../node");
fs.writeFileSync(path.join(desktopApp, "electron-builder.yml"), `${desktopConfig}\nelectronVersion: ${electronVersion}\n`);
console.log("Desktop prepare OK (local data excluded):", standalone);
