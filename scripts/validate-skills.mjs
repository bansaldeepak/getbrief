import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'brief');
let count = 0;
const errors = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.name === 'SKILL.md') {
      count++;
      try {
        const text = readFileSync(path, 'utf8');
        const match = text.match(/^---\n([\s\S]*?)\n---/);
        if (!match) throw new Error('missing YAML frontmatter');
        const meta = parse(match[1]);
        if (!meta || typeof meta.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name)) {
          throw new Error('invalid skill name');
        }
        if (typeof meta.description !== 'string' || !meta.description.trim()) throw new Error('missing description');
        // Preserve the existing multi-provider fields (model/user_invocable/argument-hint).
        if (meta.name.length > 64 || meta.description.length > 1024) throw new Error('metadata too long');
      } catch (error) { errors.push(`${path}: ${error.message}`); }
    }
  }
}
visit(root);
for (const error of errors) console.error(error);
console.log(`Skill metadata: ${count} files, ${errors.length} errors`);
process.exitCode = errors.length ? 1 : 0;
