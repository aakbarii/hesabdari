/**
 * Pure-Node warm start (no Electron).
 * Starts the Next server at Windows login so the UI opens instantly.
 *
 * DATA SAFETY: always uses %APPDATA%\Hesabdari\data — never creates a new DB elsewhere.
 */
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const PORT = 3847;
const HOST = "127.0.0.1";

function userDataDir() {
  if (process.env.HESABDARI_USER_DATA) return process.env.HESABDARI_USER_DATA;
  const base =
    process.env.APPDATA ||
    process.env.HOME ||
    process.env.USERPROFILE ||
    process.cwd();
  return path.join(base, "Hesabdari");
}

function isPortOpen(timeoutMs = 80) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: HOST }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitUp(attempts = 200) {
  for (let i = 0; i < attempts; i++) {
    if (await isPortOpen(40)) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

async function main() {
  if (await isPortOpen(60)) process.exit(0);

  const userData = userDataDir();
  const launchFile = path.join(userData, "launch.json");
  const pidFile = path.join(userData, "server.pid");
  const logFile = path.join(userData, "server.log");
  // HARD-LOCKED data path — same as Electron, preserves existing DB
  const dataDir = path.join(userData, "data");
  const compileCacheDir = path.join(userData, "node-compile-cache");

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(launchFile, "utf8"));
  } catch {
    process.exit(1);
  }

  const { nodeBin, cwd } = cfg;
  const serverJs = path.join(cwd, "server.js");
  if (!nodeBin || !cwd || !fs.existsSync(serverJs)) process.exit(1);

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(compileCacheDir, { recursive: true });

  const child = spawn(nodeBin, [serverJs], {
    cwd,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: HOST,
      HESABDARI_ROOT: cwd,
      HESABDARI_DATA_DIR: dataDir,
      NODE_ENV: "production",
      NODE_COMPILE_CACHE: compileCacheDir,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  if (child.pid) fs.writeFileSync(pidFile, String(child.pid));
  try {
    fs.appendFileSync(
      logFile,
      `warmup ${new Date().toISOString()} pid=${child.pid} data=${dataDir}\n`
    );
  } catch {
    // ignore
  }

  await waitUp(200);
  process.exit(0);
}

main().catch(() => process.exit(1));
