// قارئ CSV صغير: يدعم الفاصلة والفاصلة المنقوطة (إكسل العربي) والتبويب، والاقتباس، وBOM.
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const first = t.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const endRow = () => {
    row.push(cell); cell = "";
    if (row.some((x) => x.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; endRow(); }
    else cell += c;
  }
  endRow();
  return rows;
}

export function toCsv(rows: string[][]): string {
  const esc = (c: string) => (/[",\n\r;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
