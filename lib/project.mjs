// Project-scoped shared workspace — ~/.brief/projects/<name>/
// Pure Markdown files shared by repos on one machine. No database, no daemon.
// Every function takes an optional { home } so tests never touch the real ~/.brief.

import { existsSync, readFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { homedir } from "node:os";
import { stringify } from "yaml";
import { atomicText, splitRecord, recordMode, readRecordItems, createRecordText, createExclusive, updateRecord } from "./records.mjs";

export const ITEM_TYPES = { requirement: "requirements", decision: "decisions", memory: "memory" };
export const STALE_DAYS = 7;
const SPACE_DIRS = [...Object.values(ITEM_TYPES), "active"];
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const RESOLVED_STATUSES = ["resolved", "done"];

// --- Paths ---

export function projectsDir(home = homedir()) {
  return join(home, ".brief", "projects");
}

export function ensureProjectsDir({ home = homedir() } = {}) {
  const dir = projectsDir(home);
  const existed = existsSync(dir);
  mkdirSync(dir, { recursive: true });
  return !existed;
}

function assertName(name) {
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw new Error(`Invalid project name "${name}" — use lowercase letters, digits and dashes`);
  }
}

function projectPath(name, home) {
  assertName(name);
  return join(projectsDir(home), name);
}

export function slugify(text) {
  const slug = String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) throw new Error(`Cannot make a name from "${text}"`);
  return slug.slice(0, 60).replace(/-$/, "");
}

const today = () => new Date().toISOString().slice(0, 10);
const frontmatter = (data) => `---\n${stringify(data)}---\n`;

function readDoc(path) {
  return splitRecord(readFileSync(path, "utf8"), path);
}

function markdownFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : [];
}

// --- Repo registration (.brief/project.json) ---

export function getRepoProjects(repoRoot) {
  const path = join(repoRoot, ".brief", "project.json");
  if (!existsSync(path)) return [];
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid .brief/project.json: ${error.message}`);
  }
  return Array.isArray(data?.projects) ? data.projects : [];
}

function writeRepoProjects(repoRoot, projects, joinedAt) {
  const path = join(repoRoot, ".brief", "project.json");
  atomicText(path, JSON.stringify({ projects, joined_at: joinedAt }, null, 2) + "\n");
}

function readJoinedAt(repoRoot) {
  const path = join(repoRoot, ".brief", "project.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")).joined_at ?? {};
}

function readManifest(dir) {
  const path = join(dir, "manifest.md");
  if (!existsSync(path)) return null;
  const { data, body } = readDoc(path);
  return { data: { ...data, repos: data.repos ?? [] }, body };
}

function writeManifest(dir, manifest) {
  atomicText(join(dir, "manifest.md"), frontmatter(manifest.data) + manifest.body);
}

export function joinProject(repoRoot, name, { home = homedir() } = {}) {
  const dir = projectPath(name, home);
  const created = !existsSync(dir);
  for (const sub of SPACE_DIRS) mkdirSync(join(dir, sub), { recursive: true });
  const manifest = readManifest(dir) ?? {
    data: { name, created: today(), repos: [] },
    body: `\n# ${name}\n\nShared workspace for repos in this project.\n`,
  };
  const absRoot = resolve(repoRoot);
  const repoName = basename(absRoot);
  if (!manifest.data.repos.some((r) => r.path === absRoot)) {
    manifest.data.repos.push({ path: absRoot, name: repoName, joined: today() });
  }
  writeManifest(dir, manifest);
  const projects = getRepoProjects(repoRoot);
  if (!projects.includes(name)) projects.push(name);
  const joinedAt = readJoinedAt(repoRoot);
  joinedAt[name] ??= new Date().toISOString();
  writeRepoProjects(repoRoot, projects, joinedAt);
  return { created, repoName };
}

export function leaveProject(repoRoot, name, { home = homedir() } = {}) {
  assertName(name);
  const projects = getRepoProjects(repoRoot);
  if (!projects.includes(name)) throw new Error(`This repo is not in project "${name}"`);
  const dir = projectPath(name, home);
  const manifest = readManifest(dir);
  if (manifest) {
    const absRoot = resolve(repoRoot);
    manifest.data.repos = manifest.data.repos.filter((r) => r.path !== absRoot);
    writeManifest(dir, manifest);
  }
  const joinedAt = readJoinedAt(repoRoot);
  delete joinedAt[name];
  writeRepoProjects(repoRoot, projects.filter((p) => p !== name), joinedAt);
}

// --- Shared space write ---

function writeItem(path, front, body) {
  atomicText(path, frontmatter(front) + `\n${body.trim()}\n`);
}

export function shareItem(name, type, title, content, sourceRepo, { home = homedir(), status = "active" } = {}) {
  const sub = ITEM_TYPES[type];
  if (!sub) throw new Error(`Unknown type "${type}" — use ${Object.keys(ITEM_TYPES).join(", ")}`);
  if (!title) throw new Error("A title is required");
  const dir = projectPath(name, home);
  if (!existsSync(dir)) throw new Error(`Project "${name}" does not exist — run: brief project join ${name}`);
  const path = join(dir, sub, `${slugify(title)}.md`);
  const previous = existsSync(path) ? readDoc(path).data : null;
  const front = {
    title,
    type,
    created: previous?.created ?? today(),
    updated: today(),
    source_repo: sourceRepo,
    status,
  };
  writeItem(path, front, `# ${title}\n\n${content || ""}`);
  return path;
}

export function updateActiveWork(name, repoName, storyId, title, summary, { home = homedir(), status = "in_progress" } = {}) {
  const dir = projectPath(name, home);
  if (!existsSync(dir)) throw new Error(`Project "${name}" does not exist — run: brief project join ${name}`);
  const story = storyId || "general";
  const path = join(dir, "active", `${slugify(repoName)}_${slugify(story)}.md`);
  const front = { repo: repoName, story, title, status, updated: today() };
  writeItem(path, front, `# ${repoName} — ${story}: ${title}\n\n${summary || ""}`);
  return path;
}

// --- Shared space read ---

function readItems(name, sub, home) {
  const dir = join(projectPath(name, home), sub);
  return markdownFiles(dir).map((file) => {
    const { data, body } = readDoc(join(dir, file));
    return { file, path: join(dir, file), data, body: body.trim() };
  });
}

export function readActiveWork(name, { home = homedir() } = {}) {
  return readItems(name, "active", home);
}

export function readSharedContext(name, { home = homedir() } = {}) {
  assertName(name);
  if (!existsSync(projectPath(name, home))) return "";
  const parts = [];
  for (const [type, sub] of Object.entries(ITEM_TYPES)) {
    for (const item of readItems(name, sub, home)) {
      if (RESOLVED_STATUSES.includes(item.data.status)) continue;
      parts.push(`### ${type}: ${item.data.title ?? item.file} (from ${item.data.source_repo ?? "?"}, ${item.data.updated ?? "?"})\n\n${stripTitle(item.body)}`);
    }
  }
  for (const item of readItems(name, "active", home)) {
    if (RESOLVED_STATUSES.includes(item.data.status)) continue;
    parts.push(`### active: ${item.data.repo} ${item.data.story} — ${item.data.title} [${item.data.status}]\n\n${stripTitle(item.body)}`);
  }
  return parts.length ? `## Shared context: ${name}\n\n${parts.join("\n\n")}\n` : "";
}

function stripTitle(body) {
  return body.replace(/^# .*\n+/, "").trim();
}

// Phase entry: everything the repo's joined projects share, as one Markdown block.
// Shared context is additive — a broken project never blocks the phase.
export function readSharedContextForPhase(repoRoot, { home = homedir() } = {}) {
  let projects;
  try {
    projects = getRepoProjects(repoRoot);
  } catch {
    return "";
  }
  const blocks = [];
  for (const name of projects) {
    try {
      const block = readSharedContext(name, { home });
      if (block) blocks.push(block);
    } catch (error) {
      blocks.push(`Warning: could not read shared context for ${name}: ${error.message}\n`);
    }
  }
  return blocks.join("\n");
}

export function searchSharedSpace(name, query, { home = homedir() } = {}) {
  assertName(name);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  for (const sub of SPACE_DIRS) {
    for (const item of readItems(name, sub, home)) {
      const text = readFileSync(item.path, "utf8").toLowerCase();
      if (terms.every((term) => text.includes(term))) {
        results.push({ type: "shared", file: item.path, brief: item.data.title ?? item.file, status: item.data.status });
      }
    }
  }
  return results;
}

// --- Queries ---

export function listProjects({ home = homedir() } = {}) {
  const dir = projectsDir(home);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && NAME_RE.test(e.name))
    .map((e) => ({ name: e.name, repos: (readManifest(join(dir, e.name))?.data.repos ?? []).length }));
}

export function projectStatus(name, { home = homedir(), now = Date.now() } = {}) {
  const dir = projectPath(name, home);
  if (!existsSync(dir)) throw new Error(`Project "${name}" does not exist`);
  let manifest = null;
  const warnings = [];
  try {
    manifest = readManifest(dir);
  } catch {
    warnings.push(`Could not read project manifest for ${name}`);
  }
  const repos = (manifest?.data.repos ?? []).map((r) => ({ ...r, reachable: existsSync(r.path) }));
  for (const repo of repos) if (!repo.reachable) warnings.push(`Repo path missing: ${repo.path}`);
  const items = [];
  for (const sub of SPACE_DIRS) {
    for (const item of readItems(name, sub, home)) {
      const updated = Date.parse(item.data.updated);
      const stale = !RESOLVED_STATUSES.includes(item.data.status) && Number.isFinite(updated) && (now - updated) / 86400000 > STALE_DAYS;
      items.push({ dir: sub, file: item.file, title: item.data.title, status: item.data.status, updated: item.data.updated, stale });
      if (stale) warnings.push(`Stale (>${STALE_DAYS} days): ${sub}/${item.file}`);
    }
  }
  return { name, repos, items, warnings };
}

// --- Retro: sync back to repo memory, then clean up ---

// Copies shared requirements/decisions/memory into the repo's documentation/memory/.
// Re-running overwrites the same files, so sync is safe to repeat.
export function syncSharedToRepo(name, repoRoot, { home = homedir() } = {}) {
  assertName(name);
  const memoryDir = join(repoRoot, "documentation", "memory");
  const managed = recordMode(repoRoot);
  const existing = managed ? readRecordItems(repoRoot) : [];
  const synced = [];
  for (const [type, sub] of Object.entries(ITEM_TYPES)) {
    for (const item of readItems(name, sub, home)) {
      const slug = `shared-${name}-${basename(item.file, ".md")}`;
      const title = `Shared from project ${name}: ${item.data.title ?? slug}`;
      const text = `${item.body}\n\n_Synced from shared ${type} (${name}, source repo: ${item.data.source_repo ?? "?"})._`;
      const front = {
        name: slug,
        description: title,
        type: "project",
        created: item.data.created ?? today(),
        updated: today(),
        valid_until: "permanent",
        importance: 2,
      };
      const file = `documentation/memory/${slug}.md`;
      const path = join(memoryDir, `${slug}.md`);
      if (!managed) {
        atomicText(path, frontmatter(front) + `\n${text}\n`);
      } else if (existing.some((i) => i.id === slug)) {
        updateRecord(repoRoot, existing.find((i) => i.id === slug), {}, { body: text, frontmatter: { updated: today() } });
      } else {
        const record = { id: slug, type: "memory", title, status: "active", link: null, pr: null };
        createExclusive(path, createRecordText(frontmatter(front) + `\n${text}\n`, record));
      }
      synced.push(file);
    }
  }
  return synced;
}

// Removes resolved items and finished active summaries. Returns what was removed.
export function cleanupResolved(name, { home = homedir() } = {}) {
  assertName(name);
  const removed = [];
  for (const sub of SPACE_DIRS) {
    for (const item of readItems(name, sub, home)) {
      if (RESOLVED_STATUSES.includes(item.data.status)) {
        rmSync(item.path);
        removed.push(`${sub}/${item.file}`);
      }
    }
  }
  return removed;
}
