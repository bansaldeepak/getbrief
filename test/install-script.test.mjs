import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, chmodSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "install.sh");
const bash = spawnSync("sh", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();
const git = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();

describe("scripts/install.sh", () => {
  let tmp, bin;

  const stub = (name, body) => {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  const run = () =>
    spawnSync(bash, [SCRIPT], { encoding: "utf8", env: { PATH: bin, HOME: join(tmp, "home") } });

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-install-"));
    bin = join(tmp, "bin");
    mkdirSync(bin);
    mkdirSync(join(tmp, "home"));
    symlinkSync(git, join(bin, "git"));
  });

  afterEach(() => rmSync(tmp, { recursive: true }));

  it("has valid bash syntax", () => {
    assert.equal(spawnSync(bash, ["-n", SCRIPT]).status, 0);
  });

  it("stops with a clear message when Node.js is missing", () => {
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Node\.js 22 or newer is required but 'node' was not found/);
  });

  it("stops with a clear message when Node.js is too old", () => {
    stub("node", 'case "$1" in -p) echo 20;; --version) echo v20.1.0;; esac');
    stub("npm", "exit 0");
    stub("python3", "exit 0");
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Node\.js 22 or newer is required \(found v20\.1\.0\)/);
  });

  it("stops with a clear message when python3 is missing", () => {
    stub("node", 'case "$1" in -p) echo 24;; --version) echo v24.0.0;; esac');
    stub("npm", "exit 0");
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /python3 is required/);
  });

  it("stops when git is missing", () => {
    rmSync(join(bin, "git"));
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /git is required/);
  });
});
