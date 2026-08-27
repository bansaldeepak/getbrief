import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { verifyLink } from "./symlink.mjs";

export function runDoctor(projectRoot, opts = {}) {
  const { json = false } = opts;
  const checks = [];

  const manifestPath = join(projectRoot, ".agents", "brief-manifest.json");
  if (!existsSync(manifestPath)) {
    if (json) {
      return { healthy: false, error: "manifest-missing", message: "Run `brief init` first.", checks: [], summary: { pass: 0, fail: 1 }, exitCode: 1 };
    }
    console.error("✗ brief-manifest.json not found. Run `brief init` first.");
    return { healthy: false, checks: [], summary: { pass: 0, fail: 1 }, exitCode: 1 };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    checks.push({ type: "manifest", status: "pass" });
  } catch {
    if (json) {
      return { healthy: false, error: "manifest-invalid", message: "Delete .agents/brief-manifest.json and re-run init.", checks: [], summary: { pass: 0, fail: 1 }, exitCode: 1 };
    }
    console.error("✗ Manifest corrupted. Delete .agents/brief-manifest.json and re-run `brief init`.");
    return { healthy: false, checks: [], summary: { pass: 0, fail: 1 }, exitCode: 1 };
  }

  for (const link of manifest.symlinks || []) {
    const linkPath = join(projectRoot, link.source);
    const result = verifyLink(linkPath, link.target);
    if (result.valid) {
      checks.push({ type: "symlink", path: link.source, status: "pass" });
    } else {
      checks.push({ type: "symlink", path: link.source, status: "fail", reason: result.reason });
    }
  }

  for (const ruleFile of manifest.rules_installed || []) {
    const rulePath = join(projectRoot, ".claude", "rules", ruleFile);
    if (existsSync(rulePath)) {
      checks.push({ type: "rule", file: ruleFile, status: "pass" });
    } else {
      checks.push({ type: "rule", file: ruleFile, status: "fail", reason: "missing" });
    }
  }

  if (manifest.mode === "copy") {
    for (const link of manifest.symlinks || []) {
      const copyPath = join(projectRoot, link.source);
      const sourcePath = link.target.replace(/^~/, homedir());
      if (existsSync(copyPath) && existsSync(sourcePath)) {
        const copyMtime = statSync(copyPath).mtimeMs;
        const sourceMtime = statSync(sourcePath).mtimeMs;
        if (sourceMtime > copyMtime) {
          checks.push({ type: "stale-copy", path: link.source, status: "fail", reason: "source-newer" });
        }
      }
    }
  }

  const pass = checks.filter(c => c.status === "pass").length;
  const fail = checks.filter(c => c.status === "fail").length;
  const healthy = fail === 0;

  return { healthy, checks, summary: { pass, fail }, exitCode: healthy ? 0 : 1 };
}

export function printDoctorResult(projectRoot, result, json) {
  if (json) {
    console.log(JSON.stringify({ healthy: result.healthy, checks: result.checks, summary: result.summary }, null, 2));
    return;
  }

  if (result.error) return;

  console.log("\nbrief doctor");
  console.log("─".repeat(50));
  console.log(`Checking project: ${projectRoot}\n`);

  for (const check of result.checks) {
    const icon = check.status === "pass" ? "✓" : "✗";
    let label;
    if (check.type === "manifest") label = "Manifest: valid";
    else if (check.type === "symlink") label = `Symlink: ${check.path}`;
    else if (check.type === "rule") label = `Rules: ${check.file}`;
    else label = `${check.type}: ${check.path}`;
    const detail = check.status === "fail" ? ` (${check.reason})` : "";
    console.log(`  ${icon} ${label}${detail}`);
  }

  console.log(`\n${result.summary.pass} passed, ${result.summary.fail} failed`);
  if (!result.healthy) {
    console.log("Fix: run `brief init` to repair");
  }
  console.log("─".repeat(50));
}
