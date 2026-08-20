/**
 * brief migrate — handle brief format version upgrades.
 * Reserved for breaking changes to brief's own schema/format.
 * NOT for one-time project data conversion (that's the /brief skill + scripts).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CURRENT_VERSION = 2;

export function migrateProject(projectRoot, opts = {}) {
  const trackerPath = join(projectRoot, "documentation/tracker.yaml");

  if (!existsSync(trackerPath)) {
    console.log("No tracker.yaml found. Run `brief init` first.");
    return { added: [], totalItems: 0 };
  }

  const content = readFileSync(trackerPath, "utf8");

  // Detect version from header comment or format
  let version = 1;
  const versionMatch = content.match(/^# version:\s*(\d+)/m);
  if (versionMatch) version = parseInt(versionMatch[1], 10);

  // Check if tracker is at old root (pre-v2 had tracker.yaml at project root)
  const oldTracker = join(projectRoot, "tracker.yaml");
  if (!existsSync(trackerPath) && existsSync(oldTracker)) {
    console.log("Found legacy tracker.yaml at project root.");
    console.log("Migration: move tracker.yaml → documentation/tracker.yaml");
    console.log("Run: mv tracker.yaml documentation/tracker.yaml");
    return { added: [{ id: "migrate", title: "Move tracker.yaml to documentation/", source: "root" }], totalItems: 0 };
  }

  if (version >= CURRENT_VERSION) {
    console.log(`tracker.yaml is at version ${version} (current). Nothing to migrate.`);
    return { added: [], totalItems: 0 };
  }

  // Future: add version-specific migrations here
  // if (version === 1) { migrateV1toV2(projectRoot); }

  console.log(`tracker.yaml is at version ${version}. Current is ${CURRENT_VERSION}.`);
  console.log("No automated migration available yet for this version.");
  return { added: [], totalItems: 0 };
}
