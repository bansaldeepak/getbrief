// Table formatting for CLI output

export function table(headers, rows) {
  if (rows.length === 0) return "No items found.";

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] || "—").length)),
  );

  const sep = widths.map((w) => "-".repeat(w)).join(" | ");
  const head = headers.map((h, i) => h.padEnd(widths[i])).join(" | ");
  const body = rows
    .map((r) => r.map((c, i) => String(c || "—").padEnd(widths[i])).join(" | "))
    .join("\n");

  return `${head}\n${sep}\n${body}`;
}

export function statusOrder(status) {
  const order = { in_progress: 0, open: 1, active: 1, planned: 2, accepted: 3, done: 8, completed: 8, dropped: 9, superseded: 9, rejected: 9, clean: 9 };
  return order[status] ?? 5;
}
