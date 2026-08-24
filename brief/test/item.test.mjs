import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { itemCommand } from "../lib/commands/item.mjs";

describe("itemCommand", () => {
  let root;
  let origIsTTY;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "brief-item-test-"));
    mkdirSync(join(root, "documentation"), { recursive: true });
    writeFileSync(
      join(root, "documentation/tracker.yaml"),
      "items: []\n"
    );
    origIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = origIsTTY;
    rmSync(root, { recursive: true, force: true });
  });

  describe("create", () => {
    it("creates todo with correct ID and file", async () => {
      await itemCommand(root, "todo", "create", ["Fix the widget"], []);
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /TODO-001/);
      assert.match(tracker, /Fix the widget/);
      assert.ok(existsSync(join(root, "documentation/todo/TODO-001.md")));
    });

    it("creates decision with DEC prefix", async () => {
      await itemCommand(root, "decision", "create", ["Use PostgreSQL"], []);
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /DEC-001/);
      assert.ok(
        existsSync(join(root, "documentation/decisions/DEC-001.md"))
      );
    });

    it("creates research with RES prefix", async () => {
      await itemCommand(root, "research", "create", ["Evaluate Redis"], []);
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /RES-001/);
    });

    it("creates audit with AUD prefix", async () => {
      await itemCommand(root, "audit", "create", ["Security review"], []);
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /AUD-001/);
    });

    it("applies --body flag to markdown file", async () => {
      await itemCommand(
        root,
        "todo",
        "create",
        ["Title here"],
        ["brief", "todo", "create", "Title here", "--body=Detailed body"]
      );
      const content = readFileSync(
        join(root, "documentation/todo/TODO-001.md"),
        "utf8"
      );
      assert.match(content, /Detailed body/);
    });

    it("increments ID correctly", async () => {
      await itemCommand(root, "todo", "create", ["First"], []);
      await itemCommand(root, "todo", "create", ["Second"], []);
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /TODO-001/);
      assert.match(tracker, /TODO-002/);
    });

    it("applies --priority flag", async () => {
      await itemCommand(
        root,
        "todo",
        "create",
        ["Urgent thing"],
        ["brief", "todo", "create", "Urgent thing", "--priority=P0"]
      );
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /P0/);
    });
  });

  describe("update", () => {
    it("updates status in tracker", async () => {
      await itemCommand(root, "todo", "create", ["Fix bug"], []);
      await itemCommand(
        root,
        "todo",
        "update",
        ["TODO-001", "status=done"],
        []
      );
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /status: done/);
    });

    it("updates frontmatter in markdown file", async () => {
      await itemCommand(root, "todo", "create", ["Fix bug"], []);
      await itemCommand(
        root,
        "todo",
        "update",
        ["TODO-001", "status=done"],
        []
      );
      const content = readFileSync(
        join(root, "documentation/todo/TODO-001.md"),
        "utf8"
      );
      assert.match(content, /status: done/);
    });

    it("replaces body with --body flag", async () => {
      await itemCommand(root, "todo", "create", ["Fix bug"], []);
      await itemCommand(
        root,
        "todo",
        "update",
        ["TODO-001"],
        ["brief", "todo", "update", "TODO-001", "--body=New body content"]
      );
      const content = readFileSync(
        join(root, "documentation/todo/TODO-001.md"),
        "utf8"
      );
      assert.match(content, /New body content/);
    });

    it("updates multiple fields at once", async () => {
      await itemCommand(root, "todo", "create", ["Fix bug"], []);
      await itemCommand(
        root,
        "todo",
        "update",
        ["TODO-001", "status=done", "priority=P0"],
        []
      );
      const tracker = readFileSync(
        join(root, "documentation/tracker.yaml"),
        "utf8"
      );
      assert.match(tracker, /status: done/);
      assert.match(tracker, /P0/);
    });
  });

  describe("show", () => {
    it("outputs markdown file content", async () => {
      await itemCommand(root, "todo", "create", ["Show me"], []);
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(" "));
      itemCommand(root, "todo", "show", ["TODO-001"], []);
      console.log = origLog;
      const output = logs.join("\n");
      assert.match(output, /TODO-001/);
      assert.match(output, /Show me/);
    });
  });

  describe("help", () => {
    it("outputs usage info", () => {
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(" "));
      itemCommand(root, "todo", "help", [], []);
      console.log = origLog;
      const output = logs.join("\n");
      assert.match(output, /brief todo/);
      assert.match(output, /list/);
      assert.match(output, /create/);
    });
  });
});
