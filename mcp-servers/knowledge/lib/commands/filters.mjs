// Cross-type filter commands: status, pending, active, completed

import { readTracker } from "../tracker.mjs";
import { table, statusOrder } from "../format.mjs";

const DONE_STATUSES = ["done", "completed", "dropped", "superseded", "rejected", "clean"];
const ACTIVE_STATUSES = ["in_progress"];
const PENDING_STATUSES = ["open", "planned", "active", "accepted"];

export function statusCommand(root) {
  const items = readTracker(root);
  if (items.length === 0) {
    console.log("No tracker.yaml found or empty. Run: knowledge-graph init");
    return;
  }

  const byType = {};
  const byStatus = {};
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }

  const active = items.filter((i) => !DONE_STATUSES.includes(i.status));

  console.log("By type:");
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type.padEnd(12)} ${count}`);
  }
  console.log("\nBy status:");
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  ${status.padEnd(14)} ${count}`);
  }
  console.log(`\nActive: ${active.length} / ${items.length} total`);
}

export function pendingCommand(root) {
  const items = readTracker(root).filter((i) => PENDING_STATUSES.includes(i.status));
  items.sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const rows = items.map((i) => [i.id, i.type, i.title, i.status, i.priority || ""]);
  console.log(table(["ID", "Type", "Title", "Status", "Priority"], rows));
  console.log(`\n${items.length} pending item(s)`);
}

export function activeCommand(root) {
  const items = readTracker(root).filter((i) => ACTIVE_STATUSES.includes(i.status));

  const rows = items.map((i) => [i.id, i.type, i.title, i.status, i.priority || ""]);
  console.log(table(["ID", "Type", "Title", "Status", "Priority"], rows));
  console.log(`\n${items.length} active item(s) (in_progress)`);
}

export function completedCommand(root) {
  const items = readTracker(root).filter((i) => DONE_STATUSES.includes(i.status));

  const rows = items.map((i) => [i.id, i.type, i.title, i.status, i.pr || ""]);
  console.log(table(["ID", "Type", "Title", "Status", "PR"], rows));
  console.log(`\n${items.length} completed item(s)`);
}
