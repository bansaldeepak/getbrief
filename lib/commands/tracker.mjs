// brief tracker <action> — tracker management commands

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readTracker, writeTracker, generateMarkdown, withLockIfGit } from "../tracker.mjs";
import { scanFiles } from "../scan.mjs";

export function trackerCommand(root, action, args, rawArgs) {
  if (action === "--help" || action === "-h" || args.includes("--help") || args.includes("-h")) {
    return trackerHelp();
  }
  switch (action) {
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

  const scanned = scanFiles(root);

  if (scanned.length === 0) {
    console.log("No items found in documentation directories.");
    process.exit(0);
  }

  // Merge: scanned items are truth for what exists on disk.
  // Existing tracker entries that match an ID keep their extra fields (pr, link, current_task).
  const existing = readTracker(root);
  const existingById = new Map(existing.map((i) => [i.id, i]));

  const merged = scanned.map((item) => {
    // Strip internal _slug field before writing to tracker
    const { _slug, ...clean } = item;
    const prev = existingById.get(clean.id);
    if (prev) {
      return { ...clean, pr: prev.pr || clean.pr, link: prev.link || clean.link, current_task: prev.current_task || clean.current_task };
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
  generate [--markdown] [--dry-run]   Rebuild tracker.yaml from filesystem
                                      --markdown: also regenerate PROJECT-TRACKER.md
                                      --dry-run: preview without writing
  show                                Print raw tracker.yaml contents
  help                                Show this help`);
}
