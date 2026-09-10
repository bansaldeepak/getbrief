import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { acquireLock, releaseLock, withLock, gitCommonDir, writeTracker, readTracker } from "../lib/tracker.mjs";

describe("gitCommonDir", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns null for non-git directory", () => {
    const result = gitCommonDir(tmp);
    assert.equal(result, null);
  });

  it("returns trimmed path for git repo", () => {
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    const result = gitCommonDir(tmp);
    assert.ok(result);
    assert.ok(!result.endsWith("\n"));
    assert.ok(result.endsWith(".git"));
  });
});

describe("acquireLock", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("creates lock file with PID content", () => {
    const lockPath = acquireLock(tmp);
    assert.ok(existsSync(lockPath));
    const content = readFileSync(lockPath, "utf8");
    assert.equal(content, String(process.pid));
    releaseLock(lockPath);
  });

  it("throws after MAX_RETRIES when lock is held", () => {
    const lockPath = acquireLock(tmp);
    assert.throws(
      () => acquireLock(tmp),
      /could not acquire lock/
    );
    releaseLock(lockPath);
  });

  it("rethrows non-EEXIST errors immediately", () => {
    assert.throws(
      () => acquireLock("/nonexistent-path-that-does-not-exist"),
      (err) => err.code === "ENOENT"
    );
  });

  it("removes stale lock older than 10s", () => {
    const lockPath = join(tmp, "brief-id.lock");
    writeFileSync(lockPath, "99999");
    const past = new Date(Date.now() - 15_000);
    utimesSync(lockPath, past, past);

    const newLockPath = acquireLock(tmp);
    assert.ok(existsSync(newLockPath));
    const content = readFileSync(newLockPath, "utf8");
    assert.equal(content, String(process.pid));
    releaseLock(newLockPath);
  });
});

describe("releaseLock", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("removes lock file", () => {
    const lockPath = acquireLock(tmp);
    assert.ok(existsSync(lockPath));
    releaseLock(lockPath);
    assert.ok(!existsSync(lockPath));
  });

  it("does not throw on missing file", () => {
    assert.doesNotThrow(() => {
      releaseLock(join(tmp, "nonexistent-lock"));
    });
  });
});

describe("withLock", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("passes through callback return value", () => {
    const result = withLock(tmp, () => 42);
    assert.equal(result, 42);
    assert.ok(!existsSync(join(tmp, "brief-id.lock")));
  });

  it("releases lock even when callback throws", () => {
    assert.throws(
      () => withLock(tmp, () => { throw new Error("boom"); }),
      /boom/
    );
    assert.ok(!existsSync(join(tmp, "brief-id.lock")));
  });
});

describe("writeTracker (atomic)", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
    mkdirSync(join(tmp, "documentation"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("writes tracker.yaml with correct content and no .tmp left behind", () => {
    const items = [{ id: "S-001", type: "story", title: "Test", status: "planned" }];
    writeTracker(tmp, items);
    const content = readFileSync(join(tmp, "documentation/tracker.yaml"), "utf8");
    assert.ok(content.includes("S-001"));
    assert.ok(content.includes("Project Tracker"));
    assert.ok(!existsSync(join(tmp, "documentation/tracker.yaml.tmp")));
  });

  it("roundtrips through readTracker", () => {
    const items = [{ id: "TODO-001", type: "todo", title: "Fix bug", status: "open", priority: "P1" }];
    writeTracker(tmp, items);
    const read = readTracker(tmp);
    assert.equal(read.length, 1);
    assert.equal(read[0].id, "TODO-001");
    assert.equal(read[0].title, "Fix bug");
  });
});
