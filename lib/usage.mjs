// Usage tracking — append-only log at ~/.brief/usage.log
// Format: timestamp|project|command|duration_ms

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const USAGE_DIR = join(process.env.HOME, ".brief");
const USAGE_LOG = join(USAGE_DIR, "usage.log");

export function logUsage(project, command, startTime) {
  try {
    if (!existsSync(USAGE_DIR)) mkdirSync(USAGE_DIR, { recursive: true });
    const duration = Date.now() - startTime;
    const line = `${new Date().toISOString()}|${project}|${command}|${duration}\n`;
    appendFileSync(USAGE_LOG, line);
  } catch {
    // Never let usage tracking break the CLI
  }
}

export function statsCommand(projectFilter) {
  if (!existsSync(USAGE_LOG)) {
    console.log("No usage data yet.");
    return;
  }

  const lines = readFileSync(USAGE_LOG, "utf8").trim().split("\n").filter(Boolean);
  const byProject = {};
  const byDay = {};

  for (const line of lines) {
    const [timestamp, project, command] = line.split("|");
    const day = timestamp.slice(0, 10);

    if (projectFilter && project !== projectFilter) continue;

    if (!byProject[project]) byProject[project] = { total: 0, days: {} };
    byProject[project].total++;
    byProject[project].days[day] = (byProject[project].days[day] || 0) + 1;

    const dayKey = `${day}|${project}`;
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
  }

  if (Object.keys(byProject).length === 0) {
    console.log("No usage data" + (projectFilter ? ` for ${projectFilter}.` : "."));
    return;
  }

  // Show per-project summary
  for (const [project, data] of Object.entries(byProject)) {
    const days = Object.keys(data.days).sort();
    const recent = days.slice(-7);
    console.log(`\n${project}`);
    console.log(`  Total: ${data.total} queries`);
    console.log(`  Last 7 days:`);
    for (const day of recent) {
      console.log(`    ${day}: ${data.days[day]} queries`);
    }
  }

  const totalQueries = Object.values(byProject).reduce((sum, p) => sum + p.total, 0);
  console.log(`\n${totalQueries} total queries across ${Object.keys(byProject).length} project(s)`);
}
