import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync, readdirSync, readlinkSync, symlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { collectWorkflow, planWorkflow, applyWorkflow, inspectWorkflow, recoverWorkflow, updateNotice, WORKFLOW_DIR, WORKFLOW_MANIFEST } from "../lib/workflow-package.mjs";
import { initProject } from "../lib/init.mjs";
import { recordMode } from "../lib/records.mjs";

function put(root, file, content) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content); }
function bytes(root, file) { return readFileSync(join(root, file), "utf8"); }
describe("portable workflow packages", () => {
  let dir, root, home, source;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "brief-portable-"));
    for (const name of ["project", "home", "source"]) mkdirSync(join(dir, name));
    root = join(dir, "project"); home = join(dir, "home"); source = join(dir, "source");
    for (const [file, content] of Object.entries(collectWorkflow().files)) put(source, file, content);
    put(source, "package.json", '{"version":"1.0.0"}\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  it("previews without writes and produces a complete portable copy with relative registrations", () => {
    const plan = planWorkflow(root, { source });
    assert.deepEqual(readdirSync(root), []); assert.deepEqual(plan.conflicts, []);
    applyWorkflow(plan);
    assert.equal(inspectWorkflow(root).healthy, true);
    assert.equal(readlinkSync(join(root, ".codex/skills/brief")), "../../.brief/workflow/skills/brief");
    assert.ok(!bytes(root, WORKFLOW_MANIFEST).includes(source));
    assert.ok(!bytes(root, ".codex/agents/reviewer.toml").includes(source));
    const clone = join(dir, "clone"); cpSync(root, clone, { recursive: true, verbatimSymlinks: true });
    rmSync(root, { recursive: true }); rmSync(source, { recursive: true });
    assert.equal(inspectWorkflow(clone).healthy, true);
    assert.ok(existsSync(join(clone, ".agents/skills/brief/implement/SKILL.md")));
  });
  it("does not implicitly update on repeated init and creates fresh record authority", async () => {
    await initProject(root, { source, nonInteractive: true, skipCodegraph: true });
    assert.equal(recordMode(root), true);
    const old = bytes(root, `${WORKFLOW_DIR}/skills/brief/SKILL.md`);
    put(source, "skills/brief/SKILL.md", old + "\nAvailable revision\n");
    await initProject(root, { source, nonInteractive: true, skipCodegraph: true });
    assert.equal(bytes(root, `${WORKFLOW_DIR}/skills/brief/SKILL.md`), old);
    assert.match(updateNotice(root, { source, home }), /available/);
    updateNotice(root, { setting: "off" }); assert.equal(updateNotice(root, { source, home }), null);
    updateNotice(root, { setting: "on" }); assert.match(updateNotice(root, { source, home }), /available/);
    updateNotice(root, { setting: "snooze" }); assert.equal(updateNotice(root, { source, home }), null);
  });
  it("preserves project customizations and blocks conflicting upstream replacements", () => {
    put(root, "AGENTS.md", "Custom project rules\n");
    applyWorkflow(planWorkflow(root, { source }));
    const file = `${WORKFLOW_DIR}/skills/brief/SKILL.md`, upstream = bytes(source, "skills/brief/SKILL.md");
    put(root, file, upstream + "\nLocal convention\n");
    assert.deepEqual(planWorkflow(root, { source }).conflicts, []);
    put(source, "skills/brief/SKILL.md", upstream + "\nUpstream update\n");
    const plan = planWorkflow(root, { source });
    assert.match(plan.conflicts.join("\n"), /customized/); assert.throws(() => applyWorkflow(plan), /conflicts/);
    assert.match(bytes(root, file), /Local convention/); assert.match(bytes(root, "AGENTS.md"), /^Custom project rules/);
  });
  it("updates only the chosen scope and preserves surrounding instructions", () => {
    applyWorkflow(planWorkflow(home, { scope: "global", source }));
    applyWorkflow(planWorkflow(root, { source: join(home, WORKFLOW_DIR) }));
    const old = bytes(root, `${WORKFLOW_DIR}/skills/brief/SKILL.md`);
    put(source, "skills/brief/SKILL.md", old + "\nNew available code\n");
    applyWorkflow(planWorkflow(home, { scope: "global", source }));
    assert.equal(bytes(root, `${WORKFLOW_DIR}/skills/brief/SKILL.md`), old);
    const plan = planWorkflow(root, { source: join(home, WORKFLOW_DIR) });
    assert.equal(plan.available, true); applyWorkflow(plan);
    assert.match(bytes(root, `${WORKFLOW_DIR}/skills/brief/SKILL.md`), /New available code/);
    assert.equal(inspectWorkflow(home).healthy, true);
  });
  it("rejects foreign destinations and symlink escapes before scaffolding", async () => {
    put(root, ".agents/skills/brief/custom.md", "keep");
    await assert.rejects(initProject(root, { source, nonInteractive: true, skipCodegraph: true }), /Unowned directory/);
    assert.equal(existsSync(join(root, "documentation")), false);
    assert.equal(bytes(root, ".agents/skills/brief/custom.md"), "keep");
    rmSync(join(root, ".agents"), { recursive: true }); symlinkSync(home, join(root, ".agents"));
    await assert.rejects(initProject(root, { source, nonInteractive: true, skipCodegraph: true }), /symlink/);
    assert.deepEqual(readdirSync(home), []);
  });
  it("detects stale plans and restores interrupted transactions without losing later edits", () => {
    const plan = planWorkflow(root, { source });
    put(root, "AGENTS.md", "Late user edit\n");
    assert.throws(() => applyWorkflow(plan), /Changed since preflight/);
    const refreshed = planWorkflow(root, { source });
    const change = refreshed.changes[0];
    put(root, ".brief/workflow-transaction.json", JSON.stringify({ schema: 1, scope: "local", changes: refreshed.changes }));
    put(root, change.file, change.after.value);
    assert.equal(inspectWorkflow(root).healthy, false);
    put(root, change.file, "Later edit"); assert.throws(() => recoverWorkflow(root), /Later edits/);
    put(root, change.file, change.after.value); recoverWorkflow(root);
    assert.equal(existsSync(join(root, change.file)), false);
    assert.equal(bytes(root, "AGENTS.md"), "Late user edit\n");
  });
  it("keeps global-only project selection machine scoped", async () => {
    await initProject(root, { source, home, scope: "global", nonInteractive: true, skipCodegraph: true });
    assert.equal(existsSync(join(root, WORKFLOW_MANIFEST)), false);
    assert.ok(existsSync(join(home, WORKFLOW_MANIFEST)));
    assert.match(bytes(root, "AGENTS.md"), /~\/\.brief\/workflow/);
    assert.equal(JSON.parse(bytes(root, ".brief/install.json")).scope, "global");
  });
});
