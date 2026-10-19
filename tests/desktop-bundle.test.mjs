import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { cleanDesktopBundle } from "../scripts/clean-desktop-bundle.mjs";

test("desktop cleanup removes build copies of private files and preserves source data", () => {
  const originalCwd = process.cwd();
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "ravaal-bundle-test-"));
  try {
    process.chdir(fixture);
    const bundle = path.join(fixture, ".next", "standalone");
    fs.mkdirSync(path.join(bundle, "data"), { recursive: true });
    fs.mkdirSync(path.join(bundle, "public"), { recursive: true });
    fs.mkdirSync(path.join(fixture, "data"));
    fs.writeFileSync(path.join(fixture, "data", "hesabdari.db"), "source");
    fs.writeFileSync(path.join(bundle, "data", "hesabdari.db"), "copy");
    fs.writeFileSync(path.join(bundle, ".env.local"), "private");
    fs.writeFileSync(path.join(bundle, ".session-secret"), "private");
    fs.writeFileSync(path.join(bundle, "public", "icon.svg"), "asset");
    cleanDesktopBundle(bundle);
    assert.equal(fs.existsSync(path.join(bundle, "data")), false);
    assert.equal(fs.existsSync(path.join(bundle, ".env.local")), false);
    assert.equal(fs.existsSync(path.join(bundle, ".session-secret")), false);
    assert.equal(fs.readFileSync(path.join(bundle, "public", "icon.svg"), "utf8"), "asset");
    assert.equal(fs.readFileSync(path.join(fixture, "data", "hesabdari.db"), "utf8"), "source");
    assert.throws(() => cleanDesktopBundle(path.join(fixture, "data")), /non-build directory/);
  } finally {
    process.chdir(originalCwd);
    assert.equal(path.dirname(fixture), os.tmpdir());
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
