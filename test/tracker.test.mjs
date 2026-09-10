import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { acquireLock, releaseLock, withLock, gitCommonDir, writeTracker, readTracker, allocateId, seedCounter, nextId } from "../lib/tracker.mjs";

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

describe("allocateId", () => {
  let tmp;
  let gitDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    gitDir = join(tmp, ".git");
    mkdirSync(join(tmp, "documentation"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("increments counter and returns formatted ID", () => {
    writeTracker(tmp, []);
    const id1 = allocateId(tmp, gitDir, "story");
    assert.equal(id1, "S-001");
    const id2 = allocateId(tmp, gitDir, "story");
    assert.equal(id2, "S-002");

    const counter = JSON.parse(readFileSync(join(gitDir, "brief-counter"), "utf8"));
    assert.equal(counter.story, 2);
  });

  it("seeds from tracker.yaml on first use", () => {
    writeTracker(tmp, [
      { id: "S-005", type: "story", title: "Existing", status: "done" },
      { id: "S-003", type: "story", title: "Old", status: "done" },
    ]);
    const id = allocateId(tmp, gitDir, "story");
    assert.equal(id, "S-006");
  });

  it("takes max of counter vs tracker when tracker is ahead", () => {
    writeTracker(tmp, [{ id: "S-010", type: "story", title: "Manual", status: "planned" }]);
    writeFileSync(join(gitDir, "brief-counter"), JSON.stringify({ story: 5 }));

    const id = allocateId(tmp, gitDir, "story");
    assert.equal(id, "S-011");
  });

  it("creates counter on first use when file missing", () => {
    writeTracker(tmp, []);
    assert.ok(!existsSync(join(gitDir, "brief-counter")));
    allocateId(tmp, gitDir, "todo");
    assert.ok(existsSync(join(gitDir, "brief-counter")));
  });
});

describe("seedCounter", () => {
  let tmp;
  let gitDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    gitDir = join(tmp, ".git");
    mkdirSync(join(tmp, "documentation"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("seeds from tracker.yaml + filesystem", () => {
    writeTracker(tmp, [
      { id: "S-003", type: "story", title: "A", status: "done" },
      { id: "TODO-007", type: "todo", title: "B", status: "open", priority: "P1" },
    ]);
    mkdirSync(join(tmp, "documentation/stories/feat/S-005"), { recursive: true });
    mkdirSync(join(tmp, "documentation/todo"), { recursive: true });
    writeFileSync(join(tmp, "documentation/todo/TODO-002.md"), "");

    const counter = seedCounter(tmp, gitDir);
    assert.equal(counter.story, 5);
    assert.equal(counter.todo, 7);
  });
});

describe("nextId (refactored)", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-tracker-"));
    mkdirSync(join(tmp, "documentation"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("in git repo delegates to allocateId via counter", () => {
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    writeTracker(tmp, []);
    const id1 = nextId([], "story", tmp);
    const id2 = nextId([], "story", tmp);
    assert.equal(id1, "S-001");
    assert.equal(id2, "S-002");
    assert.ok(existsSync(join(tmp, ".git/brief-counter")));
  });

  it("in non-git directory uses old max+1 fallback", () => {
    const items = [
      { id: "S-003", type: "story", title: "A", status: "done" },
    ];
    const id = nextId(items, "story", tmp);
    assert.equal(id, "S-004");
    assert.ok(!existsSync(join(tmp, ".git")));
  });
});
