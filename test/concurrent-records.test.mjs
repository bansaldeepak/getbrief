import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { migrateRecordAuthority, splitRecord } from "../lib/records.mjs";
import { readTracker } from "../lib/tracker.mjs";
import { storyCommand } from "../lib/commands/story.mjs";
import { logCommand } from "../lib/commands/log.mjs";
import { verifyRecords } from "../lib/verify-records.mjs";
import { searchFiles } from "../lib/search.mjs";

const cli = resolve("cli.mjs");
function git(root, ...args) { return execFileSync("git", args, { cwd: root, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function commit(root, message) { git(root, "add", "."); git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", message); }
function run(root, ...args) { return execFileSync(process.execPath, [cli, "--root", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }

describe("concurrent project records", () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "brief-concurrent-")); mkdirSync(join(root, "documentation")); migrateRecordAuthority(root, { apply: true }); });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it("scopes new IDs and rejects ambiguous shorthand without changing files", async () => {
    for (const feature of ["cart", "billing"]) await storyCommand(root, "create", ["Story"], [`--feature=${feature}`, "--body=Scope"]);
    assert.deepEqual(readTracker(root).map(i => i.id), ["billing/S-001", "cart/S-001"]);
    await assert.rejects(storyCommand(root, "update", ["S-001", "status=done"], []), /Ambiguous.*billing\/S-001.*cart\/S-001/);
    await storyCommand(root, "update", ["cart/S-001", "status=in_progress"], ["--body=New scope"]);
    assert.equal(readTracker(root).find(i => i.id === "cart/S-001").status, "in_progress");
    assert.deepEqual(searchFiles(root, "Story").filter(r => r.type === "story").map(r => r.id).sort(), ["billing/S-001", "cart/S-001"]);
    await assert.rejects(storyCommand(root, "create", ["Invalid"], ["--feature=../outside", "--body=no"]), /Feature must/);
  });
  it("derives independent task progress without touching shared story metadata", async () => {
    await storyCommand(root, "create", ["Cart"], ["--feature=cart", "--body=scope"]);
    const file = join(root, "documentation/stories/cart/S-001/story.md"), before = readFileSync(file, "utf8");
    for (const title of ["First", "Second"]) await storyCommand(root, "task", ["create", "S-001", title], ["--body=Work"]);
    for (const id of ["cart/S-001-T1", "cart/S-001-T2"]) await storyCommand(root, "task", ["update", id, "status=in_progress"], ["--body=Ready"]);
    assert.equal(readFileSync(file, "utf8"), before);
    assert.deepEqual(readTracker(root)[0].active_tasks, ["cart/S-001-T1", "cart/S-001-T2"]);
    assert.equal(readTracker(root)[0].current_task, null);
    assert.equal(verifyRecords(root).ok, true);
  });
  it("creates 100 unique immutable entries at the same timestamp with safe YAML", async () => {
    const RealDate = Date;
    globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ["2026-10-10T00:00:00Z"])); } };
    try { for (let i = 0; i < 100; i++) await logCommand(root, "add", ["note: \"quoted\"\nnext"], ["--session=feature/cart", "--agent=agent-1", "--body=details"]); }
    finally { globalThis.Date = RealDate; }
    const files = readdirSync(join(root, "documentation/logs"));
    assert.equal(files.length, 100);
    for (const file of files) assert.equal(splitRecord(readFileSync(join(root, "documentation/logs", file), "utf8")).data.note, "note: \"quoted\"\nnext");
    assert.equal(verifyRecords(root).ok, true);
  });
  it("guards historical logs and tracked generated views", async () => {
    git(root, "init", "-q"); writeFileSync(join(root, "logs.md"), "History\n");
    await logCommand(root, "add", ["Initial"], ["--body=Log"]); commit(root, "baseline");
    const base = git(root, "rev-parse", "HEAD");
    writeFileSync(join(root, "logs.md"), "Edited\n");
    const file = readdirSync(join(root, "documentation/logs"))[0];
    writeFileSync(join(root, "documentation/logs", file), "changed");
    writeFileSync(join(root, "documentation/tracker.yaml"), "items: []\n"); git(root, "add", "-f", "documentation/tracker.yaml");
    const result = verifyRecords(root, { base });
    assert.equal(result.ok, false); assert.match(result.errors.join("\n"), /monolithic/); assert.match(result.errors.join("\n"), /immutable/); assert.match(result.errors.join("\n"), /Untrack/);
  });
  it("merges independent clones without tracker conflicts and detects same-feature collisions", () => {
    git(root, "init", "-q"); commit(root, "base");
    const other = mkdtempSync(join(tmpdir(), "brief-peer-"));
    try {
      git(other, "clone", "-q", root, "work"); const peer = join(other, "work");
      run(root, "story", "create", "Cart", "--feature=cart", "--body=Scope"); commit(root, "cart");
      run(peer, "story", "create", "Billing", "--feature=billing", "--body=Scope"); commit(peer, "billing");
      git(root, "fetch", peer, "HEAD"); git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "merge", "--no-edit", "FETCH_HEAD");
      assert.equal(readTracker(root).length, 2);
      assert.equal(git(root, "ls-files", "documentation/tracker.yaml"), "");
      // Independent same-feature creation has different immutable identities and a real add/add conflict.
      run(root, "story", "create", "Shared", "--feature=shared", "--body=Scope"); commit(root, "shared A");
      run(peer, "story", "create", "Shared", "--feature=shared", "--body=Scope"); commit(peer, "shared B");
      git(root, "fetch", peer, "HEAD");
      assert.throws(() => git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "merge", "--no-edit", "FETCH_HEAD"));
      assert.equal(verifyRecords(root).ok, false);
    } finally { rmSync(other, { recursive: true, force: true }); }
  });
});
