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

describe("brief bug", () => {
  let root;
  let origIsTTY;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "brief-bug-test-"));
    mkdirSync(join(root, "documentation"), { recursive: true });
    writeFileSync(join(root, "documentation/tracker.yaml"), "items: []\n");
    origIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = origIsTTY;
    rmSync(root, { recursive: true, force: true });
  });

  it("creates bug with BUG- prefix", async () => {
    await itemCommand(root, "bug", "create", ["Login fails on Safari"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /BUG-001/);
    assert.match(tracker, /type: bug/);
  });

  it("creates bug file in documentation/bugs/", async () => {
    await itemCommand(root, "bug", "create", ["API timeout"], []);
    assert.ok(existsSync(join(root, "documentation/bugs/BUG-001.md")));
  });

  it("bug template includes severity and escalated_to fields", async () => {
    await itemCommand(root, "bug", "create", ["Crash on load"], []);
    const content = readFileSync(
      join(root, "documentation/bugs/BUG-001.md"),
      "utf8"
    );
    assert.match(content, /severity: major/);
    assert.match(content, /escalated_to: null/);
  });

  it("respects --severity flag", async () => {
    await itemCommand(
      root,
      "bug",
      "create",
      ["Critical crash"],
      ["brief", "bug", "create", "Critical crash", "--severity=critical"]
    );
    const content = readFileSync(
      join(root, "documentation/bugs/BUG-001.md"),
      "utf8"
    );
    assert.match(content, /severity: critical/);
  });

  it("updates bug status", async () => {
    await itemCommand(root, "bug", "create", ["Fix this"], []);
    await itemCommand(root, "bug", "update", ["BUG-001", "status=done"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /status: done/);
  });

  it("increments bug IDs", async () => {
    await itemCommand(root, "bug", "create", ["First bug"], []);
    await itemCommand(root, "bug", "create", ["Second bug"], []);
    const tracker = readFileSync(
      join(root, "documentation/tracker.yaml"),
      "utf8"
    );
    assert.match(tracker, /BUG-001/);
    assert.match(tracker, /BUG-002/);
  });
});
