import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const MARKER_OPEN = (section, ts) =>
  `<!-- brief:auto section="${section}" generated="${ts}" -->`;
export const MARKER_CLOSE = `<!-- /brief:auto -->`;

export function generateRuleSkeletons(projectRoot, detection, selectedRules) {
  const results = { claude: [], codex: [], gemini: [] };
  const ts = new Date().toISOString();

  if (detection.agents.claude) {
    results.claude = generateClaudeRules(projectRoot, selectedRules, ts);
  }
  if (detection.agents.codex) {
    results.codex = generateCodexSection(projectRoot, selectedRules, ts);
  }
  if (detection.agents.gemini) {
    results.gemini = generateGeminiRules(projectRoot, selectedRules, ts);
  }

  return results;
}

function generateClaudeRules(projectRoot, rules, ts) {
  const rulesDir = join(projectRoot, ".claude", "rules");
  mkdirSync(rulesDir, { recursive: true });
  const created = [];

  for (const rule of rules) {
    const filePath = join(rulesDir, rule.file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      if (content.includes("brief:auto")) continue;
      const appended = content + "\n\n" + MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, appended);
      created.push({ file: rule.file, action: "appended-markers" });
    } else {
      const paths = rule.paths?.length
        ? rule.paths.map(p => `  - "${p}"`).join("\n")
        : '  - "**/*"';
      const frontmatter = `---\npaths:\n${paths}\n---\n`;
      const content = frontmatter + "\n" + MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, content);
      created.push({ file: rule.file, action: "created" });
    }
  }
  return created;
}

function generateCodexSection(projectRoot, rules, ts) {
  const agentsPath = join(projectRoot, "AGENTS.md");
  const maxSize = 30 * 1024;

  let content = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";

  if (content.length > maxSize) {
    return [{ file: "AGENTS.md", action: "skipped-size-cap" }];
  }

  if (content.includes("brief:auto")) {
    return [{ file: "AGENTS.md", action: "already-has-markers" }];
  }

  const section = "\n\n" + MARKER_OPEN("conventions", ts) + "\n" +
    "## Coding Conventions (managed by brief)\n\n" +
    "(filled by /brief init)\n\n" + MARKER_CLOSE + "\n";
  writeFileSync(agentsPath, content + section);
  return [{ file: "AGENTS.md", action: "appended" }];
}

function generateGeminiRules(projectRoot, rules, ts) {
  const rulesDir = join(projectRoot, ".agents", "rules");
  mkdirSync(rulesDir, { recursive: true });
  const created = [];

  for (const rule of rules) {
    const filePath = join(rulesDir, rule.file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      if (content.includes("brief:auto")) continue;
      const appended = content + "\n\n" + MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, appended);
      created.push({ file: rule.file, action: "appended-markers" });
    } else {
      const content = MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, content);
      created.push({ file: rule.file, action: "created" });
    }
  }
  return created;
}
