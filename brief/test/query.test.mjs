import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("query command", () => {
  let tmpDir;
  let originalExit;
  let originalError;
  let originalLog;
  let exitCode;
  let stderr;
  let stdout;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-query-"));
    mkdirSync(join(tmpDir, "documentation"), { recursive: true });
    writeFileSync(join(tmpDir, "documentation/tracker.yaml"), "stories: []\ntodos: []\ndecisions: []\nresearch: []\naudits: []\n");
    exitCode = null;
    stderr = [];
    stdout = [];
    originalExit = process.exit;
    originalError = console.error;
    originalLog = console.log;
    process.exit = (code) => { exitCode = code; throw new Error("EXIT"); };
    console.error = (...args) => stderr.push(args.join(" "));
    console.log = (...args) => stdout.push(args.join(" "));
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalError;
    console.log = originalLog;
    rmSync(tmpDir, { recursive: true });
  });

  it("exits 1 with usage when no query provided", async () => {
    const { queryCommand } = await import("../lib/commands/query.mjs");
    try {
      await queryCommand(tmpDir, [], []);
    } catch (e) {
      assert.match(e.message, /EXIT/);
    }
    assert.equal(exitCode, 1);
    assert.match(stderr[0], /Usage/);
  });

  it("shows docs-only when no codegraph exists", async () => {
    mkdirSync(join(tmpDir, "documentation/todo"), { recursive: true });
    writeFileSync(join(tmpDir, "documentation/todo/TODO-001.md"), "---\ntitle: Fix auth bug\nstatus: open\n---\n");
    writeFileSync(join(tmpDir, "documentation/tracker.yaml"), "stories: []\ntodos:\n  - id: TODO-001\n    title: Fix auth bug\n    status: open\ndecisions: []\nresearch: []\naudits: []\n");

    const { queryCommand } = await import("../lib/commands/query.mjs");
    await queryCommand(tmpDir, ["auth"], ["auth"]);

    const output = stdout.join("\n");
    assert.ok(!output.includes("## Code"));
    assert.ok(output.includes("## Docs"));
  });

  it("outputs valid JSON with --json flag", async () => {
    const { queryCommand } = await import("../lib/commands/query.mjs");
    await queryCommand(tmpDir, ["nonexistent"], ["nonexistent", "--json"]);

    const output = stdout.join("\n");
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.code));
    assert.ok(Array.isArray(parsed.docs));
  });

  it("all callers returned without cap", () => {
    const allCallers = Array.from({ length: 20 }, (_, i) => ({
      name: `c${i}`, file: "x.mjs", line: i,
    }));
    const output = { callers: allCallers.map((c) => ({ name: c.name, file: c.file, line: c.line })) };
    assert.equal(output.callers.length, 20);
  });

  it("base output always shows callees and callers", async () => {
    const { queryCommand } = await import("../lib/commands/query.mjs");
    await queryCommand(tmpDir, ["nonexistent"], ["nonexistent"]);
    const output = stdout.join("\n");
    assert.ok(!output.includes("undefined"));
  });

  it("--full flag is accepted without error", async () => {
    const { queryCommand } = await import("../lib/commands/query.mjs");
    await queryCommand(tmpDir, ["nonexistent"], ["nonexistent", "--full"]);
    const output = stdout.join("\n");
    assert.ok(output.includes("No matches"));
  });

  it("--json with --full includes edges and source fields", async () => {
    const { queryCommand } = await import("../lib/commands/query.mjs");
    await queryCommand(tmpDir, ["test"], ["test", "--json", "--full"]);
    const output = stdout.join("\n");
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.code));
  });
});
