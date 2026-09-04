import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readBody } from "../lib/body.mjs";

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
