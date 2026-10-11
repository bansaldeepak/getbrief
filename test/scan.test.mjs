import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { scanFiles } from "../lib/scan.mjs";
import { trackerCommand } from "../lib/commands/tracker.mjs";
import { readTracker, writeTracker } from "../lib/tracker.mjs";
import { migrateRecordAuthority } from "../lib/records.mjs";

describe("legacy record scanning", () => {
  let root;
  function put(file, text) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); }
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "brief-scan-")); });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  for (const label of [key => `**${key}**:`, key => `**${key}:**`]) it(`regenerates and migrates ${label("Status")} without losing metadata`, () => {
    const story = "documentation/stories/astro/S-003/story.md";
    put(story, `# S-003: Integration\n\n${label("Status")} in_progress | ${label("Branch")} \`feature/astro\`\n${label("Created")} 2026-03-16\n\n## Experiment\n**Status**: completed\n`);
    writeTracker(root, [{ id: "S-003", type: "story", title: "Integration", status: "planned", story, branch: null, created: null, custom: { flags: [false, null] }, pr: "#4", category: "custom" }]);
    trackerCommand(root, "generate", [], ["--markdown"]);
    const item = readTracker(root)[0];
    assert.equal(item.status, "in_progress"); assert.equal(item.branch, "feature/astro");
    assert.equal(item.created, "2026-03-16"); assert.equal(item.category, "custom");
    assert.deepEqual(item.custom, { flags: [false, null] }); assert.equal(item.pr, "#4");
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
    assert.deepEqual(readTracker(root)[0].custom, item.custom);
  });
  it("ignores section-local status and retains existing metadata absent from the header", () => {
    const story = "documentation/stories/astro/S-003/story.md";
    put(story, "# S-003: Integration\n\n## Experiment\n**Status:** completed\n");
    writeTracker(root, [{ id: "S-003", type: "story", title: "Integration", status: "in_progress", branch: "feature/astro", story }]);
    trackerCommand(root, "generate", [], []);
    assert.equal(readTracker(root)[0].status, "in_progress");
    assert.equal(readTracker(root)[0].branch, "feature/astro");
  });
  it("reads story frontmatter and both typed-record header styles", () => {
    put("documentation/stories/astro/S-003/story.md", "---\nstatus: blocked\nbranch: feature/astro\ncreated: 2026-03-16\n---\n# S-003: Integration\n");
    put("documentation/todo/TODO-001.md", "# TODO-001: Later\n\n**Status:** deferred | **Priority:** P2\n\n## Example\n**Status**: done\n");
    const items = scanFiles(root);
    assert.equal(items.find(i => i.id === "S-003").status, "blocked");
    assert.equal(items.find(i => i.id === "TODO-001").status, "deferred");
    assert.equal(items.find(i => i.id === "TODO-001").priority, "P2");
  });
  it("refuses to silently drop an unmatched tracker record", () => {
    put("documentation/todo/TODO-001.md", "# TODO-001: Keep\n");
    writeTracker(root, [{ id: "TODO-099", type: "todo", title: "Missing file", status: "open", custom: true }]);
    const before = readFileSync(join(root, "documentation/tracker.yaml"), "utf8");
    assert.throws(() => trackerCommand(root, "generate", [], []), /missing from scan.*TODO-099/);
    assert.equal(readFileSync(join(root, "documentation/tracker.yaml"), "utf8"), before);
  });
  it("preserves explicit null clears instead of restoring stale tracker fields", () => {
    put("documentation/todo/TODO-001.md", "---\ntitle: 'Later: maybe'\nstatus: deferred\npriority: null\ncreated: null\nstory: null\n---\n# TODO-001: Later\n");
    writeTracker(root, [{ id: "TODO-001", type: "todo", title: "Later", status: "open", priority: "P1", created: "2026-01-01", story: "S-003" }]);
    trackerCommand(root, "generate", [], []);
    const item = readTracker(root)[0];
    for (const key of ["priority", "created", "story"]) assert.equal(item[key], null);
    assert.equal(item.title, "Later: maybe");
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
  });
  it("reports malformed legacy frontmatter before rewriting the tracker", () => {
    put("documentation/todo/TODO-014.md", "---\ntitle: CI: save cache\nstatus: open\n---\n");
    writeTracker(root, [{ id: "TODO-014", type: "todo", title: "CI: save cache", status: "open" }]);
    const before = readFileSync(join(root, "documentation/tracker.yaml"), "utf8");
    assert.throws(() => trackerCommand(root, "generate", [], []), /Invalid YAML.*TODO-014/);
    assert.equal(readFileSync(join(root, "documentation/tracker.yaml"), "utf8"), before);
  });

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
