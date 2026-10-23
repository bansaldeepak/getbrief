import { it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { initProject } from "../lib/init.mjs";
import { planWorkflow, applyWorkflow, inspectWorkflow, WORKFLOW_DIR } from "../lib/workflow-package.mjs";
import { readTracker } from "../lib/tracker.mjs";
import { verifyRecords } from "../lib/verify-records.mjs";

it("combines lifecycle controls, portable Git clones and independent agent work", async () => {
  const dir = mkdtempSync(join(tmpdir(), "brief-combined-")), project = join(dir, "project"), home = join(dir, "home"), clone = join(dir, "clone");
  const env = { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" };
  const cli = resolve("cli.mjs");
  function git(root, ...args) { return execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  function run(root, ...args) { return execFileSync(process.execPath, [cli, "--root", root, ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  function commit(root, title) { git(root, "add", "."); git(root, "commit", "-m", title); }
  mkdirSync(project); mkdirSync(home);
  try {
    applyWorkflow(planWorkflow(home, { scope: "global" }));
    git(project, "init", "-q");
    await initProject(project, { source: join(home, WORKFLOW_DIR), nonInteractive: true, skipCodegraph: true });
    commit(project, "pinned workflow"); const base = git(project, "rev-parse", "HEAD");
    git(dir, "clone", "-q", project, clone);
    for (const [root, feature] of [[project, "checkout"], [clone, "billing"]]) {
      run(root, "story", "create", feature, `--feature=${feature}`, "--body=Approved scope");
      run(root, "story", "task", "create", `${feature}/S-001`, "Implement", "--body=Acceptance checks");
      run(root, "story", "task", "update", `${feature}/S-001-T1`, "status=done");
      run(root, "log", "add", `${feature} session done`, `--session=${feature}`, "--agent=test", `--story=${feature}/S-001`);
      commit(root, feature);
    }
    git(clone, "fetch", project, "HEAD"); git(clone, "merge", "--no-edit", "FETCH_HEAD");
    rmSync(home, { recursive: true }); rmSync(project, { recursive: true });
    assert.equal(inspectWorkflow(clone).healthy, true);
    assert.equal(readTracker(clone).length, 2);
    assert.equal(readdirSync(join(clone, "documentation/logs")).length, 2);
    assert.deepEqual(verifyRecords(clone, { base }).errors, []);
    assert.equal(git(clone, "ls-files", "documentation/tracker.yaml", "documentation/PROJECT-TRACKER.md"), "");
    const implement = readFileSync(join(clone, ".agents/skills/brief/implement/SKILL.md"), "utf8");
    assert.match(implement, /strict/); assert.match(implement, /selective/); assert.match(implement, /auto/); assert.match(implement, /Ambiguity/);
    assert.match(implement, /No push or PR without explicit approval/);
    const review = readFileSync(join(clone, ".agents/skills/brief/pr-review/SKILL.md"), "utf8");
    assert.match(review, /Introduced\/worsened, every severity/);
    const retro = readFileSync(join(clone, ".agents/skills/brief/retro/SKILL.md"), "utf8");
    assert.match(retro, /before final/);
    execFileSync("python3", [resolve("scripts/check-references.py"), "--root", join(clone, WORKFLOW_DIR)], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
