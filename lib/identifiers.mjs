import { existsSync, readdirSync } from "node:fs";
import { readTracker } from "./tracker.mjs";
import { safeProjectPath } from "./records.mjs";

export function featureSlug(value) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error("Feature must be a lowercase slug, e.g. checkout-flow");
  return value;
}

export function resolveStoryId(root, identifier) {
  if (!identifier) return identifier;
  if (!/^(?:[a-z0-9-]+\/)?S-\d+$/i.test(identifier)) throw new Error(`Invalid story ID: ${identifier}`);
  const items = readTracker(root).filter(i => i.type === "story");
  if (items.some(i => i.id === identifier)) return identifier;
  const candidates = items.filter(i => i.id.split("/").at(-1) === identifier);
  if (candidates.length > 1) throw new Error(`Ambiguous story ${identifier}; use: ${candidates.map(i => i.id).join(", ")}`);
  return candidates[0]?.id || identifier;
}

export function nextFeatureStory(root, feature) {
  featureSlug(feature);
  const dir = safeProjectPath(root, `documentation/stories/${feature}`);
  const nums = existsSync(dir) ? readdirSync(dir).filter(f => /^S-\d+$/.test(f)).map(f => Number(f.slice(2))) : [];
  const number = Math.max(0, ...nums) + 1;
  return `${feature}/S-${String(number).padStart(3, "0")}`;
}
