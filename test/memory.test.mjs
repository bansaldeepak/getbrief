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

  it("creates memory with MEM- prefix in tracker", async () => {
    await itemCommand(root, "memory", "create", ["API rate limits"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /MEM-001/);
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
      ["MEM-001", "status=stale"],
      []
    );
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /status: stale/);
  });

  it("increments memory IDs", async () => {
    await itemCommand(root, "memory", "create", ["First"], []);
    await itemCommand(root, "memory", "create", ["Second"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /MEM-001/);
    assert.match(tracker, /MEM-002/);
  });
});
