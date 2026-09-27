import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readBody } from "../lib/body.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "cli.mjs");

describe("readBody --body= escape handling", () => {
  it("replaces \\n with newline", async () => {
    assert.equal(await readBody(["--body=a\\nb"]), "a\nb");
  });

  it("replaces \\t with tab", async () => {
    assert.equal(await readBody(["--body=a\\tb"]), "a\tb");
  });

  it("replaces \\r with carriage return", async () => {
    assert.equal(await readBody(["--body=a\\rb"]), "a\rb");
  });

  it("replaces \\\\ with single backslash", async () => {
    assert.equal(await readBody(["--body=a\\\\b"]), "a\\b");
  });

  it("preserves literal \\n when double-escaped", async () => {
    assert.equal(await readBody(["--body=a\\\\nb"]), "a\\nb");
  });

  it("handles no escapes", async () => {
    assert.equal(await readBody(["--body=plain text"]), "plain text");
  });

  it("handles empty body", async () => {
    assert.equal(await readBody(["--body="]), "");
  });

  it("handles multiple escapes", async () => {
    assert.equal(await readBody(["--body=a\\nb\\tc"]), "a\nb\tc");
  });
});

describe("readBody never touches stdin without --body=-", () => {
  let savedIsTTY;

  beforeEach(() => {
    savedIsTTY = process.stdin.isTTY;
  });
  afterEach(() => {
    process.stdin.isTTY = savedIsTTY;
  });

  it("returns null when no --body flag and stdin is not a TTY", async () => {
    process.stdin.isTTY = undefined;
    const result = await readBody(["--priority=P1", "some", "title"]);
    assert.equal(result, null);
  });

  it("returns null when no --body flag and stdin is a TTY", async () => {
    process.stdin.isTTY = true;
    const result = await readBody(["--priority=P1"]);
    assert.equal(result, null);
  });
});

describe("readBody --body=- reads stdin", () => {
  it("reads piped content with --body=-", async () => {
    const out = execFileSync("node", ["-e", `
      import { readBody } from "./lib/body.mjs";
      const r = await readBody(["--body=-"]);
      process.stdout.write(r ?? "NULL");
    `], {
      input: "hello from pipe",
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(out, "hello from pipe");
  });
});
