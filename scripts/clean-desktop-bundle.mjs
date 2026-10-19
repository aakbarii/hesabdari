import fs from "node:fs";
import path from "node:path";

/** Remove traced local data from build copies only, never from live storage. */
export function cleanDesktopBundle(directory) {
  const root = process.cwd();
  const bundle = path.resolve(directory);
  const allowed = [
    path.join(root, ".next", "standalone"),
    path.join(root, "dist-desktop", "win-unpacked", "resources", "server"),
  ];
  if (!allowed.some((entry) => entry.toLowerCase() === bundle.toLowerCase())) {
    throw new Error(`Refusing to clean non-build directory: ${bundle}`);
  }
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const target = path.resolve(folder, entry.name);
      if (!target.startsWith(bundle + path.sep)) throw new Error("Invalid bundle path");
      const rootJunk = folder === bundle && ["data", "dist-desktop", "dist", ".git"].includes(entry.name);
      const privateFile = !entry.isDirectory() && (/^\.env(?:\.|$)/.test(entry.name) || entry.name === ".session-secret" || /\.db(?:-(?:wal|shm|journal))?$/.test(entry.name));
      if (rootJunk || privateFile) {
        fs.rmSync(target, { recursive: entry.isDirectory(), force: true });
      } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
        visit(target);
      }
    }
  }
  visit(bundle);
}
