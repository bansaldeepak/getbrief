import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { itemCommand } from "../lib/commands/item.mjs";

describe("brief memory", () => {
  let root;
  let origIsTTY;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "brief-memory-test-"));
    mkdirSync(join(root, "documentation"), { recursive: true });
    writeFileSync(join(root, "documentation/tracker.yaml"), "items: []\n");
    origIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = origIsTTY;
    rmSync(root, { recursive: true, force: true });
  });

  it("creates memory with slug-based ID in tracker", async () => {
    await itemCommand(root, "memory", "create", ["API rate limits"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /id: api-rate-limits/);
    assert.match(tracker, /type: memory/);
  });

  it("creates memory file with slug-based name", async () => {
    await itemCommand(root, "memory", "create", ["API rate limits"], []);
    assert.ok(
      existsSync(join(root, "documentation/memory/api-rate-limits.md"))
    );
  });

  it("memory template includes metadata type and valid_until", async () => {
    await itemCommand(root, "memory", "create", ["Deploy process"], []);
    const content = readFileSync(
      join(root, "documentation/memory/deploy-process.md"),
      "utf8"
    );
    assert.match(content, /type: project/);
    assert.match(content, /valid_until: permanent/);
    assert.match(content, /importance: 3/);
  });

  it("respects --memtype flag", async () => {
    await itemCommand(
      root,
      "memory",
      "create",
      ["User prefers terse"],
      ["brief", "memory", "create", "User prefers terse", "--memtype=feedback"]
    );
    const content = readFileSync(
      join(root, "documentation/memory/user-prefers-terse.md"),
      "utf8"
    );
    assert.match(content, /type: feedback/);
  });

  it("updates memory status in tracker", async () => {
    await itemCommand(root, "memory", "create", ["Old info"], []);
    await itemCommand(
      root,
      "memory",
      "update",
      ["old-info", "status=stale"],
      []
    );
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /status: stale/);
  });

  it("update --body writes body into memory file", async () => {
    await itemCommand(root, "memory", "create", ["Test body write"], []);
    await itemCommand(
      root,
      "memory",
      "update",
      ["test-body-write"],
      ["brief", "memory", "update", "test-body-write", "--body=New content here"]
    );
    const content = readFileSync(
      join(root, "documentation/memory/test-body-write.md"),
      "utf8"
    );
    assert.ok(content.includes("New content here"));
    const afterFm = content.slice(content.indexOf("---", content.indexOf("---") + 3) + 3);
    assert.ok(!afterFm.includes("Test body write"), "old body below frontmatter should be replaced");
  });

  it("uses slug-based IDs for memory", async () => {
    await itemCommand(root, "memory", "create", ["First memory"], []);
    await itemCommand(root, "memory", "create", ["Second memory"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /id: first-memory/);
    assert.match(tracker, /id: second-memory/);
  });
});
