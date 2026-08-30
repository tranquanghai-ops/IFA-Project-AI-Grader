export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

export const GEMINI_MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", detail: "Mặc định, đa phương thức và tiết kiệm hạn mức" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", detail: "Ổn định, chi phí thấp cho tác vụ đơn giản" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash", detail: "Chất lượng cao hơn cho chấm lại" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash", detail: "Cân bằng chất lượng và tốc độ" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash", detail: "Dùng khi cần chấm hoặc cân chỉnh kỹ" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", detail: "Tương thích dự phòng" }
];

export const getGeminiModelLabel = model => GEMINI_MODEL_OPTIONS.find(option => option.value === model)?.label || model || "Không rõ model";
