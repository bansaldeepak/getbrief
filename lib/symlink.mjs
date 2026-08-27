import { symlinkSync, readlinkSync, lstatSync, existsSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

export function createLink(target, linkPath) {
  const resolvedTarget = target.replace(/^~/, homedir());
  mkdirSync(dirname(linkPath), { recursive: true });

  if (lstatExists(linkPath)) {
    const existing = safeReadlink(linkPath);
    if (existing === resolvedTarget) {
      return { status: "exists", mode: "symlink" };
    }
    rmSync(linkPath, { recursive: true });
  }

  try {
    symlinkSync(resolvedTarget, linkPath);
    return { status: "created", mode: "symlink" };
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EACCES") {
      return fallbackCopy(resolvedTarget, linkPath);
    }
    throw err;
  }
}

export function verifyLink(linkPath, expectedTarget) {
  const resolvedExpected = expectedTarget.replace(/^~/, homedir());
  if (!lstatExists(linkPath)) {
    return { valid: false, reason: "missing" };
  }
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) {
    return { valid: false, reason: "not-symlink" };
  }
  const actual = readlinkSync(linkPath);
  if (actual !== resolvedExpected) {
    return { valid: false, reason: "wrong-target", actual, expected: resolvedExpected };
  }
  if (!existsSync(linkPath)) {
    return { valid: false, reason: "broken", target: actual };
  }
  return { valid: true };
}

export function fallbackCopy(source, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest, { recursive: true });
  return { status: "created", mode: "copy", warning: "Symlinks unavailable, using copy mode. Updates won't auto-propagate." };
}

export function removeStale(linkPath) {
  if (!lstatExists(linkPath)) return false;
  const stat = lstatSync(linkPath);
  if (stat.isSymbolicLink() && !existsSync(linkPath)) {
    rmSync(linkPath);
    return true;
  }
  return false;
}

function lstatExists(p) {
  try { lstatSync(p); return true; } catch { return false; }
}

function safeReadlink(p) {
  try { return readlinkSync(p); } catch { return null; }
}
