import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, symlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { collectWorkflow, installWorkflow, resolveWorkflowSource, planWorkflow, applyWorkflow, inspectWorkflow, CLI_SOURCE, WORKFLOW_DIR, WORKFLOW_MANIFEST } from "../lib/workflow-package.mjs";
import { initProject } from "../lib/init.mjs";
import { installCommand } from "../lib/commands/install.mjs";

describe("CLI-only installation and source selection", () => {
  let dir, home, project, source;
  function put(root, file, text) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); }
  function manifest(root) { return JSON.parse(readFileSync(join(root, WORKFLOW_MANIFEST), "utf8")); }
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "brief-install-sources-"));
    home = join(dir, "home"); project = join(dir, "project"); source = join(dir, "source");
    for (const root of [home, project, source]) mkdirSync(root);
    for (const [file, text] of Object.entries(collectWorkflow().files)) put(source, file, text);
    put(source, "package.json", '{"version":"9.0.0-test"}\n');
    put(source, "skills/brief/source-test.md", "Local development fixture.\n");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("installs from CLI assets without a source and preserves the pinned home package", () => {
    const preview = installWorkflow({ home, dryRun: true });
    assert.equal(preview.dryRun, true); assert.deepEqual(readdirSync(home), []);
    const installed = installWorkflow({ home });
    assert.equal(installed.created, true);
    assert.equal(manifest(home).digest, collectWorkflow(CLI_SOURCE).digest);
    assert.equal(inspectWorkflow(home).healthy, true);
    const before = readFileSync(join(home, WORKFLOW_MANIFEST), "utf8");
    assert.equal(installWorkflow({ home, source }).pinned, true);
    assert.equal(readFileSync(join(home, WORKFLOW_MANIFEST), "utf8"), before);
    assert.equal(existsSync(join(home, ".claude.json")), false);
  });
  it("uses a directory symlink override and then copies the home package into projects by default", async () => {
    const link = join(dir, "linked-source"); symlinkSync(source, link);
    installCommand([`--source=${link}`], { home });
    assert.equal(manifest(home).version, "9.0.0-test");
    await initProject(project, { home, scope: "local", nonInteractive: true, skipCodegraph: true });
    assert.equal(manifest(project).digest, manifest(home).digest);
    assert.ok(existsSync(join(project, WORKFLOW_DIR, "skills/brief/source-test.md")));
    assert.equal(resolveWorkflowSource({ home, global: true }), CLI_SOURCE);
    assert.equal(resolveWorkflowSource({ home }), join(home, WORKFLOW_DIR));
  });
  it("uses CLI assets when no home package exists and explicit source overrides the home default", async () => {
    await initProject(project, { home, scope: "local", nonInteractive: true, skipCodegraph: true });
    assert.equal(manifest(project).digest, collectWorkflow(CLI_SOURCE).digest);
    installWorkflow({ home });
    const other = join(dir, "override-project"); mkdirSync(other);
    await initProject(other, { source, home, scope: "local", nonInteractive: true, skipCodegraph: true });
    assert.equal(manifest(other).version, "9.0.0-test");
    const before = manifest(project).digest;
    applyWorkflow(planWorkflow(home, { scope: "global", source }));
    assert.equal(manifest(project).digest, before);
    const update = planWorkflow(project, { source: resolveWorkflowSource({ home }) });
    assert.equal(update.available, true); applyWorkflow(update);
    assert.equal(manifest(project).digest, manifest(home).digest);
  });
  it("reads checkout assets even if the source checkout also has a pinned project bundle", () => {
    put(source, WORKFLOW_MANIFEST, JSON.stringify({ version: "old" }));
    assert.equal(collectWorkflow(source).version, "9.0.0-test");
  });
  it("records only a source checkout revision, never a containing consumer repository revision", () => {
    function commit(root) {
      execFileSync("git", ["init", "-q", root]);
      execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "fixture"], { stdio: "pipe" });
      return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    }
    commit(dir);
    assert.equal(collectWorkflow(source).revision, null);
    const revision = commit(source);
    assert.equal(collectWorkflow(source).revision, revision);
  });
  it("refuses an interrupted home or explicit package source before creating project files", async () => {
    installWorkflow({ home });
    put(home, ".brief/workflow-transaction.json", JSON.stringify({ schema: 1, changes: [] }));
    const link = join(dir, "linked-home-package"); symlinkSync(join(home, WORKFLOW_DIR), link);
    for (const options of [{}, { source: home }, { source: join(home, WORKFLOW_DIR) }, { source: link }]) {
      await assert.rejects(initProject(project, { ...options, home, scope: "local", nonInteractive: true, skipCodegraph: true }), /Incomplete workflow transaction/);
      assert.deepEqual(readdirSync(project), []);
    }
  });
  it("rejects unsupported URLs and removed MCP flags without writes", () => {
    assert.throws(() => installCommand(["--source=https://example.test/brief"], { home }), /local directory/);
    assert.throws(() => installCommand(["--write"], { home }), /CLI-only/);
    assert.throws(() => installCommand(["--mcp"], { home }), /CLI-only/);
    assert.deepEqual(readdirSync(home), []);
  });
});
