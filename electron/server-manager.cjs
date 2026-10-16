/**
 * Persistent Next.js server for desktop.
 *
 * DATA SAFETY:
 * - User DB lives ONLY in userData/data/ (HESABDARI_DATA_DIR).
 * - Runtime mirror / deletes NEVER touch the data/ folder or *.db files.
 * - Installing a new build reuses the same data path — no wipe.
 *
 * SPEED:
 * - Cold start: spawn from packaged resources (no copy on critical path).
 * - Installed (NSIS): skip runtime mirror; resources path is stable.
 * - Portable: mirror in background for reboot warm-start only.
 * - Readiness: TCP probe (Next binds when ready).
 */
const path = require("path");
const fs = require("fs");
const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const PORT = 3847;
const HOST = "127.0.0.1";
const APP_URL = `http://${HOST}:${PORT}`;
const HEALTH_URL = `${APP_URL}/api/health`;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

function writeText(p, text) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, text, "utf8");
}

function copyDir(src, dest) {
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

/** Refuse any destructive op that could hit user data / DB. */
function assertNotUserData(targetPath, dataDir) {
  const resolved = path.resolve(targetPath).toLowerCase();
  const dataRoot = path.resolve(dataDir).toLowerCase();
  if (
    resolved === dataRoot ||
    resolved.startsWith(dataRoot + path.sep) ||
    resolved.endsWith(`${path.sep}hesabdari.db`) ||
    resolved.includes(`${path.sep}hesabdari.db-`)
  ) {
    throw new Error(`Refusing to modify protected data path:\n${targetPath}`);
  }
}

function safeRm(targetPath, dataDir) {
  assertNotUserData(targetPath, dataDir);
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function isPortableBuild() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
}

/** Fast TCP check — Next only binds when ready to accept. */
function isPortOpen(timeoutMs = 60) {
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

function isHttpOk(url, timeoutMs = 300) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode > 0 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function isReady() {
  // TCP is enough — Next listens only after the server is up
  return isPortOpen(50);
}

function waitForReady({ attempts = 400, intervalMs = 20 } = {}) {
  return new Promise((resolve, reject) => {
    let left = attempts;
    const tick = async () => {
      if (await isReady()) return resolve(true);
      left -= 1;
      if (left <= 0) return reject(new Error("Server did not start in time"));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function createManager({
  isPackaged,
  resourcesPath,
  userDataPath,
  projectRootDev,
  appVersion,
}) {
  // IMPORTANT: only create data dir if missing — never wipe existing DB
  const dataDir = ensureDir(path.join(userDataPath, "data"));
  const runtimeDir = path.join(userDataPath, "runtime");
  const compileCacheDir = ensureDir(
    path.join(userDataPath, "node-compile-cache")
  );
  const pidFile = path.join(userDataPath, "server.pid");
  const logFile = path.join(userDataPath, "server.log");
  const launchFile = path.join(userDataPath, "launch.json");
  const versionFile = path.join(runtimeDir, "version.txt");
  const portable = isPortableBuild();

  let mirroring = false;

  function packagedServerDir() {
    return path.join(resourcesPath, "server");
  }

  function packagedNodeExe() {
    return path.join(resourcesPath, "node", "node.exe");
  }

  function runtimeServerDir() {
    return path.join(runtimeDir, "server");
  }

  function runtimeNodeExe() {
    return path.join(runtimeDir, "node", "node.exe");
  }

  function syncRuntimeIfNeeded() {
    if (!isPackaged) return false;
    // Installed builds have a stable resources path — skip heavy copy
    if (!portable) return false;

    const srcServer = packagedServerDir();
    const srcNode = path.join(resourcesPath, "node");
    if (!fs.existsSync(path.join(srcServer, "server.js"))) {
      throw new Error(`Packaged server missing:\n${srcServer}`);
    }

    const current = readText(versionFile);
    const ready = fs.existsSync(path.join(runtimeServerDir(), "server.js"));
    if (current === String(appVersion) && ready) return false;

    const stamp = Date.now();
    const tmp = path.join(userDataPath, `runtime-tmp-${stamp}`);
    assertNotUserData(tmp, dataDir);
    copyDir(srcServer, path.join(tmp, "server"));
    if (fs.existsSync(srcNode)) {
      copyDir(srcNode, path.join(tmp, "node"));
    }
    writeText(path.join(tmp, "version.txt"), String(appVersion));

    const bak = path.join(userDataPath, `runtime-old-${stamp}`);
    if (fs.existsSync(runtimeDir)) {
      assertNotUserData(runtimeDir, dataDir);
      try {
        fs.renameSync(runtimeDir, bak);
      } catch {
        safeRm(runtimeDir, dataDir);
      }
    }
    fs.renameSync(tmp, runtimeDir);
    if (fs.existsSync(bak)) {
      setTimeout(() => {
        try {
          safeRm(bak, dataDir);
        } catch {
          // ignore
        }
      }, 500);
    }
    return true;
  }

  /** Background only — never blocks UI. Skipped for installed (non-portable). */
  function mirrorRuntimeInBackground() {
    if (!isPackaged || !portable || mirroring) return;
    mirroring = true;
    setImmediate(() => {
      try {
        syncRuntimeIfNeeded();
        const nodeBin = fs.existsSync(runtimeNodeExe())
          ? runtimeNodeExe()
          : resolveNodeBinary();
        const cwd = runtimeServerDir();
        if (fs.existsSync(path.join(cwd, "server.js"))) {
          persistLaunchConfig(nodeBin, cwd);
        }
      } catch (err) {
        appendLog(`\nmirror error: ${err}\n`);
      } finally {
        mirroring = false;
      }
    });
  }

  function resolveNodeBinary() {
    if (isPackaged && fs.existsSync(packagedNodeExe())) {
      return packagedNodeExe();
    }
    if (isPackaged && portable && fs.existsSync(runtimeNodeExe())) {
      return runtimeNodeExe();
    }
    try {
      const saved = JSON.parse(readText(launchFile) || "{}");
      if (saved.nodeBin && fs.existsSync(saved.nodeBin)) return saved.nodeBin;
    } catch {
      // ignore
    }
    return process.platform === "win32" ? "node.exe" : "node";
  }

  function resolveServer() {
    if (!isPackaged) {
      const root = projectRootDev;
      const standaloneDir = path.join(root, ".next", "standalone");
      const standalone = path.join(standaloneDir, "server.js");
      if (fs.existsSync(standalone)) {
        return { cwd: standaloneDir, args: [standalone] };
      }
      const nextBin = path.join(
        root,
        "node_modules",
        "next",
        "dist",
        "bin",
        "next"
      );
      return {
        cwd: root,
        args: [nextBin, "start", "--hostname", HOST, "--port", String(PORT)],
      };
    }

    const resCwd = packagedServerDir();
    if (fs.existsSync(path.join(resCwd, "server.js"))) {
      return { cwd: resCwd, args: [path.join(resCwd, "server.js")] };
    }

    const cwd = runtimeServerDir();
    if (!fs.existsSync(path.join(cwd, "server.js"))) {
      throw new Error(`Server missing in resources and runtime`);
    }
    return { cwd, args: [path.join(cwd, "server.js")] };
  }

  function persistLaunchConfig(nodeBin, cwd) {
    writeText(
      launchFile,
      JSON.stringify(
        {
          nodeBin,
          cwd,
          // Always the stable AppData data folder — never overwritten by installs
          dataDir,
          port: PORT,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  function appendLog(chunk) {
    try {
      fs.appendFileSync(logFile, chunk.toString());
    } catch {
      // ignore
    }
  }

  function readPid() {
    const n = parseInt(readText(pidFile), 10);
    return Number.isFinite(n) ? n : null;
  }

  function isPidAlive(pid) {
    if (!pid) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async function isServerUp() {
    return isReady();
  }

  async function ensureServer() {
    if (await isServerUp()) {
      mirrorRuntimeInBackground();
      return { alreadyRunning: true };
    }

    const pid = readPid();
    if (pid && isPidAlive(pid)) {
      try {
        await waitForReady({ attempts: 100, intervalMs: 20 });
        mirrorRuntimeInBackground();
        return { alreadyRunning: true };
      } catch {
        // restart below
      }
    }

    try {
      fs.writeFileSync(logFile, `start ${new Date().toISOString()}\n`);
    } catch {
      // ignore
    }

    const nodeBin = resolveNodeBinary();
    const { cwd, args } = resolveServer();
    persistLaunchConfig(nodeBin, cwd);

    const env = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: HOST,
      HESABDARI_ROOT: cwd,
      // CRITICAL: always point at existing AppData data — preserves user DB
      HESABDARI_DATA_DIR: dataDir,
      NODE_ENV: "production",
      NODE_COMPILE_CACHE: compileCacheDir,
      NEXT_TELEMETRY_DISABLED: "1",
      UV_THREADPOOL_SIZE: "8",
    };

    const child = spawn(nodeBin, args, {
      cwd,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout?.on("data", appendLog);
    child.stderr?.on("data", appendLog);
    child.unref();

    if (child.pid) writeText(pidFile, String(child.pid));

    child.on("exit", (code) => {
      appendLog(`\nexit code=${code}\n`);
      if (readPid() === child.pid) {
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // ignore
        }
      }
    });

    await waitForReady({ attempts: 500, intervalMs: 20 });
    // Soft confirm HTTP once (non-fatal)
    isHttpOk(HEALTH_URL, 400).catch(() => {});
    mirrorRuntimeInBackground();
    return { alreadyRunning: false };
  }

  function stopServer() {
    const pid = readPid();
    if (pid && isPidAlive(pid)) {
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", String(pid), "/f", "/t"], {
            windowsHide: true,
            stdio: "ignore",
          });
        } else {
          process.kill(pid, "SIGTERM");
        }
      } catch {
        // ignore
      }
    }
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // ignore
    }
  }

  return {
    PORT,
    APP_URL,
    HEALTH_URL,
    dataDir,
    logFile,
    launchFile,
    runtimeDir,
    portable,
    ensureServer,
    stopServer,
    isServerUp,
    resolveNodeBinary,
    persistLaunchConfig,
    syncRuntimeIfNeeded,
    mirrorRuntimeInBackground,
    userDataPath,
  };
}

module.exports = {
  PORT,
  APP_URL,
  HEALTH_URL,
  createManager,
  isHttpOk,
  waitForReady,
  isPortableBuild,
};
