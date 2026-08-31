import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open, getHandle, search, callers, impact } from "../lib/code-index.mjs";

describe("code-index.mjs", () => {
  describe("open()", () => {
    it("returns null when no .codegraph/ exists", () => {
      const tmp = mkdtempSync(join(tmpdir(), "brief-ci-"));
      try {
        const handle = open(tmp);
        assert.equal(handle, null);
      } finally {
        rmSync(tmp, { recursive: true });
      }
    });

    it("returns null on non-existent path", () => {
      const handle = open("/tmp/nonexistent-path-xyz-123");
      assert.equal(handle, null);
    });
  });

  describe("getHandle()", () => {
    it("returns null when not initialized", () => {
      const tmp = mkdtempSync(join(tmpdir(), "brief-ci-"));
      try {
        const handle = getHandle(tmp);
        assert.equal(handle, null);
      } finally {
        rmSync(tmp, { recursive: true });
      }
    });
  });

  describe("search()", () => {
    it("returns empty array with null handle", () => {
      const results = search(null, "test");
      assert.deepEqual(results, []);
    });

    it("returns empty array when handle.searchNodes throws", () => {
      const fakeHandle = { searchNodes() { throw new Error("boom"); } };
      const results = search(fakeHandle, "test");
      assert.deepEqual(results, []);
    });

    it("maps results correctly from codegraph format", () => {
      const fakeHandle = {
        searchNodes() {
          return [
            { node: { id: "fn:1", name: "hello", kind: "function", filePath: "index.mjs", startLine: 5, signature: "()" }, score: 10 },
          ];
        },
      };
      const results = search(fakeHandle, "hello");
      assert.equal(results.length, 1);
      assert.equal(results[0].id, "fn:1");
      assert.equal(results[0].name, "hello");
      assert.equal(results[0].kind, "function");
      assert.equal(results[0].file, "index.mjs");
      assert.equal(results[0].line, 5);
      assert.equal(results[0].score, 10);
    });
  });

  describe("callers()", () => {
    it("returns empty array with null handle", () => {
      const results = callers(null, "fn:1");
      assert.deepEqual(results, []);
    });

    it("returns empty array when handle.getCallers throws", () => {
      const fakeHandle = { getCallers() { throw new Error("boom"); } };
      const results = callers(fakeHandle, "fn:1");
      assert.deepEqual(results, []);
    });

    it("maps results correctly from {node, edge} format", () => {
      const fakeHandle = {
        getCallers() {
          return [
            { node: { id: "fn:2", name: "caller", kind: "function", filePath: "app.mjs", startLine: 10 }, edge: {} },
          ];
        },
      };
      const results = callers(fakeHandle, "fn:1");
      assert.equal(results.length, 1);
      assert.equal(results[0].name, "caller");
      assert.equal(results[0].file, "app.mjs");
      assert.equal(results[0].line, 10);
    });
  });

  describe("impact()", () => {
    it("returns empty array with null handle", () => {
      const results = impact(null, "fn:1");
      assert.deepEqual(results, []);
    });

    it("returns empty array when handle.getImpactRadius throws", () => {
      const fakeHandle = { getImpactRadius() { throw new Error("boom"); } };
      const results = impact(fakeHandle, "fn:1");
      assert.deepEqual(results, []);
    });

    it("returns empty array when result has no nodes", () => {
      const fakeHandle = { getImpactRadius() { return { nodes: null }; } };
      const results = impact(fakeHandle, "fn:1");
      assert.deepEqual(results, []);
    });

    it("maps results from Map format", () => {
      const nodesMap = new Map();
      nodesMap.set("fn:1", { id: "fn:1", name: "target", kind: "function", filePath: "lib.mjs", startLine: 3 });
      nodesMap.set("fn:2", { id: "fn:2", name: "affected", kind: "function", filePath: "dep.mjs", startLine: 7 });
      const fakeHandle = { getImpactRadius() { return { nodes: nodesMap, edges: [], roots: [] }; } };
      const results = impact(fakeHandle, "fn:1");
      assert.equal(results.length, 2);
      assert.equal(results[0].name, "target");
      assert.equal(results[1].name, "affected");
    });
  });
});
