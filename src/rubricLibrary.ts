export type RubricLibraryEntry = {
  id: string;
  mode: "project" | "thesis";
  title: string;
  description?: string;
  file: string;
};

export type RubricLibraryItem = {
  id: string;
  name: string;
  maxScore: number;
  desc: string;
};

const cleanCell = (value: unknown) => String(value ?? "").trim().replace(/^["']|["']$/g, "");

const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells.map(cleanCell);
};

export const parseRubricCsv = (csvText: string): RubricLibraryItem[] => {
  const lines = String(csvText || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("Tệp CSV không có dữ liệu rubric.");
  const headers = splitCsvLine(lines[0]).map(value => value.toLowerCase());
  const findColumn = (...aliases: string[]) => headers.findIndex(header => aliases.some(alias => header === alias || header.includes(alias)));
  const idIndex = findColumn("id", "ma tieu chi", "mã tiêu chí");
  const nameIndex = findColumn("name", "ten tieu chi", "tên tiêu chí", "tieu chi", "tiêu chí");
  const scoreIndex = findColumn("maxscore", "max score", "diem toi da", "điểm tối đa", "trong so", "trọng số");
  const descIndex = findColumn("desc", "description", "mo ta", "mô tả", "yeu cau", "yêu cầu");
  if (nameIndex < 0 || scoreIndex < 0) throw new Error("CSV cần có cột Tên tiêu chí và Điểm tối đa.");

  const items = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const maxScore = Number(String(cells[scoreIndex] || "").replace(",", "."));
    const id = cleanCell(idIndex >= 0 ? cells[idIndex] : "") || `criterion_${rowIndex + 1}`;
    return {
      id: id.replace(/[^a-zA-Z0-9_-]/g, "_"),
      name: cleanCell(cells[nameIndex]),
      maxScore,
      desc: cleanCell(descIndex >= 0 ? cells[descIndex] : "")
    };
  }).filter(item => item.name && Number.isFinite(item.maxScore) && item.maxScore > 0);
  if (!items.length) throw new Error("Không tìm thấy tiêu chí rubric hợp lệ trong CSV.");
  return items;
};

export const loadRubricManifest = async (mode: "project" | "thesis"): Promise<RubricLibraryEntry[]> => {
  const response = await fetch("./rubrics/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Không đọc được danh mục rubric GitHub (${response.status}).`);
  const entries = await response.json();
  return (Array.isArray(entries) ? entries : []).filter(entry => entry?.mode === mode && entry?.file);
};

export const loadRubricEntry = async (entry: RubricLibraryEntry): Promise<RubricLibraryItem[]> => {
  const safeFile = String(entry.file || "").replace(/^\/+/, "");
  const response = await fetch(`./rubrics/${safeFile}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Không đọc được rubric “${entry.title}” (${response.status}).`);
  return parseRubricCsv(await response.text());
};
