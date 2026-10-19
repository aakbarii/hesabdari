import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "build-resources", "desktop-app");
const installers = process.argv[2] === "installers";
execFileSync(process.execPath, [
  path.join(root, "node_modules", "electron-builder", "cli.js"),
  "--projectDir", appDir,
  "--config", path.join(appDir, "electron-builder.yml"),
  "--win", ...(installers ? ["nsis", "portable", "--prepackaged", path.join(root, "dist-desktop", "win-unpacked")] : ["dir"]),
  "--config.npmRebuild=false",
], { cwd: root, stdio: "inherit", windowsHide: true });
