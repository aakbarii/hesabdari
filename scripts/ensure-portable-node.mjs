/**
 * Downloads a portable Node.js runtime for Windows into build-resources/node
 * so the packaged EXE does not require a system Node install.
 */
import fs from "fs";
import path from "path";
import https from "https";
import { execFileSync } from "child_process";

const NODE_VERSION = "v22.14.0";
const destDir = path.join(process.cwd(), "build-resources", "node");
const nodeExe = path.join(destDir, "node.exe");

if (fs.existsSync(nodeExe)) {
  console.log("Portable Node already present:", nodeExe);
  process.exit(0);
}

if (process.platform !== "win32") {
  console.log("Skipping portable Node download (Windows only for now)");
  process.exit(0);
}

const zipName = `node-${NODE_VERSION}-win-x64.zip`;
const url = `https://nodejs.org/dist/${NODE_VERSION}/${zipName}`;
const tmpZip = path.join(process.cwd(), "build-resources", zipName);

fs.mkdirSync(path.dirname(tmpZip), { recursive: true });

console.log("Downloading", url);

function download(url, file) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(file);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          out.close();
          fs.unlinkSync(file);
          return download(res.headers.location, file).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(out);
        out.on("finish", () => out.close(resolve));
      })
      .on("error", reject);
  });
}

await download(url, tmpZip);

const extractDir = path.join(process.cwd(), "build-resources", "_node_extract");
fs.mkdirSync(extractDir, { recursive: true });

// Use PowerShell Expand-Archive
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Expand-Archive -Path '${tmpZip}' -DestinationPath '${extractDir}' -Force`,
  ],
  { stdio: "inherit" }
);

const extracted = path.join(extractDir, `node-${NODE_VERSION}-win-x64`);
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(path.join(extracted, "node.exe"), nodeExe);

fs.rmSync(tmpZip, { force: true });
fs.rmSync(extractDir, { recursive: true, force: true });

console.log("Portable Node ready:", nodeExe);
