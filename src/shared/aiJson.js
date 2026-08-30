export const parseAiJson = (value) => {
  const clean = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!clean) throw new Error("AI trả về nội dung rỗng.");
  const candidates = [clean];
  const firstObject = clean.indexOf("{");
  const lastObject = clean.lastIndexOf("}");
  const firstArray = clean.indexOf("[");
  const lastArray = clean.lastIndexOf("]");
  if (firstObject >= 0 && lastObject > firstObject) candidates.push(clean.slice(firstObject, lastObject + 1));
  if (firstArray >= 0 && lastArray > firstArray) candidates.push(clean.slice(firstArray, lastArray + 1));
  for (const candidate of [...new Set(candidates)]) {
    try { return JSON.parse(candidate); } catch (_) {
      try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")); } catch (_) { /* thử ứng viên tiếp theo */ }
    }
  }
  throw new Error("AI trả sai định dạng JSON. Hệ thống đã giữ bài và không tạo kết quả điểm lỗi; hãy bấm Chấm lại bằng AI.");
};
