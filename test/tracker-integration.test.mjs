import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeTracker } from "../lib/tracker.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCK_WORKER = join(__dirname, "helpers/lock-worker.mjs");
const ALLOCATE_WORKER = join(__dirname, "helpers/allocate-worker.mjs");
const TASK_WORKER = join(__dirname, "helpers/task-worker.mjs");

function forkAndCollect(script, args) {
  return new Promise((resolve, reject) => {
    const child = fork(script, args, { stdio: ["pipe", "pipe", "pipe", "ipc"] });
    let stdout = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      else resolve(stdout.trim());
    });
    child.on("error", reject);
  });
}

describe("integration: lock contention", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-integ-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    mkdirSync(join(tmp, "documentation"), { recursive: true });
    writeTracker(tmp, []);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("two processes serialize through lock", async () => {
    const logFile = join(tmp, "log.txt");
    writeFileSync(logFile, "");

    const p1 = forkAndCollect(LOCK_WORKER, [tmp, logFile, "A"]);
    const p2 = forkAndCollect(LOCK_WORKER, [tmp, logFile, "B"]);
    await Promise.all([p1, p2]);

    const log = readFileSync(logFile, "utf8").trim().split("\n");
    assert.equal(log.length, 4);
    assert.equal(log[0].startsWith("start:"), true);
    assert.equal(log[1].startsWith("end:"), true);
    assert.equal(log[0].split(":")[1], log[1].split(":")[1]);
  });
});

describe("integration: parallel story create", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-integ-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    mkdirSync(join(tmp, "documentation"), { recursive: true });
    writeTracker(tmp, []);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("5 parallel allocations produce 5 unique IDs", async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(forkAndCollect(ALLOCATE_WORKER, [tmp, "story"]));
    }
    const ids = await Promise.all(promises);
    const unique = new Set(ids);
    assert.equal(unique.size, 5);
    assert.deepEqual(
      [...unique].sort(),
      ["S-001", "S-002", "S-003", "S-004", "S-005"],
    );

    const counter = JSON.parse(readFileSync(join(tmp, ".git/brief-counter"), "utf8"));
    assert.equal(counter.story, 5);
  });
});

describe("integration: task numbering under contention", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-integ-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    mkdirSync(join(tmp, "documentation"), { recursive: true });
    writeTracker(tmp, [{ id: "S-001", type: "story", title: "Test", status: "planned" }]);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("two parallel task allocations get unique numbers", async () => {
    const p1 = forkAndCollect(TASK_WORKER, [tmp, "S-001"]);
    const p2 = forkAndCollect(TASK_WORKER, [tmp, "S-001"]);
    const nums = (await Promise.all([p1, p2])).map(Number).sort();
    assert.deepEqual(nums, [1, 2]);

    const counter = JSON.parse(readFileSync(join(tmp, ".git/brief-counter"), "utf8"));
    assert.equal(counter["task:S-001"], 2);
  });
});

describe("integration: stale lock recovery", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-integ-"));
    execFileSync("git", ["init"], { cwd: tmp, stdio: "pipe" });
    mkdirSync(join(tmp, "documentation"), { recursive: true });
    writeTracker(tmp, []);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("stale lock auto-removed and process proceeds", async () => {
    const lockPath = join(tmp, ".git/brief-id.lock");
    writeFileSync(lockPath, "99999");
    const past = new Date(Date.now() - 15_000);
    utimesSync(lockPath, past, past);

    const id = await forkAndCollect(ALLOCATE_WORKER, [tmp, "story"]);
    assert.equal(id, "S-001");
    assert.ok(!existsSync(lockPath));
  });
});
