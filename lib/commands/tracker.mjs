// brief tracker <action> — tracker management commands

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readTracker, writeTracker, writeTrackerView, generateMarkdown, withLockIfGit } from "../tracker.mjs";
import { recordMode, migrateRecordAuthority, rollbackRecordAuthority } from "../records.mjs";
import { scanFiles } from "../scan.mjs";

export function trackerCommand(root, action, args, rawArgs) {
  if (action === "--help" || action === "-h" || args.includes("--help") || args.includes("-h")) {
    return trackerHelp();
  }
  switch (action) {
    case "migrate-authority": {
      if (rawArgs.includes("--apply") && rawArgs.includes("--dry-run")) throw new Error("Choose --apply or --dry-run");
      const result = withLockIfGit(root, () => migrateRecordAuthority(root, { apply: rawArgs.includes("--apply") }));
      console.log(JSON.stringify(result, null, 2));
      if (result.untrack) console.log("After inspecting the migration, untrack generated views with: git rm --cached --ignore-unmatch documentation/tracker.yaml documentation/PROJECT-TRACKER.md");
      return;
    }
    case "rollback-authority": {
      if (!rawArgs.includes("--apply")) throw new Error("Rollback requires --apply; it refuses changed/new records");
      console.log(JSON.stringify(withLockIfGit(root, () => rollbackRecordAuthority(root)), null, 2));
      return;
    }
    case "generate": return trackerGenerate(root, rawArgs);
    case "show": return trackerShow(root);
    case "help": return trackerHelp();
    default:
      console.error(`Unknown tracker action: ${action || "(none)"}. Run: brief tracker help`);
      process.exit(1);
  }
}

function trackerGenerate(root, rawArgs) {
  const markdown = rawArgs.includes("--markdown");
  const dryRun = rawArgs.includes("--dry-run");

  if (recordMode(root)) {
    return withLockIfGit(root, () => {
      const items = readTracker(root);
      if (dryRun) return console.log(`Would generate local tracker views from ${items.length} canonical records`);
      writeTrackerView(root, items);
      if (markdown) generateMarkdown(root);
      console.log(`Generated local views from ${items.length} canonical records`);
    });
  }

  const existing = readTracker(root);
  const scanned = scanFiles(root, { existingItems: existing });

  if (scanned.length === 0) {
    console.log("No items found in documentation directories.");
    process.exit(0);
  }

  // Merge: scanned items are truth for what exists on disk.
  // Existing tracker entries that match an ID keep their extra fields (pr, link, current_task).
  const existingById = new Map(existing.map((i) => [i.id, i]));
  const scannedIds = new Set(scanned.map(item => item.id));
  const missing = existing.filter(item => !scannedIds.has(item.id));
  if (missing.length) throw new Error(`Tracker records missing from scan; reconcile before regeneration: ${missing.map(item => item.id).join(", ")}`);

  const merged = scanned.map((item) => {
    // Strip internal _slug field before writing to tracker
    const { _slug, ...clean } = item;
    const prev = existingById.get(clean.id);
    if (prev) {
      const merged = { ...prev, ...clean };
      for (const key of ["pr", "link", "current_task"]) if (Object.hasOwn(prev, key)) merged[key] = prev[key];
      if (item._sourceFields) for (const key of ["status", "branch", "category", "created", "priority", "title"]) {
        if (!item._sourceFields.has(key) && Object.hasOwn(prev, key)) merged[key] = prev[key];
      }
      return merged;
    }
    return clean;
  });

  if (dryRun) {
    const types = {};
    for (const i of merged) types[i.type] = (types[i.type] || 0) + 1;
    console.log("Would write tracker.yaml with:");
    for (const [t, c] of Object.entries(types)) console.log(`  ${t}: ${c}`);
    console.log(`\nTotal: ${merged.length} items`);
    if (markdown) console.log("Would also regenerate PROJECT-TRACKER.md");
    return;
  }

  withLockIfGit(root, () => {
    writeTracker(root, merged);
  });
  console.log(`✓ tracker.yaml rebuilt from filesystem`);

  const types = {};
  for (const i of merged) types[i.type] = (types[i.type] || 0) + 1;
  for (const [t, c] of Object.entries(types)) console.log(`  ${t}: ${c}`);
  console.log(`  total: ${merged.length}`);

  if (markdown) {
    const { path, activeCount } = generateMarkdown(root);
    console.log(`✓ PROJECT-TRACKER.md regenerated (${activeCount} active items)`);
  }
}

function trackerShow(root) {
  if (recordMode(root)) { console.log(JSON.stringify(readTracker(root), null, 2)); return; }
  const path = join(root, "documentation/tracker.yaml");
  if (!existsSync(path)) {
    console.log("No tracker.yaml found. Run: brief tracker generate");
    process.exit(1);
  }
  console.log(readFileSync(path, "utf8"));
}

function trackerHelp() {
  console.log(`brief tracker <action>

Actions:
  migrate-authority [--dry-run|--apply]  Preserve legacy metadata in canonical Markdown
  rollback-authority --apply           Restore migration inputs if no later edits exist
  generate [--markdown] [--dry-run]   Rebuild tracker.yaml from filesystem
                                      --markdown: also regenerate PROJECT-TRACKER.md
                                      --dry-run: preview without writing
  show                                Print raw tracker.yaml contents
  help                                Show this help`);
}
