const OPEN_RE = /^<!-- brief:auto section="([^"]+)"(?: version="[^"]*")?(?: generated="[^"]*")? -->\s*$/;
const CLOSE_RE = /^<!-- \/brief:auto -->\s*$/;

export function parseMarkers(content) {
  const lines = content.split("\n");
  const sections = [];
  let i = 0;
  let manualStart = 0;
  let inCodeBlock = false;

  while (i < lines.length) {
    if (/^ {0,3}```/.test(lines[i])) {
      inCodeBlock = !inCodeBlock;
      i++;
      continue;
    }
    if (inCodeBlock) { i++; continue; }

    const openMatch = lines[i].match(OPEN_RE);
    if (openMatch) {
      if (i > manualStart) {
        sections.push({ type: "manual", content: lines.slice(manualStart, i).join("\n") });
      }
      const sectionId = openMatch[1];
      const startLine = i;
      i++;
      let found = false;
      while (i < lines.length) {
        if (/^ {0,3}```/.test(lines[i])) { inCodeBlock = !inCodeBlock; i++; continue; }
        if (inCodeBlock) { i++; continue; }
        if (CLOSE_RE.test(lines[i])) {
          sections.push({ type: "auto", id: sectionId, content: lines.slice(startLine + 1, i).join("\n"), openTag: lines[startLine] });
          manualStart = i + 1;
          found = true;
          i++;
          break;
        }
        if (OPEN_RE.test(lines[i])) {
          throw new Error(`Nested marker at line ${i + 1}: cannot have <!-- brief:auto --> inside another`);
        }
        i++;
      }
      if (!found) {
        throw new Error(`Unclosed marker for section "${sectionId}" starting at line ${startLine + 1}`);
      }
    } else {
      i++;
    }
  }

  if (manualStart < lines.length) {
    sections.push({ type: "manual", content: lines.slice(manualStart).join("\n") });
  }
  return sections;
}

export function mergeContent(sections, newGenerated, { version } = {}) {
  const ts = new Date().toISOString();
  const versionAttr = version ? ` version="${version}"` : "";
  const newTag = (id) => `<!-- brief:auto section="${id}"${versionAttr} generated="${ts}" -->`;
  const result = [];
  const usedSections = new Set();

  for (const section of sections) {
    if (section.type === "manual") {
      result.push(section.content);
    } else if (section.type === "auto") {
      usedSections.add(section.id);
      const newContent = newGenerated[section.id];
      const contentToWrite = newContent !== undefined ? newContent : section.content;
      const contentChanged = contentToWrite !== section.content;
      result.push(contentChanged ? newTag(section.id) : (section.openTag || newTag(section.id)));
      result.push(contentToWrite);
      result.push(`<!-- /brief:auto -->`);
    }
  }

  for (const [id, content] of Object.entries(newGenerated)) {
    if (!usedSections.has(id)) {
      result.push("");
      result.push(newTag(id));
      result.push(content);
      result.push(`<!-- /brief:auto -->`);
    }
  }

  return result.join("\n");
}
