import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { recordMode, readRecordItems, splitRecord, safeProjectPath } from "./records.mjs";

const LEGACY_LOG = /^(?:documentation\/)?logs?\.md$/i;
const VIEWS = ["documentation/tracker.yaml", "documentation/PROJECT-TRACKER.md"];
function git(root, args) { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }

export function verifyRecords(root, { base } = {}) {
  if (!root || typeof root !== "string") throw new Error("Project root required");
  const errors = [], identities = new Map();
  function check(fn) { try { fn(); } catch (error) { errors.push(error.message); } }
  const mode = recordMode(root);
  let items = [], original = new Set(), revision;
  if (base) {
    if (base.startsWith("-")) throw new Error("Invalid base revision");
    revision = git(root, ["rev-parse", "--verify", `${base}^{commit}`]).trim();
    original = new Set(git(root, ["ls-tree", "-r", "--name-only", "-z", revision]).split("\0").filter(Boolean));
  }
  if (mode) {
    const recordErrors = [];
    items = readRecordItems(root, { onError: (file, error) => {
      if (base && original.has(file)) recordErrors.push(`Pre-existing record parse issue (non-blocking): ${file}: ${error.message}`);
      else recordErrors.push(error.message);
    } });
    for (const msg of recordErrors) {
      if (!msg.startsWith("Pre-existing")) errors.push(msg);
    }
  }
  if (mode) check(() => {
    for (const item of items) {
      if (item.type !== "story") continue;
      const dir = item.story.replace(/story\.md$/, "tasks");
      if (!existsSync(safeProjectPath(root, dir))) continue;
      for (const file of readdirSync(safeProjectPath(root, dir)).filter(f => /^T-\d+\.md$/.test(f))) {
        const parsed = splitRecord(readFileSync(safeProjectPath(root, `${dir}/${file}`), "utf8"), `${dir}/${file}`);
        const id = parsed.data._brief_task;
        if (id) {
          if (typeof id !== "string" || identities.has(id)) throw new Error(`Duplicate/invalid task identity: ${dir}/${file}`);
          identities.set(id, file);
          const visible = parsed.body.match(/^#\s+([^:]+):/m)?.[1];
          if (visible !== `${item.id}-T${Number(file.match(/\d+/)[0])}`) throw new Error(`Conflicting task identity: ${dir}/${file}`);
        }
      }
    }
  });
  if (base) {
    const changed = git(root, ["diff", "--name-only", "-z", revision, "--"]).split("\0").filter(Boolean);
    if (mode) for (const item of items) {
      check(() => {
        if (!original.has(item._file)) return;
        const old = splitRecord(git(root, ["show", `${revision}:${item._file}`]), item._file).data._brief;
        const current = splitRecord(readFileSync(safeProjectPath(root, item._file), "utf8"), item._file).data._brief;
        if (old?.record_id && (old.record_id !== current.record_id || old.item?.id !== current.item.id)) throw new Error(`Record identity changed: ${item._file}`);
      });
      if (item.type !== "story") continue;
      const dir = item.story.replace(/story\.md$/, "tasks");
      if (!existsSync(safeProjectPath(root, dir))) continue;
      for (const name of readdirSync(safeProjectPath(root, dir)).filter(f => /^T-\d+\.md$/.test(f))) check(() => {
        const file = `${dir}/${name}`, current = splitRecord(readFileSync(safeProjectPath(root, file), "utf8"), file);
        const old = original.has(file) ? splitRecord(git(root, ["show", `${revision}:${file}`]), file) : null;
        if (!old && !current.data._brief_task) throw new Error(`New task requires immutable identity: ${file}`);
        if (old?.data._brief_task && old.data._brief_task !== current.data._brief_task) throw new Error(`Task identity changed/removed: ${file}`);
        const visible = current.body.match(/^#\s+([^:]+):/m)?.[1];
        if ((!old || current.data._brief_task) && visible !== `${item.id}-T${Number(name.match(/\d+/)[0])}`) throw new Error(`Conflicting task identity: ${file}`);
      });
    }
    const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
    for (const file of new Set([...changed, ...untracked])) {
      if (LEGACY_LOG.test(file)) errors.push(`Historical monolithic logs are read-only; use brief log add: ${file}`);
      if (file.startsWith("documentation/logs/") && original.has(file)) errors.push(`Existing log entries are immutable: ${file}`);
      if (mode && VIEWS.includes(file) && git(root, ["ls-files", "--", file]).trim()) errors.push(`Untrack generated local view: ${file}`);
    }
  }
  const logs = safeProjectPath(root, "documentation/logs");
  if (existsSync(logs)) for (const name of readdirSync(logs).filter(f => f.endsWith(".md"))) check(() => {
    const file = `documentation/logs/${name}`;
    const content = readFileSync(safeProjectPath(root, file), "utf8");
    // Historical writers did not always quote YAML values. Skip validation for pre-existing
    // logs with parse errors; base-aware mutation detection still protects their bytes.
    if (!/^_brief_log:/m.test(content) && (!base || original.has(file))) return;
    let data;
    try { data = splitRecord(content, file).data; } catch (error) {
      if (base && original.has(file)) return;
      throw error;
    }
    if (data._brief_log !== 1 || typeof data.entry_id !== "string" || !data.entry_id || typeof data.session !== "string" || !data.session || typeof data.agent !== "string" || !data.agent || typeof data.note !== "string" || !Number.isFinite(Date.parse(data.timestamp))) throw new Error(`Invalid immutable log schema: ${file}`);
    if (identities.has(data.entry_id)) throw new Error(`Duplicate log identity: ${file}`);
    identities.set(data.entry_id, file);
  });
  return { ok: errors.length === 0, authority: mode ? "markdown" : "legacy", errors };
}
