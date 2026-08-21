import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { graduate, list, searchContext } from "../lib/context.mjs";

describe("context.mjs", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe("graduate()", () => {
    it("creates file with correct frontmatter", () => {
      const path = graduate(tmpDir, "Auth Flow", "JWT tokens expire in 24h");
      assert.equal(path, "documentation/context/auth-flow.md");

      const content = readFileSync(join(tmpDir, path), "utf8");
      assert.match(content, /^---\ntitle: Auth Flow\ncreated: \d{4}-\d{2}-\d{2}\nsource: manual\n---/);
      assert.match(content, /JWT tokens expire in 24h/);
    });

    it("handles slug collision with -2 suffix", () => {
      graduate(tmpDir, "Auth Flow", "First body");
      const path2 = graduate(tmpDir, "Auth Flow", "Second body");
      assert.equal(path2, "documentation/context/auth-flow-2.md");
    });

    it("handles multiple collisions with incrementing suffix", () => {
      graduate(tmpDir, "Test", "body 1");
      graduate(tmpDir, "Test", "body 2");
      const path3 = graduate(tmpDir, "Test", "body 3");
      assert.equal(path3, "documentation/context/test-3.md");
    });

    it("throws on empty slug", () => {
      assert.throws(() => graduate(tmpDir, "!!!", "body"), /empty slug/);
    });

    it("respects --source option", () => {
      const path = graduate(tmpDir, "Config", "body", { source: "skill/implement" });
      const content = readFileSync(join(tmpDir, path), "utf8");
      assert.match(content, /source: skill\/implement/);
    });
  });

  describe("list()", () => {
    it("returns empty array when no context dir", () => {
      const items = list(tmpDir);
      assert.deepEqual(items, []);
    });

    it("returns items with title, created, file", () => {
      graduate(tmpDir, "First Item", "body one");
      graduate(tmpDir, "Second Item", "body two");
      const items = list(tmpDir);
      assert.equal(items.length, 2);
      assert.equal(items[0].title, "First Item");
      assert.match(items[0].created, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(items[0].file, "documentation/context/first-item.md");
    });
  });

  describe("searchContext()", () => {
    it("finds matching content", () => {
      graduate(tmpDir, "Auth", "JWT tokens with refresh");
      graduate(tmpDir, "DB", "PostgreSQL connection pooling");
      const results = searchContext(tmpDir, "JWT");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Auth");
      assert.match(results[0].match, /JWT/);
    });

    it("returns empty when no match", () => {
      graduate(tmpDir, "Auth", "JWT tokens");
      const results = searchContext(tmpDir, "GraphQL");
      assert.deepEqual(results, []);
    });
  });
});
