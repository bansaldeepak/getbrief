import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  joinProject, leaveProject, getRepoProjects, shareItem, updateActiveWork,
  readSharedContext, readSharedContextForPhase, searchSharedSpace, listProjects,
  projectStatus, syncSharedToRepo, cleanupResolved, ensureProjectsDir, slugify,
} from "../lib/project.mjs";

describe("project.mjs", () => {
  let tmp, home, repoA, repoB;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-project-"));
    home = join(tmp, "home");
    repoA = join(tmp, "api");
    repoB = join(tmp, "web");
    for (const dir of [home, repoA, repoB]) mkdirSync(dir);
  });

  afterEach(() => rmSync(tmp, { recursive: true }));

  it("join auto-creates the project with manifest and folders", () => {
    const { created } = joinProject(repoA, "my-app", { home });
    const dir = join(home, ".brief/projects/my-app");
    assert.equal(created, true);
    for (const sub of ["requirements", "decisions", "memory", "active"]) assert.ok(existsSync(join(dir, sub)));
    assert.match(readFileSync(join(dir, "manifest.md"), "utf8"), /name: api/);
  });

  it("join writes .brief/project.json in the repo", () => {
    joinProject(repoA, "my-app", { home });
    assert.deepEqual(getRepoProjects(repoA), ["my-app"]);
  });

  it("join is idempotent", () => {
    joinProject(repoA, "my-app", { home });
    const second = joinProject(repoA, "my-app", { home });
    assert.equal(second.created, false);
    assert.deepEqual(getRepoProjects(repoA), ["my-app"]);
    const manifest = readFileSync(join(home, ".brief/projects/my-app/manifest.md"), "utf8");
    assert.equal(manifest.match(/name: api/g).length, 1);
  });

  it("a repo can join several projects", () => {
    joinProject(repoA, "one", { home });
    joinProject(repoA, "two", { home });
    assert.deepEqual(getRepoProjects(repoA), ["one", "two"]);
  });

  it("rejects project names that could escape the folder", () => {
    assert.throws(() => joinProject(repoA, "../evil", { home }), /Invalid project name/);
    assert.throws(() => joinProject(repoA, "A b", { home }), /Invalid project name/);
  });

  it("leave removes the repo from project.json and manifest", () => {
    joinProject(repoA, "my-app", { home });
    joinProject(repoB, "my-app", { home });
    leaveProject(repoA, "my-app", { home });
    assert.deepEqual(getRepoProjects(repoA), []);
    const manifest = readFileSync(join(home, ".brief/projects/my-app/manifest.md"), "utf8");
    assert.doesNotMatch(manifest, /name: api/);
    assert.match(manifest, /name: web/);
  });

  it("leave fails when the repo never joined", () => {
    assert.throws(() => leaveProject(repoA, "my-app", { home }), /not in project/);
  });

  it("shareItem writes a slugged Markdown file with frontmatter", () => {
    joinProject(repoA, "my-app", { home });
    const path = shareItem("my-app", "decision", "Use JWT tokens", "All services validate JWT.", "api", { home });
    assert.ok(path.endsWith("decisions/use-jwt-tokens.md"));
    const text = readFileSync(path, "utf8");
    assert.match(text, /source_repo: api/);
    assert.match(text, /status: active/);
    assert.match(text, /All services validate JWT/);
  });

  it("shareItem keeps created date when the same title is shared again", () => {
    joinProject(repoA, "my-app", { home });
    const path = shareItem("my-app", "decision", "Use JWT", "v1", "api", { home });
    const text = readFileSync(path, "utf8").replace(/created: .*/, "created: 2020-01-01");
    writeFileSync(path, text);
    shareItem("my-app", "decision", "Use JWT", "v2", "api", { home });
    const next = readFileSync(path, "utf8");
    assert.match(next, /created: 2020-01-01/);
    assert.match(next, /v2/);
  });

  it("shareItem rejects unknown type and missing project", () => {
    joinProject(repoA, "my-app", { home });
    assert.throws(() => shareItem("my-app", "chat", "x", "", "api", { home }), /Unknown type/);
    assert.throws(() => shareItem("nope", "memory", "x", "", "api", { home }), /does not exist/);
  });

  it("another repo reads what the first repo shared", () => {
    joinProject(repoA, "my-app", { home });
    joinProject(repoB, "my-app", { home });
    shareItem("my-app", "requirement", "Auth contract", "POST /token returns JWT", "api", { home });
    const context = readSharedContextForPhase(repoB, { home });
    assert.match(context, /Auth contract/);
    assert.match(context, /POST \/token returns JWT/);
  });

  it("phase read returns empty text when the repo joined nothing", () => {
    assert.equal(readSharedContextForPhase(repoA, { home }), "");
  });

  it("phase read does not throw when project.json is broken", () => {
    mkdirSync(join(repoA, ".brief"));
    writeFileSync(join(repoA, ".brief/project.json"), "{ not json");
    assert.equal(readSharedContextForPhase(repoA, { home }), "");
  });

  it("active work is one file per repo and story", () => {
    joinProject(repoA, "my-app", { home });
    const path = updateActiveWork("my-app", "api", "S-001", "OAuth2", "Adding endpoints", { home });
    assert.ok(path.endsWith("active/api_s-001.md"));
    assert.match(readSharedContext("my-app", { home }), /active: api S-001 — OAuth2/);
  });

  it("resolved items are hidden from context", () => {
    joinProject(repoA, "my-app", { home });
    shareItem("my-app", "decision", "Old choice", "gone", "api", { home, status: "resolved" });
    assert.equal(readSharedContext("my-app", { home }), "");
  });

  it("search finds shared items by all terms", () => {
    joinProject(repoA, "my-app", { home });
    shareItem("my-app", "decision", "Use JWT tokens", "shared secret", "api", { home });
    assert.equal(searchSharedSpace("my-app", "jwt secret", { home }).length, 1);
    assert.equal(searchSharedSpace("my-app", "jwt banana", { home }).length, 0);
  });

  it("listProjects shows member counts", () => {
    joinProject(repoA, "one", { home });
    joinProject(repoB, "one", { home });
    assert.deepEqual(listProjects({ home }), [{ name: "one", repos: 2 }]);
  });

  it("listProjects is empty when ~/.brief/projects is missing", () => {
    assert.deepEqual(listProjects({ home }), []);
  });

  it("status warns about stale items and missing repo paths", () => {
    joinProject(repoA, "my-app", { home });
    const path = shareItem("my-app", "memory", "Old note", "x", "api", { home });
    writeFileSync(path, readFileSync(path, "utf8").replace(/updated: .*/, "updated: 2020-01-01"));
    rmSync(repoA, { recursive: true });
    const status = projectStatus("my-app", { home });
    assert.ok(status.warnings.some((w) => w.startsWith("Stale")));
    assert.ok(status.warnings.some((w) => w.startsWith("Repo path missing")));
    assert.equal(status.repos[0].reachable, false);
  });

  it("status does not warn for fresh items", () => {
    joinProject(repoA, "my-app", { home });
    shareItem("my-app", "memory", "Fresh note", "x", "api", { home });
    assert.deepEqual(projectStatus("my-app", { home }).warnings, []);
  });

  it("sync copies shared items into repo memory and is repeatable", () => {
    joinProject(repoA, "my-app", { home });
    shareItem("my-app", "decision", "Use JWT", "details", "api", { home, status: "resolved" });
    const first = syncSharedToRepo("my-app", repoB, { home });
    const second = syncSharedToRepo("my-app", repoB, { home });
    assert.deepEqual(first, ["documentation/memory/shared-my-app-use-jwt.md"]);
    assert.deepEqual(second, first);
    const text = readFileSync(join(repoB, first[0]), "utf8");
    assert.match(text, /details/);
    assert.match(text, /Synced from shared decision/);
  });

  it("cleanup removes resolved items and done work, keeps the rest", () => {
    joinProject(repoA, "my-app", { home });
    shareItem("my-app", "decision", "Done choice", "x", "api", { home, status: "resolved" });
    shareItem("my-app", "decision", "Live choice", "y", "api", { home });
    updateActiveWork("my-app", "api", "S-001", "Finished", "z", { home, status: "done" });
    const removed = cleanupResolved("my-app", { home });
    assert.deepEqual(removed.sort(), ["active/api_s-001.md", "decisions/done-choice.md"]);
    assert.ok(existsSync(join(home, ".brief/projects/my-app/decisions/live-choice.md")));
  });

  it("ensureProjectsDir creates the folder once", () => {
    assert.equal(ensureProjectsDir({ home }), true);
    assert.equal(ensureProjectsDir({ home }), false);
  });

  it("slugify rejects empty results", () => {
    assert.equal(slugify("Hello, World!"), "hello-world");
    assert.throws(() => slugify("!!!"), /Cannot make a name/);
  });
});

describe("project-aware search and init", () => {
  let tmp, home, repo;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-project-search-"));
    home = join(tmp, "home");
    repo = join(tmp, "api");
    mkdirSync(home);
    mkdirSync(repo);
  });

  afterEach(() => rmSync(tmp, { recursive: true }));

  it("searchFiles includes shared items from joined projects", async () => {
    const { searchFiles } = await import("../lib/search.mjs");
    joinProject(repo, "my-app", { home });
    shareItem("my-app", "decision", "Use JWT tokens", "shared secret", "web", { home });
    const results = searchFiles(repo, "jwt", { home });
    assert.ok(results.some((r) => r.type === "shared" && r.brief === "Use JWT tokens"));
  });

  it("searchFiles finds no shared items when the repo joined nothing", async () => {
    const { searchFiles } = await import("../lib/search.mjs");
    joinProject(join(tmp, "other"), "my-app", { home });
    assert.equal(searchFiles(repo, "jwt", { home }).filter((r) => r.type === "shared").length, 0);
  });

  it("init creates ~/.brief/projects in the home", async () => {
    const { initProject } = await import("../lib/init.mjs");
    const { execSync } = await import("node:child_process");
    execSync("git init", { cwd: repo, stdio: "pipe" });
    const { created } = await initProject(repo, { nonInteractive: true, skipCodegraph: true, home });
    assert.ok(existsSync(join(home, ".brief/projects")));
    assert.ok(created.includes("~/.brief/projects/"));
  });
});
