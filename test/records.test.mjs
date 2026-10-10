import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync, chmodSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { migrateRecordAuthority, rollbackRecordAuthority, readRecordItems, splitRecord, safeProjectPath, atomicText, createExclusive, createRecordText } from "../lib/records.mjs";
import { readTracker, writeTracker, writeTrackerView, generateMarkdown } from "../lib/tracker.mjs";
import { itemCommand } from "../lib/commands/item.mjs";
import { storyCommand } from "../lib/commands/story.mjs";

describe("canonical record authority", () => {
  let root, items, source;
  const story = "documentation/stories/cart/S-001/story.md";
  function put(file, text) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); }
  function get(file) { return readFileSync(join(root, file), "utf8"); }
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "brief-records-"));
    items = [
      { id: "S-001", type: "story", title: "Cart", status: "planned", story, current_task: "S-001-T1", extra: { nested: [null, false, "x"] }, pr: "#17" },
      { id: "choice", type: "memory", title: "Choice", status: "active", custom: ["preserve", 0] },
    ];
    put(story, "# S-001: Cart\n\n**Status**: planned\n**Branch**: feature/cart\n\n## Goal\nKeep body.\n");
    put("documentation/memory/choice.md", "---\nname: choice\ntype: feedback\nupdated: 2026-01-01\nvalid_until: permanent\n---\n\nUser choice.\n");
    put("documentation/tracker.yaml", stringify({ items }));
    source = new Map([story, "documentation/memory/choice.md", "documentation/tracker.yaml"].map(f => [f, get(f)]));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it("previews without writing then round-trips unknown metadata and legacy memory type", () => {
    assert.equal(migrateRecordAuthority(root).records, 2);
    assert.equal(existsSync(join(root, ".brief")), false);
    migrateRecordAuthority(root, { apply: true });
    const saved = splitRecord(get(story)).data._brief;
    assert.deepEqual({ ...saved.item, ...saved.legacy }, items[0]);
    assert.equal(splitRecord(get("documentation/memory/choice.md")).data.type, "feedback");
    assert.equal(readTracker(root).length, 2);
  });
  it("writes only changed records and rejects stale writes", () => {
    migrateRecordAuthority(root, { apply: true });
    const stale = readTracker(root), fresh = readTracker(root), memory = get("documentation/memory/choice.md");
    fresh.find(i => i.id === "S-001").status = "in_progress";
    writeTracker(root, fresh);
    assert.equal(get("documentation/tracker.yaml"), source.get("documentation/tracker.yaml"));
    assert.equal(get("documentation/memory/choice.md"), memory);
    assert.throws(() => writeTracker(root, stale), /changed since read/);
    assert.equal(readTracker(root).find(i => i.id === "S-001").status, "in_progress");
  });
  it("updates body/status atomically without losing frontmatter", async () => {
    migrateRecordAuthority(root, { apply: true });
    await storyCommand(root, "update", ["S-001", "status=done"], ["--body=## Goal\nUpdated."]);
    const parsed = splitRecord(get(story));
    assert.match(parsed.body, /^# S-001: Cart/);
    assert.match(parsed.body, /\*\*Status\*\*: done/);
    assert.match(parsed.body, /Updated/);
    assert.deepEqual(parsed.data._brief.item.extra, items[0].extra);
    await itemCommand(root, "memory", "update", ["choice", "updated=2026-10-10"], ["--body=New learning"]);
    assert.match(get("documentation/memory/choice.md"), /New learning/);
    assert.equal(readRecordItems(root).length, 2);
  });
  it("restores original bytes including generated views", () => {
    migrateRecordAuthority(root, { apply: true });
    writeTrackerView(root, readTracker(root)); generateMarkdown(root);
    rollbackRecordAuthority(root);
    for (const [file, text] of source) assert.equal(get(file), text);
    assert.equal(existsSync(join(root, ".brief/records.json")), false);
    assert.equal(existsSync(join(root, "documentation/PROJECT-TRACKER.md")), false);
  });
  it("refuses rollback over post-migration edits", () => {
    migrateRecordAuthority(root, { apply: true });
    put(story, get(story) + "Added later\n");
    assert.throws(() => rollbackRecordAuthority(root), /Post-migration edits/);
    assert.match(get(story), /Added later/);
  });
  it("blocks conflicting/missing records before mutation", () => {
    put(story, source.get(story).replace("planned", "done"));
    assert.throws(() => migrateRecordAuthority(root, { apply: true }), /Conflicting/);
    assert.equal(existsSync(join(root, ".brief/records.json")), false);
    rmSync(join(root, story));
    assert.throws(() => migrateRecordAuthority(root, { apply: true }), /ENOENT/);
  });
  it("preserves narrative memory status during migration and later updates", async () => {
    const file = "documentation/memory/choice.md";
    const body = "\n**Status:** Explicitly decided; implementation verified.\n\n## Notes\nKeep context.\n";
    put(file, get(file) + body);
    migrateRecordAuthority(root, { apply: true });
    const before = splitRecord(get(file)).body;
    await itemCommand(root, "memory", "update", ["choice", "status=retired"], []);
    assert.equal(splitRecord(get(file)).body, before);
    assert.equal(readTracker(root).find(i => i.id === "choice").status, "retired");
  });
  it("preserves section-local experiment status when research status changes", async () => {
    const file = "documentation/research/RES-001-notes.md";
    items.push({ id: "RES-001", type: "research", title: "Study", status: "open" });
    put("documentation/tracker.yaml", stringify({ items }));
    put(file, "---\nid: RES-001\ntitle: Study\nstatus: open\n---\n# Study\n\n## Experiment\n**Status**: Running (2026-08-20)\n");
    migrateRecordAuthority(root, { apply: true });
    const before = splitRecord(get(file)).body;
    await itemCommand(root, "research", "update", ["RES-001", "status=done"], []);
    assert.equal(splitRecord(get(file)).body, before);
    assert.equal(splitRecord(get(file)).data.status, "done");
    assert.equal(readTracker(root).find(i => i.id === "RES-001").status, "done");
  });
  it("reports real status conflicts with both values without changing records", () => {
    const file = "documentation/todo/TODO-014.md";
    items.push({ id: "TODO-014", type: "todo", title: "Keep", status: "active" });
    put("documentation/tracker.yaml", stringify({ items }));
    put(file, "---\nid: TODO-014\ntitle: Keep\nstatus: deferred\n---\nKeep this choice.\n");
    const before = get(file);
    assert.throws(() => migrateRecordAuthority(root), /TODO-014\.md: Markdown="deferred", metadata="active"/);
    assert.equal(get(file), before);
    assert.equal(existsSync(join(root, ".brief")), false);
    items.at(-1).status = "deferred";
    put("documentation/tracker.yaml", stringify({ items }));
    assert.equal(migrateRecordAuthority(root).records, 3);
  });
  it("still rejects conflicting record-header status even with frontmatter", () => {
    put(story, "---\nstatus: planned\n---\n" + source.get(story).replace("planned", "done"));
    assert.throws(() => migrateRecordAuthority(root), /Conflicting visible status/);
  });
  it("validates and updates indented or inline header status without changing adjacent fields", () => {
    for (const header of ["  **Status:** planned", "**Priority:** P1 | **Status:** planned | **Blocked By:** --"]) {
      const text = `# S-001: Cart\n\n${header}\n\n## Goal\nKeep body.\n`;
      put(story, text.replace("planned", "done"));
      assert.throws(() => migrateRecordAuthority(root), /Conflicting visible status/);
      put(story, text);
      migrateRecordAuthority(root, { apply: true });
      const fresh = readTracker(root);
      fresh.find(i => i.id === "S-001").status = "done";
      writeTracker(root, fresh);
      assert.equal(splitRecord(get(story)).body, text.replace("planned", "done"));
      // Read fresh metadata for the second write, then restore the migration inputs.
      const restored = readTracker(root);
      restored.find(i => i.id === "S-001").status = "planned";
      writeTracker(root, restored);
      rollbackRecordAuthority(root);
    }
  });
  it("detects duplicate identities, malformed metadata and interrupted transactions", () => {
    migrateRecordAuthority(root, { apply: true });
    put("documentation/stories/copy/S-001/story.md", get(story).replace(story, "documentation/stories/copy/S-001/story.md"));
    assert.throws(() => readTracker(root), /Duplicate record/);
    rmSync(join(root, "documentation/stories/copy"), { recursive: true });
    const journal = JSON.parse(get(".brief/records-migration.json")); journal.state = "pending";
    put(".brief/records-migration.json", JSON.stringify(journal));
    assert.throws(() => readTracker(root), /Incomplete record migration/);
    rollbackRecordAuthority(root);
  });
  it("blocks legacy mutations during an interruption before the authority marker exists", async () => {
    migrateRecordAuthority(root, { apply: true });
    const journal = JSON.parse(get(".brief/records-migration.json")); journal.state = "pending";
    put(".brief/records-migration.json", JSON.stringify(journal));
    rmSync(join(root, ".brief/records.json"));
    const before = get(story);
    assert.throws(() => readTracker(root), /Incomplete record migration/);
    await assert.rejects(storyCommand(root, "create", ["Late story"], ["--body=No"]), /Incomplete record migration/);
    assert.equal(get(story), before);
    rollbackRecordAuthority(root);
    for (const [file, text] of source) assert.equal(get(file), text);
  });
  it("rejects mappings outside scanner inventory and inconsistent canonical paths", () => {
    const outside = "documentation/legacy-story.md";
    put(outside, get(story)); rmSync(join(root, story));
    items[0].story = outside; put("documentation/tracker.yaml", stringify({ items }));
    assert.throws(() => migrateRecordAuthority(root, { apply: true }), /outside canonical inventory/);
    assert.equal(existsSync(join(root, ".brief")), false);
    put(story, get(outside)); rmSync(join(root, outside)); items[0].story = story;
    put("documentation/tracker.yaml", stringify({ items })); migrateRecordAuthority(root, { apply: true });
    put(story, get(story).replace(story, outside));
    assert.throws(() => readTracker(root), /canonical story path/);
  });
  it("accepts Setext headings while refusing real conflict blocks", () => {
    assert.equal(splitRecord("Heading\n=======\nText\n").body, "Heading\n=======\nText\n");
    assert.throws(() => splitRecord("<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> peer\n"), /merge markers/);
  });
  it("publishes complete managed records exclusively and preserves file modes", () => {
    const path = join(root, "exclusive.md");
    const text = createRecordText("# New\n", { id: "TODO-001", type: "todo", status: "open" });
    createExclusive(path, text);
    assert.ok(splitRecord(readFileSync(path, "utf8")).data._brief.record_id);
    assert.throws(() => createExclusive(path, "partial"), /EEXIST/);
    assert.equal(readFileSync(path, "utf8"), text);
    chmodSync(path, 0o664); const oldMask = process.umask(0o022);
    try { atomicText(path, text + "Updated\n"); } finally { process.umask(oldMask); }
    assert.equal(statSync(path).mode & 0o777, 0o664);
  });
  it("rejects dangling symlinks and path traversal", () => {
    symlinkSync(join(root, "absent"), join(root, "link"));
    assert.throws(() => safeProjectPath(root, "link/child"), /symlink/);
    assert.throws(() => safeProjectPath(root, "../elsewhere"), /Unsafe/);
  });
});
