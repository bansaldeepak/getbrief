import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { scanFiles } from "../lib/scan.mjs";
import { trackerCommand } from "../lib/commands/tracker.mjs";
import { readTracker, writeTracker } from "../lib/tracker.mjs";
import { migrateRecordAuthority, recordFiles } from "../lib/records.mjs";

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
  it("preserves research IDs when an earlier-sorting unnumbered file is added", () => {
    put("documentation/research/z-study.md", "# Existing study\n");
    writeTracker(root, [{ id: "RES-007", type: "research", title: "Existing study", status: "in_review", custom: { owner: "keep" } }]);
    put("documentation/research/a-new.md", "# New study\n");
    trackerCommand(root, "generate", [], []);
    let items = readTracker(root);
    assert.equal(items.find(item => item.title === "Existing study").id, "RES-007");
    assert.equal(items.find(item => item.title === "Existing study").status, "in_review");
    assert.equal(items.find(item => item.title === "New study").id, "RES-008");
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 2);
    items = readTracker(root);
    assert.deepEqual(items.find(item => item.id === "RES-007").custom, { owner: "keep" });
  });
  it("refuses ambiguous research title mappings without rewriting metadata", () => {
    put("documentation/research/one.md", "# Same study\n");
    put("documentation/research/two.md", "# Same study\n");
    writeTracker(root, [{ id: "RES-001", type: "research", title: "Same study", status: "active" }]);
    const before = readFileSync(join(root, "documentation/tracker.yaml"), "utf8");
    assert.throws(() => trackerCommand(root, "generate", [], []), /Ambiguous.*RES-001/);
    assert.throws(() => migrateRecordAuthority(root), /Ambiguous.*RES-001/);
    assert.equal(readFileSync(join(root, "documentation/tracker.yaml"), "utf8"), before);
  });
  it("retains flat legacy research beside canonical research without reassigning IDs", () => {
    put("documentation/RES-001-flat.md", "# RES-001: Flat study\n\n**Status:** planned\n");
    put("documentation/research/canonical.md", "# Canonical study\n");
    writeTracker(root, [{ id: "RES-001", type: "research", title: "Flat study", status: "planned", custom: true }]);
    trackerCommand(root, "generate", [], []);
    const items = readTracker(root);
    assert.equal(items.length, 2);
    assert.equal(items.find(item => item.id === "RES-001").custom, true);
    assert.equal(items.find(item => item.title === "Canonical study").id, "RES-002");
  });
  it("still refuses research missing from both canonical and flat locations", () => {
    put("documentation/research/new.md", "# New study\n");
    writeTracker(root, [{ id: "RES-001", type: "research", title: "Missing study", status: "planned" }]);
    const before = readFileSync(join(root, "documentation/tracker.yaml"), "utf8");
    assert.throws(() => trackerCommand(root, "generate", [], []), /missing from scan.*RES-001/);
    assert.equal(readFileSync(join(root, "documentation/tracker.yaml"), "utf8"), before);
  });
  it("prefers an explicit flat research ID over a new canonical file with the same title", () => {
    put("documentation/RES-010-flat.md", "# RES-010: Same study\n\n**Status:** planned\n");
    put("documentation/research/canonical.md", "# Same study\n\n**Status:** active\n");
    writeTracker(root, [{ id: "RES-010", type: "research", title: "Same study", status: "planned", custom: "flat" }]);
    trackerCommand(root, "generate", [], []);
    const items = readTracker(root);
    assert.equal(items.length, 2);
    assert.equal(items.find(item => item.id === "RES-010").status, "planned");
    assert.equal(items.find(item => item.id === "RES-010").custom, "flat");
    assert.equal(items.find(item => item.id === "RES-011").status, "active");
    assert.equal(items.find(item => item.id === "RES-011").custom, undefined);
  });
  it("reserves untracked flat research IDs during first regeneration", () => {
    put("documentation/research/RES-010-study.md", "# Declared study\n");
    put("documentation/research/new.md", "# New study\n");
    put("documentation/RES-011-flat.md", "# RES-011: Flat study\n");
    trackerCommand(root, "generate", [], []);
    const items = readTracker(root);
    assert.equal(items.length, 3);
    assert.equal(items.find(item => item.title === "Declared study").id, "RES-010");
    assert.equal(items.find(item => item.title === "New study").id, "RES-012");
    assert.equal(items.find(item => item.title === "Flat study").id, "RES-011");
  });
  it("reserves declared research IDs and refuses conflicting filename/frontmatter identities", () => {
    put("documentation/research/RES-010-study.md", "# Declared study\n");
    put("documentation/research/a-new.md", "# New study\n");
    assert.equal(scanFiles(root).find(item => item.title === "New study").id, "RES-011");
    put("documentation/research/RES-010-study.md", "---\nid: RES-009\n---\n# Declared study\n");
    assert.throws(() => scanFiles(root), /Conflicting research identity/);
  });
  it("preserves explicitly labeled feature epic overviews outside the record inventory", () => {
    const file = "documentation/stories/web/story.md", overview = "# Epic: Web (S-011)\n\n## Stories\nChild stories live below.\n";
    put(file, overview);
    put("documentation/stories/web/S-001/story.md", "# S-001: Child\n\n**Status:** in_review\n");
    trackerCommand(root, "generate", [], []);
    assert.equal(recordFiles(root).length, 1);
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
    assert.equal(readFileSync(join(root, file), "utf8"), overview);
    put(file, "# S-011: Real record\n\n# Epic: section example\n");
    assert.equal(recordFiles(root).length, 2);
  });
  it("preserves descriptive statuses without inferring progress and reads quoted memory statuses", () => {
    put("documentation/stories/web/S-001/story.md", "# S-001: Child\n\n**Status:** implemented (pending review)\n");
    put("documentation/decisions/DEC-001-choice.md", "# DEC-001: Choice\n\n**Status:** 🔒 Decided\n");
    put("documentation/memory/choice.md", '---\nname: choice\nstatus: "retired"\n---\n');
    assert.equal(scanFiles(root).find(item => item.id === "choice").status, "retired");
    trackerCommand(root, "generate", [], []);
    assert.equal(readTracker(root).find(item => item.id === "S-001").status, "implemented (pending review)");
    assert.equal(readTracker(root).find(item => item.id === "DEC-001").status, "🔒 Decided");
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 3);
    assert.equal(readTracker(root).find(item => item.id === "S-001").status, "implemented (pending review)");
  });
  it("migrates explicitly registered feature-level epic records", () => {
    const story = "documentation/stories/web/story.md", body = "# Epic: Web\n\n**Status:** planned\n";
    put(story, body);
    writeTracker(root, [{ id: "S-010", type: "story", title: "Web", status: "planned", story }]);
    assert.equal(migrateRecordAuthority(root).records, 1);
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
    assert.equal(readTracker(root)[0].id, "S-010");
    assert.ok(readFileSync(join(root, story), "utf8").endsWith(body));
  });
  for (const [visible, stored] of [["Accepted (Option A)", "active"], ["in_review (blocked)", "in_review (approved)"]]) {
    for (const frontmatter of [false, true]) it(`rejects differing full statuses: ${visible} / ${stored}, YAML=${frontmatter}`, () => {
      const file = "documentation/decisions/DEC-001-choice.md";
      put(file, frontmatter ? `---\nstatus: ${visible}\n---\n# Choice\n` : `# Choice\n\n**Status:** ${visible}\n`);
      writeTracker(root, [{ id: "DEC-001", type: "decision", title: "Choice", status: stored }]);
      const before = readFileSync(join(root, file), "utf8");
      assert.throws(() => migrateRecordAuthority(root, { apply: true }), /Conflicting (visible )?status/);
      assert.equal(readFileSync(join(root, file), "utf8"), before);
      trackerCommand(root, "generate", [], []);
      assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
      assert.equal(readTracker(root)[0].status, visible);
    });
  }

  it("retains a deferred decision instead of reactivating it", () => {
    put("documentation/todo/TODO-014.md", "---\nid: TODO-014\ntitle: Keep generator\nstatus: deferred\n---\nKeep for later.\n");
    assert.equal(scanFiles(root)[0].status, "deferred");
  });
  for (const label of ["**Status:**", "**Status**:"]) it(`preserves descriptive research ${label} through regeneration and migration`, () => {
    const file = "documentation/research/gap-analysis.md";
    const status = "Not yet implemented. Must be added before matching algorithm goes live.";
    const body = `# Gap analysis\n\n${label} ${status}\n\n## Component\n**Status:** completed\n`;
    put(file, body);
    writeTracker(root, [{ id: "RES-003", type: "research", title: "Gap analysis", status: "active" }]);
    assert.throws(() => migrateRecordAuthority(root), /Conflicting visible status/);
    trackerCommand(root, "generate", [], ["--markdown"]);
    assert.equal(readTracker(root)[0].status, status);
    assert.equal(migrateRecordAuthority(root, { apply: true }).records, 1);
    assert.equal(readTracker(root)[0].status, status);
    assert.ok(readFileSync(join(root, file), "utf8").endsWith(body));
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
