import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, renameSync, unlinkSync, chmodSync, linkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { parseDocument } from "yaml";

export const RECORDS_MARKER = ".brief/records.json";
const MIGRATION = ".brief/records-migration.json";
const TYPES = { todo: "todo", decision: "decisions", research: "research", audit: "audit", bug: "bugs", memory: "memory" };
const VIEWS = ["documentation/tracker.yaml", "documentation/PROJECT-TRACKER.md"];

export function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function safeProjectPath(root, file) {
  if (typeof file !== "string" || !file || file.includes("\\") || file.split("/").includes("..") || file.startsWith("/")) throw new Error(`Unsafe project path: ${file}`);
  const target = resolve(root, file);
  let current = realpathSync(root);
  for (const part of file.split("/")) {
    current = resolve(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throw new Error(`Refusing record symlink: ${file}`);
  }
  return target;
}

export function atomicText(path, text, { mode } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    const previous = lstatSync(path, { throwIfNoEntry: false });
    const permissions = mode ?? (previous ? previous.mode & 0o777 : undefined);
    writeFileSync(temp, text, { flag: "wx", mode: permissions ?? 0o666 });
    if (permissions !== undefined) chmodSync(temp, permissions);
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export function splitRecord(content, label = "record") {
  if (/^<{7}(?: |$)[\s\S]*?^={7}\r?$[\s\S]*?^>{7}(?: |$)/m.test(content)) throw new Error(`Unresolved merge markers: ${label}`);
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return { doc: parseDocument("{}"), data: {}, body: content };
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Malformed frontmatter: ${label}`);
  const doc = parseDocument(match[1]);
  if (doc.errors.length) throw new Error(`Invalid YAML in ${label}: ${doc.errors[0].message}`);
  const data = doc.toJSON();
  if (!data || Array.isArray(data) || typeof data !== "object") throw new Error(`Expected YAML mapping: ${label}`);
  return { doc, data, body: content.slice(match[0].length) };
}

function statusToken(value) {
  const token = String(value).toLowerCase().split(/[\s(,·—–]/)[0];
  return ({ accepted: "active", decided: "active", complete: "completed", pending: "planned" })[token] || token;
}

export function recordHeaderField({ body }, label) {
  if (!/^[a-z]+$/i.test(label)) throw new Error(`Invalid metadata label: ${label}`);
  const header = body.split(/^[ \t]{0,3}#{2,6}[ \t]+/m)[0];
  return header.match(new RegExp(`((?:^[ \\t]*|\\|[ \\t]*)\\*\\*${label}:?\\*\\*:?[ \\t]*)([^|\\r\\n]+?)([ \\t]*)(?=\\||\\r?$)`, "im"));
}

function statusHeader(parsed, item) {
  // Memory status prose describes a decision, not its active/retired lifecycle.
  // Section-local statuses describe subitems, not the surrounding record.
  if (item.type === "memory") return null;
  return recordHeaderField(parsed, "status");
}

function validateVisible(parsed, item, file) {
  const { data, body } = parsed;
  for (const key of ["id", "status", "title", "branch", "priority", "pr", "link"]) {
    if (!Object.hasOwn(data, key) || !Object.hasOwn(item, key)) continue;
    let left = data[key], right = item[key];
    if (key === "status") { left = statusToken(left); right = statusToken(right); }
    if (!isDeepStrictEqual(left, right)) throw new Error(`Conflicting ${key} in ${file}: Markdown=${JSON.stringify(data[key])}, metadata=${JSON.stringify(item[key])}. Reconcile the intended value before migration/update.`);
  }
  const status = statusHeader(parsed, item)?.[2];
  if (status && statusToken(status) !== statusToken(item.status)) throw new Error(`Conflicting visible status in ${file}: Markdown=${JSON.stringify(status)}, metadata=${JSON.stringify(item.status)}. Reconcile the intended value before migration/update.`);
  if (item.type === "story") {
    const id = body.match(/^#\s+((?:[a-z0-9-]+\/)?S-\d+):/m)?.[1];
    if (id && id !== item.id) throw new Error(`Conflicting visible identity in ${file}`);
  }
}

export function recordMode(root) {
  const journal = safeProjectPath(root, MIGRATION);
  if (existsSync(journal) && JSON.parse(readFileSync(journal, "utf8")).state !== "complete") throw new Error("Incomplete record migration; run brief tracker rollback-authority --apply");
  const marker = safeProjectPath(root, RECORDS_MARKER);
  if (!existsSync(marker)) return false;
  const data = JSON.parse(readFileSync(marker, "utf8"));
  if (data.version !== 1 || data.authority !== "markdown") throw new Error("Unsupported records schema; do not rebuild from legacy tracker");
  return true;
}

export function recordFiles(root) {
  const files = [];
  function visit(dir, stories = false) {
    const full = safeProjectPath(root, dir);
    if (!existsSync(full)) return;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Refusing record symlink: ${file}`);
      if (entry.isDirectory() && stories) visit(file, true);
      else if (entry.isFile() && (stories ? entry.name === "story.md" : entry.name.endsWith(".md"))) files.push(file);
    }
  }
  visit("documentation/stories", true);
  for (const dir of Object.values(TYPES)) visit(`documentation/${dir}`);
  return files.sort();
}

function parseManaged(root, file) {
  const parsed = splitRecord(readFileSync(safeProjectPath(root, file), "utf8"), file);
  const meta = parsed.data._brief;
  if (!meta || meta.version !== 1 || typeof meta.record_id !== "string" || !meta.record_id || !meta.item?.id || !meta.item?.type) throw new Error(`Missing/invalid _brief metadata: ${file}; migrate authority before using record mode`);
  if (meta.item.type === "story" && meta.item.story !== file) throw new Error(`Conflicting canonical story path: ${file}`);
  validateVisible(parsed, meta.item, file);
  return { ...parsed, meta, file };
}

function taskProgress(root, item) {
  if (!item.story) return { active_tasks: [], current_task: null };
  const dir = item.story.replace(/story\.md$/, "tasks");
  const full = safeProjectPath(root, dir);
  const active = [];
  if (existsSync(full)) for (const file of readdirSync(full).filter(f => /^T-\d+\.md$/.test(f)).sort()) {
    const text = readFileSync(safeProjectPath(root, `${dir}/${file}`), "utf8");
    splitRecord(text, `${dir}/${file}`);
    const status = text.match(/\*\*Status:?\*\*:?\s*(\S+)/i)?.[1];
    if (["in_progress", "in-progress", "active"].includes(status)) active.push(`${item.id}-T${Number(file.match(/\d+/)[0])}`);
  }
  return { active_tasks: active, current_task: active.length === 1 ? active[0] : null };
}

export function readRecordItems(root, { derived = true, allowPending = false } = {}) {
  const journalPath = safeProjectPath(root, MIGRATION);
  if (!allowPending && existsSync(journalPath) && JSON.parse(readFileSync(journalPath, "utf8")).state !== "complete") throw new Error("Incomplete record migration; run brief tracker rollback-authority --apply");
  const ids = new Map(), identities = new Map(), items = [];
  for (const file of recordFiles(root)) {
    const { meta } = parseManaged(root, file);
    if (ids.has(meta.item.id)) throw new Error(`Duplicate record ID ${meta.item.id}: ${ids.get(meta.item.id)}, ${file}`);
    if (identities.has(meta.record_id)) throw new Error(`Duplicate record identity: ${identities.get(meta.record_id)}, ${file}`);
    ids.set(meta.item.id, file); identities.set(meta.record_id, file);
    const item = structuredClone(meta.item);
    if (derived && item.type === "story") Object.assign(item, taskProgress(root, item));
    Object.defineProperty(item, "_file", { value: file });
    Object.defineProperty(item, "_original", { value: structuredClone(meta.item) });
    items.push(item);
  }
  return items;
}

export function locateRecord(root, item) {
  if (item._file) return item._file;
  if (item.type === "story") {
    if (!item.story) throw new Error(`No canonical file for ${item.id}`);
    safeProjectPath(root, item.story);
    return item.story;
  }
  const dir = TYPES[item.type];
  if (!dir) throw new Error(`Unknown record type: ${item.type}`);
  const candidates = recordFiles(root).filter(f => f.startsWith(`documentation/${dir}/`)).filter(file => {
    const parsed = splitRecord(readFileSync(safeProjectPath(root, file), "utf8"), file);
    const base = file.split("/").at(-1).replace(/\.md$/, "");
    return parsed.data._brief?.item?.id === item.id || parsed.data.id === item.id || parsed.data.name === item.id || base === item.id || base.startsWith(item.id + "-");
  });
  if (candidates.length !== 1) throw new Error(`${candidates.length ? "Ambiguous" : "Missing"} canonical file for ${item.id}: ${candidates.join(", ")}`);
  return candidates[0];
}

function encodeRecord(content, meta, { mirror = false } = {}) {
  const parsed = splitRecord(content);
  const { doc, data, body } = parsed;
  doc.set("_brief", meta);
  if (mirror) for (const key of ["id", "status", "title", "branch", "priority", "pr", "link"]) {
    if (Object.hasOwn(data, key) && Object.hasOwn(meta.item, key)) doc.set(key, meta.item[key]);
  }
  const status = mirror ? statusHeader(parsed, meta.item) : null;
  const start = status ? status.index + status[1].length : 0;
  const visible = status ? body.slice(0, start) + meta.item.status + body.slice(start + status[2].length) : body;
  return `---\n${doc.toString().trimEnd()}\n---\n${visible}`;
}

export function persistRecordItems(root, items) {
  const seen = new Set();
  const changes = [];
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate record ID: ${item.id}`);
    seen.add(item.id);
    const file = locateRecord(root, item), path = safeProjectPath(root, file);
    if (!existsSync(path)) throw new Error(`Missing canonical file for ${item.id}: ${file}`);
    const content = readFileSync(path, "utf8"), parsed = splitRecord(content, file);
    const data = structuredClone(item);
    delete data._slug;
    if (data.type === "story") { delete data.active_tasks; delete data.current_task; delete data.last_task; }
    const old = parsed.data._brief;
    if (old && (old.version !== 1 || old.item.id !== item.id)) throw new Error(`Invalid record ownership: ${file}`);
    // A stale collection must never overwrite a newer state read by another writer.
    if (old && item._original && !isDeepStrictEqual(old.item, item._original)) throw new Error(`Record changed since read: ${item.id}`);
    if (old && isDeepStrictEqual(old.item, data)) continue;
    const meta = old ? { ...old, item: data } : { version: 1, record_id: randomUUID(), item: data };
    const text = encodeRecord(content, meta, { mirror: true });
    if (text !== content) changes.push({ path, text });
  }
  for (const change of changes) atomicText(change.path, change.text);
}

export function replaceRecordBody(content, replacement, { story = false } = {}) {
  const parsed = splitRecord(content);
  let body = replacement.trimEnd() + "\n";
  if (story) {
    const end = parsed.body.search(/\n\n(?![\s]*\*\*)/);
    if (end !== -1) body = parsed.body.slice(0, end) + "\n\n" + body;
  }
  return Object.keys(parsed.data).length ? `---\n${parsed.doc.toString().trimEnd()}\n---\n${body}` : body;
}

function legacyItems(root) {
  const path = safeProjectPath(root, VIEWS[0]);
  if (!existsSync(path)) return [];
  const doc = parseDocument(readFileSync(path, "utf8"));
  if (doc.errors.length) throw new Error(`Invalid legacy tracker: ${doc.errors[0].message}`);
  const value = doc.toJSON();
  const items = Array.isArray(value) ? value : value?.items;
  if (!Array.isArray(items)) throw new Error("Legacy tracker must contain an items array");
  return items;
}

export function migrateRecordAuthority(root, { apply = false } = {}) {
  if (recordMode(root)) return { already: true, files: [], records: readRecordItems(root).length };
  const transactionPath = safeProjectPath(root, MIGRATION);
  if (existsSync(transactionPath)) throw new Error("Existing migration recovery record; inspect or rollback it before retrying");
  const items = legacyItems(root), ids = new Set(), paths = new Set(), changes = [];
  for (const item of items) {
    if (!item?.id || !item.type || ids.has(item.id)) throw new Error(`Invalid/duplicate legacy record: ${item?.id}`);
    ids.add(item.id);
    const file = locateRecord(root, item);
    if (paths.has(file)) throw new Error(`Multiple records map to ${file}`);
    paths.add(file);
    const before = readFileSync(safeProjectPath(root, file), "utf8"), parsed = splitRecord(before, file);
    if (parsed.data._brief) throw new Error(`Reserved _brief metadata exists in ${file}`);
    validateVisible(parsed, item, file);
    const data = structuredClone(item), legacy = {};
    if (item.type === "story") for (const key of ["current_task", "last_task"]) {
      if (Object.hasOwn(data, key)) { legacy[key] = data[key]; delete data[key]; }
    }
    const meta = { version: 1, record_id: randomUUID(), item: data, ...(Object.keys(legacy).length ? { legacy } : {}) };
    const after = encodeRecord(before, meta);
    const saved = splitRecord(after).data._brief;
    if (!isDeepStrictEqual({ ...saved.item, ...saved.legacy }, item)) throw new Error(`Metadata round-trip failed: ${item.id}`);
    changes.push({ file, before, after });
  }
  const inventory = recordFiles(root);
  const outside = [...paths].filter(f => !inventory.includes(f));
  if (outside.length) throw new Error(`Mappings outside canonical inventory: ${outside.join(", ")}`);
  const missing = inventory.filter(f => !paths.has(f));
  if (missing.length) throw new Error(`Unregistered canonical files; reconcile before migration: ${missing.join(", ")}`);
  const marker = JSON.stringify({ version: 1, authority: "markdown" }, null, 2) + "\n";
  changes.push({ file: RECORDS_MARKER, before: null, after: marker });
  const ignoreFile = "documentation/.gitignore", ignorePath = safeProjectPath(root, ignoreFile);
  const beforeIgnore = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : null;
  let afterIgnore = beforeIgnore || "";
  for (const name of ["/tracker.yaml", "/PROJECT-TRACKER.md"]) if (!afterIgnore.split(/\r?\n/).includes(name)) afterIgnore += (afterIgnore && !afterIgnore.endsWith("\n") ? "\n" : "") + name + "\n";
  changes.push({ file: ignoreFile, before: beforeIgnore, after: afterIgnore });
  const machineIgnore = ".brief/.gitignore", machinePath = safeProjectPath(root, machineIgnore);
  const machineBefore = existsSync(machinePath) ? readFileSync(machinePath, "utf8") : null;
  const machineAfter = (machineBefore || "").replace(/\s*$/, "") + "\n/records-migration.json\n";
  changes.push({ file: machineIgnore, before: machineBefore, after: machineAfter });
  const report = { records: items.length, files: changes.map(c => c.file), untrack: VIEWS, dryRun: !apply };
  if (!apply) return report;
  // The journal is written before mutation, allowing recovery from interruption at any step.
  const journal = { version: 1, state: "pending", changes, legacyViews: VIEWS.map(file => ({ file, content: existsSync(safeProjectPath(root, file)) ? readFileSync(safeProjectPath(root, file), "utf8") : null })) };
  atomicText(transactionPath, JSON.stringify(journal, null, 2) + "\n", { mode: 0o600 });
  for (const change of changes) atomicText(safeProjectPath(root, change.file), change.after);
  const migrated = readRecordItems(root, { allowPending: true, derived: false });
  if (migrated.length !== items.length || migrated.some(item => !ids.has(item.id))) throw new Error("Migrated inventory differs from legacy records; roll back before continuing");
  journal.state = "complete";
  atomicText(transactionPath, JSON.stringify(journal, null, 2) + "\n", { mode: 0o600 });
  return report;
}

export function rollbackRecordAuthority(root) {
  const path = safeProjectPath(root, MIGRATION);
  if (!existsSync(path)) throw new Error("No record-authority migration to roll back");
  const journal = JSON.parse(readFileSync(path, "utf8"));
  if (journal.version !== 1 || !Array.isArray(journal.changes)) throw new Error("Invalid migration recovery record");
  for (const change of journal.changes) {
    const file = safeProjectPath(root, change.file);
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current !== change.before && current !== change.after) throw new Error(`Post-migration edits prevent rollback: ${change.file}`);
  }
  const known = new Set(journal.changes.map(c => c.file));
  const extra = recordFiles(root).filter(f => !known.has(f));
  if (extra.length) throw new Error(`New records prevent rollback: ${extra.join(", ")}`);
  for (const view of journal.legacyViews || []) {
    const file = safeProjectPath(root, view.file);
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current !== view.content && current !== view.generated) throw new Error(`Edited view prevents rollback: ${view.file}`);
  }
  for (const view of journal.legacyViews || []) {
    const file = safeProjectPath(root, view.file);
    if (view.content === null) { if (existsSync(file)) unlinkSync(file); }
    else atomicText(file, view.content);
  }
  for (const change of [...journal.changes].reverse()) {
    const file = safeProjectPath(root, change.file);
    if (change.before === null) { if (existsSync(file)) unlinkSync(file); }
    else atomicText(file, change.before);
  }
  unlinkSync(path);
  return { restored: journal.changes.length };
}

// Record generated bytes so rollback can distinguish a derived view from a user edit.
export function rememberGeneratedView(root, file, content) {
  const path = safeProjectPath(root, MIGRATION);
  if (!existsSync(path)) return;
  const journal = JSON.parse(readFileSync(path, "utf8"));
  const view = journal.legacyViews?.find(v => v.file === file);
  if (view) { view.generated = content; atomicText(path, JSON.stringify(journal, null, 2) + "\n"); }
}

export function updateRecord(root, item, updates, { body, frontmatter = {}, note } = {}) {
  for (const key of ["id", "type", "_brief", "_file", "_original", "record_id", ...(item.type === "story" ? ["story", "current_task", "last_task", "active_tasks"] : [])]) {
    if (Object.hasOwn(updates, key)) throw new Error(`Cannot change record identity/derived field: ${key}`);
  }
  const file = locateRecord(root, item), path = safeProjectPath(root, file);
  const content = readFileSync(path, "utf8"), parsed = splitRecord(content, file);
  if (!parsed.data._brief || !isDeepStrictEqual(parsed.data._brief.item, item._original)) throw new Error(`Record changed since read: ${item.id}`);
  const metadata = { ...parsed.data._brief, item: { ...parsed.data._brief.item, ...updates } };
  let next = encodeRecord(content, metadata, { mirror: true });
  const updated = splitRecord(next);
  for (const [key, value] of Object.entries({ ...updates, ...frontmatter })) {
    if (key !== "type" && key !== "note" && Object.hasOwn(updated.data, key)) updated.doc.set(key, value);
  }
  next = `---\n${updated.doc.toString().trimEnd()}\n---\n${updated.body}`;
  if (body) next = replaceRecordBody(next, body, { story: item.type === "story" });
  if (note) next = next.trimEnd() + `\n\n### Note (${new Date().toISOString().slice(0, 10)})\n\n${note}\n`;
  validateVisible(splitRecord(next), metadata.item, file);
  atomicText(path, next);
  return file;
}

export function createRecordText(content, item) {
  const data = structuredClone(item);
  if (data.type === "story") { delete data.current_task; delete data.last_task; delete data.active_tasks; }
  const text = encodeRecord(content, { version: 1, record_id: randomUUID(), item: data }, { mirror: true });
  validateVisible(splitRecord(text), data, data.id);
  return text;
}

// Publish complete bytes exclusively. Readers see absence or a complete record, never a partial file.
export function createExclusive(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try { writeFileSync(temp, text, { flag: "wx" }); linkSync(temp, path); }
  finally { if (existsSync(temp)) unlinkSync(temp); }
}
