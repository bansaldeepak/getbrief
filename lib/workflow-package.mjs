import { existsSync, lstatSync, readFileSync, writeFileSync, readdirSync, readlinkSync, realpathSync, mkdirSync, symlinkSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname, basename, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { atomicText, hashText, safeProjectPath } from "./records.mjs";

export const WORKFLOW_DIR = ".brief/workflow";
export const WORKFLOW_MANIFEST = `${WORKFLOW_DIR}/manifest.json`;
export const CLI_SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRANSACTION = ".brief/workflow-transaction.json";
const NOTICE = ".brief/update-state.json";
const OPEN = "<!-- brief:workflow -->", CLOSE = "<!-- /brief:workflow -->";
const AGENTS = ["qa", "reviewer", "researcher", "self-improving"];
const RULES = ["brief", "brief-lifecycle", "git-workflow", "db-safety"];

function json(text) { return JSON.stringify(text, null, 2) + "\n"; }
function readJson(path) { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null; }
function stat(path) { return lstatSync(path, { throwIfNoEntry: false }); }

// Local registrations may themselves be links; their parents must stay inside the project.
function destination(root, file, global = false) {
  if (!file || file.startsWith("/") || file.includes("\\") || file.split("/").includes("..")) throw new Error(`Unsafe workflow path: ${file}`);
  const path = resolve(root, file);
  if (!global) safeProjectPath(root, relative(root, dirname(path)) || ".");
  let ancestor = dirname(path);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = resolve(realpathSync(ancestor), relative(ancestor, path));
  const realRoot = realpathSync(root);
  if (!actual.startsWith(realRoot + sep)) throw new Error(`Workflow path escapes root: ${file}`);
  return path;
}
function snapshot(path) {
  const info = stat(path);
  if (!info) return null;
  if (info.isSymbolicLink()) return { kind: "link", value: readlinkSync(path) };
  if (!info.isFile()) throw new Error(`Unowned directory or special file: ${path}`);
  return { kind: "file", value: readFileSync(path, "utf8"), mode: info.mode & 0o777 };
}
function sameContent(a, b) { return (!a && !b) || (a?.kind === b?.kind && a?.value === b?.value); }
function fingerprint(value) { return value ? { kind: value.kind, sha256: hashText(value.value) } : null; }
function bounds(text) {
  const starts = text.split(OPEN).length - 1, ends = text.split(CLOSE).length - 1;
  if (!starts && !ends) return null;
  if (starts !== 1 || ends !== 1 || text.indexOf(CLOSE) < text.indexOf(OPEN)) throw new Error("Malformed workflow block; preserve and resolve it before installing");
  return [text.indexOf(OPEN), text.indexOf(CLOSE) + CLOSE.length];
}
function integrate(text, block) {
  const range = bounds(text);
  return range ? text.slice(0, range[0]) + block + text.slice(range[1]) : text + (text && !text.endsWith("\n") ? "\n\n" : "\n") + block + "\n";
}

export function readWorkflowManifest(root) {
  const path = safeProjectPath(root, WORKFLOW_MANIFEST);
  const manifest = readJson(path);
  if (!manifest) return null;
  if (manifest.schema !== 1 || !["local", "global"].includes(manifest.scope) || !manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) throw new Error("Invalid workflow manifest");
  for (const [file, hash] of Object.entries(manifest.files)) {
    safeProjectPath(root, `${WORKFLOW_DIR}/${file}`);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid workflow hash: ${file}`);
  }
  return manifest;
}

export function collectWorkflow(source = CLI_SOURCE) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) throw new Error("--source must be a local directory or directory symlink. Clone or download the package first; URL sources are not fetched.");
  source = resolve(source);
  if (!existsSync(join(source, "skills/brief")) && existsSync(join(source, WORKFLOW_MANIFEST))) source = join(source, WORKFLOW_DIR);
  source = realpathSync(source);
  if (basename(source) === "workflow" && basename(dirname(source)) === ".brief") assertWorkflowReady(dirname(dirname(source)));
  const files = {};
  function collect(file) {
    const path = safeProjectPath(source, file), info = stat(path);
    if (!info) throw new Error(`Missing workflow source: ${file}`);
    if (info.isDirectory()) { for (const name of readdirSync(path).sort()) collect(`${file}/${name}`); }
    else if (info.isFile()) files[file] = readFileSync(path, "utf8");
    else throw new Error(`Invalid workflow source: ${file}`);
  }
  collect("skills/brief");
  for (const name of RULES) collect(`rules/${name}.md`);
  for (const name of AGENTS) collect(`agents/${name}.md`);
  for (const file of ["templates/WORKFLOW-ADAPTER.md", "scripts/gen-codex-agent.py", "scripts/install-workflow.py"]) collect(file);
  const provenance = readJson(join(source, "manifest.json"));
  const version = readJson(join(source, "package.json"))?.version || provenance?.version || "unknown";
  let revision = provenance?.revision || null;
  if (!provenance) {
    const repository = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: source, encoding: "utf8" });
    // An npm package inside a consumer's repository must not claim that project's revision.
    if (repository.status === 0 && realpathSync(repository.stdout.trim()) === source) {
      const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" });
      if (result.status === 0) revision = result.stdout.trim();
    }
  }
  const hashes = Object.fromEntries(Object.entries(files).map(([file, text]) => [file, hashText(text)]));
  return { source, files, hashes, version, revision, digest: hashText(json(hashes)) };
}

export function resolveWorkflowSource({ source, home = homedir(), global = false } = {}) {
  return source || (!global && existsSync(join(home, WORKFLOW_MANIFEST)) ? join(home, WORKFLOW_DIR) : CLI_SOURCE);
}

export function installWorkflow({ home = homedir(), source, dryRun = false } = {}) {
  assertWorkflowReady(home);
  const existing = readWorkflowManifest(home);
  if (existing) {
    if (existing.scope !== "global") throw new Error("The home workflow path contains a project-local package; preserve it and resolve the scope conflict before installing.");
    const result = inspectWorkflow(home);
    if (!result.healthy) throw new Error("Existing home package needs attention; run brief doctor in a global-scope project or brief update --global --dry-run to inspect it.");
    return { created: false, pinned: true, path: join(home, WORKFLOW_DIR), version: existing.version, dryRun };
  }
  const plan = planWorkflow(home, { scope: "global", source: resolveWorkflowSource({ source, home, global: true }) });
  if (plan.conflicts.length) throw new Error(`Workflow conflicts:\n${plan.conflicts.join("\n")}`);
  const preview = workflowPreview(plan, { diff: dryRun });
  if (!dryRun) applyWorkflow(plan);
  return { ...preview, created: !dryRun, path: join(home, WORKFLOW_DIR), dryRun };
}

function localRegistrations(candidate) {
  const result = {};
  for (const host of [".agents", ".claude", ".codex"]) result[`${host}/skills/brief`] = { kind: "link", value: `../../${WORKFLOW_DIR}/skills/brief` };
  for (const name of AGENTS) {
    for (const host of [".agents", ".claude"]) result[`${host}/agents/${name}.md`] = { kind: "link", value: `../../${WORKFLOW_DIR}/agents/${name}.md` };
    const value = execFileSync("python3", [join(candidate.source, "scripts/gen-codex-agent.py"), join(candidate.source, `agents/${name}.md`), "--label", `${WORKFLOW_DIR}/agents/${name}.md`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    result[`.codex/agents/${name}.toml`] = { kind: "file", value };
  }
  const block = `${OPEN}\n${candidate.files["templates/WORKFLOW-ADAPTER.md"].replaceAll("@BRIEF_SOURCE@", WORKFLOW_DIR).trimEnd()}\n\nThe tracked project bundle takes precedence over machine-global Brief skills.\n${CLOSE}`;
  for (const file of ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]) result[file] = { kind: "block", value: block };
  return result;
}

export function planWorkflow(root, { source = CLI_SOURCE, scope = "local" } = {}) {
  root = realpathSync(root);
  if (!["local", "global"].includes(scope)) throw new Error("Scope must be local or global");
  if (existsSync(safeProjectPath(root, TRANSACTION))) throw new Error("Incomplete workflow transaction; run brief update --recover");
  const previous = readWorkflowManifest(root), candidate = collectWorkflow(source), changes = [], conflicts = [];
  if (previous && previous.scope !== scope) throw new Error("Workflow scope mismatch; keep project and machine packages separate");
  const manifest = { schema: 1, scope, version: candidate.version, revision: candidate.revision, digest: candidate.digest, files: candidate.hashes, registrations: {} };
  function add(file, after, expected, { block = false, legacyLink = false } = {}) {
    let path, before;
    try { path = destination(root, file, scope === "global"); before = snapshot(path); }
    catch (error) { conflicts.push(`${file}: ${error.message}`); return; }
    if (block && before && before.kind !== "file") { conflicts.push(`${file}: expected a regular instruction file`); return; }
    let owned = !before, comparable = before;
    if (block && before) {
      let range;
      try { range = bounds(before.value); } catch (error) { conflicts.push(`${file}: ${error.message}`); return; }
      comparable = range ? { kind: "block", value: before.value.slice(...range) } : null;
      owned = !range;
    }
    if (expected && isDeepStrictEqual(fingerprint(comparable), expected)) owned = true;
    if (legacyLink && before?.kind === "link") {
      const oldManifest = readJson(join(root, ".brief/brief-manifest.json"));
      const known = oldManifest?.symlinks?.find(entry => entry.source === file && entry.target === before.value);
      if (known || resolve(dirname(path), before.value) === join(CLI_SOURCE, "skills/brief") || /[/\\]custom-skills[/\\]/.test(before.value)) owned = true;
    }
    if (sameContent(comparable, after)) return;
    // A customized managed file is retained when upstream has not changed it.
    if (before && expected && isDeepStrictEqual(fingerprint(after), expected)) return;
    if (!owned) { conflicts.push(`${file}: customized or unowned; preserve and resolve before updating`); return; }
    const final = block ? { kind: "file", value: integrate(before?.value || "", after.value) } : after;
    changes.push({ file, before, after: final });
  }
  for (const [file, text] of Object.entries(candidate.files)) add(`${WORKFLOW_DIR}/${file}`, { kind: "file", value: text }, previous?.files[file] ? { kind: "file", sha256: previous.files[file] } : null);
  for (const file of Object.keys(previous?.files || {})) if (!Object.hasOwn(candidate.files, file)) add(`${WORKFLOW_DIR}/${file}`, null, { kind: "file", sha256: previous.files[file] });
  if (scope === "local") {
    for (const [file, entry] of Object.entries(localRegistrations(candidate))) {
      add(file, entry, previous?.registrations?.[file], { block: entry.kind === "block", legacyLink: file.endsWith("/skills/brief") });
      manifest.registrations[file] = fingerprint(entry);
    }
    for (const host of [".agents", ".claude", ".codex"]) {
      const file = `${host}/.gitignore`, path = destination(root, file);
      const before = snapshot(path);
      if (before?.kind === "file") {
        const value = before.value.split(/(?<=\n)/).filter(line => !["skills/brief", "/skills/brief"].includes(line.trim())).join("");
        if (value !== before.value) changes.push({ file, before, after: { kind: "file", value } });
      }
    }
  } else {
    // Reuse the safe global installer's ownership/alias preflight; apply its plan in this transaction.
    const result = spawnSync("python3", [join(CLI_SOURCE, "scripts/install-workflow.py"), "--home-dir", root, "--source-dir", candidate.source, "--link-source", join(root, WORKFLOW_DIR), "--plan-json"], { encoding: "utf8" });
    if (!result.stdout?.trim()) throw new Error(result.stderr || "Global registration preflight failed");
    const globalPlan = JSON.parse(result.stdout);
    conflicts.push(...globalPlan.conflicts);
    for (const entry of globalPlan.plan) if (entry.change) {
      const before = snapshot(destination(root, entry.relative, true));
      changes.push({ file: entry.relative, before, after: { kind: entry.kind === "link" ? "link" : "file", value: entry.payload } });
    }
    const file = ".agents/brief-workflow.json", before = snapshot(destination(root, file, true)), after = { kind: "file", value: json(globalPlan.manifest) };
    if (!sameContent(before, after)) changes.push({ file, before, after });
  }
  const ignoreFile = ".brief/.gitignore", ignoreBefore = snapshot(destination(root, ignoreFile));
  if (ignoreBefore?.kind === "link") throw new Error("Refusing symlink ignore file");
  let ignore = ignoreBefore?.value || "";
  for (const entry of ["/workflow-transaction.json", "/update-state.json", "/brief-manifest.json"]) if (!ignore.split(/\r?\n/).includes(entry)) ignore += (ignore && !ignore.endsWith("\n") ? "\n" : "") + entry + "\n";
  if (ignore !== ignoreBefore?.value) changes.push({ file: ignoreFile, before: ignoreBefore, after: { kind: "file", value: ignore } });
  const before = snapshot(destination(root, WORKFLOW_MANIFEST)), after = { kind: "file", value: json(manifest) };
  // Provenance is published last. Content digest, not only version, determines available updates.
  if (!sameContent(before, after)) changes.push({ file: WORKFLOW_MANIFEST, before, after });
  return { root, scope, changes, conflicts, manifest, previous, available: !previous || previous.digest !== manifest.digest };
}

function snapshotMatches(current, expected) {
  return sameContent(current, expected) && (expected?.mode === undefined || current?.mode === expected.mode);
}
function writeSnapshot(path, value) {
  if (!value) { if (stat(path)) unlinkSync(path); return; }
  mkdirSync(dirname(path), { recursive: true });
  if (value.kind === "file") atomicText(path, value.value, { mode: value.mode });
  else if (value.kind === "link") {
    const temp = `${path}.${randomUUID()}.tmp`;
    try { symlinkSync(value.value, temp); renameSync(temp, path); }
    finally { if (stat(temp)) unlinkSync(temp); }
  } else throw new Error("Invalid transaction entry");
}

export function applyWorkflow(plan) {
  if (plan.conflicts.length) throw new Error(`Workflow conflicts:\n${plan.conflicts.join("\n")}`);
  if (!plan.changes.length) return { changed: [] };
  plan = { ...plan, changes: plan.changes.map(change => ({ ...change, after: change.after?.kind === "file" ? { ...change.after, mode: change.after.mode ?? change.before?.mode ?? (plan.scope === "global" ? 0o600 : 0o666 & ~process.umask()) } : change.after })) };
  const transaction = safeProjectPath(plan.root, TRANSACTION);
  if (existsSync(transaction)) throw new Error("Workflow transaction already exists; recover it first");
  for (const change of plan.changes) if (!isDeepStrictEqual(snapshot(destination(plan.root, change.file, plan.scope === "global")), change.before)) throw new Error(`Changed since preflight: ${change.file}`);
  mkdirSync(dirname(transaction), { recursive: true });
  writeFileSync(transaction, json({ schema: 1, scope: plan.scope, changes: plan.changes }), { flag: "wx", mode: 0o600 });
  for (const change of plan.changes) writeSnapshot(destination(plan.root, change.file, plan.scope === "global"), change.after);
  unlinkSync(transaction);
  return { changed: plan.changes.map(c => c.file) };
}

export function recoverWorkflow(root) {
  const path = safeProjectPath(root, TRANSACTION), journal = readJson(path);
  if (!journal || journal.schema !== 1 || !Array.isArray(journal.changes)) throw new Error("No valid workflow transaction to recover");
  for (const entry of journal.changes) {
    const current = snapshot(destination(root, entry.file, journal.scope === "global"));
    if (!snapshotMatches(current, entry.before) && !snapshotMatches(current, entry.after)) throw new Error(`Later edits prevent workflow recovery: ${entry.file}`);
  }
  for (const entry of [...journal.changes].reverse()) writeSnapshot(destination(root, entry.file, journal.scope === "global"), entry.before);
  unlinkSync(path);
  return { restored: journal.changes.length };
}

export function inspectWorkflow(root) {
  const checks = [];
  try {
    if (existsSync(safeProjectPath(root, TRANSACTION))) throw new Error("Incomplete workflow transaction; run brief update --recover");
    const manifest = readWorkflowManifest(root);
    if (!manifest) throw new Error("Workflow package missing; run brief init");
    for (const [file, hash] of Object.entries(manifest.files)) {
      const path = safeProjectPath(root, `${WORKFLOW_DIR}/${file}`);
      if (!existsSync(path)) checks.push({ type: "workflow", path: file, status: "fail", reason: "missing" });
      else checks.push({ type: "workflow", path: file, status: "pass", reason: hashText(readFileSync(path, "utf8")) === hash ? undefined : "local customization" });
    }
    if (manifest.scope === "global") {
      const result = spawnSync("python3", [join(CLI_SOURCE, "scripts/install-workflow.py"), "--home-dir", root, "--source-dir", join(root, WORKFLOW_DIR), "--check"], { encoding: "utf8" });
      checks.push({ type: "registration", path: "global providers", status: result.status === 0 ? "pass" : "fail", reason: result.status === 0 ? undefined : result.stderr || result.stdout });
    }
    for (const [file, expected] of Object.entries(manifest.registrations || {})) {
      let current = snapshot(destination(root, file));
      if (expected.kind === "block" && current?.kind === "file") { const range = bounds(current.value); current = range ? { kind: "block", value: current.value.slice(...range) } : null; }
      checks.push({ type: "registration", path: file, status: isDeepStrictEqual(fingerprint(current), expected) ? "pass" : "fail", reason: "missing or changed" });
    }
  } catch (error) { checks.push({ type: "workflow", status: "fail", reason: error.message }); }
  const fail = checks.filter(c => c.status === "fail").length;
  return { healthy: fail === 0, checks, summary: { pass: checks.length - fail, fail }, exitCode: fail ? 1 : 0 };
}

export function updateNotice(root, { home = homedir(), source, setting } = {}) {
  const path = safeProjectPath(root, NOTICE);
  const state = readJson(path) || {};
  if (setting) {
    if (!["on", "off", "snooze"].includes(setting)) throw new Error("Notice must be on, off, or snooze");
    atomicText(path, json({ disabled: setting === "off", snoozeUntil: setting === "snooze" ? Date.now() + 86400000 : 0 }));
    return null;
  }
  if (state.disabled || state.snoozeUntil > Date.now()) return null;
  const installed = readWorkflowManifest(root);
  if (!installed) return null;
  const candidatePath = resolveWorkflowSource({ source, home });
  try {
    const candidate = collectWorkflow(candidatePath);
    return candidate.digest === installed.digest ? null : "Brief workflow update available from local source. Review with brief update --dry-run (project copy stays pinned).";
  } catch { return "Brief update availability is unknown: source unavailable. Installed workflow remains pinned."; }
}

export function planGlobalProject(root, source) {
  const candidate = collectWorkflow(source), changes = [];
  const block = `${OPEN}\n${candidate.files["templates/WORKFLOW-ADAPTER.md"].replaceAll("@BRIEF_SOURCE@", "~/.brief/workflow").trimEnd()}\n${CLOSE}`;
  const previous = readJson(safeProjectPath(root, ".brief/install.json"));
  for (const host of [".agents", ".claude", ".codex"]) {
    const file = `${host}/skills/brief`, path = destination(root, file), before = snapshot(path);
    if (!before) continue;
    const legacy = readJson(join(root, ".brief/brief-manifest.json"));
    const owned = before.kind === "link" && (legacy?.symlinks?.some(entry => entry.source === file && entry.target === before.value) || resolve(dirname(path), before.value) === join(CLI_SOURCE, "skills/brief") || /[/\\]custom-skills[/\\]/.test(before.value));
    if (!owned) throw new Error(`Project registration conflicts with global scope: ${file}; preserve and reconcile it explicitly`);
    changes.push({ file, before, after: null });
  }
  for (const file of ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]) {
    const path = destination(root, file), before = snapshot(path);
    if (before && before.kind !== "file") throw new Error(`Expected instruction file: ${file}`);
    const range = bounds(before?.value || ""), currentBlock = range ? before.value.slice(...range) : null;
    if (currentBlock && currentBlock !== block && hashText(currentBlock) !== previous?.blocks?.[file]) throw new Error(`Customized workflow block: ${file}`);
    const after = { kind: "file", value: integrate(before?.value || "", block) };
    if (!sameContent(before, after)) changes.push({ file, before, after });
  }
  const file = ".brief/install.json", before = snapshot(destination(root, file));
  const after = { kind: "file", value: json({ schema: 1, scope: "global", blocks: Object.fromEntries(["AGENTS.md", "CLAUDE.md", "GEMINI.md"].map(file => [file, hashText(block)])) }) };
  if (!sameContent(before, after)) changes.push({ file, before, after });
  const ignoreFile = ".brief/.gitignore", ignoreBefore = snapshot(destination(root, ignoreFile));
  if (ignoreBefore?.kind === "link") throw new Error("Refusing symlink ignore file");
  let ignore = ignoreBefore?.value || "";
  for (const entry of ["/workflow-transaction.json", "/update-state.json", "/brief-manifest.json"]) if (!ignore.split(/\r?\n/).includes(entry)) ignore += (ignore && !ignore.endsWith("\n") ? "\n" : "") + entry + "\n";
  if (ignore !== ignoreBefore?.value) changes.push({ file: ignoreFile, before: ignoreBefore, after: { kind: "file", value: ignore } });
  return { root, scope: "local", changes, conflicts: [] };
}


export function planFileWrites(root, files) {
  const changes = [];
  for (const [file, value] of Object.entries(files)) {
    const before = snapshot(destination(root, file)), after = { kind: "file", value };
    if (before?.kind === "link") throw new Error(`Refusing file symlink: ${file}`);
    if (!sameContent(before, after)) changes.push({ file, before, after });
  }
  return changes;
}

export function assertWorkflowReady(root) {
  if (existsSync(safeProjectPath(root, TRANSACTION))) throw new Error("Incomplete workflow transaction; run brief update --recover before init");
}

export function inspectGlobalProject(root, home) {
  const result = inspectWorkflow(home);
  try {
    const scope = readJson(safeProjectPath(root, ".brief/install.json"));
    for (const [file, hash] of Object.entries(scope?.blocks || {})) {
      const current = snapshot(destination(root, file)), range = current?.kind === "file" ? bounds(current.value) : null;
      const valid = range && hashText(current.value.slice(...range)) === hash;
      result.checks.push({ type: "project scope", path: file, status: valid ? "pass" : "fail", reason: valid ? undefined : "global workflow block missing/changed" });
    }
    for (const host of [".agents", ".claude", ".codex"]) if (stat(destination(root, `${host}/skills/brief`))) result.checks.push({ type: "project scope", path: `${host}/skills/brief`, status: "fail", reason: "project registration overrides selected global workflow" });
  } catch (error) { result.checks.push({ type: "project scope", status: "fail", reason: error.message }); }
  result.summary.fail = result.checks.filter(c => c.status === "fail").length;
  result.summary.pass = result.checks.length - result.summary.fail;
  result.healthy = result.summary.fail === 0; result.exitCode = result.healthy ? 0 : 1;
  return result;
}

export function workflowPreview(plan, { diff = false } = {}) {
  const provenance = manifest => manifest ? { version: manifest.version, revision: manifest.revision, digest: manifest.digest } : null;
  const changes = plan.changes.map(change => {
    const item = { file: change.file, action: !change.before ? "add" : !change.after ? "remove" : "update" };
    if (diff) {
      const input = JSON.stringify({ file: change.file, before: change.before?.value || "", after: change.after?.value || "" });
      item.diff = execFileSync("python3", ["-c", "import sys,json,difflib; d=json.load(sys.stdin); print(''.join(difflib.unified_diff(d['before'].splitlines(True),d['after'].splitlines(True),fromfile='installed/'+d['file'],tofile='available/'+d['file'])),end='')"], { input, encoding: "utf8" });
    }
    return item;
  });
  return { scope: plan.scope, available: plan.available, installed: provenance(plan.previous), candidate: provenance(plan.manifest), changes, conflicts: plan.conflicts };
}
