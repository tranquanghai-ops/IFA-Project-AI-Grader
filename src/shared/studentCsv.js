const removeAccents = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export const parseCsvRows = source => {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];
    if (character === '"') {
      if (inQuotes && nextCharacter === '"') { row[row.length - 1] += '"'; index += 1; }
      else inQuotes = !inQuotes;
    } else if (character === ',' && !inQuotes) row.push("");
    else if ((character === '\r' || character === '\n') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      lines.push(row); row = [""];
    } else row[row.length - 1] += character;
  }
  if (row.length > 1 || row[0] !== "") lines.push(row);
  return lines;
};

export const decodeStudentCsv = buffer => {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  let windows1258 = "";
  try { windows1258 = new TextDecoder("windows-1258").decode(buffer); } catch (_) {}
  const brokenCount = value => (String(value || "").match(/\uFFFD/g) || []).length;
  return windows1258 && brokenCount(windows1258) < brokenCount(utf8) ? windows1258 : utf8;
};

export const extractStudentList = source => {
  const rawRows = parseCsvRows(source);
  if (rawRows.length < 2) throw new Error("File CSV trống hoặc không đúng định dạng.");
  const headers = rawRows[0].map(value => removeAccents(value).replace(/[^a-z0-9]+/g, " ").trim());
  const emailIndex = headers.findIndex(value => value.includes("email") || value.includes("mail") || value.includes("thu dien tu"));
  const idIndex = headers.findIndex(value => /^(mssv|student id|studentid|username|ten dang nhap|ma sinh vien)$/.test(value));
  const firstNameIndex = headers.findIndex(value => value.includes("first name") || value === "ten" || value.includes("given name"));
  const lastNameIndex = headers.findIndex(value => value.includes("last name") || value === "ho" || value.includes("surname") || value.includes("ho dem"));
  const fullNameIndex = headers.findIndex(value => value.includes("full name") || value.includes("ho va ten") || value.includes("ho ten"));
  const splitStudentIndex = headers.findIndex((value, index) => value === "sinh" && /^vi/.test(headers[index + 1] || ""));
  const output = [];
  rawRows.slice(1).forEach(row => {
    if (!row.length || row.every(cell => !String(cell || "").trim())) return;
    let idSource = String(row[idIndex >= 0 ? idIndex : emailIndex >= 0 ? emailIndex : 0] || "").trim();
    if (idSource.includes("@")) idSource = idSource.split("@")[0];
    const studentId = idSource.match(/\b1[a-zA-Z0-9]{7}\b/)?.[0]?.toUpperCase() || "";
    let studentName = "";
    if (splitStudentIndex >= 0) studentName = `${row[splitStudentIndex] || ""} ${row[splitStudentIndex + 1] || ""}`;
    else if (fullNameIndex >= 0) studentName = row[fullNameIndex] || "";
    else if (lastNameIndex >= 0 || firstNameIndex >= 0) studentName = `${row[lastNameIndex] || ""} ${row[firstNameIndex] || ""}`;
    else if (idIndex >= 0) studentName = `${row[idIndex + 1] || ""} ${row[idIndex + 2] || ""}`;
    else studentName = row[1] || "";
    studentName = String(studentName).replace(/\s+/g, " ").trim();
    if (studentId && studentName && studentName !== studentId) output.push({ studentId, studentName });
  });
  return output;
};
