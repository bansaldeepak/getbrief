import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { scanFiles } from "../lib/scan.mjs";

describe("legacy record scanning", () => {
  let root;
  function put(file, text) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); }
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "brief-scan-")); });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("retains a deferred decision instead of reactivating it", () => {
    put("documentation/todo/TODO-014.md", "---\nid: TODO-014\ntitle: Keep generator\nstatus: deferred\n---\nKeep for later.\n");
    assert.equal(scanFiles(root)[0].status, "deferred");
  });
  it("uses research frontmatter while preserving Markdown-only research support", () => {
    put("documentation/research/RES-001-study.md", "---\nid: RES-001\ntitle: 'Bundle: context'\nstatus: open\n---\n# Short heading\n\n## Experiment\n**Status**: Running\n");
    put("documentation/research/RES-002-notes.md", "# Legacy study\n\nNotes.\n");
    const items = scanFiles(root);
    assert.equal(items.find(i => i.id === "RES-001").title, "Bundle: context");
    assert.equal(items.find(i => i.id === "RES-001").status, "open");
    assert.equal(items.find(i => i.id === "RES-002").title, "Legacy study");
    assert.equal(items.find(i => i.id === "RES-002").status, "active");
  });
});
