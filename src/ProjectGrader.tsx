import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Sliders, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Download, 
  Plus, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  History, 
  ChevronRight, 
  ChevronLeft,
  Info,
  RotateCw,
  FolderOpen,
  Check,
  Clock,
  Maximize2,
  X,
  Play,
  FileSpreadsheet,
  GraduationCap,
  DownloadCloud,
  UploadCloud,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Fingerprint,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Sun,
  Moon,
  Users,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  UserCheck,
  UserX
} from 'lucide-react';
import { countGeminiKeys, getVisibleGeminiKeySlots, loadGeminiKeyPool, MAX_GEMINI_API_KEYS, saveGeminiKeyPool } from './geminiKeyPool';

const APP_VERSION = "V6";
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const DEFAULT_REVIEW_MODEL = "gemini-3-flash-preview";
const GEMINI_MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview – mặc định, tiết kiệm" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash – chấm lại / cân chỉnh kỹ" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash – tương thích" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash – tiết kiệm" }
];
const REVIEW_MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview – mặc định" },
  { value: "gemini-3.1-flash-lite", label: "Flash Lite – dự phòng, tải nhẹ" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash – kỹ hơn" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash – tốt nhất" }
];
const DEFAULT_GRADING_STRATEGY = "all";
const PDF_RENDER_SCALE = 0.9;
const PDF_JPEG_QUALITY = 0.45;
const MAX_PDF_TEXT_CHARS = 140000;
const GRADING_STRATEGY_OPTIONS = [
  { value: "all", label: "Tất cả trang (mặc định)" },
  { value: "sections", label: "Theo mục / tiêu đề chính" },
  { value: "chunks8", label: "Theo cụm 8 trang – đọc kỹ" },
  { value: "split2", label: "Chia toàn bộ PDF thành 2 lượt" },
  { value: "split3", label: "Chia toàn bộ PDF thành 3 lượt" },
  { value: "chunks50", label: "Theo cụm 50 trang" },
  { value: "chunks75", label: "Theo cụm 75 trang" },
  { value: "chunks100", label: "Theo cụm 100 trang" },
  { value: "chunks125", label: "Theo cụm 125 trang" },
  { value: "chunks150", label: "Theo cụm 150 trang" }
];

const DEFAULT_RUBRIC = [
  { id: 'research_concept', name: 'Nghiên cứu & Ý tưởng (Concept)', maxScore: 2.5, desc: 'Phương pháp nghiên cứu đề tài, tính sáng tạo của ý tưởng thiết kế, giải pháp công năng giải quyết vấn đề và tính thực tiễn.' },
  { id: 'technical_anatomy', name: 'Bản vẽ kỹ thuật & Quy chuẩn', maxScore: 3.0, desc: 'Độ chính xác của hệ thống mặt bằng, mặt đứng, mặt cắt, tỷ lệ xích, các ghi chú kỹ thuật, tính hợp lý của cấu trúc vật thể/không gian.' },
  { id: 'visual_shading', name: 'Phối cảnh 3D & Diễn họa không gian', maxScore: 2.5, desc: 'Khả năng render/vẽ phác thảo phối cảnh góc nhìn rộng, xử lý nguồn sáng, chất cảm vật liệu và mức độ thẩm mỹ thị giác.' },
  { id: 'presentation_layout', name: 'Thuyết minh & Bố cục dàn trang (Layout)', maxScore: 2.0, desc: 'Bố cục thiết kế slide/portfolio, tính mạch lạc logic trong thuyết minh diễn giải phương án và tính thẩm mỹ chuyên nghiệp trong trình bày.' }
];

const parseAiJson = (value) => {
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

const pdfItemsToLines = (items = []) => {
  const rows = [];
  items.forEach(item => {
    const text = String(item?.str || "").trim();
    if (!text) return;
    const y = Math.round(Number(item?.transform?.[5] || 0));
    const x = Number(item?.transform?.[4] || 0);
    const fontSize = Math.abs(Number(item?.transform?.[0] || item?.height || 0));
    let row = rows.find(candidate => Math.abs(candidate.y - y) <= 2);
    if (!row) { row = { y, parts: [], fontSize: 0 }; rows.push(row); }
    row.parts.push({ x, text });
    row.fontSize = Math.max(row.fontSize, fontSize);
  });
  return rows.sort((a, b) => b.y - a.y).map(row => ({
    text: row.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(" ").replace(/\s+/g, " ").trim(),
    fontSize: row.fontSize
  })).filter(row => row.text);
};

const cleanMainHeading = (rawValue) => String(rawValue || "")
  .replace(/(?:\.{2,}|\s)(\d{1,4})\s*$/, "")
  .replace(/\s+/g, " ")
  .trim();

const normalizeHeadingKey = (value) => removeAccents(cleanMainHeading(value))
  .replace(/^(?:chuong|chapter|phan|bai|module)\s+/i, "")
  .replace(/^(?:so\s*)?(?:[0-9]+|[ivxlcdm]+)\s*[.):_-]?\s*/i, "")
  .replace(/\b(de tai|noi dung)\b\s*$/i, match => match)
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const headingTokenSimilarity = (left, right) => {
  const a = new Set(normalizeHeadingKey(left).split(" ").filter(Boolean));
  const b = new Set(normalizeHeadingKey(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
};

const isMeaningfulMainHeading = (rawValue, options = {}) => {
  const label = cleanMainHeading(rawValue);
  const plain = removeAccents(label);
  const plainCore = plain.replace(/^(?:so\s*)?(?:[0-9]+|[ivxlcdm]+)\s*[.):_-]?\s*/i, "");
  const words = plain.split(/\s+/).filter(Boolean);
  const knownMain = /^(?:(?:chuong|chapter|phan|bai|module)\s+(?:[0-9ivxlcdm]+)\b|mo dau\b|gioi thieu(?:\s+de tai)?\b|tong quan\b|nghien cuu\b|y tuong(?:\s+thiet ke)?\b|giai phap(?:\s+thiet ke)?\b|ket luan\b|tai lieu tham khao\b|phu luc\b)/i.test(plainCore);
  if (!label || label.length < 5 || label.length > 105) return false;
  if (/^[a-z]{1,4}\s*[-_.]?\s*\d{1,3}$/i.test(plain) || /^\d{1,3}$/i.test(plain)) return false;
  if (/^(?:mat bang|mat cat|mat dung|phoi canh|chi tiet|layout|ban ve|trien lam)\b/i.test(plainCore) && !/^(?:chuong|phan|bai)\b/i.test(plainCore)) return false;
  if (/:/.test(label) && words.length > 6 && !/^(?:chuong|chapter|phan|bai|module)\b/i.test(plainCore)) return false;
  if (words.length < 2 && !knownMain) return false;
  if (words.length > 12 && !knownMain) return false;
  if (options.page === 1 && options.source === "Bookmark" && !knownMain) return false;
  if (options.depth > 0 && !knownMain) return false;
  return knownMain || options.visuallyProminent === true || options.depth === 0;
};

const canonicalMainHeading = (rawValue, fontSize = 0, pageMedianFont = 0) => {
  const original = cleanMainHeading(rawValue);
  if (!original || original.length < 3 || original.length > 150) return "";
  const plain = removeAccents(original);
  if (/^(muc luc|danh muc hinh|danh muc bang|tai lieu tham khao|phu luc|mo dau|gioi thieu|ket luan)\b/i.test(plain)) return original;
  if (/^(chuong|phan|bai|module|chapter)\s+[0-9ivxlcdm]+\b/i.test(plain)) return original;
  if (/^[0-9ivxlcdm]+\s*[.)-]\s+[^.]/i.test(plain) && !/^\d+\.\d+/.test(plain)) return original;
  const letters = original.replace(/[^A-Za-zÀ-ỹĐđ]/g, "");
  const upperLetters = original.replace(/[^A-ZÀ-ỸĐ]/g, "");
  const visuallyLarge = pageMedianFont > 0 && fontSize >= pageMedianFont * 1.32;
  const mostlyUppercase = letters.length >= 5 && upperLetters.length / letters.length >= 0.82;
  return visuallyLarge && mostlyUppercase ? original : "";
};

const flattenOutline = (items = [], depth = 0, output = []) => {
  (items || []).forEach(item => {
    output.push({ ...item, depth });
    if (item?.items?.length) flattenOutline(item.items, depth + 1, output);
  });
  return output;
};

const normalizePdfSections = (sections = [], totalPages = 1) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const deduped = [];
  (sections || []).map((section, index) => ({
    ...section,
    label: String(section?.label || `Phần ${index + 1}`).trim() || `Phần ${index + 1}`,
    startPage: Math.min(safeTotal, Math.max(1, Math.round(Number(section?.startPage) || 1))),
    detectedBy: section?.detectedBy || "Giảng viên chỉnh thủ công"
  })).filter(section => section.detectedBy?.includes("Giảng viên") || section.label === "Phần đầu bài nộp" || isMeaningfulMainHeading(section.label, { page: section.startPage, source: section.detectedBy || "", depth: 0, visuallyProminent: true }))
    .sort((a, b) => a.startPage - b.startPage).forEach(section => {
    const existing = deduped.find(item => item.startPage === section.startPage || (normalizeHeadingKey(item.label) && normalizeHeadingKey(item.label) === normalizeHeadingKey(section.label)) || headingTokenSimilarity(item.label, section.label) >= 0.86);
    if (!existing) deduped.push(section);
    else if ((section.weight || 0) > (existing.weight || 0) || ((section.weight || 0) === (existing.weight || 0) && section.startPage < existing.startPage)) Object.assign(existing, section);
  });
  if (deduped.length && deduped[0].startPage > 1) deduped.unshift({ label: "Phần đầu bài nộp", startPage: 1, detectedBy: "Trước tiêu đề chính đầu tiên" });
  return deduped.map((section, index) => ({
    ...section,
    endPage: index < deduped.length - 1 ? Math.max(section.startPage, deduped[index + 1].startPage - 1) : safeTotal
  })).filter(section => section.startPage <= section.endPage);
};

const summarizePdfSections = (sections = []) => sections.map(section => `${section.label}: trang ${section.startPage}–${section.endPage}`).join("; ");

const detectPdfMainSections = async (pdf, pageDataList = []) => {
  const direct = [];
  const toc = [];
  const bookmarks = [];
  pageDataList.forEach(pageData => {
    const lines = pageData.lines || [];
    const fontSizes = lines.map(line => line.fontSize).filter(Boolean).sort((a, b) => a - b);
    const medianFont = fontSizes.length ? fontSizes[Math.floor(fontSizes.length / 2)] : 0;
    const normalizedPage = removeAccents(pageData.text || "");
    const isToc = /\bmuc luc\b/i.test(normalizedPage);
    if (isToc && pageData.page <= Math.min(30, pdf.numPages)) {
      lines.forEach(line => {
        const match = line.text.match(/(?:\.{2,}|\s)(\d{1,4})\s*$/);
        const label = canonicalMainHeading(line.text, line.fontSize, medianFont);
        if (match && label && isMeaningfulMainHeading(label, { page: pageData.page, source: "Mục lục", depth: 0, visuallyProminent: true })) toc.push({ label, printedPage: Number(match[1]), source: "Mục lục", weight: 2 });
      });
    } else {
      lines.slice(0, 35).forEach(line => {
        const label = canonicalMainHeading(line.text, line.fontSize, medianFont);
        const visuallyProminent = medianFont > 0 && line.fontSize >= medianFont * 1.32;
        if (label && isMeaningfulMainHeading(label, { page: pageData.page, source: "Tiêu đề trong trang", depth: 0, visuallyProminent })) direct.push({ label, page: pageData.page, source: "Tiêu đề trong trang", weight: 4 });
      });
    }
  });
  try {
    const outline = flattenOutline(await pdf.getOutline());
    for (const item of outline.filter(item => item.depth <= 1)) {
      if (!item?.title || !item?.dest) continue;
      let destination = item.dest;
      if (typeof destination === "string") destination = await pdf.getDestination(destination);
      if (!Array.isArray(destination) || !destination[0]) continue;
      const pageIndex = await pdf.getPageIndex(destination[0]);
      const label = cleanMainHeading(item.title);
      if (!isMeaningfulMainHeading(label, { page: pageIndex + 1, source: "Bookmark", depth: item.depth })) continue;
      bookmarks.push({ label, page: pageIndex + 1, source: "Bookmark", weight: item.depth === 0 ? 5 : 2, depth: item.depth });
    }
  } catch (error) { console.warn("Không đọc được bookmark PDF:", error); }

  const normalizeLabelKey = normalizeHeadingKey;
  const trusted = [...bookmarks, ...direct];
  const offsets = [];
  toc.forEach(tocItem => {
    const key = normalizeLabelKey(tocItem.label);
    const match = trusted.find(item => normalizeLabelKey(item.label) === key);
    if (match) offsets.push(match.page - tocItem.printedPage);
  });
  offsets.sort((a, b) => a - b);
  const tocOffset = offsets.length ? offsets[Math.floor(offsets.length / 2)] : 0;
  const candidates = [...bookmarks, ...direct, ...toc.filter(() => offsets.length).map(item => ({ ...item, page: item.printedPage + tocOffset }))]
    .filter(item => item.page >= 1 && item.page <= pdf.numPages)
    .sort((a, b) => a.page - b.page || b.weight - a.weight);
  const selected = [];
  candidates.forEach(candidate => {
    const key = normalizeLabelKey(candidate.label);
    const duplicate = selected.find(item => normalizeLabelKey(item.label) === key || headingTokenSimilarity(item.label, candidate.label) >= 0.86);
    if (!duplicate) selected.push({ label: candidate.label, startPage: candidate.page, detectedBy: candidate.source, weight: candidate.weight });
    else if (candidate.weight > duplicate.weight || (candidate.weight === duplicate.weight && candidate.page < duplicate.startPage)) Object.assign(duplicate, { label: candidate.label, startPage: candidate.page, detectedBy: candidate.source, weight: candidate.weight });
  });
  return normalizePdfSections(selected, pdf.numPages);
};

const cleanSystemicKeywords = (str) => {
  if (!str) return "";
  return str
    .replace(/assignsubmission_file_?/gi, " ")
    .replace(/assignsubmission_file/gi, " ")
    .replace(/assignsubmission/gi, " ")
    .replace(/submission/gi, " ")
    .replace(/IMG_\d+/gi, " ")
    .replace(/IMG/gi, " ")
    .replace(/file/gi, " ")
    .replace(/image/gi, " ")
    .replace(/photo/gi, " ")
    .replace(/capture/gi, " ")
    .replace(/draw/gi, " ")
    .replace(/draft/gi, " ")
    .replace(/doan/gi, " ")
    .replace(/assignment/gi, " ")
    .replace(/portfolio/gi, " ")
    .replace(/_\d+_\d+/g, " ") 
    .replace(/[\d]{6,}/g, " ") 
    .replace(/[\s\-_]+/g, " ")
    .trim();
};

const toTitleCase = (str) => {
  if (!str) return "";
  return str.trim().toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const removeAccents = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const validateExtractedName = (rawName, fallback) => {
  if (!rawName) return (fallback && fallback.trim() !== "") ? toTitleCase(fallback) : "Không Rõ";
  const cleaned = rawName.trim();
  if (cleaned === "") return (fallback && fallback.trim() !== "") ? toTitleCase(fallback) : "Không Rõ";
  const lower = cleaned.toLowerCase();
  const invalidKeywords = ["không", "chưa", "null", "unknown", "none", "n/a", "no name", "không rõ", "không tìm thấy", "trống", "chưa rõ", "không có", "thông tin"];
  if (invalidKeywords.some(keyword => lower.includes(keyword))) return (fallback && fallback.trim() !== "") ? toTitleCase(fallback) : "Không Rõ";
  return toTitleCase(cleaned);
};

const validateExtractedId = (rawId, fallback) => {
  if (!rawId) return (fallback && fallback.trim() !== "") ? fallback.trim() : "Không Rõ";
  const cleaned = rawId.trim();
  if (/^1[a-zA-Z0-9]{7}$/i.test(cleaned)) return cleaned.toUpperCase();
  return (fallback && fallback.trim() !== "") ? fallback.trim() : "Không Rõ";
};

const reconcileWithClassList = (name, id, classList) => {
  if (!classList || classList.length === 0) {
    return { name, id, isMatched: true, note: "" };
  }

  const cleanId = (id || "").trim().toUpperCase();
  const cleanName = (name || "").trim();

  if (cleanId && cleanId !== "KHÔNG RÕ" && cleanId !== "ĐANG QUÉT...") {
    const matchedById = classList.find(s => s.studentId.trim().toUpperCase() === cleanId);
    if (matchedById) {
      return {
        name: matchedById.studentName,
        id: matchedById.studentId,
        isMatched: true,
        note: ""
      };
    }
  }

  if (cleanName && cleanName !== "Không Rõ" && cleanName !== "Đang xử lý...") {
    const normNameInput = removeAccents(cleanName);
    const matchedByName = classList.find(s => removeAccents(s.studentName) === normNameInput);
    if (matchedByName) {
      return {
        name: matchedByName.studentName,
        id: matchedByName.studentId,
        isMatched: true,
        note: ""
      };
    }

    const partialMatch = classList.find(s => {
      const normListName = removeAccents(s.studentName);
      return normListName.includes(normNameInput) || normNameInput.includes(normListName);
    });
    if (partialMatch) {
      return {
        name: partialMatch.studentName,
        id: partialMatch.studentId,
        isMatched: true,
        note: ""
      };
    }
  }

  return {
    name,
    id,
    isMatched: false,
    note: "Không tìm thấy trong danh sách tải lên"
  };
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('ifa-grader-theme');
      if (savedTheme) return savedTheme;
    }
    return 'dark';
  });
  
  const [rubric, setRubric] = useState(DEFAULT_RUBRIC);
  const [currentStep, setCurrentStep] = useState(1); 
  const [sidebarFilter, setSidebarFilter] = useState('all'); 
  
  const [globalSubject, setGlobalSubject] = useState('');
  const [globalSubjectCode, setGlobalSubjectCode] = useState(''); 
  const [globalGroup, setGlobalGroup] = useState('');
  const [globalAcademicYear, setGlobalAcademicYear] = useState('');
  const [globalSemester, setGlobalSemester] = useState('');
  const [globalExam, setGlobalExam] = useState('Quá trình 1');
  const [globalLecturer, setGlobalLecturer] = useState('');
  const [globalGradingStrategy, setGlobalGradingStrategy] = useState(DEFAULT_GRADING_STRATEGY);
  const [apiKeyPool, setApiKeyPool] = useState(() => loadGeminiKeyPool([
    typeof window !== 'undefined' ? localStorage.getItem('ifa-project-gemini-api-key') || '' : ''
  ]));
  const [activeGeminiModel, setActiveGeminiModel] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('ifa-project-gemini-model') || DEFAULT_GEMINI_MODEL : DEFAULT_GEMINI_MODEL);
  const [reviewGeminiModel, setReviewGeminiModel] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('ifa-project-review-model') || DEFAULT_REVIEW_MODEL : DEFAULT_REVIEW_MODEL);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [draftApiKeys, setDraftApiKeys] = useState(() => [...apiKeyPool.keys]);
  const [draftActiveApiKeyIndex, setDraftActiveApiKeyIndex] = useState(apiKeyPool.activeIndex);
  const [visibleApiKeySlots, setVisibleApiKeySlots] = useState(() => getVisibleGeminiKeySlots(apiKeyPool.keys));
  const apiKey = apiKeyPool.keys[apiKeyPool.activeIndex] || '';

  const rubricFileInputRef = useRef(null);
  const projectFileInputRef = useRef(null); 
  const smartRubricInputRef = useRef(null);
  const classListInputRef = useRef(null);

  const [isGradedDrawerOpen, setIsGradedDrawerOpen] = useState(false);
  const [zoomedFile, setZoomedFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [isCalibratingScores, setIsCalibratingScores] = useState(false);
  const [calibrationReview, setCalibrationReview] = useState(null);
  const [showCalibrationReviewModal, setShowCalibrationReviewModal] = useState(false);
  const [scoreVersionProjectId, setScoreVersionProjectId] = useState(null);
  const [generatingRubricReviewKey, setGeneratingRubricReviewKey] = useState("");

  const [gradingFeedbacks, setGradingFeedbacks] = useState([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isGeneratingTuning, setIsGeneratingTuning] = useState(false);
  const [isExtractingRubric, setIsExtractingRubric] = useState(false);
  const [isExtractingClassList, setIsExtractingClassList] = useState(false);

  const [aiSuspectDetailProject, setAiSuspectDetailProject] = useState(null);
  const [aiAuditInstruction, setAiAuditInstruction] = useState("");
  const [isRegeneratingAiAudit, setIsRegeneratingAiAudit] = useState(false);
  const [chartType, setChartType] = useState('column');

  const [toast, setToast] = useState({ message: "", type: "success" });
  
  const [gradingProjectId, setGradingProjectId] = useState(null);
  const stopBatchRef = useRef(false);
  const pdfProcessingRef = useRef(new Set());

  const [classList, setClassList] = useState([]);
  const [showClassListComparisonModal, setShowClassListComparisonModal] = useState(false);
  
  const [editingProjId, setEditingProjId] = useState(null);
  const [editingClassStudentId, setEditingClassStudentId] = useState(null);
  
  const [tempStudentName, setTempStudentName] = useState("");
  const [tempStudentId, setTempStudentId] = useState("");

  const [imgScale, setImgScale] = useState(1.0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ifa-grader-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !apiKey) setShowApiSettings(true);
  }, []);

  const saveApiSettings = () => {
    const nextPool = saveGeminiKeyPool(draftApiKeys, draftActiveApiKeyIndex);
    if (!nextPool.keys.some(Boolean)) {
      showToast("Vui lòng nhập ít nhất một Gemini API key trước khi lưu.", "error");
      return;
    }
    setApiKeyPool(nextPool);
    localStorage.setItem('ifa-project-gemini-api-key', nextPool.keys[nextPool.activeIndex]);
    localStorage.setItem('ifa-project-gemini-model', activeGeminiModel);
    localStorage.setItem('ifa-project-review-model', reviewGeminiModel);
    setShowApiSettings(false);
    showToast(`Đã lưu ${countGeminiKeys(nextPool)} API key; đang dùng khóa ${nextPool.activeIndex + 1}.`, "success");
  };

  const openApiSettings = () => {
    setDraftApiKeys([...apiKeyPool.keys]);
    setDraftActiveApiKeyIndex(apiKeyPool.activeIndex);
    setVisibleApiKeySlots(getVisibleGeminiKeySlots(apiKeyPool.keys));
    setShowApiSettings(true);
  };

  useEffect(() => {
    setImgScale(1.0);
  }, [zoomedFile]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    if (type !== "error") setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  const [pdfLibLoaded, setPdfjsLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [renderingPage, setRenderingPage] = useState(false);
  const canvasRef = useRef(null);

  const activeProject = projects.find(p => p.id === activeId) || {};
  const activeGradingProject = projects.find(p => p.id === gradingProjectId) || {};
  const activeGradingProgress = activeGradingProject.gradingProgress || [];
  const viewerProject = projects.find(p => p.id === zoomedFile?.projectId) || zoomedFile || {};

  useEffect(() => {
    setFeedbackInput("");
  }, [activeId]);

  const startGradingProgress = (projectId, message) => {
    setLoadingStep(message);
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, gradingProgress: [{ id: `p-${Date.now()}`, key: "start", message, status: "running", time: new Date().toISOString() }] } : project));
  };

  const recordGradingProgress = (projectId, message, key = message) => {
    setLoadingStep(message);
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const previous = (project.gradingProgress || []).map(item => item.status === "running" ? { ...item, status: "completed" } : item);
      const next = { id: `p-${Date.now()}-${previous.length}`, key, message, status: "running", time: new Date().toISOString() };
      const existingIndex = previous.findIndex(item => item.key === key);
      if (existingIndex >= 0) previous[existingIndex] = next; else previous.push(next);
      return { ...project, gradingProgress: previous };
    }));
  };

  const finishGradingProgress = (projectId, message = "Hoàn tất chấm bài") => {
    setLoadingStep(message);
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, gradingProgress: [...(project.gradingProgress || []).map(item => ({ ...item, status: item.status === "error" ? "error" : "completed" })), { id: `p-${Date.now()}-done`, key: "done", message, status: "completed", time: new Date().toISOString() }], aiGradingFailed: false } : project));
  };

  const failGradingProgress = (projectId, message) => {
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, aiGradingFailed: true, gradingProgress: [...(project.gradingProgress || []).map(item => item.status === "running" ? { ...item, status: "error" } : item), { id: `p-${Date.now()}-error`, key: "error", message, status: "error", time: new Date().toISOString() }] } : project));
  };

  const updatePdfSections = (projectId, sections, totalPages = 1) => {
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, pdfSections: normalizePdfSections(sections, totalPages || project.pdfTotalPages || 1), pdfStructureManuallyEdited: true } : project));
  };

  const handleUpdatePdfSection = (projectId, index, field, value) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const sections = [...(project.pdfSections || [])];
    if (!sections[index]) return;
    sections[index] = { ...sections[index], [field]: field === "startPage" ? Number(value) : value, detectedBy: "Giảng viên chỉnh thủ công" };
    updatePdfSections(projectId, sections, project.pdfTotalPages);
  };

  const handleAddPdfSection = (projectId, startPage) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const totalPages = Math.max(1, Number(project.pdfTotalPages) || 1);
    const occupied = new Set((project.pdfSections || []).map(item => Number(item.startPage)));
    let page = Math.min(totalPages, Math.max(1, Number(startPage) || 1));
    while (page <= totalPages && occupied.has(page)) page += 1;
    if (page > totalPages) { showToast("Không còn trang trống để thêm mục mới.", "error"); return; }
    updatePdfSections(projectId, [...(project.pdfSections || []), { label: `Mục chính ${(project.pdfSections || []).length + 1}`, startPage: page, detectedBy: "Giảng viên thêm thủ công" }], totalPages);
    setPdfPageNum(page);
  };

  const handleRemovePdfSection = (projectId, index) => {
    const project = projects.find(item => item.id === projectId);
    if (project) updatePdfSections(projectId, (project.pdfSections || []).filter((_, itemIndex) => itemIndex !== index), project.pdfTotalPages);
  };

  const handleRedetectPdfStructure = (projectId) => {
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, pdfSections: [], pdfStructureReady: false, pdfStructureManuallyEdited: false, isStructureProcessing: false } : project));
    pdfProcessingRef.current.delete(projectId);
    showToast("Đang dò lại tiêu đề chính, bookmark và mục lục...", "success");
  };

  const handleGlobalGradingStrategyChange = (value) => {
    setGlobalGradingStrategy(value);
    setProjects(prev => prev.map(project => ({ ...project, gradingStrategy: value })));
    showToast("Đã áp dụng cách AI đọc cho toàn bộ bài đang có.", "success");
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchWithRetry = async (url, options, retries = 5, backoffMs = 1000) => {
    if (!apiKey.trim()) {
      setDraftApiKey("");
      setShowApiSettings(true);
      throw new Error("Chưa có Gemini API key. Hãy mở Cấu hình AI và nhập khóa trước khi chấm.");
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const responseText = await response.text();
          const error = new Error(`Gemini API ${response.status}: ${responseText.slice(0, 350) || response.statusText}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (error) {
        const retryable = !error?.status || [408, 409, 425, 429].includes(error.status) || error.status >= 500;
        if (attempt === retries || !retryable) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(12000, backoffMs * Math.pow(2, attempt - 1))));
      }
    }
  };

  useEffect(() => {
    if (!pdfLibLoaded || projects.length === 0) return;

    const pdfsToProcess = projects.filter(p => p.mimeType === 'application/pdf' && !p.pdfStructureReady && !pdfProcessingRef.current.has(p.id) && p.base64);
    if (pdfsToProcess.length === 0) return;
    pdfsToProcess.forEach(p => pdfProcessingRef.current.add(p.id));

    const generateCoverThumbnailsAndOCR = async () => {
      const processedUpdates = await Promise.all(pdfsToProcess.map(async (p) => {
        try {
          const binData = atob(p.base64);
          const uint8Array = new Uint8Array(binData.length);
          for (let i = 0; i < binData.length; i++) {
            uint8Array[i] = binData.charCodeAt(i);
          }
          const pdf = await window.pdfjsLib.getDocument({ data: uint8Array }).promise;
          
          const pageDataList = [];
          let firstPageCanvas = null;
          let secondPageCanvas = null;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const lines = pdfItemsToLines(content.items);
            pageDataList.push({ page: pageNum, lines, text: lines.map(line => line.text).join("\n") });
            if (pageNum <= 2) {
              const viewport = page.getViewport({ scale: 0.8 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width; canvas.height = viewport.height;
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              if (pageNum === 1) firstPageCanvas = canvas; else secondPageCanvas = canvas;
            }
          }
          const combinedCanvas = document.createElement('canvas');
          combinedCanvas.width = Math.max(firstPageCanvas?.width || 1, secondPageCanvas?.width || 1);
          combinedCanvas.height = (firstPageCanvas?.height || 0) + (secondPageCanvas?.height || 0);
          const combinedCtx = combinedCanvas.getContext('2d');
          if (firstPageCanvas) combinedCtx.drawImage(firstPageCanvas, 0, 0);
          if (secondPageCanvas) combinedCtx.drawImage(secondPageCanvas, 0, firstPageCanvas?.height || 0);
          const coverDataUrl = firstPageCanvas?.toDataURL('image/jpeg', 0.6) || "";
          const ocrDataUrl = combinedCanvas.toDataURL('image/jpeg', 0.6);
          const ocrBase64 = ocrDataUrl.split(',')[1];
          const detectedSections = await detectPdfMainSections(pdf, pageDataList);

          if (p.isOcrLoading) {
            runImmediateOCR(p.id, ocrBase64, p.fallbackName, p.fallbackId, 'image/jpeg');
          }

          return { id: p.id, thumbnailUrl: coverDataUrl, pdfTotalPages: pdf.numPages, pdfPageTexts: pageDataList.map(item => ({ page: item.page, text: item.text })), pdfSections: p.pdfStructureManuallyEdited ? p.pdfSections : detectedSections, pdfStructureReady: true, isStructureProcessing: false };
        } catch (err) {
          console.error("Lỗi khi kết xuất PDF:", err);
          if (p.isOcrLoading) {
            let finalName = validateExtractedName(null, p.fallbackName);
            let finalId = validateExtractedId(null, p.fallbackId);
            if (classList && classList.length > 0) {
              const rec = reconcileWithClassList(finalName, finalId, classList);
              finalName = rec.name;
              finalId = rec.id;
            }
            setProjects(prev => prev.map(proj => proj.id === p.id ? { 
              ...proj, 
              studentName: finalName, 
              studentId: finalId, 
              classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
              classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
              isOcrLoading: false 
            } : proj));
          }
          return { id: p.id, thumbnailUrl: null, pdfStructureReady: true, isStructureProcessing: false, pdfStructureError: err.message || "Không thể đọc cấu trúc PDF" }; 
        } finally {
          pdfProcessingRef.current.delete(p.id);
        }
      }));

      setProjects(prev => {
        const nextState = [...prev];
        processedUpdates.forEach(update => {
          const idx = nextState.findIndex(x => x.id === update.id);
          if (idx !== -1) {
            nextState[idx] = { ...nextState[idx], ...update };
          }
        });
        return nextState;
      });
    };

    generateCoverThumbnailsAndOCR();
  }, [pdfLibLoaded, projects, classList]);

  useEffect(() => {
    if (zoomedFile && zoomedFile.isPDF && pdfLibLoaded && zoomedFile.base64) {
      setPdfDoc(null);
      setPdfPageNum(1);
      setRenderingPage(true);
      try {
        const binData = atob(zoomedFile.base64);
        const uint8Array = new Uint8Array(binData.length);
        for (let i = 0; i < binData.length; i++) {
          uint8Array[i] = binData.charCodeAt(i);
        }
        const loadingTask = window.pdfjsLib.getDocument({ data: uint8Array });
        loadingTask.promise.then((pdf) => {
          setPdfDoc(pdf);
          setPdfTotalPages(pdf.numPages);
          setRenderingPage(false);
        }).catch(err => {
          console.error("Lỗi khi load tài liệu PDF:", err);
          setRenderingPage(false);
        });
      } catch (err) {
        console.error("Lỗi parse Base64 PDF:", err);
        setRenderingPage(false);
      }
    }
  }, [zoomedFile, pdfLibLoaded]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      setRenderingPage(true);
      pdfDoc.getPage(pdfPageNum).then((page) => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: pdfScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: context, viewport: viewport };
        const renderTask = page.render(renderContext);
        renderTask.promise.then(() => {
          setRenderingPage(false);
        });
      }).catch(err => {
        console.error("Lỗi vẽ trang PDF lên Canvas:", err);
        setRenderingPage(false);
      });
    }
  }, [pdfDoc, pdfPageNum, pdfScale]);

  const base64ToBlobUrl = (base64, mimeType) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) {
      return `data:${mimeType};base64,${base64}`;
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      let updated = false;
      const nextProjects = projects.map(p => {
        if (p.base64 && !p.fileUrl) {
          updated = true;
          return { ...p, fileUrl: base64ToBlobUrl(p.base64, p.mimeType || "application/pdf") };
        }
        return p;
      });
      if (updated) {
        setProjects(nextProjects);
      }
    }
  }, [projects]);

  const extractInfoFromFilename = (filename) => {
    let nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const mssvMatch = nameWithoutExt.match(/\b1[a-zA-Z0-9]{7}\b/);
    const mssv = mssvMatch ? mssvMatch[0] : "";
    let nameOnly = nameWithoutExt.replace(mssv, "");
    let cleanedName = cleanSystemicKeywords(nameOnly);
    return { fallbackName: cleanedName, fallbackId: mssv };
  };

  const escapeCSV = (val) => {
    if (val === undefined || val === null) return "";
    let strVal = String(val).trim();
    strVal = strVal.replace(/\r?\n|\r/g, " ");
    if (strVal.includes(',') || strVal.includes('"') || strVal.includes(';') || strVal.includes('\t')) {
      strVal = '"' + strVal.replace(/"/g, '""') + '"';
    }
    return strVal;
  };

  const filteredProjects = projects.filter(p => {
    if (sidebarFilter === 'graded') return p.isGraded;
    if (sidebarFilter === 'pending') return !p.isGraded;
    return true;
  });

  const updateProjectField = (id, field, value) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        let updatedProject = { ...p, [field]: value };
        if (["generalComment", "improvements", "aiGeneratedStatus", "aiGeneratedDetails", "aiDetectionReport"].includes(field) && p.selectedScoreVersionId) {
          updatedProject.scoreVersions = (p.scoreVersions || []).map(version => version.id === p.selectedScoreVersionId ? { ...version, [field]: value, editedByLecturer: true } : version);
        }
        
        if (classList && classList.length > 0 && (field === 'studentName' || field === 'studentId')) {
          const reconciled = reconcileWithClassList(
            field === 'studentName' ? value : p.studentName,
            field === 'studentId' ? value : p.studentId,
            classList
          );
          updatedProject.studentName = reconciled.name;
          updatedProject.studentId = reconciled.id;
          updatedProject.classMatchStatus = reconciled.isMatched ? 'matched' : 'unmatched';
          updatedProject.classMatchNote = reconciled.note;
        }
        return updatedProject;
      }
      return p;
    }));
  };

  const updateActiveGrade = (criterionId, val, maxScore) => {
    if (!activeId) return;
    const numVal = parseFloat(val);
    const rounded = Math.round(numVal * 10) / 10; 
    const finalVal = Math.min(maxScore, Math.max(0, rounded));

    setProjects(prev => prev.map(p => {
      if (p.id === activeId) {
        const currentGrades = p.grades || {};
        const updatedGrades = { ...currentGrades, [criterionId]: finalVal };
        const hasScore = Object.values(updatedGrades).some(v => v > 0);
        return {
          ...p,
          isGraded: hasScore,
          grades: updatedGrades,
          hasUnsavedManualScore: true,
          manualScoreBaseGrades: p.hasUnsavedManualScore ? p.manualScoreBaseGrades : { ...currentGrades }
        };
      }
      return p;
    }));
  };

  const updateActiveReview = (criterionId, comment) => {
    if (!activeId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === activeId) {
        const currentReviews = p.reviews || {};
        const reviews = { ...currentReviews, [criterionId]: comment };
        return { ...p, reviews, dirtyRubricReviews: { ...(p.dirtyRubricReviews || {}), [criterionId]: true } };
      }
      return p;
    }));
  };

  const activeGrades = activeProject.grades || {};
  const totalScore = parseFloat(Object.values(activeGrades).reduce((sum, val) => sum + val, 0).toFixed(2));

  const makeScoreVersion = (project, data = {}, type = "ai_grading", note = "") => {
    const grades = { ...(data.grades || project.grades || {}) };
    return {
      id: `score-version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      label: "",
      createdAt: new Date().toISOString(),
      totalScore: Number(Object.values(grades).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2)),
      grades,
      reviews: { ...(data.reviews || project.reviews || {}) },
      generalComment: data.generalComment ?? project.generalComment ?? "",
      improvements: [...(data.improvements || project.improvements || [])],
      aiGeneratedStatus: data.aiGeneratedStatus ?? project.aiGeneratedStatus ?? "none",
      aiGeneratedDetails: data.aiGeneratedDetails ?? project.aiGeneratedDetails ?? "",
      aiDetectionReport: data.aiDetectionReport ?? project.aiDetectionReport ?? null,
      sourceId: data.scoreVersionSourceId || "",
      note
    };
  };

  const addAiDetectionVersion = (project, data = {}, source = "AI kiểm tra", instruction = "") => {
    const versions = [...(project.aiDetectionVersions || [])];
    const status = data.aiGeneratedStatus ?? project.aiGeneratedStatus ?? "none";
    const details = data.aiGeneratedDetails ?? project.aiGeneratedDetails ?? "";
    const report = data.aiDetectionReport ?? project.aiDetectionReport ?? null;
    const duplicate = versions.find(item => item.status === status && String(item.details || "").trim() === String(details || "").trim() && JSON.stringify(item.report || null) === JSON.stringify(report || null));
    const version = duplicate || {
      id: `ai-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `Bản ${versions.length + 1}`,
      status,
      details,
      report,
      source,
      instruction,
      createdAt: new Date().toISOString()
    };
    if (!duplicate) versions.push(version);
    return { aiDetectionVersions: versions, selectedAiDetectionVersionId: version.id };
  };

  const addRubricReviewVersions = (project, reviews = {}, source = "AI chấm") => {
    const rubricReviewVersions = { ...(project.rubricReviewVersions || {}) };
    const selectedRubricReviewVersions = { ...(project.selectedRubricReviewVersions || {}) };
    rubric.forEach(criterion => {
      const text = String(reviews?.[criterion.id] || "").trim();
      if (!text) return;
      const existing = [...(rubricReviewVersions[criterion.id] || [])];
      let version = existing.find(item => String(item.text || "").trim() === text);
      if (!version) {
        version = { id: `review-${criterion.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: `Bản ${existing.length + 1}`, text, source, createdAt: new Date().toISOString() };
        existing.push(version);
      }
      rubricReviewVersions[criterion.id] = existing;
      selectedRubricReviewVersions[criterion.id] = version.id;
    });
    return { rubricReviewVersions, selectedRubricReviewVersions };
  };

  const appendScoreVersion = (project, data, type, note = "") => {
    let versions = [...(project.scoreVersions || [])];
    if (versions.length === 0 && project.isGraded) {
      const original = makeScoreVersion(project, project.manualScoreBaseGrades ? { grades: project.manualScoreBaseGrades } : {}, "legacy", "Kết quả đang có trước khi tạo phiên bản mới");
      original.label = "Lần 1";
      versions.push(original);
    }
    const version = makeScoreVersion(project, data, type, note);
    version.label = `Lần ${versions.length + 1}`;
    versions.push(version);
    const reviewVersionState = ["ai_grading", "ai_regrade"].includes(type) ? addRubricReviewVersions(project, data.reviews || project.reviews || {}, type === "ai_regrade" ? "AI chấm lại" : "AI chấm") : { rubricReviewVersions: project.rubricReviewVersions || {}, selectedRubricReviewVersions: project.selectedRubricReviewVersions || {} };
    const aiDetectionVersionState = Object.prototype.hasOwnProperty.call(data || {}, "aiGeneratedStatus") ? addAiDetectionVersion(project, data, type === "ai_regrade" ? "AI kiểm tra khi chấm lại" : "AI kiểm tra khi chấm") : { aiDetectionVersions: project.aiDetectionVersions || [], selectedAiDetectionVersionId: project.selectedAiDetectionVersionId || "" };
    return {
      ...project,
      ...data,
      isGraded: true,
      aiGradingFailed: false,
      scoreVersions: versions,
      selectedScoreVersionId: version.id,
      hasUnsavedManualScore: false,
      manualScoreBaseGrades: null,
      ...reviewVersionState,
      ...aiDetectionVersionState
    };
  };

  const handleSelectScoreVersion = (projectId, versionId) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const version = (project.scoreVersions || []).find(item => item.id === versionId);
      if (!version) return project;
      const reviewVersionState = addRubricReviewVersions(project, version.reviews || {}, typeLabelsForReviewSource(version.type));
      const aiDetectionVersionState = addAiDetectionVersion(project, { aiGeneratedStatus: version.aiGeneratedStatus || "none", aiGeneratedDetails: version.aiGeneratedDetails || "", aiDetectionReport: version.aiDetectionReport || null }, typeLabelsForReviewSource(version.type));
      return {
        ...project,
        ...reviewVersionState,
        ...aiDetectionVersionState,
        grades: { ...version.grades },
        reviews: { ...version.reviews },
        generalComment: version.generalComment,
        improvements: [...(version.improvements || [])],
        aiGeneratedStatus: version.aiGeneratedStatus || "none",
        aiGeneratedDetails: version.aiGeneratedDetails || "",
        aiDetectionReport: version.aiDetectionReport || null,
        selectedScoreVersionId: version.id,
        hasUnsavedManualScore: false,
        manualScoreBaseGrades: null,
        isGraded: true
      };
    }));
    showToast("Đã chọn phiên bản này làm điểm cuối cùng.", "success");
  };

  const typeLabelsForReviewSource = (type) => ({
    ai_grading: "AI chấm",
    ai_regrade: "AI chấm lại",
    calibration: "Cân chỉnh điểm",
    manual_edit: "Giảng viên chỉnh",
    legacy: "Kết quả cũ"
  }[type] || "Phiên bản điểm");

  const handleSaveManualScoreVersion = (projectId = activeId) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const selected = (project.scoreVersions || []).find(item => item.id === project.selectedScoreVersionId);
    const changed = rubric.some(item => Math.abs(Number(project.grades?.[item.id] || 0) - Number(selected?.grades?.[item.id] || 0)) >= 0.05);
    if (!project.hasUnsavedManualScore || !changed) {
      setProjects(prev => prev.map(item => item.id === projectId ? { ...item, hasUnsavedManualScore: false } : item));
      showToast("Điểm hiện tại không khác phiên bản đã lưu.", "info");
      return;
    }
    setProjects(prev => prev.map(item => item.id === projectId ? appendScoreVersion(item, {
      grades: { ...(item.grades || {}) },
      reviews: { ...(item.reviews || {}) },
      generalComment: item.generalComment || "",
      improvements: [...(item.improvements || [])]
    }, "manual_edit", "Giảng viên lưu lần chỉnh điểm thủ công") : item));
    showToast("Đã lưu một phiên bản điểm do giảng viên chỉnh thủ công.", "success");
  };

  const handleSelectRubricReviewVersion = (projectId, criterionId, versionId) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const version = (project.rubricReviewVersions?.[criterionId] || []).find(item => item.id === versionId);
      if (!version) return project;
      const reviews = { ...(project.reviews || {}), [criterionId]: version.text };
      return {
        ...project,
        reviews,
        selectedRubricReviewVersions: { ...(project.selectedRubricReviewVersions || {}), [criterionId]: versionId },
        dirtyRubricReviews: { ...(project.dirtyRubricReviews || {}), [criterionId]: false },
        scoreVersions: (project.scoreVersions || []).map(item => item.id === project.selectedScoreVersionId ? { ...item, reviews: { ...(item.reviews || {}), [criterionId]: version.text } } : item)
      };
    }));
    showToast("Đã chọn phiên bản nhận xét dùng cho phiếu PDF.", "success");
  };

  const handleSaveManualRubricReviewVersion = (projectId, criterionId) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId || !project.dirtyRubricReviews?.[criterionId]) return project;
      const text = String(project.reviews?.[criterionId] || "").trim();
      if (!text) return { ...project, dirtyRubricReviews: { ...(project.dirtyRubricReviews || {}), [criterionId]: false } };
      const existing = [...(project.rubricReviewVersions?.[criterionId] || [])];
      let version = existing.find(item => String(item.text || "").trim() === text);
      if (!version) {
        version = { id: `review-${criterionId}-lecturer-${Date.now()}`, label: `Bản ${existing.length + 1}`, text, source: "Giảng viên chỉnh", createdAt: new Date().toISOString() };
        existing.push(version);
      }
      return {
        ...project,
        rubricReviewVersions: { ...(project.rubricReviewVersions || {}), [criterionId]: existing },
        selectedRubricReviewVersions: { ...(project.selectedRubricReviewVersions || {}), [criterionId]: version.id },
        dirtyRubricReviews: { ...(project.dirtyRubricReviews || {}), [criterionId]: false },
        scoreVersions: (project.scoreVersions || []).map(item => item.id === project.selectedScoreVersionId ? { ...item, reviews: { ...(item.reviews || {}), [criterionId]: text } } : item)
      };
    }));
  };

  const handleRegenerateRubricReview = async (projectId, criterionId) => {
    const project = projects.find(item => item.id === projectId);
    const criterion = rubric.find(item => item.id === criterionId);
    if (!project || !criterion || generatingRubricReviewKey) return;
    if (project.dirtyRubricReviews?.[criterionId]) handleSaveManualRubricReviewVersion(projectId, criterionId);
    const taskKey = `${projectId}-${criterionId}`;
    setGeneratingRubricReviewKey(taskKey);
    try {
      const previousTexts = (project.rubricReviewVersions?.[criterionId] || []).map(item => item.text).filter(Boolean).slice(-6);
      const prompt = `Bạn là giảng viên Mỹ thuật Công nghiệp. Hãy viết MỘT phiên bản nhận xét mới cho đúng tiêu chí rubric dưới đây, dựa vào bài nộp và điểm hiện tại. Nhận xét phải cụ thể về chuyên môn, chỉ ra mức đạt, điểm mạnh, thiếu sót và tác động đến điểm; không lặp lại các phiên bản cũ, không tập trung vào nghi vấn AI, không tự thay đổi điểm.\nMôn học: ${globalSubject}.\nTiêu chí: ${criterion.name}.\nMô tả rubric: ${criterion.desc}.\nĐiểm: ${Number(project.grades?.[criterionId] || 0).toFixed(1)}/${Number(criterion.maxScore).toFixed(1)}.\nNhận xét tổng quát: ${project.generalComment || ""}.\nCác bản đã có cần tránh lặp: ${JSON.stringify(previousTexts)}`;
      const parts = [{ text: prompt }];
      const isWord = project.mimeType === 'application/msword' || project.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (isWord && project.extractedText) parts.push({ text: String(project.extractedText).slice(0, MAX_PDF_TEXT_CHARS) });
      else if (project.base64) parts.push({ inlineData: { mimeType: project.mimeType || "image/jpeg", data: project.base64 } });
      const payload = { contents: [{ parts }], generationConfig: { temperature: 0.75, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { review: { type: "STRING" } }, required: ["review"] } } };
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const generated = resultText ? String(parseAiJson(resultText).review || "").trim() : "";
      if (!generated) throw new Error("AI không trả nhận xét mới.");
      setProjects(prev => prev.map(item => {
        if (item.id !== projectId) return item;
        const existing = [...(item.rubricReviewVersions?.[criterionId] || [])];
        const version = { id: `review-${criterionId}-ai-${Date.now()}`, label: `Bản ${existing.length + 1}`, text: generated, source: "AI tạo lại", createdAt: new Date().toISOString() };
        existing.push(version);
        const reviews = { ...(item.reviews || {}), [criterionId]: generated };
        return { ...item, reviews, rubricReviewVersions: { ...(item.rubricReviewVersions || {}), [criterionId]: existing }, selectedRubricReviewVersions: { ...(item.selectedRubricReviewVersions || {}), [criterionId]: version.id }, dirtyRubricReviews: { ...(item.dirtyRubricReviews || {}), [criterionId]: false }, scoreVersions: (item.scoreVersions || []).map(scoreVersion => scoreVersion.id === item.selectedScoreVersionId ? { ...scoreVersion, reviews } : scoreVersion) };
      }));
      showToast("Đã tạo một phiên bản nhận xét rubric mới.", "success");
    } catch (error) {
      showToast(`Không thể tạo lại nhận xét: ${error.message || "Lỗi không xác định"}`, "error");
    } finally {
      setGeneratingRubricReviewKey("");
    }
  };

  const persistPendingManualChanges = (project) => {
    let nextProject = { ...project };
    const dirtyReviews = { ...(nextProject.dirtyRubricReviews || {}) };
    const rubricReviewVersions = { ...(nextProject.rubricReviewVersions || {}) };
    const selectedRubricReviewVersions = { ...(nextProject.selectedRubricReviewVersions || {}) };

    rubric.forEach(criterion => {
      if (!dirtyReviews[criterion.id]) return;
      const reviewText = String(nextProject.reviews?.[criterion.id] || "").trim();
      if (reviewText) {
        const existing = [...(rubricReviewVersions[criterion.id] || [])];
        let version = existing.find(item => String(item.text || "").trim() === reviewText);
        if (!version) {
          version = { id: `review-${criterion.id}-lecturer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: `Bản ${existing.length + 1}`, text: reviewText, source: "Giảng viên chỉnh", createdAt: new Date().toISOString() };
          existing.push(version);
        }
        rubricReviewVersions[criterion.id] = existing;
        selectedRubricReviewVersions[criterion.id] = version.id;
      }
      dirtyReviews[criterion.id] = false;
    });

    nextProject = {
      ...nextProject,
      rubricReviewVersions,
      selectedRubricReviewVersions,
      dirtyRubricReviews: dirtyReviews,
      scoreVersions: (nextProject.scoreVersions || []).map(version => version.id === nextProject.selectedScoreVersionId ? { ...version, reviews: { ...(nextProject.reviews || {}) } } : version)
    };
    if (nextProject.hasUnsavedManualScore) {
      const selected = (nextProject.scoreVersions || []).find(item => item.id === nextProject.selectedScoreVersionId);
      const changed = rubric.some(item => Math.abs(Number(nextProject.grades?.[item.id] || 0) - Number(selected?.grades?.[item.id] || 0)) >= 0.05);
      nextProject = changed ? appendScoreVersion(nextProject, {
        grades: { ...(nextProject.grades || {}) },
        reviews: { ...(nextProject.reviews || {}) },
        generalComment: nextProject.generalComment || "",
        improvements: [...(nextProject.improvements || [])]
      }, "manual_edit", "Giảng viên lưu lần chỉnh điểm thủ công") : { ...nextProject, hasUnsavedManualScore: false, manualScoreBaseGrades: null };
    }
    return nextProject;
  };

  const handleLearnFromCurrentGrading = () => {
    if (!activeId || !activeProject) return;

    const customStandard = rubric.map(r => {
      const score = activeGrades[r.id] || 0;
      const review = (activeProject.reviews && activeProject.reviews[r.id]) || "Đồng ý đánh giá.";
      return `- ${r.name}: ${score}/${r.maxScore} điểm. Nhận xét: "${review}"`;
    }).join('\n');

    const learningInstruction = `CHỈ THỊ PHONG CÁCH CHẤM CHUẨN (Học từ thực tế điều chỉnh của Giảng viên cho bài của sinh viên ${activeProject.studentName || "Mẫu"}):
    Giảng viên đã chấm điểm và nhận xét thực tế làm chuẩn như sau:
    ${customStandard}
    Nhận xét tổng quát chuẩn: "${activeProject.generalComment || ""}"
    Hãy sử dụng chính xác tỷ lệ phân phối điểm, mức độ nghiêm khắc và văn phong nhận xét mẫu này để làm thước đo đánh giá thống nhất cho các bài còn lại trong hàng đợi.`;

    setGradingFeedbacks(prev => [...prev, learningInstruction]);
    showToast("AI đã tiếp thu thành công phương pháp chấm bài chuẩn này để chấm các bài tiếp theo!", "success");
  };

  const handleFinalizeActiveGrading = () => {
    if (!activeId) return;
    setProjects(prev => prev.map(project => project.id === activeId ? persistPendingManualChanges(project) : project));
    handleLearnFromCurrentGrading();
    setIsGradedDrawerOpen(false);
  };

  const handleSelectProject = (id) => {
    setActiveId(id);
  };

  const handleRemoveProject = (id, e) => {
    if (e) e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const simulateStandardGrading = (id) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const fallbackGrades = {};
        const fallbackReviews = {};
        rubric.forEach(r => {
          fallbackGrades[r.id] = 0;
          fallbackReviews[r.id] = "AI đang bị lỗi hoặc quá tải. Giảng viên vui lòng tự kéo thanh trượt để chấm điểm.";
        });
        return {
          ...p,
          isGraded: false,
          grades: fallbackGrades,
          reviews: fallbackReviews,
          generalComment: "Không thể nhận phản hồi từ AI lúc này. Vui lòng chấm điểm thủ công hoặc nhấn 'Chấm lại bằng AI'.",
          improvements: ["Tự điền lỗi cần khắc phục nếu cần thiết."],
          aiGeneratedStatus: 'none',
          aiGeneratedDetails: "",
          aiGradingFailed: true
        };
      }
      return p;
    }));
    showToast("Đã chuyển sang chế độ chấm tay do AI bị lỗi.", "error");
  };

  const handleSendGraderTuningFeedbackAndReGrade = async () => {
    if (!activeId || !activeProject || !feedbackInput.trim()) return;
    setIsGeneratingTuning(true);

    const newFeedback = feedbackInput.trim();
    const updatedFeedbacks = [...gradingFeedbacks, newFeedback];
    setGradingFeedbacks(updatedFeedbacks);

    showToast("AI đã hấp thu chỉ dẫn chấm điểm mới. Đang bắt đầu chấm lại bài...", "success");
    setLoading(true);
    setLoadingStep("AI đang tái thẩm định bài theo chỉ dẫn mới bổ sung...");
    setGradingProjectId(activeId);
    startGradingProgress(activeId, "Bắt đầu chấm lại theo góp ý của giảng viên...");

    try {
      const result = await performSingleGradingWithFeedbacks(activeProject, updatedFeedbacks);
      
      let finalName = validateExtractedName(result.ocr.tenSinhVien, activeProject.studentName);
      let finalId = validateExtractedId(result.ocr.mssv, activeProject.studentId);

      if (classList && classList.length > 0) {
        const reconciled = reconcileWithClassList(finalName, finalId, classList);
        finalName = reconciled.name;
        finalId = reconciled.id;
      }

      setProjects(prev => prev.map(p => {
        if (p.id === activeId) {
          return appendScoreVersion(p, {
            studentName: finalName,
            studentId: finalId,
            grades: result.grades,
            reviews: result.reviews,
            generalComment: result.generalComment,
            improvements: result.improvements,
            aiGeneratedStatus: result.aiSuspect.coNghiVan ? 'suspected' : 'none',
            aiGeneratedDetails: result.aiSuspect.lyDoChiTiet || "",
            aiDetectionReport: result.aiSuspect.report || null,
            classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
            classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
            aiImprovementSuggestions: `Đã hiệu chỉnh cách chấm thành công dựa trên chỉ đạo: "${newFeedback}". Hệ thống AI đã học hỏi và tái đánh giá chuẩn xác!`
          }, "ai_regrade", `Chấm lại theo góp ý: ${newFeedback}`);
        }
        return p;
      }));

      const calculatedTotal = parseFloat(Object.values(result.grades).reduce((sum, val) => sum + val, 0).toFixed(2));
      setHistoryList(prev => [
        {
          id: `hist-${Date.now()}`,
          projectId: activeId,
          studentName: finalName,
          studentId: finalId,
          subject: globalSubject,
          subjectCode: globalSubjectCode,
          group: globalGroup,
          totalScore: calculatedTotal,
          date: new Date().toLocaleDateString('vi-VN'),
          grades: result.grades
        },
        ...prev.filter(item => item.projectId !== activeId && !(item.studentId === finalId && item.subjectCode === globalSubjectCode))
      ]);

      setFeedbackInput("");
      finishGradingProgress(activeId, "Hoàn tất chấm lại và cập nhật điểm");
      showToast("Tái chấm và cập nhật phổ điểm thành công!", "success");

    } catch (e) {
      console.error(e);
      failGradingProgress(activeId, `AI lỗi: ${e.message || "Không rõ nguyên nhân"}`);
      showToast("Có lỗi xảy ra khi yêu cầu AI chấm lại bài.", "error");
    } finally {
      setLoading(false);
      setIsGeneratingTuning(false);
      setGradingProjectId(null);
    }
  };

  const handleSelectAiDetectionVersion = (projectId, versionId) => {
    const project = projects.find(item => item.id === projectId);
    const version = (project?.aiDetectionVersions || []).find(item => item.id === versionId);
    if (!project || !version) return;
    const selectedProject = {
      ...project,
      aiGeneratedStatus: version.status || "none",
      aiGeneratedDetails: version.details || "",
      aiDetectionReport: version.report || null,
      selectedAiDetectionVersionId: version.id,
      scoreVersions: (project.scoreVersions || []).map(item => item.id === project.selectedScoreVersionId ? { ...item, aiGeneratedStatus: version.status || "none", aiGeneratedDetails: version.details || "", aiDetectionReport: version.report || null } : item)
    };
    setProjects(prev => prev.map(item => item.id === projectId ? selectedProject : item));
    setAiSuspectDetailProject(selectedProject);
    showToast("Đã chọn phiên bản kiểm tra AI dùng cho phiếu chấm.", "success");
  };

  const handleVerifyStudentWorkClean = (projectId) => {
    let updatedProject = null;
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const lecturerNote = aiAuditInstruction.trim() || "Giảng viên đã kiểm tra trực tiếp và xác nhận đây là bài sinh viên tự thực hiện.";
      const report = { ...(project.aiDetectionReport || {}), coNghiVan: false, mucDo: "Giảng viên xác nhận không nghi vấn", ketLuanGiangVien: lecturerNote };
      const versionState = addAiDetectionVersion(project, { aiGeneratedStatus: "verified_clean", aiGeneratedDetails: lecturerNote, aiDetectionReport: report }, "Giảng viên xác nhận", lecturerNote);
      updatedProject = {
        ...project,
        ...versionState,
        aiGeneratedStatus: 'verified_clean',
        aiGeneratedDetails: lecturerNote,
        aiDetectionReport: report,
        scoreVersions: (project.scoreVersions || []).map(version => version.id === project.selectedScoreVersionId ? { ...version, aiGeneratedStatus: 'verified_clean', aiGeneratedDetails: lecturerNote, aiDetectionReport: report } : version)
      };
      return updatedProject;
    }));
    setAiSuspectDetailProject(null);
    setAiAuditInstruction("");
    showToast("Đã lưu kết luận của giảng viên và bỏ cảnh báo nghi vấn AI.", "success");
  };

  const handleConfirmAiSuspicion = (projectId) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const lecturerNote = aiAuditInstruction.trim() || project.aiGeneratedDetails || "Giảng viên xác nhận bài cần tiếp tục được xem xét về khả năng sử dụng AI.";
    const report = { ...(project.aiDetectionReport || {}), coNghiVan: true, mucDo: "Giảng viên xác nhận nghi vấn", ketLuanGiangVien: lecturerNote };
    const versionState = addAiDetectionVersion(project, { aiGeneratedStatus: "suspected", aiGeneratedDetails: lecturerNote, aiDetectionReport: report }, "Giảng viên xác nhận nghi vấn", lecturerNote);
    const updatedProject = {
      ...project,
      ...versionState,
      aiGeneratedStatus: "suspected",
      aiGeneratedDetails: lecturerNote,
      aiDetectionReport: report,
      scoreVersions: (project.scoreVersions || []).map(version => version.id === project.selectedScoreVersionId ? { ...version, aiGeneratedStatus: "suspected", aiGeneratedDetails: lecturerNote, aiDetectionReport: report } : version)
    };
    setProjects(prev => prev.map(item => item.id === projectId ? updatedProject : item));
    setAiSuspectDetailProject(updatedProject);
    setAiAuditInstruction("");
    showToast("Đã lưu kết luận nghi vấn AI của giảng viên.", "success");
  };

  const handleRegenerateAiAudit = async (projectId, mode = "recheck") => {
    const project = projects.find(item => item.id === projectId);
    if (!project || isRegeneratingAiAudit) return;
    const instruction = aiAuditInstruction.trim();
    const modeDirective = mode === "find_more"
      ? "Tập trung tìm thêm dấu hiệu tại các vùng/trang giảng viên yêu cầu, nhưng chỉ ghi nhận bằng chứng trực tiếp nhìn thấy."
      : mode === "consider_clear"
        ? "Xem xét các lý do giảng viên cho rằng dấu hiệu có thể là báo sai; bỏ qua dấu hiệu không đủ căn cứ, nhưng vẫn giữ cảnh báo nếu còn bằng chứng trực tiếp rõ ràng."
        : "Thực hiện lại độc lập toàn bộ báo cáo, tránh lặp máy móc kết luận trước.";
    setIsRegeneratingAiAudit(true);
    try {
      const schema = {
        type: "OBJECT",
        properties: {
          coNghiVan: { type: "BOOLEAN" },
          mucDo: { type: "STRING", enum: ["Không có dấu hiệu rõ", "Cần giảng viên kiểm tra", "Nghi vấn cao"] },
          diemTinCay: { type: "NUMBER" },
          lyDoChiTiet: { type: "STRING" },
          dauHieu: { type: "ARRAY", items: { type: "OBJECT", properties: { trang: { type: "STRING" }, nhomDauHieu: { type: "STRING" }, quanSatCuThe: { type: "STRING" }, mucTinCay: { type: "STRING", enum: ["Thấp", "Trung bình", "Cao"] } }, required: ["trang", "nhomDauHieu", "quanSatCuThe", "mucTinCay"] } },
          cauHoiXacMinh: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["coNghiVan", "mucDo", "diemTinCay", "lyDoChiTiet", "dauHieu", "cauHoiXacMinh"]
      };
      const prompt = `Bạn là chuyên gia giám định hình ảnh hỗ trợ giảng viên. Hãy tạo MỘT BÁO CÁO KIỂM TRA AI MỚI cho bài đồ án môn học/bài vẽ tay này; không chấm lại điểm rubric.
${modeDirective}
YÊU CẦU CỦA GIẢNG VIÊN: ${instruction || "Không có yêu cầu bổ sung."}
BÁO CÁO TRƯỚC ĐỂ ĐỐI CHIẾU, KHÔNG ĐƯỢC SAO CHÉP MÁY MÓC: ${JSON.stringify(project.aiDetectionReport || {})}
Kiểm tra chữ/ký hiệu vô nghĩa; vật thể tan, dính, xuyên; hình học, kết cấu, bóng đổ, phản chiếu phi logic; chi tiết nhân bản; texture chuyển dạng; mâu thuẫn giữa nhiều góc nhìn và bản vẽ kỹ thuật; watermark hoặc dấu vết trực tiếp từ công cụ tạo ảnh. Không coi hình đẹp, photorealistic, render bằng phần mềm, văn phong trau chuốt hoặc nhiễu nén là bằng chứng. Chỉ coNghiVan=true khi có ít nhất 1 dấu hiệu Cao hoặc 2 dấu hiệu Trung bình độc lập và phải nêu đúng trang/vùng. diemTinCay dưới 45 phải để false. Kết quả chỉ là cảnh báo tham khảo; giảng viên quyết định cuối cùng.`;
      const parts = [{ text: prompt }];
      const isWord = project.mimeType === 'application/msword' || project.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (isWord && project.extractedText) parts.push({ text: `NỘI DUNG WORD:\n${String(project.extractedText).slice(0, MAX_PDF_TEXT_CHARS)}` });
      else if (project.base64) parts.push({ inlineData: { mimeType: project.mimeType || "image/jpeg", data: project.base64 } });
      else throw new Error("Không còn dữ liệu bài nộp để kiểm tra lại.");
      const payload = { contents: [{ parts }], generationConfig: { temperature: 0.08, responseMimeType: "application/json", responseSchema: schema } };
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("AI không trả báo cáo kiểm tra mới.");
      const reportRaw = parseAiJson(resultText);
      const confidence = Math.min(100, Math.max(0, Number(reportRaw.diemTinCay) || 0));
      const suspected = Boolean(reportRaw.coNghiVan) && confidence >= 45;
      const report = { ...reportRaw, diemTinCay: confidence, coNghiVan: suspected, yeuCauGiangVien: instruction, cheDoKiemTra: mode };
      const status = suspected ? "suspected" : "none";
      const details = report.lyDoChiTiet || (suspected ? "AI phát hiện dấu hiệu cần giảng viên xác minh." : "Lần kiểm tra mới chưa phát hiện đủ dấu hiệu trực tiếp để duy trì cảnh báo.");
      const versionState = addAiDetectionVersion(project, { aiGeneratedStatus: status, aiGeneratedDetails: details, aiDetectionReport: report }, mode === "find_more" ? "AI tìm thêm theo yêu cầu GV" : mode === "consider_clear" ? "AI xem xét bỏ qua theo yêu cầu GV" : "AI tạo lại báo cáo", instruction);
      const updatedProject = {
        ...project,
        ...versionState,
        aiGeneratedStatus: status,
        aiGeneratedDetails: details,
        aiDetectionReport: report,
        scoreVersions: (project.scoreVersions || []).map(version => version.id === project.selectedScoreVersionId ? { ...version, aiGeneratedStatus: status, aiGeneratedDetails: details, aiDetectionReport: report } : version)
      };
      setProjects(prev => prev.map(item => item.id === projectId ? updatedProject : item));
      setAiSuspectDetailProject(updatedProject);
      setAiAuditInstruction("");
      showToast(suspected ? "AI đã tạo báo cáo mới và vẫn ghi nhận nghi vấn." : "AI đã kiểm tra lại và chưa thấy đủ căn cứ duy trì cảnh báo.", suspected ? "info" : "success");
    } catch (error) {
      showToast(`Không thể tạo lại báo cáo nghi vấn AI: ${error.message || "Lỗi không xác định"}`, "error");
    } finally {
      setIsRegeneratingAiAudit(false);
    }
  };

  const runImmediateOCR = async (targetId, base64Data, fallbackName, fallbackId, mimeType) => {
    const ocrPrompt = `Bạn là công cụ phân tích tài liệu học thuật thông minh. Hãy phân tích nội dung văn bản, trang bìa hoặc thông tin định danh trong tài liệu này, trích xuất thông tin sinh viên thực hiện và trả về ĐÚNG cấu trúc JSON sau:
{
  "tenSinhVien": "Họ Tên sinh viên (nếu có)",
  "mssv": "Mã số sinh viên (bắt buộc phải bắt đầu bằng số 1, có độ dài đúng 8 ký tự gồm chữ và số, ví dụ 123H0023 hoặc 12345678)"
}
Chỉ trả về JSON, không kèm văn bản giải thích nào khác. Nếu không tìm thấy thông tin định danh cụ thể khớp đúng định dạng, để chuỗi rỗng "".`;

    const payload = {
      contents: [{
        parts: [
          { text: ocrPrompt },
          mimeType === 'text/plain' 
            ? { text: `NỘI DUNG TÀI LIỆU (Word Extracted):\n${atob(base64Data)}` } 
            : { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            tenSinhVien: { type: "STRING" },
            mssv: { type: "STRING" }
          },
          required: ["tenSinhVien", "mssv"]
        }
      }
    };

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${reviewGeminiModel}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );

      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResult) {
        const parsed = JSON.parse(textResult);
        let finalName = validateExtractedName(parsed.tenSinhVien, fallbackName);
        let finalId = validateExtractedId(parsed.mssv, fallbackId);

        if (classList && classList.length > 0) {
          const reconciled = reconcileWithClassList(finalName, finalId, classList);
          finalName = reconciled.name;
          finalId = reconciled.id;
        }

        setProjects(prev => prev.map(p => p.id === targetId ? { 
          ...p, 
          studentName: finalName, 
          studentId: finalId, 
          classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
          classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
          isOcrLoading: false 
        } : p));
      }
    } catch (e) {
      let finalName = validateExtractedName(null, fallbackName);
      let finalId = validateExtractedId(null, fallbackId);
      if (classList && classList.length > 0) {
        const reconciled = reconcileWithClassList(finalName, finalId, classList);
        finalName = reconciled.name;
        finalId = reconciled.id;
      }
      setProjects(prev => prev.map(p => p.id === targetId ? { 
        ...p, 
        studentName: finalName, 
        studentId: finalId, 
        classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
        classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
        isOcrLoading: false 
      } : p));
    }
  };

  const reviewDuplicateUploads = (incomingFiles) => {
    const accepted = [];
    const replacementIds = new Set();
    const comparisonPool = [...projects];

    incomingFiles.forEach(file => {
      const parsed = extractInfoFromFilename(file.name);
      const incomingStudentId = cleanId(parsed.fallbackId || '');
      const normalizedName = String(file.name || '').trim().toLowerCase();
      const exactDuplicate = comparisonPool.find(project =>
        String(project.fileName || '').trim().toLowerCase() === normalizedName
        && Number(project.fileSize || 0) > 0
        && Number(project.fileSize) === Number(file.size)
        && (!incomingStudentId || cleanId(project.studentId || project.fallbackId || '') === incomingStudentId)
      );

      if (exactDuplicate) {
        const addAgain = window.confirm(
          `Tệp “${file.name}” trùng tên, dung lượng${incomingStudentId ? ' và MSSV' : ''} với bài đã nạp.\n\nBấm OK để vẫn nạp thêm; bấm Hủy để bỏ qua tệp trùng.`
        );
        if (!addAgain) return;
      } else if (incomingStudentId) {
        const sameStudent = comparisonPool.find(project =>
          cleanId(project.studentId || project.fallbackId || '') === incomingStudentId
        );
        if (sameStudent) {
          const replaceExisting = window.confirm(
            `MSSV ${incomingStudentId} đã có tệp “${sameStudent.fileName || 'không rõ tên'}”, nhưng tệp mới có tên hoặc dung lượng khác.\n\nBấm OK để THAY THẾ bài cũ; bấm Hủy để chọn giữ cả hai hoặc bỏ qua.`
          );
          if (replaceExisting) {
            replacementIds.add(sameStudent.id);
            const oldIndex = comparisonPool.findIndex(item => item.id === sameStudent.id);
            if (oldIndex >= 0) comparisonPool.splice(oldIndex, 1);
          } else {
            const keepBoth = window.confirm(
              `Giữ cả hai tệp của MSSV ${incomingStudentId} để chấm như hai bài riêng?\n\nBấm OK để giữ cả hai; bấm Hủy để bỏ qua tệp mới.`
            );
            if (!keepBoth) return;
          }
        }
      }

      accepted.push(file);
      comparisonPool.push({ id: `incoming-${accepted.length}`, fileName: file.name, fileSize: file.size, studentId: incomingStudentId, fallbackId: incomingStudentId });
    });

    if (replacementIds.size > 0) {
      setProjects(previous => {
        previous.filter(project => replacementIds.has(project.id)).forEach(project => {
          if (String(project.fileUrl || '').startsWith('blob:')) URL.revokeObjectURL(project.fileUrl);
        });
        return previous.filter(project => !replacementIds.has(project.id));
      });
    }
    return accepted;
  };

  const handleBatchUpload = (e) => {
    const files = reviewDuplicateUploads(Array.from(e.target.files));
    if (!files.length) return;

    const initialGrades = {};
    const initialReviews = {};
    rubric.forEach(r => {
       initialGrades[r.id] = 0;
       initialReviews[r.id] = "";
    });

    files.forEach((file, index) => {
      const { fallbackName, fallbackId } = extractInfoFromFilename(file.name);
      
      const ext = file.name.split('.').pop().toLowerCase();
      let mimeType = file.type;
      if (!mimeType) {
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'doc') mimeType = 'application/msword';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else mimeType = 'image/png';
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        const newId = `project-${Date.now()}-${index}`;
        const fileBlobUrl = URL.createObjectURL(file);

        let finalName = fallbackName ? toTitleCase(fallbackName) : 'Đang xử lý...';
        let finalId = fallbackId ? fallbackId : 'Đang quét...';
        let status = 'matched';
        let note = '';

        if (classList && classList.length > 0) {
          const reconciled = reconcileWithClassList(fallbackName, fallbackId, classList);
          finalName = reconciled.name;
          finalId = reconciled.id;
          status = reconciled.isMatched ? 'matched' : 'unmatched';
          note = reconciled.note;
        }

        const isWord = mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const customProject = {
          id: newId,
          fileName: file.name,
          fileSize: file.size,
          studentName: finalName,
          studentId: finalId,
          fallbackName: fallbackName,
          fallbackId: fallbackId,
          fileUrl: fileBlobUrl, 
          mimeType: mimeType,
          base64: base64String,
          rotation: 0, 
          isPreset: false,
          isGraded: false,
          isOcrLoading: true,
          grades: { ...initialGrades },
          reviews: { ...initialReviews },
          generalComment: "Chưa có nhận xét.",
          improvements: [],
          aiFeedbackEmail: "",
          thumbnailUrl: "",
          classMatchStatus: status,
          classMatchNote: note,
          extractedText: "",
          gradingStrategy: globalGradingStrategy,
          pdfTotalPages: 0,
          pdfSections: [],
          pdfPageTexts: [],
          pdfStructureReady: mimeType !== 'application/pdf',
          isStructureProcessing: mimeType === 'application/pdf',
          gradingProgress: [],
          aiGradingFailed: false,
          scoreCalibrationHistory: [],
          scoreVersions: [],
          selectedScoreVersionId: "",
          aiDetectionReport: null,
          aiDetectionVersions: [],
          selectedAiDetectionVersionId: "",
          rubricReviewVersions: {},
          selectedRubricReviewVersions: {},
          dirtyRubricReviews: {},
          hasUnsavedManualScore: false,
          manualScoreBaseGrades: null
        };

        setProjects(prev => {
          if (prev.length === 0 && index === 0) {
            setActiveId(newId);
          }
          return [...prev, customProject];
        });

        // Xử lý đọc Word bằng Mammoth.js và chạy OCR text
        if (isWord) {
          try {
             await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
             const arrayBuffer = await file.arrayBuffer();
             const result = await window.mammoth.extractRawText({ arrayBuffer });
             const textContent = result.value || "Tài liệu Word này rỗng hoặc không thể trích xuất văn bản.";
             
             // Tạo ảnh thumbnail mô phỏng một trang A4 từ Text
             const canvas = document.createElement('canvas');
             canvas.width = 800; canvas.height = 1131; 
             const ctx = canvas.getContext('2d');
             ctx.fillStyle = '#ffffff'; 
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.fillStyle = '#1e293b'; 
             ctx.font = '16px "Times New Roman", Times, serif';
             
             const lines = textContent.split('\n');
             let y = 60;
             for (let i = 0; i < lines.length && y < 1100; i++) {
                const line = lines[i].trim();
                if (line) { ctx.fillText(line.substring(0, 90), 50, y); y += 24; } 
                else { y += 12; }
             }
             const wordThumbUrl = canvas.toDataURL('image/jpeg', 0.8);
             
             setProjects(prev => prev.map(p => p.id === newId ? { ...p, thumbnailUrl: wordThumbUrl, extractedText: textContent } : p));
             
             // Gửi 3000 ký tự đầu tiên để tìm tên và MSSV (tránh nghẽn mạng)
             const textToScan = textContent.substring(0, 3000);
             runImmediateOCR(newId, btoa(unescape(encodeURIComponent(textToScan))), fallbackName, fallbackId, 'text/plain');
          } catch (err) {
             setProjects(prev => prev.map(p => p.id === newId ? { ...p, isOcrLoading: false, extractedText: "Lỗi giải mã tài liệu Word." } : p));
          }
       } else if (mimeType !== 'application/pdf') {
         runImmediateOCR(newId, base64String, fallbackName, fallbackId, mimeType);
       }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const buildGradingPrompt = (feedbacksMemory = gradingFeedbacks) => {
    const rubricPrompt = rubric.map(r => `- ${r.name} (Điểm tối đa: ${r.maxScore}): ${r.desc}`).join('\n');
    const feedbacksDirective = feedbacksMemory.length > 0
      ? `CÁC CHỈ THỊ / GÓP Ý CHẤM ĐIỂM BẮT BUỘC ĐÃ TIẾP THU TỪ GIẢNG VIÊN:\n${feedbacksMemory.map((f, idx) => `Chỉ thị ${idx + 1}: ${f}`).join('\n')}`
      : 'Không có chỉ thị đặc thù bổ sung.';

    return `Bạn là Giảng viên chấm điểm độc lập môn Thiết kế / Mỹ thuật Công nghiệp IFA và là chuyên gia thẩm định nghệ thuật kỳ cựu.
    Hãy phân tích toàn bộ nội dung của tệp bài nộp bài tập / đồ án chuyên ngành thiết kế của sinh viên dưới đây.

    MÔN HỌC / HỌC PHẦN ĐANG CHẤM: ${globalSubject || 'Đồ án môn học / Vẽ mỹ thuật'} (Mã môn học: ${globalSubjectCode || 'Chưa rõ'})
    KỲ THI: ${globalExam}

    LƯU Ý ĐẶT THÙ MÔN HỌC ĐỂ CHẤM ĐIỂM:
    - Nếu môn học là Vẽ tay / Hình họa / Vẽ phối cảnh thủ công: Tập trung cao vào kỹ thuật dựng hình phối cảnh, các đường gióng tỷ lệ, kỹ năng kiểm soát nét bút, xử lý tương phản sắc độ đen trắng sáng tối, nguồn sáng chính phụ và độ tả thực chất cảm vật liệu.
    - Nếu môn học là Đồ án môn học / Thiết kế chuyên ngành / Đồ án tốt nghiệp: Tập trung cao vào tư duy nghiên cứu giải quyết công năng, ý tưởng độc đáo của giải pháp thiết kế (concept), độ chính xác kỹ thuật của bản vẽ 2D (mặt bằng, mặt đứng, mặt cắt), quy chuẩn dàn trang layout đồ án và tính thẩm mỹ diễn họa phối cảnh 3D.

    ${feedbacksDirective}

    DỰA VÀO ĐÚNG CÁC TIÊU CHÍ RUBRIC TÙY CHỈNH DƯỚI ĐỂ ĐÁNH GIÁ CHẤM ĐIỂM (CỰC KỲ QUAN TRỌNG):
    ${rubricPrompt}

    YÊU CẦU ĐÁNH GIÁ NGHIÊM NGẶT, OCR & QUÉT NGHI VẤN AI (ĐẶC BIỆT SIẾT CHẶT VỚI KHOA MTCN):
    1. Trích xuất chính xác: "Họ Tên" và "MSSV" của sinh viên thực hiện từ tệp bài nộp này. "MSSV" bắt buộc phải bắt đầu bằng số 1 và có độ dài đúng 8 ký tự gồm chữ và số (ví dụ 123H0023 hoặc 12345678). Nếu không thấy hoặc không đúng định dạng này, hãy để chuỗi rỗng "".
    2. Việc kiểm tra nghi vấn Generative AI được thực hiện ở một lượt thẩm định riêng sau khi đọc bài. Ở lượt chấm này chỉ ghi cảnh báo khi có dấu hiệu trực tiếp, có thể chỉ đúng vị trí; không kết luận chỉ vì hình đẹp, render chân thực hoặc văn phong trau chuốt.
    3. Mọi điểm số thành phần phải thuộc bước nhảy 0.1 (Ví dụ: 0.1, 0.5, 0.8, 1.2, 1.5, 2.0...). TUYỆT ĐỐI không cho điểm lẻ phi tiêu chuẩn. Không bao giờ vượt quá điểm tối đa của từng tiêu chí tương ứng.
    4. Đảm bảo sử dụng chính xác các khóa [ID] tương ứng trong RUBRIC ở trên để gán điểm và nhận xét chi tiết từng hạng mục thiết kế trong tệp nộp bài.
    5. Chấm nghiêm theo đúng minh chứng nhìn thấy và mô tả mức đạt của rubric. Không mặc định bài hoàn thiện hình thức là bài xuất sắc. Điểm 9.5–10 chỉ dành cho bài hiếm gặp, gần như không có lỗi đáng kể, có ý tưởng nổi bật, kỹ thuật vững và đáp ứng trọn vẹn rubric; 9.0–9.4 là rất tốt nhưng vẫn phải có bằng chứng mạnh; 8.0–8.9 là tốt nhưng còn hạn chế rõ; 7.0–7.9 là khá/đạt. Nếu thiếu trang, thiếu bản vẽ hoặc không đủ dữ liệu chứng minh tiêu chí thì phải giảm điểm tương ứng, không suy đoán có lợi cho sinh viên.

    Phản hồi bằng định dạng JSON:
    {
      "thongTinSinhVienQuetDuoc": {
        "tenSinhVien": "Tên sinh viên",
        "mssv": "Mã số sinh viên"
      },
      "nhanXetChung": "Nhận xét tổng quát toàn bộ bài làm/đồ án dựa trên đúng đặc thù thể loại môn học...",
      "diemThanhPhan": {
        // Trả về điểm số của từng ID tiêu chí tương ứng được định nghĩa trong Rubric ở trên
      },
      "nhanXetChiTiet": {
        // Nhận xét chi tiết cho từng ID tiêu chí tương ứng được định nghĩa trong Rubric ở trên
      },
      "huongCaiThien": [
        "Khắc phục về dựng hình / phối cảnh / nét vẽ chuyên sâu 1",
        "Khắc phục về sắc độ / bố cục công năng chuyên sâu 2"
      ],
      "nghiVanSuDungAI": {
        "coNghiVan": true/false,
        "lyDoChiTiet": "Mô tả cụ thể và liệt kê các vấn đề chi tiết dẫn đến nghi vấn dùng AI thực hiện..."
      }
    }`;
  };

  const performSingleGradingWithFeedbacks = async (project, feedbacksMemory = gradingFeedbacks) => {
    let fileData = project.base64;
    if (!fileData) throw new Error("Không tìm thấy dữ liệu tệp bài nộp.");

    const diemThanhPhanProps = {};
    const nhanXetChiTietProps = {};
    const requiredKeys = [];

    rubric.forEach(r => {
      diemThanhPhanProps[r.id] = { type: "NUMBER" };
      nhanXetChiTietProps[r.id] = { type: "STRING" };
      requiredKeys.push(r.id);
    });
    
    const isWord = project.mimeType === 'application/msword' || project.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const finalSchema = {
      type: "OBJECT",
      properties: {
        thongTinSinhVienQuetDuoc: {
          type: "OBJECT",
          properties: { tenSinhVien: { type: "STRING" }, mssv: { type: "STRING" } },
          required: ["tenSinhVien", "mssv"]
        },
        nhanXetChung: { type: "STRING" },
        diemThanhPhan: { type: "OBJECT", properties: diemThanhPhanProps, required: requiredKeys },
        nhanXetChiTiet: { type: "OBJECT", properties: nhanXetChiTietProps, required: requiredKeys },
        huongCaiThien: { type: "ARRAY", items: { type: "STRING" } },
        nghiVanSuDungAI: {
          type: "OBJECT",
          properties: { coNghiVan: { type: "BOOLEAN" }, lyDoChiTiet: { type: "STRING" } },
          required: ["coNghiVan", "lyDoChiTiet"]
        }
      },
      required: ["thongTinSinhVienQuetDuoc", "nhanXetChung", "diemThanhPhan", "nhanXetChiTiet", "huongCaiThien", "nghiVanSuDungAI"]
    };

    const aiAuditSchema = {
      type: "OBJECT",
      properties: {
        coNghiVan: { type: "BOOLEAN" },
        mucDo: { type: "STRING", enum: ["Không có dấu hiệu rõ", "Cần giảng viên kiểm tra", "Nghi vấn cao"] },
        diemTinCay: { type: "NUMBER" },
        lyDoChiTiet: { type: "STRING" },
        dauHieu: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              trang: { type: "STRING" },
              nhomDauHieu: { type: "STRING" },
              quanSatCuThe: { type: "STRING" },
              mucTinCay: { type: "STRING", enum: ["Thấp", "Trung bình", "Cao"] }
            },
            required: ["trang", "nhomDauHieu", "quanSatCuThe", "mucTinCay"]
          }
        },
        cauHoiXacMinh: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["coNghiVan", "mucDo", "diemTinCay", "lyDoChiTiet", "dauHieu", "cauHoiXacMinh"]
    };

    let dedicatedAiAudit = null;

    let payload;
    if (project.mimeType === 'application/pdf' && window.pdfjsLib) {
      recordGradingProgress(project.id, "Đang chuẩn bị đọc toàn bộ PDF...", "prepare-pdf");
      const binData = atob(fileData);
      const bytes = new Uint8Array(binData.length);
      for (let i = 0; i < binData.length; i++) bytes[i] = binData.charCodeAt(i);
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const totalPages = pdf.numPages;
      let pageTexts = project.pdfPageTexts || [];
      if (pageTexts.length !== totalPages) {
        pageTexts = [];
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const lines = pdfItemsToLines(content.items);
          pageTexts.push({ page: pageNumber, text: lines.map(line => line.text).join("\n") });
        }
      }

      const strategy = project.gradingStrategy || globalGradingStrategy || DEFAULT_GRADING_STRATEGY;
      const ranges = [];
      const requestedSize = Number(String(strategy).replace("chunks", ""));
      const chunkSize = [8, 50, 75, 100, 125, 150].includes(requestedSize) ? requestedSize : 125;
      if (strategy === "sections" && (project.pdfSections || []).length) {
        recordGradingProgress(project.id, "Đang dùng các mục chính đã đối chiếu từ tiêu đề trang, bookmark và mục lục...", "structure");
        normalizePdfSections(project.pdfSections, totalPages).forEach(section => {
          for (let start = section.startPage, part = 1; start <= section.endPage; start += 150, part++) {
            ranges.push({ startPage: start, endPage: Math.min(section.endPage, start + 149), label: section.endPage - section.startPage >= 150 ? `${section.label} – phần ${part}` : section.label });
          }
        });
      } else if (strategy === "split2" || strategy === "split3") {
        const partCount = strategy === "split2" ? 2 : 3;
        const size = Math.ceil(totalPages / partCount);
        recordGradingProgress(project.id, `Đã chia toàn bộ ${totalPages} trang thành ${partCount} lượt đọc cân bằng.`, "reading-mode");
        for (let start = 1, part = 1; start <= totalPages; start += size, part++) {
          ranges.push({ startPage: start, endPage: Math.min(totalPages, start + size - 1), label: `Phần ${part}/${partCount}` });
        }
      } else {
        const size = strategy === "all" ? 150 : chunkSize;
        recordGradingProgress(project.id, strategy === "all" ? `Đã chọn đọc tất cả ${totalPages} trang; hệ thống tự chia kỹ thuật khi tệp quá dài.` : `Đã chọn đọc theo cụm ${size} trang liên tiếp.`, "reading-mode");
        for (let start = 1, part = 1; start <= totalPages; start += size, part++) {
          ranges.push({ startPage: start, endPage: Math.min(totalPages, start + size - 1), label: strategy === "all" ? (totalPages > size ? `Toàn bộ bài – phần ${part}` : "Toàn bộ bài") : `Cụm ${part}` });
        }
      }
      if (!ranges.length) {
        for (let start = 1, part = 1; start <= totalPages; start += 125, part++) ranges.push({ startPage: start, endPage: Math.min(totalPages, start + 124), label: `Cụm dự phòng ${part}` });
      }

      const evidenceProps = {};
      rubric.forEach(item => { evidenceProps[item.id] = { type: "STRING" }; });
      const chunkSummaries = [];
      for (let index = 0; index < ranges.length; index++) {
        const range = ranges[index];
        recordGradingProgress(project.id, `AI đang đọc ${range.label} – trang ${range.startPage} đến ${range.endPage} (${index + 1}/${ranges.length})...`, `chunk-${index + 1}`);
        const chunkParts = [{ text: `Bạn đang ở bước ĐỌC VÀ TRÍCH XUẤT MINH CHỨNG, chưa chấm điểm cuối. Đây là ${range.label}, trang ${range.startPage}–${range.endPage}/${totalPages}. Hãy quan sát kỹ bài vẽ, bản vẽ kỹ thuật, layout, hình ảnh và văn bản; ghi minh chứng/thiếu sót theo đúng từng ID rubric. Không suy đoán nội dung ngoài trang đã thấy.

ĐỒNG THỜI QUÉT RIÊNG TỪNG TRANG ĐỂ TÌM DẤU HIỆU TRỰC TIẾP CỦA ẢNH TẠO SINH:
- chữ, logo, ký hiệu, vật dụng hoặc họa tiết bị méo/ghép/vô nghĩa;
- tay người, cạnh vật thể, chân bàn ghế, kết cấu, bóng đổ, phản chiếu hoặc tiếp giáp vật liệu phi logic;
- vật thể bị tan/chồng/xuyên nhau, chi tiết lặp nhân bản bất thường hoặc chuyển dạng trong cùng ảnh;
- cùng một phương án ở nhiều góc nhìn nhưng số lượng, hình dáng, vị trí cửa–cột–đồ nội thất–vật liệu không nhất quán;
- phối cảnh không thể quy chiếu về mặt bằng/mặt đứng/mặt cắt, hoặc hình kỹ thuật và hình diễn họa mâu thuẫn rõ;
- watermark/giao diện/cụm chữ liên quan công cụ tạo ảnh.
Không coi phong cách đẹp, ảnh render, độ chân thực cao, nhiễu JPEG hoặc thiếu nét dựng là bằng chứng độc lập. Mỗi phát hiện phải chỉ rõ trang và chi tiết nhìn thấy. Ghi cả dấu hiệu mức Trung bình/Cao vào aiVisualFindings; không ghi suy đoán chung chung.

RUBRIC:\n${rubric.map(item => `- ${item.id}: ${item.name} (${item.maxScore}) – ${item.desc}`).join("\n")}` }];
        const textParts = [];
        for (let pageNumber = range.startPage; pageNumber <= range.endPage; pageNumber++) {
          const pageText = pageTexts.find(item => item.page === pageNumber)?.text || "";
          if (pageText) textParts.push(`[Trang ${pageNumber}] ${pageText}`);
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          chunkParts.push({ text: `[Ảnh trang ${pageNumber}/${totalPages}]` });
          chunkParts.push({ inlineData: { mimeType: "image/jpeg", data: canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY).split(",")[1] } });
        }
        if (textParts.length) chunkParts.splice(1, 0, { text: `VĂN BẢN TRÍCH XUẤT:\n${textParts.join("\n").slice(0, MAX_PDF_TEXT_CHARS)}` });
        const chunkPayload = {
          contents: [{ parts: chunkParts }],
          generationConfig: {
            temperature: 0.05,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                thongTinSinhVien: { type: "OBJECT", properties: { tenSinhVien: { type: "STRING" }, mssv: { type: "STRING" } }, required: ["tenSinhVien", "mssv"] },
                criterionEvidence: { type: "OBJECT", properties: evidenceProps, required: requiredKeys },
                criterionConcerns: { type: "OBJECT", properties: evidenceProps, required: requiredKeys },
                chunkSummary: { type: "STRING" },
                aiSignalsToVerify: { type: "STRING" },
                aiVisualFindings: { type: "ARRAY", items: { type: "OBJECT", properties: { page: { type: "NUMBER" }, signalType: { type: "STRING" }, observedDetail: { type: "STRING" }, confidence: { type: "STRING", enum: ["Thấp", "Trung bình", "Cao"] } }, required: ["page", "signalType", "observedDetail", "confidence"] } },
                crossPageConsistency: { type: "STRING" },
                coverageNotes: { type: "STRING" }
              },
              required: ["thongTinSinhVien", "criterionEvidence", "criterionConcerns", "chunkSummary", "aiSignalsToVerify", "aiVisualFindings", "crossPageConsistency", "coverageNotes"]
            }
          }
        };
        const chunkData = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunkPayload) });
        const chunkText = chunkData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!chunkText) throw new Error(`AI không trả dữ liệu cho trang ${range.startPage}–${range.endPage}.`);
        chunkSummaries.push({ ...range, ...parseAiJson(chunkText) });
      }
      recordGradingProgress(project.id, "Đang kiểm định riêng dấu hiệu ảnh tạo sinh và đối chiếu chéo các trang...", "ai-authenticity-audit");
      const auditParts = [{ text: `Bạn là chuyên gia giám định hình ảnh hỗ trợ giảng viên, thực hiện LƯỢT KIỂM TRA ĐỘC LẬP về nghi vấn Generative AI cho bài đồ án môn học/bài vẽ tay. Không chấm điểm rubric ở lượt này.

PHẢI KIỂM TRA THEO 6 NHÓM:
1. Dị dạng cục bộ: chữ/ký hiệu vô nghĩa, biên vật thể tan–dính–xuyên, chi tiết thừa thiếu, tay người hoặc cấu kiện phi logic.
2. Hình học–kết cấu: phối cảnh, điểm tụ, tiếp giáp, trọng lực, chân bàn ghế, cửa/cột/cầu thang, bóng đổ và phản chiếu mâu thuẫn.
3. Nhân bản–hoa văn: chi tiết lặp bất thường, texture chuyển dạng, vật liệu hòa lẫn, vùng quá hoàn thiện cạnh vùng lỗi.
4. Nhất quán nhiều góc nhìn: số lượng/vị trí/hình dạng vật thể, cửa, cột, vật liệu và ánh sáng thay đổi không giải thích được.
5. Đối chiếu hồ sơ: phối cảnh không khớp mặt bằng/mặt đứng/mặt cắt hoặc thuyết minh về giải pháp.
6. Dấu vết trực tiếp: watermark, giao diện, chữ hoặc ký hiệu từ công cụ tạo ảnh.

NGUYÊN TẮC GIẢM BÁO SAI:
- Không kết luận chỉ vì hình đẹp, photorealistic, render bằng phần mềm, văn phong trau chuốt, nhiễu nén hoặc thiếu nét dựng.
- Chỉ đặt coNghiVan=true khi có ít nhất 1 dấu hiệu Cao, hoặc ít nhất 2 dấu hiệu Trung bình độc lập có vị trí cụ thể.
- diemTinCay từ 0–100; dưới 45 phải để coNghiVan=false. Đây là cảnh báo để GV xác minh, không phải kết luận gian lận.
- Mỗi dấu hiệu phải nêu trang/vùng và quan sát nhìn thấy; không dùng câu chung chung như “trông giống AI”.

HỒ SƠ QUÉT CHI TIẾT TỪNG PHẦN/CỤM:
${JSON.stringify(chunkSummaries)}` }];
      for (let sheetStart = 1; sheetStart <= totalPages; sheetStart += 4) {
        const rendered = [];
        for (let pageNumber = sheetStart; pageNumber <= Math.min(totalPages, sheetStart + 3); pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 0.55 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          rendered.push({ pageNumber, canvas });
        }
        const cellWidth = Math.max(...rendered.map(item => item.canvas.width));
        const cellHeight = Math.max(...rendered.map(item => item.canvas.height)) + 24;
        const sheet = document.createElement('canvas');
        sheet.width = cellWidth * 2; sheet.height = cellHeight * 2;
        const ctx = sheet.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sheet.width, sheet.height);
        ctx.fillStyle = '#111827'; ctx.font = 'bold 16px Arial';
        rendered.forEach((item, index) => {
          const x = (index % 2) * cellWidth; const y = Math.floor(index / 2) * cellHeight;
          ctx.fillText(`Trang ${item.pageNumber}`, x + 6, y + 18);
          ctx.drawImage(item.canvas, x, y + 24);
        });
        auditParts.push({ text: `[Bảng ảnh trang ${sheetStart}–${Math.min(totalPages, sheetStart + 3)}]` });
        auditParts.push({ inlineData: { mimeType: "image/jpeg", data: sheet.toDataURL("image/jpeg", 0.55).split(",")[1] } });
      }
      const auditPayload = { contents: [{ parts: auditParts }], generationConfig: { temperature: 0.02, responseMimeType: "application/json", responseSchema: aiAuditSchema } };
      try {
        const auditData = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditPayload) });
        const auditText = auditData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (auditText) dedicatedAiAudit = parseAiJson(auditText);
      } catch (auditError) {
        console.warn("Lượt kiểm định AI riêng chưa hoàn tất:", auditError);
        recordGradingProgress(project.id, "Lượt kiểm định AI riêng bị gián đoạn; vẫn giữ kết quả quét trong từng trang.", "ai-audit-warning");
      }
      if (!dedicatedAiAudit) {
        const fallbackFindings = chunkSummaries.flatMap(summary => summary.aiVisualFindings || []);
        const highCount = fallbackFindings.filter(item => item.confidence === "Cao").length;
        const mediumCount = fallbackFindings.filter(item => item.confidence === "Trung bình").length;
        const fallbackSuspected = highCount >= 1 || mediumCount >= 2;
        dedicatedAiAudit = {
          coNghiVan: fallbackSuspected,
          mucDo: highCount ? "Nghi vấn cao" : fallbackSuspected ? "Cần giảng viên kiểm tra" : "Không có dấu hiệu rõ",
          diemTinCay: highCount ? 75 : fallbackSuspected ? 55 : 25,
          lyDoChiTiet: fallbackSuspected ? fallbackFindings.map(item => `Trang ${item.page}: ${item.observedDetail}`).join("\n") : "Chưa phát hiện đủ dấu hiệu trực tiếp để gắn cảnh báo.",
          dauHieu: fallbackFindings.map(item => ({ trang: `Trang ${item.page}`, nhomDauHieu: item.signalType, quanSatCuThe: item.observedDetail, mucTinCay: item.confidence })),
          cauHoiXacMinh: fallbackSuspected ? ["Sinh viên trình bày quy trình tạo hình và cung cấp tệp làm việc/lịch sử chỉnh sửa của các trang được nêu."] : []
        };
      }
      recordGradingProgress(project.id, `Đã đọc đủ ${totalPages}/${totalPages} trang. Đang tổng hợp điểm theo rubric...`, "synthesis");
      payload = {
        contents: [{ parts: [{ text: `${buildGradingPrompt(feedbacksMemory)}\n\nBạn đã đọc TOÀN BỘ ${totalPages} trang qua các hồ sơ trích xuất dưới đây. Hãy tổng hợp điểm cuối cùng chỉ từ những minh chứng này, đối chiếu xuyên suốt các phần và không chấm trùng một lỗi nhiều lần. Nếu hồ sơ ghi thiếu dữ liệu ở tiêu chí nào thì phải thể hiện đúng sự thiếu hụt đó trong điểm và nhận xét.\nCẤU TRÚC PDF: ${summarizePdfSections(project.pdfSections || []) || "Không xác định được mục chính; đã đọc theo cụm liên tiếp."}\nHỒ SƠ TỪNG PHẦN/CỤM:\n${JSON.stringify(chunkSummaries)}` }] }],
        generationConfig: { temperature: 0.05, responseMimeType: "application/json", responseSchema: finalSchema }
      };
    } else {
      recordGradingProgress(project.id, isWord ? "AI đang đọc nội dung Word và đối chiếu từng tiêu chí rubric..." : "AI đang quan sát bài vẽ/hình ảnh và đối chiếu từng tiêu chí rubric...", "read-submission");
      const parts = [{ text: buildGradingPrompt(feedbacksMemory) }];
      if (isWord && project.extractedText) parts.push({ text: `\n\nNỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ TÀI LIỆU CỦA SINH VIÊN:\n${project.extractedText}` });
      else parts.push({ inlineData: { mimeType: project.mimeType || "image/jpeg", data: fileData } });
      payload = { contents: [{ parts }], generationConfig: { temperature: 0.05, responseMimeType: "application/json", responseSchema: finalSchema } };
    }

    recordGradingProgress(project.id, "Đang gửi hồ sơ minh chứng để AI tổng hợp điểm và nhận xét...", "final-request");
    const data = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error("Không thể trích xuất dữ liệu trả về từ AI.");
    const parsedData = parseAiJson(textResult);
    recordGradingProgress(project.id, "Đã nhận kết quả chấm. Đang chuẩn hóa điểm và kiểm tra dữ liệu trả về...", "normalize-result");
    if (!dedicatedAiAudit) {
      recordGradingProgress(project.id, "Đang kiểm định riêng dấu hiệu nội dung tạo sinh...", "ai-authenticity-audit");
      const auditPrompt = `Bạn là chuyên gia giám định hình ảnh hỗ trợ giảng viên. Kiểm tra độc lập bài nộp để tìm dấu hiệu TRỰC TIẾP của Generative AI; không chấm điểm.
Với ảnh/bài vẽ: rà chữ/ký hiệu vô nghĩa; vật thể tan–dính–xuyên; tay/cấu kiện/tiếp giáp/bóng đổ/phản chiếu phi logic; chi tiết nhân bản; texture chuyển dạng; vùng hoàn thiện không nhất quán; watermark/giao diện công cụ tạo ảnh. Nếu có nhiều hình/góc nhìn thì đối chiếu cửa, cột, vật dụng, vật liệu và hình học.
Với văn bản: không kết luận từ văn phong; chỉ ghi dấu vết trực tiếp như phần nhắc lệnh còn sót, câu tự nhận là mô hình AI, trích dẫn không tồn tại có thể kiểm tra từ chính tài liệu, hoặc nội dung mâu thuẫn rõ với hình/bản vẽ.
Không coi hình đẹp, photorealistic, render bằng phần mềm, văn phong trau chuốt, nhiễu nén hoặc thiếu nét dựng là bằng chứng. Chỉ coNghiVan=true khi có 1 dấu hiệu Cao hoặc 2 dấu hiệu Trung bình độc lập; diemTinCay dưới 45 phải false. Nêu đúng vị trí và câu hỏi GV có thể dùng để xác minh. Đây là cảnh báo, không phải kết luận gian lận.`;
      const auditParts = [{ text: auditPrompt }];
      if (isWord && project.extractedText) auditParts.push({ text: `NỘI DUNG WORD:\n${project.extractedText.slice(0, MAX_PDF_TEXT_CHARS)}` });
      else auditParts.push({ inlineData: { mimeType: project.mimeType || "image/jpeg", data: fileData } });
      const auditPayload = { contents: [{ parts: auditParts }], generationConfig: { temperature: 0.02, responseMimeType: "application/json", responseSchema: aiAuditSchema } };
      try {
        const auditData = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditPayload) });
        const auditText = auditData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (auditText) dedicatedAiAudit = parseAiJson(auditText);
      } catch (auditError) {
        console.warn("Lượt kiểm định AI riêng chưa hoàn tất:", auditError);
      }
    }
    const cleanGrades = {};
    rubric.forEach(item => {
      const val = Number(parsedData.diemThanhPhan?.[item.id]);
      cleanGrades[item.id] = Math.min(Number(item.maxScore), Math.max(0, Number.isFinite(val) ? Math.round(val * 10) / 10 : 0));
    });
    const allScoresAreZero = rubric.length > 0 && rubric.every(item => Number(cleanGrades[item.id] || 0) === 0);
    if (allScoresAreZero) {
      throw new Error("AI trả toàn bộ điểm bằng 0 dù hồ sơ đã được gửi. Đây được xem là lỗi truyền/đọc tệp; hệ thống không tạo phiên điểm 0. Vui lòng chấm lại bằng AI.");
    }
    const auditConfidence = Math.min(100, Math.max(0, Number(dedicatedAiAudit?.diemTinCay) || 0));
    const auditSuspected = Boolean(dedicatedAiAudit?.coNghiVan) && auditConfidence >= 45;
    recordGradingProgress(project.id, "Đang hoàn tất điểm, nhận xét rubric và báo cáo kiểm tra AI...", "finalize-result");
    return {
      grades: cleanGrades,
      reviews: parsedData.nhanXetChiTiet || {},
      generalComment: parsedData.nhanXetChung || "",
      improvements: parsedData.huongCaiThien || [],
      ocr: parsedData.thongTinSinhVienQuetDuoc || {},
      aiSuspect: dedicatedAiAudit ? { coNghiVan: auditSuspected, lyDoChiTiet: dedicatedAiAudit.lyDoChiTiet || "", report: { ...dedicatedAiAudit, diemTinCay: auditConfidence, coNghiVan: auditSuspected } } : (parsedData.nghiVanSuDungAI || { coNghiVan: false, lyDoChiTiet: "" })
    };
  };

  const performSingleGrading = async (project) => {
    return performSingleGradingWithFeedbacks(project, gradingFeedbacks);
  };

  const handleCalibrateGradedProjects = async () => {
    const candidates = projects.filter(project => project.isGraded && !project.aiGradingFailed);
    if (candidates.length < 2) { showToast("Cần ít nhất 2 bài đã được AI chấm để cân chỉnh.", "error"); return; }
    setIsCalibratingScores(true);
    try {
      const scoreProps = {};
      rubric.forEach(item => { scoreProps[item.id] = { type: "NUMBER" }; });
      const dossiers = candidates.map(project => ({
        projectId: project.id,
        currentScores: project.grades || {},
        currentTotal: Number(Object.values(project.grades || {}).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2)),
        criterionReviews: rubric.reduce((result, item) => ({ ...result, [item.id]: String(project.reviews?.[item.id] || "").slice(0, 1800) }), {}),
        generalComment: String(project.generalComment || "").slice(0, 1600),
        improvements: project.improvements || [],
        coverage: project.pdfTotalPages ? `${project.pdfTotalPages} trang; ${summarizePdfSections(project.pdfSections || [])}` : project.fileName
      }));
      const payload = {
        contents: [{ parts: [{ text: `Bạn là trưởng bộ môn đang cân chỉnh tương quan điểm các bài đồ án môn học/bài vẽ tay đã được chấm độc lập. So sánh chất lượng chuyên môn theo đúng RUBRIC, không dựa vào tên sinh viên và không thay đổi điểm chỉ để tạo thứ hạng.
NGUYÊN TẮC: (1) Bài tương đương giữ điểm tương đương. (2) Chỉ nâng/hạ khi có khác biệt rõ từ hồ sơ nhận xét và minh chứng. (3) Mỗi bài thay đổi tổng tối đa 0.7 điểm. (4) Không thưởng/phạt vì nghi vấn AI. (5) 9.5–10 là xuất sắc hiếm gặp; 9.0–9.4 rất tốt; 8.0–8.9 tốt nhưng còn hạn chế; 7.0–7.9 khá/đạt. (6) Lý do phải chỉ rõ bài mạnh/yếu hơn nhóm ở tiêu chí chuyên môn nào.
RUBRIC: ${JSON.stringify(rubric)}
HỒ SƠ CÁC BÀI: ${JSON.stringify(dossiers)}
Trả đủ đúng một kết quả cho mỗi projectId.` }] }],
        generationConfig: {
          temperature: 0.05,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { comparisons: { type: "ARRAY", items: { type: "OBJECT", properties: { projectId: { type: "STRING" }, adjustedScores: { type: "OBJECT", properties: scoreProps, required: rubric.map(item => item.id) }, relativeLevel: { type: "STRING" }, rationale: { type: "STRING" } }, required: ["projectId", "adjustedScores", "relativeLevel", "rationale"] } } },
            required: ["comparisons"]
          }
        }
      };
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResult) throw new Error("AI không trả kết quả cân chỉnh.");
      const parsed = parseAiJson(textResult);
      const comparisonMap = new Map((parsed.comparisons || []).map(item => [item.projectId, item]));
      if (candidates.some(project => !comparisonMap.has(project.id))) throw new Error("AI chưa trả đủ kết quả cho tất cả bài.");
      const calibrationId = `calibration-${Date.now()}`;
      const entries = [];
      const calibratedProjects = projects.map(project => {
        const comparison = comparisonMap.get(project.id);
        if (!comparison || !project.isGraded) return project;
        const before = { ...(project.grades || {}) };
        const proposed = {};
        rubric.forEach(item => {
          const raw = Number(comparison.adjustedScores?.[item.id]);
          proposed[item.id] = Math.min(Number(item.maxScore), Math.max(0, Number.isFinite(raw) ? Math.round(raw * 10) / 10 : Number(before[item.id] || 0)));
        });
        const beforeTotal = Object.values(before).reduce((sum, value) => sum + Number(value || 0), 0);
        const proposedTotal = Object.values(proposed).reduce((sum, value) => sum + Number(value || 0), 0);
        const delta = proposedTotal - beforeTotal;
        const scale = Math.abs(delta) > 0.7 ? 0.7 / Math.abs(delta) : 1;
        const after = {};
        rubric.forEach(item => { const current = Number(before[item.id] || 0); after[item.id] = Math.min(Number(item.maxScore), Math.max(0, Math.round((current + (proposed[item.id] - current) * scale) * 10) / 10)); });
        const afterTotal = Number(Object.values(after).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2));
        const changedCriteria = rubric.filter(item => Math.abs(Number(after[item.id] || 0) - Number(before[item.id] || 0)) >= 0.05).map(item => ({ id: item.id, name: item.name, before: Number(before[item.id] || 0), after: Number(after[item.id] || 0) }));
        entries.push({ projectId: project.id, studentName: project.studentName || project.fileName, studentId: project.studentId || "", beforeTotal: Number(beforeTotal.toFixed(2)), afterTotal, changedCriteria, rationale: comparison.rationale || "Bài tương đương với nhóm nên giữ nguyên.", relativeLevel: comparison.relativeLevel || "", changed: changedCriteria.length > 0, undone: false });
        const calibratedData = {
          grades: changedCriteria.length ? after : before,
          scoreCalibrationNote: comparison.rationale || "",
          scoreCalibrationLevel: comparison.relativeLevel || "",
          scoreVersionSourceId: calibrationId,
          scoreCalibrationHistory: [...(project.scoreCalibrationHistory || []), { id: calibrationId, before, after: changedCriteria.length ? after : before, rationale: comparison.rationale || "", time: new Date().toISOString() }]
        };
        return appendScoreVersion(project, calibratedData, "calibration", `Cân chỉnh tương quan: ${comparison.rationale || "Giữ nguyên vì tương đương nhóm."}`);
      });
      setProjects(calibratedProjects);
      const review = { id: calibrationId, time: new Date().toISOString(), entries };
      setCalibrationReview(review);
      setShowCalibrationReviewModal(true);
      showToast(`Đã cân chỉnh ${candidates.length} bài; có thể hoàn tác từng bài.`, "success");
    } catch (error) {
      setErrorMsg("Không thể cân chỉnh điểm: " + (error.message || "Lỗi không xác định"));
      showToast("Cân chỉnh điểm thất bại.", "error");
    } finally { setIsCalibratingScores(false); }
  };

  const handleUndoCalibration = (projectId, calibrationId) => {
    const project = projects.find(item => item.id === projectId);
    const versions = project?.scoreVersions || [];
    const targetIndex = calibrationId ? versions.findIndex(item => item.sourceId === calibrationId) : versions.findIndex(item => item.id === project?.selectedScoreVersionId);
    const previous = targetIndex > 0 ? versions[targetIndex - 1] : null;
    if (!previous) { showToast("Không tìm thấy phiên bản điểm trước cân chỉnh.", "error"); return; }
    handleSelectScoreVersion(projectId, previous.id);
    setCalibrationReview(prev => prev ? { ...prev, entries: prev.entries.map(entry => entry.projectId === projectId ? { ...entry, undone: true } : entry) } : prev);
    showToast("Đã chọn lại phiên bản điểm trước cân chỉnh; phiên bản cân chỉnh vẫn được lưu trong lịch sử.", "success");
  };

  const handleBatchGradeAll = async () => {
    const pendingProjects = projects.filter(p => !p.isGraded);
    if (pendingProjects.length === 0) {
      setErrorMsg("Không có tệp bài làm nào đang chờ chấm trong hàng đợi.");
      return;
    }

    stopBatchRef.current = false;
    setBatchLoading(true);
    setErrorMsg("");

    for (let i = 0; i < pendingProjects.length; i++) {
      if (stopBatchRef.current) {
        showToast("Đã dừng chấm bài hàng loạt theo yêu cầu.", "info");
        break;
      }

      const current = pendingProjects[i];
      setLoadingStep(`Đang tự động chấm bài ${i + 1}/${pendingProjects.length}...`);
      setGradingProjectId(current.id);
      startGradingProgress(current.id, `Bắt đầu chấm bài ${i + 1}/${pendingProjects.length}...`);
      
      try {
        const result = await performSingleGrading(current);
        let finalName = validateExtractedName(result.ocr.tenSinhVien, current.studentName);
        let finalId = validateExtractedId(result.ocr.mssv, current.studentId);

        if (classList && classList.length > 0) {
          const reconciled = reconcileWithClassList(finalName, finalId, classList);
          finalName = reconciled.name;
          finalId = reconciled.id;
        }

        setProjects(prev => prev.map(p => {
          if (p.id === current.id) {
            return appendScoreVersion(p, {
              studentName: finalName,
              studentId: finalId,
              grades: result.grades,
              reviews: result.reviews,
              generalComment: result.generalComment,
              improvements: result.improvements,
              aiGeneratedStatus: result.aiSuspect.coNghiVan ? 'suspected' : 'none',
              aiGeneratedDetails: result.aiSuspect.lyDoChiTiet || "",
              aiDetectionReport: result.aiSuspect.report || null,
              classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
              classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
            }, "ai_grading", "Chấm tự động bằng AI");
          }
          return p;
        }));

        const totalScore = parseFloat(Object.values(result.grades).reduce((a, b) => a + b, 0).toFixed(2));
        setHistoryList(prev => [
          {
            id: `hist-batch-${Date.now()}-${i}`,
            projectId: current.id,
            studentName: finalName,
            studentId: finalId,
            subject: globalSubject,
            subjectCode: globalSubjectCode,
            group: globalGroup,
            totalScore: totalScore,
            date: new Date().toLocaleDateString('vi-VN'),
            grades: result.grades
          },
          ...prev.filter(item => item.projectId !== current.id && !(item.studentId === finalId && item.subjectCode === globalSubjectCode))
        ]);
        finishGradingProgress(current.id);
      } catch (err) {
        console.warn(`Lỗi khi chấm tự động: ${err.message}`);
        failGradingProgress(current.id, `AI lỗi: ${err.message || "Không rõ nguyên nhân"}`);
        simulateStandardGrading(current.id);
      }
      setGradingProjectId(null);
    }
    setBatchLoading(false);
    setGradingProjectId(null);
  };

  const analyzeWithAI = async (overrideId = null) => {
    const targetId = typeof overrideId === 'string' ? overrideId : activeId;
    const targetProject = projects.find(p => p.id === targetId);
    if (!targetProject) return;
    
    setActiveId(targetId);
    setLoading(true);
    setGradingProjectId(targetId);
    setErrorMsg("");
    setLoadingStep("Đang phân tích dữ liệu tệp nộp bài bằng AI...");
    startGradingProgress(targetId, "Bắt đầu phân tích bài nộp...");

    try {
      const result = await performSingleGrading(targetProject);
      let finalName = validateExtractedName(result.ocr.tenSinhVien, targetProject.studentName);
      let finalId = validateExtractedId(result.ocr.mssv, targetProject.studentId);

      if (classList && classList.length > 0) {
        const reconciled = reconcileWithClassList(finalName, finalId, classList);
        finalName = reconciled.name;
        finalId = reconciled.id;
      }

      setProjects(prev => prev.map(p => {
        if (p.id === targetId) {
          return appendScoreVersion(p, { 
            studentName: finalName, 
            studentId: finalId, 
            grades: result.grades, 
            reviews: result.reviews, 
            generalComment: result.generalComment, 
            improvements: result.improvements,
            aiGeneratedStatus: result.aiSuspect.coNghiVan ? 'suspected' : 'none',
            aiGeneratedDetails: result.aiSuspect.lyDoChiTiet || "",
            aiDetectionReport: result.aiSuspect.report || null,
            classMatchStatus: classList && classList.length > 0 ? (classList.some(s => s.studentId === finalId) ? 'matched' : 'unmatched') : 'matched',
            classMatchNote: classList && classList.length > 0 && !classList.some(s => s.studentId === finalId) ? "Không tìm thấy trong danh sách tải lên" : "",
          }, "ai_grading", p.isGraded ? "Chấm lại bằng AI" : "Chấm lần đầu bằng AI");
        }
        return p;
      }));

      const calculatedTotal = parseFloat(Object.values(result.grades).reduce((a, b) => a + b, 0).toFixed(2));
      setHistoryList(prev => [{
        id: `hist-${Date.now()}`,
        projectId: targetId,
        studentName: finalName,
        studentId: finalId,
        subject: globalSubject,
        subjectCode: globalSubjectCode,
        group: globalGroup,
        totalScore: calculatedTotal,
        date: new Date().toLocaleDateString('vi-VN'),
        grades: result.grades
      }, ...prev.filter(item => item.projectId !== targetId && !(item.studentId === finalId && item.subjectCode === globalSubjectCode))]);

      showToast("Chấm điểm bài thành công!", "success");
      finishGradingProgress(targetId);

    } catch (err) {
      failGradingProgress(targetId, `AI lỗi: ${err.message || "Không rõ nguyên nhân"}`);
      setErrorMsg("Hệ thống AI bận. Đã tự động kích hoạt chế độ tự chấm dự phòng.");
      simulateStandardGrading(targetId);
    } finally {
      setLoading(false);
      setGradingProjectId(null);
    }
  };

  const handleAddRubricItem = () => {
    setRubric(prev => [...prev, { id: `crit_${Date.now()}`, name: "Tiêu chí mới", maxScore: 1.0, desc: "Mô tả yêu cầu đạt..." }]);
  };

  const handleRemoveRubricItem = (id) => {
    setRubric(prev => prev.filter(item => item.id !== id));
  };

  const handleResetRubric = () => {
    setRubric(DEFAULT_RUBRIC);
  };

  const handleMoveRubricItem = (index, direction) => {
    if (index + direction < 0 || index + direction >= rubric.length) return;
    setRubric(prev => {
      const newRubric = [...prev];
      const temp = newRubric[index];
      newRubric[index] = newRubric[index + direction];
      newRubric[index + direction] = temp;
      return newRubric;
    });
  };

  const updateRubricItem = (id, field, value) => {
    setRubric(prev => prev.map(item => {
      if (item.id === id) {
        let val = field === 'maxScore' ? (parseFloat(value) || 0) : value;
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleMoveRubricItemUp = (index) => handleMoveRubricItem(index, -1);
  const handleMoveRubricItemDown = (index) => handleMoveRubricItem(index, 1);

  const handleExportRubric = () => {
    const headers = "Số Thứ tự,Tên Tiêu Chí,Điểm Tối Đa,Mô Tả";
    const rows = rubric.map((r, index) => {
      const cleanNum = String(index + 1);
      return `${escapeCSV(cleanNum)},${escapeCSV(r.name)},${escapeCSV(r.maxScore)},${escapeCSV(r.desc)}`;
    });
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rubric_Grader_${globalSubjectCode || 'ChuaCoMa'}_${globalSubject || 'ChuaCoTen'}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const handleImportRubric = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          showToast("Tệp tin không đúng định dạng cấu hình Rubric.", "error");
          return;
        }
        
        const importedRubrics = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = [];
          let currentField = "";
          let insideQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              cols.push(currentField.trim());
              currentField = "";
            } else {
              currentField += char;
            }
          }
          cols.push(currentField.trim());

          if (cols.length >= 3) {
            const cleanId = cols[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim() || `crit_${Date.now()}_${i}`;
            const cleanName = cols[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            const cleanMaxScore = parseFloat(cols[2].replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || 1.0;
            const cleanDesc = cols[3] ? cols[3].replace(/^"|"$/g, '').replace(/""/g, '"').trim() : "";
            
            importedRubrics.push({
              id: cleanId,
              name: cleanName,
              maxScore: cleanMaxScore,
              desc: cleanDesc
            });
          }
        }

        if (importedRubrics.length > 0) {
          setRubric(importedRubrics);
          showToast(`Nạp thành công ${importedRubrics.length} tiêu chí Rubric mới!`, "success");
        } else {
          showToast("Không tìm thấy cấu trúc Rubric hợp lệ trong file.", "error");
        }
      } catch (err) {
        showToast("Lỗi khi đọc file cấu trúc Rubric: " + err.message, "error");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const handleSmartRubricUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtractingRubric(true);
    showToast("Đang tải dữ liệu và phân tích Rubric...", "success");

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let extractedText = "";
      let inlineData = null;

      if (['docx', 'doc'].includes(ext)) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        extractedText = window.XLSX.utils.sheet_to_csv(worksheet);
      } else if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        const base64String = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        inlineData = {
          mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          data: base64String
        };
      } else if (['txt', 'md'].includes(ext)) {
        extractedText = await file.text();
      } else {
        throw new Error("Định dạng file không được hỗ trợ để trích xuất Rubric.");
      }

      const prompt = `Bạn là chuyên gia giáo dục. Hãy trích xuất cấu trúc Rubric (Tiêu chí chấm điểm) từ tài liệu dưới đây. 
      Nếu nội dung chưa có điểm tối đa cụ thể, hãy tự phân bổ sao cho TỔNG ĐIỂM CÁC TIÊU CHÍ LÀ 10.0.
      ${extractedText ? `\n\nNội dung tài liệu:\n${extractedText}` : ""}`;

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            ...(inlineData ? [{ inlineData }] : [])
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Tên tiêu chí" },
                maxScore: { type: "NUMBER", description: "Điểm tối đa" },
                desc: { type: "STRING", description: "Mô tả yêu cầu" }
              },
              required: ["name", "maxScore", "desc"]
            }
          }
        }
      };

      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${reviewGeminiModel}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );

      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResult) {
        const parsed = JSON.parse(textResult);
        const newRubric = parsed.map((item, idx) => ({
           id: `crit_${Date.now()}_${idx}`,
           name: item.name,
           maxScore: item.maxScore,
           desc: item.desc
        }));
        setRubric(newRubric);
        showToast("AI đã trích xuất Rubric thành công!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi trích xuất Rubric: " + err.message, "error");
    } finally {
      setIsExtractingRubric(false);
    }
    e.target.value = "";
  };

  const handleSmartClassListUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'csv') {
      showToast("Hệ thống chỉ hỗ trợ định dạng CSV.", "error");
      e.target.value = "";
      return;
    }

    setIsExtractingClassList(true);
    showToast("Đang chạy công thức bóc tách danh sách sinh viên...", "success");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        
        const parseCSV = (str) => {
          const lines = [];
          let row = [""];
          let inQuotes = false;

          for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const nextChar = str[i + 1];

            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                row[row.length - 1] += '"';
                i++; // Skip second quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              row.push("");
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
              if (char === '\r' && nextChar === '\n') {
                i++; // Skip CRLF combo
              }
              lines.push(row);
              row = [""];
            } else {
              row[row.length - 1] += char;
            }
          }
          if (row.length > 1 || row[0] !== "") {
            lines.push(row);
          }
          return lines;
        };

        const rawRows = parseCSV(text);
        if (rawRows.length < 2) {
          throw new Error("File CSV trống hoặc không đúng định dạng.");
        }

        const headers = rawRows[0].map(h => h.trim().toLowerCase());
        
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('thư điện tử'));
        const usernameIdx = headers.findIndex(h => h.includes('username') || h.includes('tên đăng nhập') || h.includes('mã') || h.includes('mssv') || h.includes('student id') || h.includes('id'));
        const firstNameIdx = headers.findIndex(h => h.includes('first name') || h.includes('tên') || h.includes('given name'));
        const lastNameIdx = headers.findIndex(h => h.includes('last name') || h.includes('họ') || h.includes('surname') || h.includes('họ đệm'));
        const fullNameIdx = headers.findIndex(h => h.includes('full name') || h.includes('họ và tên') || h.includes('họ tên') || h.includes('ho va ten'));

        const parsedList = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row.length === 0 || row.every(cell => cell.trim() === "")) continue;

          let extractedId = "";
          let extractedName = "";

          let idSource = "";
          if (usernameIdx !== -1 && row[usernameIdx]) {
            idSource = row[usernameIdx].trim();
          } else if (emailIdx !== -1 && row[emailIdx]) {
            idSource = row[emailIdx].trim();
          } else if (row[0]) {
            idSource = row[0].trim();
          }

          if (idSource.includes('@')) {
            idSource = idSource.split('@')[0];
          }
          
          const idMatch = idSource.match(/[a-zA-Z0-9]+/);
          extractedId = idMatch ? idMatch[0].toUpperCase() : idSource.toUpperCase();

          if (fullNameIdx !== -1 && row[fullNameIdx]) {
            extractedName = row[fullNameIdx].trim();
          } else if (lastNameIdx !== -1 || firstNameIdx !== -1) {
            const lastName = lastNameIdx !== -1 ? row[lastNameIdx].trim() : "";
            const firstName = firstNameIdx !== -1 ? row[firstNameIdx].trim() : "";
            extractedName = `${lastName} ${firstName}`.trim();
          } else if (row[1]) {
            extractedName = row[1].trim();
          }

          if (extractedId && extractedName) {
            parsedList.push({
              studentId: extractedId,
              studentName: toTitleCase(extractedName)
            });
          }
        }

        if (parsedList.length > 0) {
          setClassList(parsedList);
          showToast(`Đã nạp thành công danh sách gồm ${parsedList.length} sinh viên bằng công thức!`, "success");

          setProjects(prev => prev.map(p => {
            const reconciled = reconcileWithClassList(p.studentName, p.studentId, parsedList);
            return {
              ...p,
              studentName: reconciled.name,
              studentId: reconciled.id,
              classMatchStatus: reconciled.isMatched ? 'matched' : 'unmatched',
              classMatchNote: reconciled.note
            };
          }));
        } else {
          showToast("Không tìm thấy dữ liệu sinh viên hợp lệ trong file CSV.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi phân tích danh sách lớp: " + err.message, "error");
      } finally {
        setIsExtractingClassList(false);
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleDeleteClassStudent = (studentId) => {
    setClassList(prev => prev.filter(s => s.studentId !== studentId));
    showToast("Đã xóa sinh viên khỏi danh sách lớp học.", "success");
  };

  const handleSaveClassStudent = (oldId) => {
    if (!tempStudentId.trim() || !tempStudentName.trim()) {
      showToast("Vui lòng điền đầy đủ thông tin sinh viên.", "error");
      return;
    }
    
    const nextList = classList.map(s => s.studentId === oldId ? { 
      studentId: tempStudentId.trim().toUpperCase(), 
      studentName: toTitleCase(tempStudentName) 
    } : s);
    setClassList(nextList);
    
    setEditingClassStudentId(null);
    showToast("Cập nhật thông tin sinh viên thành công.", "success");

    setProjects(prev => prev.map(p => {
      let finalName = p.studentName;
      let finalId = p.studentId;
      if (p.studentId === oldId) {
        finalId = tempStudentId.trim().toUpperCase();
        finalName = toTitleCase(tempStudentName);
      }
      const reconciled = reconcileWithClassList(finalName, finalId, nextList);
      return {
        ...p,
        studentName: reconciled.name,
        studentId: reconciled.id,
        classMatchStatus: reconciled.isMatched ? 'matched' : 'unmatched',
        classMatchNote: reconciled.note
      };
    }));
  };

  const handleExportProject = () => {
    const projectData = {
      appVersion: APP_VERSION,
      rubric, globalSubject, globalSubjectCode, globalGroup,
      globalAcademicYear, globalSemester, globalExam, globalLecturer,
      globalGradingStrategy, sketches: projects, historyList, activeId, classList, gradingFeedbacks, calibrationReview
    };
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-'); 
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); 
    const timestamp = `${dateStr}_${timeStr}`;
    const parts = [];
    if (globalSubject.trim()) parts.push(globalSubject.trim());
    if (globalSubjectCode.trim()) parts.push(globalSubjectCode.trim());
    if (globalGroup.trim()) parts.push(globalGroup.trim());

    let fileName = parts.length > 0 ? `${parts.join(" - ")} - ${APP_VERSION} - ${timestamp}.json` : `MonHoc-MaMon-Nhom_${APP_VERSION}_${now.toISOString().slice(0, 10)}.json`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGradingStyle = () => {
    const projectData = {
      appVersion: APP_VERSION,
      rubric, globalSubject, globalSubjectCode,
      gradingFeedbacks, globalGradingStrategy
    };
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-'); 
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); 
    const timestamp = `${dateStr}_${timeStr}`;

    let fileName = `PhongCachCham_${globalSubjectCode || 'Mon'}_${APP_VERSION}_${timestamp}.json`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Đã xuất cấu hình phong cách chấm AI thành công!", "success");
  };

  const handleImportProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.rubric) setRubric(importedData.rubric);
        if (importedData.globalSubject !== undefined) setGlobalSubject(importedData.globalSubject);
        if (importedData.globalSubjectCode !== undefined) setGlobalSubjectCode(importedData.globalSubjectCode);
        if (importedData.globalGroup !== undefined) setGlobalGroup(importedData.globalGroup);
        if (importedData.globalAcademicYear !== undefined) setGlobalAcademicYear(importedData.globalAcademicYear);
        if (importedData.globalSemester !== undefined) setGlobalSemester(importedData.globalSemester);
        if (importedData.globalExam !== undefined) setGlobalExam(importedData.globalExam);
        if (importedData.globalLecturer !== undefined) setGlobalLecturer(importedData.globalLecturer);
        if (importedData.globalGradingStrategy) setGlobalGradingStrategy(importedData.globalGradingStrategy);
        if (importedData.classList) setClassList(importedData.classList);
        if (importedData.gradingFeedbacks) setGradingFeedbacks(importedData.gradingFeedbacks);
        if (importedData.sketches) {
          const recovered = importedData.sketches.map(p => {
            let restored = p;
            if (p.base64 && p.mimeType) {
              restored = { ...p, fileUrl: base64ToBlobUrl(p.base64, p.mimeType) };
            }
            if (restored.isGraded && (!restored.scoreVersions || restored.scoreVersions.length === 0)) {
              const version = makeScoreVersion(restored, {}, "legacy", "Khôi phục từ tiến trình phiên bản cũ");
              version.label = "Lần 1";
              restored = { ...restored, scoreVersions: [version], selectedScoreVersionId: version.id };
            }
            if (restored.isGraded && (!restored.rubricReviewVersions || Object.keys(restored.rubricReviewVersions).length === 0)) {
              const reviewState = addRubricReviewVersions(restored, restored.reviews || {}, "Kết quả cũ");
              restored = { ...restored, ...reviewState, dirtyRubricReviews: {}, hasUnsavedManualScore: false };
            }
            if (restored.isGraded && (!restored.aiDetectionVersions || restored.aiDetectionVersions.length === 0)) {
              const aiVersionState = addAiDetectionVersion(restored, {}, "Kết quả kiểm tra cũ");
              restored = { ...restored, ...aiVersionState };
            }
            restored = {
              ...restored,
              pdfSections: normalizePdfSections(restored.pdfSections || [], restored.pdfTotalPages || 1),
              rubricReviewVersions: restored.rubricReviewVersions || {},
              selectedRubricReviewVersions: restored.selectedRubricReviewVersions || {},
              aiDetectionVersions: restored.aiDetectionVersions || [],
              selectedAiDetectionVersionId: restored.selectedAiDetectionVersionId || "",
              dirtyRubricReviews: restored.dirtyRubricReviews || {},
              hasUnsavedManualScore: Boolean(restored.hasUnsavedManualScore),
              manualScoreBaseGrades: restored.manualScoreBaseGrades || null
            };
            return restored;
          });
          setProjects(recovered);
        }
        if (importedData.historyList) setHistoryList(importedData.historyList);
        if (importedData.calibrationReview) setCalibrationReview(importedData.calibrationReview);
        if (importedData.activeId) setActiveId(importedData.activeId);
        showToast("Nạp lại tiến trình dự án thành công!", "success");
      } catch (err) {
        showToast("Lỗi khi đọc file cấu trúc dự án: " + err.message, "error");
      }
    };
    reader.readAsText(e.target.files[0], "UTF-8");
    e.target.value = "";
  };

  const getSingleExcelString = (projectItem, index) => {
    const sGrades = projectItem.grades || {};
    const sTotal = Object.values(sGrades).reduce((sum, val) => sum + val, 0);
    const row = [
      index,
      projectItem.studentId || "---",
      projectItem.studentName || "---",
      globalGroup || "---"
    ];
    rubric.forEach(r => {
      row.push((sGrades[r.id] || 0).toFixed(2));
    });
    row.push(sTotal.toFixed(2));
    return row.map(val => escapeCSV(val)).join(",");
  };

  const getFullClassExcelString = () => {
    const dynamicHeaders = rubric.map(r => `${r.name} (${r.maxScore})`);
    const headers = ["STT", "MSSV", "Họ Tên", "Nhóm", ...dynamicHeaders, "Tổng điểm"].map(h => escapeCSV(h)).join(",");
    const rows = projects.map((p, idx) => getSingleExcelString(p, idx + 1));
    return [headers, ...rows].join("\n");
  };

  const handleDownloadCSV = () => {
    const blob = new Blob(["\uFEFF" + getFullClassExcelString()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bang_Diem_MonHoc_${globalGroup.replace(/\s+/g, '_') || 'LopHoc'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const handlePrintPDFTemplate = (targetProjectsList) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Vui lòng cho phép trình duyệt mở pop-up để tạo phiếu điểm PDF.", "error");
      return;
    }
    const printSafe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    let htmlContent = `
      <html>
      <head>
        <title>Phieu_Danh_Gia_Chi_Tiet_${globalGroup || 'BaoCao'}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
          body { font-family: 'Montserrat', sans-serif; color: #1e293b; background: white; padding: 40px; margin: 0; }
          .page { page-break-after: always; max-width: 800px; margin: 0 auto; padding-bottom: 40px; border-bottom: 2px dashed #e2e8f0; }
          .page:last-child { page-break-after: avoid; border-bottom: none; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #cbd5e1; padding-bottom: 15px; margin-bottom: 25px; }
          .header-left h1 { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; color: #e11d48; letter-spacing: 0.5px; }
          .header-right { text-align: right; }
          .header-right .total-score-badge { background: #e11d48; color: white; padding: 10px 20px; border-radius: 12px; font-size: 24px; font-weight: 900; display: inline-block; margin-top: 4px; border: 2px solid #be123c; }
          .header-right .total-label { font-size: 10px; font-weight: 700; color: #e11d48; text-transform: uppercase; margin-bottom: 2px; display: block; }
          
          .meta-container { 
            margin-bottom: 25px; 
            background: #f8fafc; 
            padding: 18px 20px; 
            border-radius: 12px; 
            border: 1px solid #e2e8f0; 
            display: grid;
            grid-template-columns: 2fr 1.1fr 1.1fr;
            gap: 12px 20px;
            font-size: 11px;
            line-height: 1.5;
          }
          .meta-item {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 6px;
          }
          .meta-item.span-all { grid-column: 1 / -1; }
          .meta-item.span-2 { grid-column: span 2; }
          .meta-item strong { color: #475569; white-space: nowrap; flex-shrink: 0; }
          .meta-item span { color: #1e293b; }
          
          .rubric-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .rubric-table th, .rubric-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; line-height: 1.5; }
          .rubric-table th { background: #f1f5f9; color: #475569; font-weight: 700; }
          .rubric-table .score-col { text-align: center; font-weight: 700; width: 120px; color: #e11d48; }
          .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #475569; margin-bottom: 8px; border-left: 4px solid #e11d48; padding-left: 8px; }
          .comment-box { background: #fafaf9; border: 1px solid #e7e5e4; padding: 15px; border-radius: 10px; font-size: 12px; line-height: 1.6; margin-bottom: 20px; color: #44403c; }
          @media print { body { padding: 0; } .page { border-bottom: none; padding-bottom: 0; } }
        </style>
      </head>
      <body>
    `;

    targetProjectsList.forEach(project => {
      const sGrades = project.grades || {};
      const sReviews = project.reviews || {};
      const sTotal = Object.values(sGrades).reduce((sum, val) => sum + val, 0);
      const aiReport = project.aiDetectionReport || {};
      const aiFindingRows = (aiReport.dauHieu || []).map((finding, index) => `
        <div style="padding: 8px 0; border-bottom: 1px solid #fde68a; font-size: 11px; line-height: 1.55;">
          <strong>${index + 1}. ${printSafe(finding.trang || "Không rõ trang")}</strong> · ${printSafe(finding.nhomDauHieu || "Dấu hiệu bất thường")} · <span style="font-weight: 700; color: ${finding.mucTinCay === 'Cao' ? '#be123c' : '#d97706'};">${printSafe(finding.mucTinCay || "Chưa xác định")}</span><br />
          ${printSafe(finding.quanSatCuThe || "Chưa có mô tả chi tiết.")}
        </div>`).join("");
      const aiQuestionRows = (aiReport.cauHoiXacMinh || []).map((question, index) => `<li style="margin-bottom: 5px;">${index + 1}. ${printSafe(question)}</li>`).join("");

      let rubricRows = rubric.map(r => {
        const score = sGrades[r.id] || 0;
        const review = sReviews[r.id] || "Chưa có nhận xét chi tiết cho tiêu chí này.";
        return `
          <tr>
            <td>
              <strong>${r.name}</strong>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">${r.desc}</div>
            </td>
            <td>${review}</td>
            <td class="score-col">${score.toFixed(2)} / ${r.maxScore.toFixed(2)}</td>
          </tr>
        `;
      }).join("");

      htmlContent += `
        <div class="page">
          <div class="header">
            <div class="header-left">
              <h1>PHIẾU ĐÁNH GIÁ & CHẤM ĐIỂM CHI TIẾT</h1>
            </div>
            <div class="header-right">
              <span class="total-label">Tổng kết điểm số</span>
              <div class="total-score-badge">${sTotal.toFixed(2)} / 10.00</div>
            </div>
          </div>
          
          <div class="meta-container">
            <div class="meta-item span-2"><strong>Họ và tên sinh viên:</strong> <span>${project.studentName || "Không rõ"}</span></div>
            <div class="meta-item"><strong>MSSV:</strong> <span>${project.studentId || "Không rõ"}</span></div>
            
            <div class="meta-item"><strong>Môn học:</strong> <span>${globalSubject || "Không rõ"}</span></div>
            <div class="meta-item"><strong>Mã môn học:</strong> <span>${globalSubjectCode || "Không rõ"}</span></div>
            <div class="meta-item"><strong>Nhóm:</strong> <span>${globalGroup || "Không rõ"}</span></div>
            
            <div class="meta-item"><strong>Năm học:</strong> <span>${globalAcademicYear || "Chưa rõ"}</span></div>
            <div class="meta-item"><strong>Học kỳ:</strong> <span>${globalSemester || "Chưa rõ"}</span></div>
            <div class="meta-item"><strong>Kỳ thi:</strong> <span>${globalExam || "Chưa rõ"}</span></div>
            
            <div class="meta-item span-all"><strong>Giảng viên chấm:</strong> <span>${globalLecturer || "Chưa rõ"}</span></div>
          </div>

          ${project.aiGeneratedStatus === 'suspected' ? `
            <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
              <strong style="color: #d97706; font-size: 13px; text-transform: uppercase;">⚠️ Cảnh báo: Bài có dấu hiệu sử dụng AI</strong>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 9px;">
                <span style="font-size: 10px; font-weight: 700; color: #9f1239; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 4px 7px;">Mức: ${printSafe(aiReport.mucDo || "Cần giảng viên kiểm tra")}</span>
                <span style="font-size: 10px; font-weight: 700; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 7px;">Độ tin cậy cảnh báo: ${Math.round(aiReport.diemTinCay || 0)}%</span>
              </div>
              <p style="font-size: 12px; color: #78350f; margin: 10px 0 4px; line-height: 1.6;"><strong>Nhận định tổng quát:</strong> ${printSafe(project.aiGeneratedDetails || "Chưa có mô tả tổng quát.")}</p>
              ${aiFindingRows ? `<div style="margin-top: 9px;"><strong style="font-size: 10px; color: #9f1239; text-transform: uppercase;">Dấu hiệu và vị trí cần kiểm tra</strong>${aiFindingRows}</div>` : ''}
              ${aiQuestionRows ? `<div style="margin-top: 10px;"><strong style="font-size: 10px; color: #4338ca; text-transform: uppercase;">Câu hỏi giảng viên nên xác minh</strong><ol style="padding-left: 0; margin: 7px 0 0; list-style: none; font-size: 11px; line-height: 1.5; color: #312e81;">${aiQuestionRows}</ol></div>` : ''}
              ${aiReport.yeuCauGiangVien ? `<p style="font-size: 11px; color: #334155; margin: 10px 0 0; padding: 8px; background: #f8fafc; border-radius: 6px;"><strong>Yêu cầu GV đã dùng khi kiểm tra lại:</strong> ${printSafe(aiReport.yeuCauGiangVien)}</p>` : ''}
              ${aiReport.ketLuanGiangVien ? `<p style="font-size: 11px; color: #334155; margin: 10px 0 0; padding: 8px; background: #f8fafc; border-radius: 6px;"><strong>Kết luận của giảng viên:</strong> ${printSafe(aiReport.ketLuanGiangVien)}</p>` : ''}
              <p style="font-size: 9px; color: #92400e; margin: 10px 0 0; font-style: italic;">Cảnh báo AI chỉ là thông tin hỗ trợ xác minh; quyết định chuyên môn cuối cùng thuộc về giảng viên.</p>
            </div>
          ` : ''}
          ${project.aiGeneratedStatus === 'verified_clean' ? `
            <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 12px 15px; border-radius: 10px; margin-bottom: 20px;">
              <strong style="color: #047857; font-size: 12px; text-transform: uppercase;">✓ Kết luận xác minh của giảng viên</strong>
              <p style="font-size: 11px; color: #065f46; margin: 6px 0 0; line-height: 1.55;">${printSafe(aiReport.ketLuanGiangVien || project.aiGeneratedDetails || "Giảng viên đã kiểm tra và xác nhận bài do sinh viên tự thực hiện.")}</p>
            </div>
          ` : ''}

          <div class="section-title">Chi tiết điểm số & Nhận xét của Giảng viên</div>
          <table class="rubric-table">
            <thead>
              <tr>
                <th style="width: 35%">Tiêu chí đánh giá</th>
                <th style="width: 50%">Nhận xét chi tiết của giảng viên</th>
                <th class="score-col" style="width: 15%">Điểm đạt</th>
              </tr>
            </thead>
            <tbody>
              ${rubricRows}
            </tbody>
          </table>
          <div class="section-title">Đánh giá tổng quát bài làm</div>
          <div class="comment-box">
            ${project.generalComment || "Chưa có nhận xét tổng quát."}
          </div>
          <div style="margin-top: 18px; text-align: right; font-size: 8px; color: #94a3b8;">IFA Project AI Grader ${APP_VERSION}</div>
        </div>
      `;
    });

    htmlContent += `
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintPDF = () => {
    const gradedProjects = projects.filter(p => p.isGraded);
    if (gradedProjects.length === 0) {
      showToast("Chưa có sinh viên nào được chấm điểm để xuất PDF.", "error");
      return;
    }
    handlePrintPDFTemplate(gradedProjects);
  };

  const handlePrintSinglePDF = (project) => {
    if (!project.isGraded) {
      showToast("Bài của sinh viên này chưa được chấm điểm.", "error");
      return;
    }
    handlePrintPDFTemplate([project]);
  };

  const getDistribution = () => {
    const dist = [
      { label: '< 5', sub: 'Yếu', count: 0, color: 'bg-rose-500', hex: '#f43f5e' },
      { label: '5-5.4', sub: 'TB', count: 0, color: 'bg-orange-500', hex: '#f97316' },
      { label: '5.5-5.9', sub: 'TB', count: 0, color: 'bg-amber-500', hex: '#f59e0b' },
      { label: '6-6.4', sub: 'TB Khá', count: 0, color: 'bg-yellow-400', hex: '#facc15' },
      { label: '6.5-6.9', sub: 'TB Khá', count: 0, color: 'bg-lime-400', hex: '#a3e635' },
      { label: '7-7.4', sub: 'Khá', count: 0, color: 'bg-green-400', hex: '#4ade80' },
      { label: '7.5-7.9', sub: 'Khá', count: 0, color: 'bg-emerald-400', hex: '#34d399' },
      { label: '8-8.4', sub: 'Giỏi', count: 0, color: 'bg-teal-400', hex: '#2dd4bf' },
      { label: '8.5-8.9', sub: 'XS', count: 0, color: 'bg-cyan-400', hex: '#22d3ee' },
      { label: '9-10', sub: 'XS', count: 0, color: 'bg-blue-500', hex: '#3b82f6' }
    ];
    projects.filter(p => p.isGraded).forEach(p => {
      const sTotal = Object.values(p.grades || {}).reduce((sum, val) => sum + val, 0);
      if (sTotal < 5.0) dist[0].count++;
      else if (sTotal < 5.5) dist[1].count++;
      else if (sTotal < 6.0) dist[2].count++;
      else if (sTotal < 6.5) dist[3].count++;
      else if (sTotal < 7.0) dist[4].count++;
      else if (sTotal < 7.5) dist[5].count++;
      else if (sTotal < 8.0) dist[6].count++;
      else if (sTotal < 8.5) dist[7].count++;
      else if (sTotal < 9.0) dist[8].count++;
      else dist[9].count++;
    });
    return dist;
  };

  const handlePrintDistributionPDF = () => {
    const gradedProjects = projects.filter(p => p.isGraded);
    if (gradedProjects.length === 0) {
      showToast("Chưa có sinh viên nào được chấm điểm để xuất phổ điểm.", "error");
      return;
    }
    const dist = getDistribution();
    const maxCount = Math.max(...dist.map(d => d.count), 1);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Vui lòng cho phép trình duyệt mở pop-up để tạo file PDF.", "error");
      return;
    }

    let chartHtml = '';
    if (chartType === 'column') {
        chartHtml = `
            <div class="chart-container-col">
              ${dist.map(d => {
                const h = (d.count / maxCount) * 100;
                return `
                  <div class="bar-wrapper-col">
                    <span class="bar-value">${d.count > 0 ? d.count : ''}</span>
                    <div class="bar-col" style="height: ${h}%; background-color: ${d.hex}; min-height: ${d.count > 0 ? '4px' : '0px'};"></div>
                  </div>
                `
              }).join('')}
            </div>
            <div class="labels-container">
              ${dist.map(d => `<div class="label"><div>${d.label}</div><div class="label-sub">${d.sub}</div></div>`).join('')}
            </div>
        `;
    } else if (chartType === 'bar') {
        chartHtml = `
            <div class="chart-container-bar">
              ${dist.map(d => {
                const w = (d.count / maxCount) * 100;
                return `
                  <div class="bar-wrapper-row">
                    <span class="label-row">${d.label} (${d.sub})</span>
                    <div class="bar-track">
                       <div class="bar-row" style="width: ${w}%; background-color: ${d.hex}; min-width: ${d.count > 0 ? '4px' : '0px'};"></div>
                    </div>
                    <span class="bar-val-row">${d.count > 0 ? d.count : ''}</span>
                  </div>
                `
              }).join('')}
            </div>
        `;
    } else if (chartType === 'line') {
        chartHtml = `
            <div class="chart-container-col" style="position: relative;">
               <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: visible;" preserveAspectRatio="none" viewBox="0 0 100 100">
                   <polyline fill="none" stroke="#8b5cf6" stroke-width="2" vector-effect="non-scaling-stroke" 
                             points="${dist.map((d, idx) => {
                                 const x = (idx + 0.5) * (100 / dist.length);
                                 const y = 100 - (d.count / maxCount) * 90;
                                 return `${x},${y}`;
                             }).join(' ')}" />
                   ${dist.map((d, idx) => {
                         const x = (idx + 0.5) * (100 / dist.length);
                         const y = 100 - (d.count / maxCount) * 90;
                         return `<circle cx="${x}" cy="${y}" r="3" fill="${d.hex}" vector-effect="non-scaling-stroke" />`;
                   }).join('')}
               </svg>
               ${dist.map((d, idx) => {
                  const x = (idx + 0.5) * (100 / dist.length);
                  const y = 100 - (d.count / maxCount) * 90;
                  return d.count > 0 ? `<div style="position: absolute; left: ${x}%; top: calc(${y}% - 20px); transform: translateX(-50%); font-size: 14px; font-weight: bold; color: #334155;">${d.count}</div>` : '';
               }).join('')}
            </div>
            <div class="labels-container">
              ${dist.map(d => `<div class="label"><div>${d.label}</div><div class="label-sub">${d.sub}</div></div>`).join('')}
            </div>
        `;
    }

    const htmlContent = `
      <html>
      <head>
        <title>Pho_Diem_${globalGroup || 'BaoCao'}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
          body { font-family: 'Montserrat', sans-serif; color: #1e293b; background: white; padding: 40px; margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0 0 10px 0; }
          .header p { font-size: 14px; color: #64748b; margin: 0; }
          
          .chart-container-col { display: flex; align-items: flex-end; justify-content: space-around; height: 350px; border-bottom: 2px solid #94a3b8; padding-bottom: 10px; margin-top: 50px; position: relative; }
          .bar-wrapper-col { display: flex; flex-direction: column; align-items: center; flex: 1; z-index: 10; }
          .bar-value { font-size: 14px; font-weight: bold; color: #334155; margin-bottom: 8px; }
          .bar-col { width: 90%; max-width: 50px; border-radius: 4px 4px 0 0; }
          
          .chart-container-bar { display: flex; flex-direction: column; gap: 15px; margin-top: 50px; padding: 0 20px; }
          .bar-wrapper-row { display: flex; align-items: center; gap: 15px; }
          .label-row { width: 180px; text-align: right; font-size: 13px; font-weight: bold; color: #475569; }
          .bar-track { flex: 1; height: 30px; background: #f1f5f9; border-radius: 4px; overflow: hidden; display: flex; align-items: center; }
          .bar-row { height: 100%; border-radius: 0 4px 4px 0; }
          .bar-val-row { width: 30px; font-size: 14px; font-weight: bold; color: #334155; }

          .labels-container { display: flex; justify-content: space-around; margin-top: 15px; }
          .label { flex: 1; text-align: center; font-size: 10px; font-weight: bold; color: #475569; padding: 0 2px; }
          .label-sub { font-size: 9px; font-weight: normal; color: #64748b; }
          
          .summary { margin-top: 40px; display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
          .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; text-align: center; min-width: 150px; }
          .stat-box .title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 5px; }
          .stat-box .val { font-size: 24px; color: #0f172a; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Biểu Đồ Phổ Điểm Lớp Học</h1>
          <p>Môn học: ${globalSubject || "---"} | Mã MH: ${globalSubjectCode || "---"} | Nhóm: ${globalGroup || "---"}</p>
          <p>Năm học: ${globalAcademicYear || "---"} | Học kỳ: ${globalSemester || "---"} | Giảng viên: ${globalLecturer || "---"}</p>
        </div>
        <div class="summary">
          <div class="stat-box"><span class="title">Tổng số bài chấm</span><span class="val">${gradedProjects.length}</span></div>
          <div class="stat-box"><span class="title">Điểm trung bình</span><span class="val">${(gradedProjects.reduce((sum, p) => sum + Object.values(p.grades||{}).reduce((a,b)=>a+b,0), 0) / gradedProjects.length).toFixed(2)}</span></div>
        </div>
        ${chartHtml}
        <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStep2InputFieldClass = (value, widthClass) => {
    const isEmpty = !value || !value.trim();
    const darkClasses = isEmpty 
      ? 'bg-slate-950 border-red-500/80 text-white placeholder:text-red-500 placeholder:font-semibold placeholder:animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.25)] text-center' 
      : 'bg-slate-950 border-slate-800 text-white focus:border-rose-500';
    const lightClasses = isEmpty 
      ? 'bg-white border-red-500 text-red-600 placeholder:text-red-500 placeholder:font-semibold placeholder:animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)] font-semibold text-center' 
      : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500';
    const activeThemeClass = theme === 'dark' ? darkClasses : lightClasses;
    return `border text-xs px-2.5 py-1.5 rounded-lg focus:outline-none ${widthClass} font-semibold transition-all ${activeThemeClass}`;
  };

  const classListStats = (() => {
    if (!classList || classList.length === 0) return null;

    const submittedIds = new Set(projects.map(p => p.studentId).filter(id => id && id !== "Không Rõ" && id !== "Đang quét..."));
    
    const matchedCount = classList.filter(student => submittedIds.has(student.studentId)).length;
    const totalCount = classList.length;

    const classListIdsSet = new Set(classList.map(s => s.studentId));
    const unmatchedProjects = projects.filter(p => p.studentId && p.studentId !== "Không Rõ" && p.studentId !== "Đang quét..." && !classListIdsSet.has(p.studentId));
    const unmatchedCount = unmatchedProjects.length;

    return {
      matchedCount,
      totalCount,
      unmatchedCount,
      unmatchedProjects,
      submittedIds
    };
  })();

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans flex flex-col antialiased relative ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {toast.message && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[10000] animate-fade-in">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold font-mono tracking-wide ${toast.type === "success" ? "bg-emerald-950/90 text-emerald-400 border-emerald-500/30" : "bg-rose-950/90 text-rose-400 border-rose-500/30"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="max-h-32 max-w-[75vw] overflow-y-auto whitespace-pre-wrap">{toast.message}</span>
            <button type="button" onClick={() => setToast({ message: "", type: "success" })} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Đóng thông báo" title="Đóng"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {showApiSettings && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Cấu hình Gemini API</h2>
                <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Khóa chỉ được lưu trong trình duyệt trên máy đang dùng, không đưa vào file JSON hoặc mã GitHub.</p>
              </div>
              {apiKey && <button type="button" onClick={() => setShowApiSettings(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>}
            </div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-indigo-400">Kho Gemini API key — tối đa 10 khóa</label>
            <div className="space-y-2">
              {Array.from({ length: visibleApiKeySlots }, (_, index) => index).map(index => (
                <label key={index} className={`flex items-center gap-3 rounded-xl border p-2 ${draftActiveApiKeyIndex === index ? 'border-indigo-500 bg-indigo-500/10' : (theme === 'dark' ? 'border-slate-700' : 'border-slate-300')}`}>
                  <input type="radio" name="project-active-api-key" checked={draftActiveApiKeyIndex === index} onChange={() => setDraftActiveApiKeyIndex(index)} />
                  <span className="w-14 text-[10px] font-black uppercase text-slate-500">Khóa {index + 1}</span>
                  <input type="password" autoComplete="off" value={draftApiKeys[index] || ''} onChange={event => setDraftApiKeys(current => current.map((value, keyIndex) => keyIndex === index ? event.target.value : value))} placeholder={`Dán API key tài khoản ${index + 1}`} className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`} />
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[9px] text-slate-500">Chọn nút tròn để đặt khóa đang hoạt động. Hệ thống không tự chuyển khóa khi hết quota.</p>
              {visibleApiKeySlots < MAX_GEMINI_API_KEYS && (
                <button type="button" onClick={() => { setVisibleApiKeySlots(current => Math.min(MAX_GEMINI_API_KEYS, current + 1)); setDraftActiveApiKeyIndex(visibleApiKeySlots); }} className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-indigo-500/40 px-3 py-1.5 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/10"><Plus className="h-3.5 w-3.5" />Thêm API key</button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-indigo-400">Model chấm bài chính</label>
                <select value={activeGeminiModel} onChange={(event) => setActiveGeminiModel(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}>
                  {GEMINI_MODEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-emerald-400">Model Flash Review</label>
                <select value={reviewGeminiModel} onChange={(event) => setReviewGeminiModel(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}>
                  {REVIEW_MODEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <p className="mt-1 text-[9px] text-slate-500">Dùng cho OCR, phân tích rubric và danh sách sinh viên để giảm chi phí.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {apiKey && <button type="button" onClick={() => setShowApiSettings(false)} className="rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">Hủy</button>}
              <button type="button" onClick={saveApiSettings} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-500">Lưu cấu hình</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className={`border-b backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2 rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2"><h1 className={`text-xl font-extrabold tracking-tight ${theme === 'dark' ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent' : 'text-slate-900'}`}>IFA Project AI Grader</h1><span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400">{APP_VERSION}</span></div>
            <p className={`text-xs font-medium font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Hệ thống AI Thẩm định & Chấm điểm bài môn học khoa MTCN</p>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* THEME MODE TOGGLE */}
        <div className="flex justify-end gap-2 mb-4 relative z-40">
          <button
            type="button"
            onClick={openApiSettings}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-black cursor-pointer shadow-lg active:scale-95 ${apiKey ? (theme === 'dark' ? 'bg-slate-950 border-emerald-700/60 text-emerald-400' : 'bg-white border-emerald-300 text-emerald-700') : 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'}`}
            title="Cấu hình API và model Gemini"
          >
            <Sliders className="w-4 h-4" /> {apiKey ? `Khóa ${apiKeyPool.activeIndex + 1} · ${activeGeminiModel.replace('gemini-', '')}` : 'Nhập API key'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme(prev => prev === 'dark' ? 'light' : 'dark');
            }}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-black cursor-pointer shadow-lg active:scale-95 ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-amber-400 hover:text-amber-300' : 'bg-white border-slate-300 text-indigo-600 hover:text-indigo-500'}`}
            title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {theme === 'dark' ? (
              <span className="flex items-center gap-1.5"><Sun className="w-4 h-4 text-amber-400" /> Giao diện Sáng</span>
            ) : (
              <span className="flex items-center gap-1.5"><Moon className="w-4 h-4 text-indigo-600" /> Giao diện Tối</span>
            )}
          </button>
        </div>

        {/* STEP NAVIGATION WIZARD */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between gap-4 mb-6 shadow-sm overflow-x-auto ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3 md:gap-4 lg:gap-8 min-w-max">
            <div onClick={() => setCurrentStep(1)} className={`flex items-center gap-2 cursor-pointer transition-all ${currentStep === 1 ? 'text-rose-400 font-bold' : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${currentStep === 1 ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800'}`}>1</span>
              <span className="text-xs uppercase tracking-wider">Bước 1: Rubric & Lớp Học</span>
            </div>
            <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            <div onClick={() => { if(currentStep > 1 || projects.length > 0) setCurrentStep(2) }} className={`flex items-center gap-2 cursor-pointer transition-all ${currentStep === 2 ? 'text-rose-400 font-bold' : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${currentStep === 2 ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800'}`}>2</span>
              <span className="text-xs uppercase tracking-wider">Bước 2: Chấm bài nộp</span>
            </div>
            <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            <div onClick={() => { if(currentStep > 3 || projects.length > 0) setCurrentStep(3) }} className={`flex items-center gap-2 cursor-pointer transition-all ${currentStep === 3 ? 'text-rose-400 font-bold' : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${currentStep === 3 ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800'}`}>3</span>
              <span className="text-xs uppercase tracking-wider">Bước 3: Sổ điểm</span>
            </div>
            <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            <div onClick={() => { if(currentStep > 3 || projects.length > 0) setCurrentStep(4) }} className={`flex items-center gap-2 cursor-pointer transition-all ${currentStep === 4 ? 'text-rose-400 font-bold' : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${currentStep === 4 ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800'}`}>4</span>
              <span className="text-xs uppercase tracking-wider">Bước 4: Xuất kết quả</span>
            </div>
          </div>
        </div>

        {/* STEP 1: RUBRIC, COURSES & CLASS FILE */}
        {currentStep === 1 && (
          <div className={`border rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-w-4xl mx-auto w-full transition-all animate-fade-in ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-5 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>BƯỚC 1: Cấu hình Môn học, Rubric & Danh sách lớp</h2>
                  <p className={`text-xs mt-0.5 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Thiết lập thang điểm chi tiết và tùy chọn nạp danh sách lớp từ hệ thống E-learning để so khớp chống sai sót.</p>
                </div>
              </div>
            </div>

            {/* CLASS LIST UPLOADER CARD */}
            <div className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-emerald-50/40 border-emerald-200'}`}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-600/15 p-2 rounded-xl text-emerald-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wide">
                      tải lên Danh sách sinh viên (.csv)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Hỗ trợ tải lên file danh sách lớp E-learning định dạng (.csv)
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <a
                    href="data:text/csv;charset=utf-8,%EF%BB%BFEmail,First%20name,Surname%0A12200271%40student.tdtu.edu.vn,Hi%E1%BB%81n,Nguy%E1%BB%85n%20%C4%90%E1%BB%97%20Thu%0A12200272%40student.tdtu.edu.vn,B,Tr%E1%BA%A7n%20Th%E1%BB%8B"
                    download="Mau_Danh_Sach_Sinh_Vien.csv"
                    className={`flex items-center justify-center gap-1.5 border px-3 py-2 rounded-xl text-[11px] font-bold cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Download className="w-3.5 h-3.5" /> File mẫu CSV
                  </a>
                  
                  <button
                    type="button"
                    onClick={() => classListInputRef.current && classListInputRef.current.click()}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Nạp danh sách sinh viên (.csv)
                  </button>
                </div>
              </div>

              {isExtractingClassList && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-3 animate-pulse mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Hệ thống đang chạy công thức bóc tách danh sách sinh viên...</span>
                </div>
              )}

              {classList.length > 0 && (
                <div className={`mt-2 border rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div 
                    className="flex items-center gap-2 cursor-pointer group hover:text-emerald-400 transition-colors"
                    onClick={() => setShowClassListComparisonModal(true)}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-500 group-hover:animate-bounce" />
                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} underline decoration-dotted font-bold`}>
                      Đã ghi nhận <b>{classList.length}</b> sinh viên. (Nhấp để xem danh sách)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClassList([]);
                        setProjects(prev => prev.map(p => ({
                          ...p,
                          classMatchStatus: 'matched',
                          classMatchNote: ""
                        })));
                        showToast("Đã xóa danh sách lớp học.", "info");
                      }}
                      className="text-red-500 hover:text-red-400 font-extrabold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa danh sách
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SMART RUBRIC EXTRACTOR */}
            <div className={`flex flex-col gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-200'}`}>
               <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-500"/> AI Trích xuất Tiêu chí tự động</span>
                    <span className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Tải lên file Word, Excel, PDF hoặc Hình ảnh chứa nội dung Rubric để AI tự động điền.</span>
                  </div>
                  <button type="button" onClick={() => smartRubricInputRef.current && smartRubricInputRef.current.click()} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow shadow-indigo-900/20 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5" /> <span>Nạp file phân tích Rubric</span>
                  </button>
               </div>
               {isExtractingRubric && (
                  <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3 flex items-center gap-3 animate-pulse mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-400 border-t-transparent"></div>
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI đang quét và bóc tách cấu trúc Rubric từ tài liệu...</span>
                  </div>
                )}
            </div>

            {/* Course Meta Inputs */}
            <div className={`border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Môn học
                </label>
                <input 
                  type="text" value={globalSubject} onChange={e => setGlobalSubject(e.target.value)}
                  placeholder="VD: Đồ án thiết kế nội thất..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Mã môn học
                </label>
                <input 
                  type="text" value={globalSubjectCode} onChange={e => setGlobalSubjectCode(e.target.value)}
                  placeholder="VD: DAMH_NT02..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none font-mono ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" /> Nhóm
                </label>
                <input 
                  type="text" value={globalGroup} onChange={e => setGlobalGroup(e.target.value)}
                  placeholder="VD: Nhóm 02..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Năm học
                </label>
                <input 
                  type="text" value={globalAcademicYear} onChange={e => setGlobalAcademicYear(e.target.value)}
                  placeholder="VD: 2025-2026..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none font-mono ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Học kỳ
                </label>
                <input 
                  type="text" value={globalSemester} onChange={e => setGlobalSemester(e.target.value)}
                  placeholder="VD: Học kỳ I..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Kỳ thi
                </label>
                <select
                  value={globalExam}
                  onChange={e => setGlobalExam(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                >
                  <option value="Quá trình 1">Quá trình 1</option>
                  <option value="Quá trình 2">Quá trình 2</option>
                  <option value="Giữa kỳ">Giữa kỳ</option>
                  <option value="Cuối kỳ">Cuối kỳ</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Giảng viên chấm
                </label>
                <input 
                  type="text" value={globalLecturer} onChange={e => setGlobalLecturer(e.target.value)}
                  placeholder="VD: ThS. Nguyễn Văn A..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
            </div>

            {/* Rubric Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rubric.map((crit, index) => (
                <div key={crit.id} className={`relative p-4 border rounded-xl flex flex-col gap-3 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button type="button" onClick={() => handleMoveRubricItemUp(index)} disabled={index === 0} className={`disabled:opacity-30 disabled:hover:text-slate-500 transition-colors border p-1.5 rounded-md cursor-pointer ${theme === 'dark' ? 'text-slate-500 hover:text-indigo-400 bg-slate-900 border-slate-800' : 'text-slate-600 hover:text-indigo-600 bg-white border-slate-300'}`} title="Di chuyển lên"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleMoveRubricItemDown(index)} disabled={index === rubric.length - 1} className={`disabled:opacity-30 disabled:hover:text-slate-500 transition-colors border p-1.5 rounded-md cursor-pointer ${theme === 'dark' ? 'text-slate-500 hover:text-indigo-400 bg-slate-900 border-slate-800' : 'text-slate-600 hover:text-indigo-600 bg-white border-slate-300'}`} title="Di chuyển xuống"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleRemoveRubricItem(crit.id)} className={`transition-colors border p-1.5 rounded-md ml-1 cursor-pointer ${theme === 'dark' ? 'text-slate-500 hover:text-rose-500 bg-slate-900 border-slate-800' : 'text-slate-600 hover:text-rose-500 bg-white border-slate-300'}`} title="Xóa tiêu chí"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="pr-28">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Tên tiêu chí đánh giá</label>
                    <input type="text" value={crit.name} onChange={(e) => updateRubricItem(crit.id, 'name', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Điểm tối đa</label>
                    <input type="number" step="0.1" value={crit.maxScore} onChange={(e) => updateRubricItem(crit.id, 'maxScore', e.target.value)} className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none font-mono ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Định nghĩa & Yêu cầu cụ thể đạt tiêu chí</label>
                    <textarea value={crit.desc} onChange={(e) => updateRubricItem(crit.id, 'desc', e.target.value)} rows="2" className={`w-full border p-2.5 text-xs focus:outline-none leading-relaxed ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="Mô tả tiêu chuẩn đạt..." />
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex flex-wrap items-center justify-end gap-3 p-4 rounded-2xl border -mt-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100 border-slate-200'}`}>
              <button type="button" onClick={handleAddRubricItem} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4.5 py-2.5 rounded-xl text-xs transition-all shadow cursor-pointer">
                <Plus className="w-4 h-4" /> <span>Thêm tiêu chí</span>
              </button>
              <button type="button" onClick={handleResetRubric} className={`flex items-center gap-1.5 border font-semibold px-4.5 py-2.5 rounded-xl text-xs transition-all shadow cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
                <RotateCcw className="w-3.5 h-3.5" /> <span>Khôi phục mẫu chuẩn</span>
              </button>
            </div>

            {/* Total score warning */}
            <div className={`flex items-center justify-between border-t pt-5 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex flex-col gap-1 text-xs">
                {(() => {
                  const currentTotal = rubric.reduce((sum, r) => sum + (parseFloat(r.maxScore) || 0), 0);
                  const isTotal10 = Math.abs(currentTotal - 10) < 0.01;
                  return (
                    <>
                      <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Tổng điểm tối đa hiện tại: <strong className={`text-sm font-black font-mono px-2 py-1 rounded-lg transition-all ${isTotal10 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>{currentTotal.toFixed(2)}</strong> / 10.00
                      </span>
                      {!isTotal10 && (<span className="text-rose-500 flex items-center gap-1 mt-1 font-semibold"><AlertTriangle className="w-4 h-4" /> Khuyến nghị tổng các điểm tiêu chí nên là 10.</span>)}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Actions and Imports */}
            <div className={`flex flex-wrap items-center justify-between gap-4 border-t pt-5 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex flex-col w-full gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={handleExportRubric} className={`flex items-center gap-1.5 border font-medium px-4 py-2.5 rounded-xl text-xs transition-all shadow cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      <DownloadCloud className="w-3.5 h-3.5 text-rose-400" /> <span>Lưu Rubric</span>
                    </button>
                    <button type="button" onClick={() => rubricFileInputRef.current && rubricFileInputRef.current.click()} className={`flex items-center gap-1.5 border font-medium px-4 py-2.5 rounded-xl text-xs transition-all shadow cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      <UploadCloud className="w-3.5 h-3.5 text-rose-400" /> <span>Nạp Rubric</span>
                    </button>
                    <button type="button" onClick={() => projectFileInputRef.current && projectFileInputRef.current.click()} className={`flex items-center gap-1.5 border font-medium px-4 py-2.5 rounded-xl text-xs transition-all shadow cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-500" /> <span>Nạp dự án (.json)</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => setCurrentStep(2)} className="bg-rose-500 hover:bg-rose-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer">
                    <span>Xác nhận & Sang Bước 2</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GRADING DASHBOARD */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6 transition-all animate-fade-in">
            {(batchLoading || loading) && (
              <div className={`border rounded-2xl p-4 flex items-start justify-between gap-4 shadow-lg ${theme === 'dark' ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mt-0.5 flex-shrink-0"></div>
                  <div className="text-xs min-w-0 flex-1">
                    <span className="font-bold text-indigo-500 uppercase tracking-wider block">AI đang chấm bài{activeGradingProject.studentName ? ` – ${activeGradingProject.studentName}` : ""}</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5 mb-2">Phiên bản {APP_VERSION}</span>
                    <div className={`grid grid-rows-3 gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {(() => {
                        const latestEntries = (activeGradingProgress.length ? [...activeGradingProgress].slice(-3).reverse() : [{ id: 'loading-current', status: 'running', message: loadingStep }]);
                        return [...latestEntries, ...Array(Math.max(0, 3 - latestEntries.length)).fill(null)].map((item, index) => item ? (
                          <div key={item.id} className="flex items-center gap-2 h-5 min-w-0 leading-none">
                            {item.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : item.status === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" /> : <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-pulse" />}
                            <span title={item.message} className={`truncate ${item.status === 'completed' ? 'opacity-70' : 'font-semibold'}`}>{item.message}</span>
                          </div>
                        ) : <div key={`empty-log-${index}`} className="h-5 border-b border-slate-700/20" />);
                      })()}
                    </div>
                  </div>
                </div>
                {batchLoading && <button onClick={() => { stopBatchRef.current = true; }} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-md shadow-rose-950/20 cursor-pointer flex-shrink-0">Dừng chấm</button>}
              </div>
            )}

            <div className={`border rounded-2xl p-5 flex flex-col gap-4 shadow-xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-rose-500" />
                  <span className={`text-sm font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Bảng Chấm Điểm Bài Tập & Đồ Án</span>
                </div>
                
                {/* Embedded dynamic metadata editor with standardized inputs */}
                <div className={`flex items-center gap-3 flex-wrap p-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Môn học:</span>
                    <input 
                      type="text" 
                      value={globalSubject} 
                      onChange={e => setGlobalSubject(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalSubject, 'w-36')} font-sans`} 
                    />
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Mã môn:</span>
                    <input 
                      type="text" 
                      value={globalSubjectCode} 
                      onChange={e => setGlobalSubjectCode(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalSubjectCode, 'w-28')} ${globalSubjectCode ? 'font-mono' : 'font-sans'}`} 
                    />
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Nhóm:</span>
                    <input 
                      type="text" 
                      value={globalGroup} 
                      onChange={e => setGlobalGroup(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalGroup, 'w-24')} font-sans`} 
                    />
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Năm học:</span>
                    <input 
                      type="text" 
                      value={globalAcademicYear} 
                      onChange={e => setGlobalAcademicYear(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalAcademicYear, 'w-24')} ${globalAcademicYear ? 'font-mono' : 'font-sans'}`} 
                    />
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Học kỳ:</span>
                    <input 
                      type="text" 
                      value={globalSemester} 
                      onChange={e => setGlobalSemester(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalSemester, 'w-24')} font-sans`} 
                    />
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Kỳ thi:</span>
                    <select
                      value={globalExam}
                      onChange={e => setGlobalExam(e.target.value)}
                      className={`border text-xs px-2 py-1.5 rounded-lg focus:outline-none font-semibold transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    >
                      <option value="Quá trình 1">Quá trình 1</option>
                      <option value="Quá trình 2">Quá trình 2</option>
                      <option value="Giữa kỳ">Giữa kỳ</option>
                      <option value="Cuối kỳ">Cuối kỳ</option>
                    </select>
                  </div>
                  <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Giảng viên:</span>
                    <input 
                      type="text" 
                      value={globalLecturer} 
                      onChange={e => setGlobalLecturer(e.target.value)} 
                      placeholder="CHƯA NHẬP" 
                      className={`${getStep2InputFieldClass(globalLecturer, 'w-36')} font-sans`} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-between">
                <div className={`flex p-0.5 rounded-lg border text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button type="button" onClick={() => setSidebarFilter('all')} className={`px-3 py-1.5 rounded transition-all cursor-pointer ${sidebarFilter === 'all' ? 'bg-rose-500 text-white' : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}>Tất cả ({projects.length})</button>
                  <button type="button" onClick={() => setSidebarFilter('pending')} className={`px-3 py-1.5 rounded transition-all cursor-pointer ${sidebarFilter === 'pending' ? 'bg-rose-500 text-white' : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}>Chờ chấm ({projects.filter(p => !p.isGraded).length})</button>
                  <button type="button" onClick={() => setSidebarFilter('graded')} className={`px-3 py-1.5 rounded transition-all cursor-pointer ${sidebarFilter === 'graded' ? 'bg-rose-500 text-white' : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}>Đã xong ({projects.filter(p => p.isGraded).length})</button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className={`font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border shadow-md transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'}`}>
                    <Upload className="w-3.5 h-3.5 text-rose-400" /> <span>Nạp Ảnh, Word hoặc PDF...</span>
                    <input type="file" accept="image/*,application/pdf,.doc,.docx" multiple onChange={handleBatchUpload} className="hidden" />
                  </label>
                  <label className={`font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-2 border ${theme === 'dark' ? 'bg-indigo-950/50 text-indigo-200 border-indigo-700/50' : 'bg-indigo-50 text-indigo-800 border-indigo-200'}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Cách AI đọc:</span>
                    <select value={globalGradingStrategy} onChange={(e) => handleGlobalGradingStrategyChange(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                      {GRADING_STRATEGY_OPTIONS.map(option => <option key={option.value} value={option.value} className="text-slate-900">{option.label}</option>)}
                    </select>
                  </label>
                  
                  <button type="button" onClick={handleBatchGradeAll} disabled={batchLoading || projects.length === 0} className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-black py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition-all uppercase tracking-wider cursor-pointer">
                    <Play className="w-3.5 h-3.5 fill-white" /> <span>Chấm tự động tất cả bằng AI</span>
                  </button>
                  <button type="button" onClick={handleCalibrateGradedProjects} disabled={isCalibratingScores || batchLoading || projects.filter(project => project.isGraded && !project.aiGradingFailed).length < 2} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer">
                    {isCalibratingScores ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />} <span>{isCalibratingScores ? "Đang cân chỉnh..." : "Cân chỉnh điểm"}</span>
                  </button>
                  <div className={`h-6 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                  <div className="relative group z-30">
                    <button type="button" className={`border py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'}`} title="Tùy chọn lưu dữ liệu">
                      <DownloadCloud className="w-3.5 h-3.5 text-rose-400" /> <span>Lưu dữ liệu...</span>
                    </button>
                    <div className={`absolute right-0 top-full mt-1 hidden group-hover:flex flex-col rounded-lg shadow-xl border overflow-hidden whitespace-nowrap min-w-max ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <button type="button" onClick={handleExportProject} className={`text-left px-4 py-2 text-xs font-semibold hover:bg-rose-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu toàn bộ tiến trình (.json)</button>
                      <button type="button" onClick={handleExportGradingStyle} className={`text-left px-4 py-2 text-xs font-semibold hover:bg-indigo-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu cách chấm điểm của AI (.json)</button>
                    </div>
                  </div>
                  <button type="button" onClick={() => projectFileInputRef.current && projectFileInputRef.current.click()} className={`border py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'}`} title="Nạp lại tiến trình">
                    <UploadCloud className="w-3.5 h-3.5 text-emerald-500" /> <span>Nạp tiến trình (.json)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of Submissions */}
            <div className={`border rounded-3xl p-6 shadow-2xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProjects.map((project) => {
                  const isActive = project.id === activeId;
                  const hasGrades = project.isGraded;
                  const calculatedScore = Object.values(project.grades || {}).reduce((sum, val) => sum + val, 0);
                  const isNameUnclear = !project.studentName || project.studentName === "Không Rõ";
                  const isIdUnclear = !project.studentId || project.studentId === "Không Rõ";
                  
                  const isIdError = !isIdUnclear && !/^1[a-zA-Z0-9]{7}$/i.test(project.studentId);
                  
                  const isPDF = project.mimeType && project.mimeType === "application/pdf";
                  const isWord = project.mimeType === 'application/msword' || project.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  const isSuspectedAI = project.aiGeneratedStatus === 'suspected';
                  const isGradingThis = gradingProjectId === project.id;

                  const isClassUnmatched = project.classMatchStatus === 'unmatched';

                  return (
                    <div key={project.id} onClick={() => { handleSelectProject(project.id); if (hasGrades) { setIsGradedDrawerOpen(true); } }} className={`relative group/item rounded-2xl overflow-hidden border flex flex-col transition-all cursor-pointer select-none hover:shadow-xl ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100/50'} ${isGradingThis ? 'border-indigo-500 ring-2 ring-indigo-500/50 animate-pulse' : (isActive ? 'border-rose-500 ring-2 ring-rose-500/20' : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'))}`}>
                      <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-2 border-b border-slate-800 gap-2">
                        {isPDF ? (
                          project.thumbnailUrl ? (
                            <img src={project.thumbnailUrl} alt="PDF Cover Preview" className="w-full h-full object-contain group-hover/item:scale-105 transition-transform duration-300" style={{ transform: `rotate(${project.rotation || 0}deg)` }} />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-4 w-full h-full">
                              <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 group-hover/item:scale-110 transition-transform duration-300">
                                <FileText className="w-12 h-12 animate-pulse" />
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono animate-pulse">Đang kết xuất trang PDF...</span>
                            </div>
                          )
                        ) : isWord ? (
                           <img src={project.thumbnailUrl} alt="Word Thumbnail" className="w-full h-full object-contain bg-white group-hover/item:scale-105 transition-transform duration-300" style={{ transform: `rotate(${project.rotation || 0}deg)` }} />
                        ) : (
                          <img src={project.fileUrl} alt="Drawing Thumbnail" className="w-full h-full object-contain group-hover/item:scale-105 transition-transform duration-300" style={{ transform: `rotate(${project.rotation || 0}deg)` }} />
                        )}

                        <button type="button" onClick={(e) => { e.stopPropagation(); setZoomedFile({ projectId: project.id, src: project.fileUrl, name: project.studentName, isPDF: isPDF, isWord: isWord, extractedText: project.extractedText, base64: project.base64, rotation: project.rotation || 0 }); }} className="absolute bottom-2.5 left-2.5 bg-slate-950/90 hover:bg-rose-600 text-white px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-800/80 transition-all z-10 flex items-center gap-1 text-[10px] font-bold cursor-pointer" title="Xem phóng to chi tiết bài nộp">
                          <Maximize2 className="w-3 h-3" /> <span>{isPDF ? 'Đọc PDF' : isWord ? 'Xem Word' : 'Xem Ảnh'}</span>
                        </button>
                        {isPDF && <div className="absolute bottom-2.5 left-[92px] bg-indigo-600/95 text-white px-2 py-1.5 rounded-xl shadow-lg text-[10px] font-black font-mono z-10">{project.pdfTotalPages > 0 ? `${project.pdfTotalPages} trang` : "Đang đếm..."}</div>}

                        {/* Combined Absolute Alerts Container */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
                          {isSuspectedAI && (
                            <div onClick={(e) => { e.stopPropagation(); setAiAuditInstruction(""); setAiSuspectDetailProject(project); }} className="bg-amber-600/90 hover:bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl shadow-lg border border-amber-400 ring-2 ring-amber-500/25 flex items-center gap-1 transition-all cursor-pointer" title="Nhấp vào để xem chi tiết các điểm bất thường nghi vấn sử dụng AI">
                              <AlertTriangle className="w-3.5 h-3.5 text-white" /> <span>Nghi vấn AI</span>
                            </div>
                          )}
                        </div>

                        {hasGrades ? (
                          <div className="absolute top-2.5 right-2.5 bg-red-600 text-white font-black text-[16px] px-3.5 py-1.5 rounded-2xl shadow-xl shadow-red-950/70 font-mono border border-red-400 ring-4 ring-red-500/30 scale-110 transform transition-all duration-300">
                            {calculatedScore.toFixed(2)}
                          </div>
                        ) : isGradingThis ? (
                          <div className="absolute top-2.5 right-2.5 bg-indigo-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-lg font-mono animate-bounce">Đang chấm...</div>
                        ) : (
                          <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-lg font-mono">Chờ chấm</div>
                        )}

                        <div className="absolute bottom-2.5 right-2.5 flex gap-1 z-10 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button 
                            type="button" onClick={(e) => { e.stopPropagation(); updateProjectField(project.id, 'rotation', ((project.rotation || 0) + 90) % 360); }} 
                            className="bg-slate-950/90 hover:bg-indigo-600 p-2 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer" title="Xoay ảnh 90 độ"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" onClick={(e) => { e.stopPropagation(); handleRemoveProject(project.id, e); }} 
                            className="bg-slate-950/90 hover:bg-rose-600 p-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer" title="Xóa bài làm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info scanning block */}
                      <div className="p-4 flex flex-col gap-2.5">
                        {project.isOcrLoading && (
                          <div className="text-[9px] text-rose-400 font-bold animate-pulse flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 animate-spin" /> 
                            <span>{(classList && classList.length > 0) ? "AI đang đối khớp với danh sách..." : "AI đang quét thông tin sinh viên"}</span>
                          </div>
                        )}
                        <div>
                          <label className={`text-[8px] uppercase font-bold block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Họ tên sinh viên {isNameUnclear && <span className="text-red-500 font-extrabold">(Sửa tay)</span>}</label>
                          <input type="text" value={project.studentName || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => updateProjectField(project.id, 'studentName', e.target.value)} className={`w-full mt-0.5 border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none transition-colors ${isNameUnclear ? 'border-red-600 text-red-400 bg-red-950/30' : (theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500')}`} />
                        </div>
                        <div>
                          <label className={`text-[8px] uppercase font-bold block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Mã số sinh viên (MSSV) 
                            {isIdUnclear && <span className="text-red-500 font-extrabold ml-1">(Sửa tay)</span>}
                            {isIdError && <span className="text-red-500 font-extrabold ml-1 animate-pulse">(bắt đầu bằng 1, đủ 8 ký tự)</span>}
                          </label>
                          <input 
                            type="text" 
                            value={project.studentId || ""} 
                            onClick={(e) => e.stopPropagation()} 
                            onChange={(e) => updateProjectField(project.id, 'studentId', e.target.value)} 
                            className={`w-full mt-0.5 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                              isIdError 
                                ? 'border-red-500 text-red-500 bg-red-500/10 font-bold' 
                                : isIdUnclear 
                                  ? 'border-red-600 text-red-400 bg-red-950/30' 
                                  : (theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500')
                            }`} 
                          />
                        </div>

                        {/* Status Note display for comparison */}
                        {classList.length > 0 && (
                          <div className={`text-[10px] p-2 rounded-lg border flex items-center gap-1.5 ${isClassUnmatched ? (theme === 'dark' ? 'bg-rose-950/30 text-rose-400 border-rose-900/30' : 'bg-white text-rose-600 border-rose-300 shadow-sm') : (theme === 'dark' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' : 'bg-white text-emerald-600 border-emerald-300 shadow-sm')}`}>
                            {isClassUnmatched ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                                <span className="font-semibold truncate">Không có dữ liệu</span>
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                                <span className="font-semibold truncate">Đã khớp danh sách lớp học</span>
                              </>
                            )}
                          </div>
                        )}

                        {project.fileName && (
                          <div className={`text-[10px] truncate mt-1 border p-1.5 rounded-md ${theme === 'dark' ? 'text-slate-400 bg-slate-900/60 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-200'}`} title={project.fileName}>
                            <span className={`font-bold block text-[8px] uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>File bài nộp gốc:</span>
                            <span className="font-mono block truncate">{project.fileName}</span>
                          </div>
                        )}
                        {isPDF && (
                          <div>
                            <label className={`text-[8px] uppercase font-bold block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Cách AI đọc bài</label>
                            <select value={project.gradingStrategy || DEFAULT_GRADING_STRATEGY} onChange={(e) => updateProjectField(project.id, 'gradingStrategy', e.target.value)} onClick={(e) => e.stopPropagation()} className={`w-full mt-0.5 border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-indigo-300' : 'bg-white border-slate-300 text-indigo-700'}`}>
                              {GRADING_STRATEGY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="mt-2 text-center">
                          {hasGrades ? (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectProject(project.id); setIsGradedDrawerOpen(true); }} className={`w-full border px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${theme === 'dark' ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-white border-rose-900/50' : 'bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border-rose-200'}`}>Chi tiết điểm chấm</button>
                          ) : (
                            <button type="button" onClick={(e) => { e.stopPropagation(); analyzeWithAI(project.id); }} disabled={(loading || batchLoading) && activeId === project.id} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                              {isGradingThis ? (<><Sparkles className="w-3.5 h-3.5 animate-spin" /> Đang chấm...</>) : (<><Sparkles className="w-3.5 h-3.5" /> {project.aiGradingFailed ? "Chấm lại bằng AI" : "Chấm bài bằng AI"}</>)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-center text-slate-500 text-xs">
                    <p>Hàng đợi trống hoặc chưa nạp tệp bài nào.</p>
                    <label className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 mt-2 transition-all">
                      <Upload className="w-4 h-4" /> <span>NẠP TỆP BÀI TẬP (WORD/PDF/ẢNH)</span>
                      <input type="file" accept="image/*,application/pdf,.doc,.docx" multiple onChange={handleBatchUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* DYNAMIC PROGRESS COVERAGE TRACKER */}
              {classListStats && (
                <div className="mt-6 p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 bg-emerald-950/20 border-emerald-500/35">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-600/15 p-2 rounded-full text-emerald-500 animate-pulse">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 block">Thống kê & Đối soát danh sách</span>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        Đã nhận <b>{classListStats.matchedCount} / {classListStats.totalCount}</b> bài nộp trong danh sách.
                        {classListStats.unmatchedCount > 0 && (
                          <span className="text-red-500 ml-1.5 font-bold">
                            ({classListStats.unmatchedCount} bài nộp không có dữ liệu trong danh sách lớp)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClassListComparisonModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" /> <span>Kiểm tra danh sách chi tiết</span>
                  </button>
                </div>
              )}

              <div className={`flex justify-between pt-6 border-t mt-6 ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setCurrentStep(1)} className={`border font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /><span>Quay lại Bước 1</span></button>
                {projects.length > 0 && (<button type="button" onClick={() => setCurrentStep(3)} className="bg-rose-500 hover:bg-rose-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"><span>Tiếp tục sang Bước 3</span><ChevronRight className="w-4 h-4" /></button>)}
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* STEP 3: STATS HISTORICAL DIARY          */}
        {/* ======================================= */}
        {currentStep === 3 && (
          <section className={`border rounded-2xl p-6 shadow-xl flex flex-col gap-6 animate-fade-in ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-5 gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}><History className="w-5 h-5 text-rose-500" />BƯỚC 3: Sổ Điểm Bài Làm Chi Tiết</h2>
                <p className={`text-xs mt-1 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Danh sách thống kê chi tiết các bài đã chấm</p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative group z-30">
                  <button type="button" className={`border font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`} title="Tùy chọn lưu dữ liệu">
                    <DownloadCloud className="w-3.5 h-3.5 text-rose-400" /><span>Lưu dữ liệu...</span>
                  </button>
                  <div className={`absolute right-0 top-full mt-1 hidden group-hover:flex flex-col rounded-lg shadow-xl border overflow-hidden whitespace-nowrap min-w-max ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <button type="button" onClick={handleExportProject} className={`text-left px-4 py-2 text-xs font-semibold hover:bg-rose-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu toàn bộ tiến trình (.json)</button>
                    <button type="button" onClick={handleExportGradingStyle} className={`text-left px-4 py-2 text-xs font-semibold hover:bg-indigo-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu cách chấm điểm của AI (.json)</button>
                  </div>
                </div>
                <button type="button" onClick={() => projectFileInputRef.current && projectFileInputRef.current.click()} className={`border font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-emerald-500 hover:bg-slate-50'}`} title="Nạp tiến trình từ tệp JSON"><UploadCloud className="w-3.5 h-3.5 text-emerald-500" /><span>Nạp tiến trình</span></button>
                <div className={`text-xs font-semibold border px-3 py-1.5 rounded-lg font-mono font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Kết quả cuối: {projects.filter(project => project.isGraded).length} bài</div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b font-mono ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-900/40' : 'border-slate-200 text-slate-600 bg-slate-100'}`}>
                    <th className="py-3 px-4">Ngày chấm</th>
                    <th className="py-3 px-4">MSSV</th>
                    <th className="py-3 px-4">Sinh viên</th>
                    <th className="py-3 px-4">Nhóm</th>
                    {rubric.map(r => (<th key={r.id} className="py-3 px-4 text-center">{r.name}</th>))}
                    <th className={`py-3 px-4 text-center font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Tổng điểm</th>
                    <th className="py-3 px-4 text-center">Các lần chấm</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {projects.filter(project => project.isGraded).map((project) => {
                    const selectedVersion = (project.scoreVersions || []).find(version => version.id === project.selectedScoreVersionId);
                    const finalTotal = Number(Object.values(project.grades || {}).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2));
                    return <tr key={project.id} className={theme === 'dark' ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}>
                      <td className={`py-3.5 px-4 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{selectedVersion?.createdAt ? new Date(selectedVersion.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-500 font-bold">{project.studentId}</td>
                      <td className={`py-3.5 px-4 font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{project.studentName}</td>
                      <td className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{globalGroup || "---"}</td>
                      {rubric.map(r => (<td key={r.id} className={`py-3.5 px-4 text-center font-mono font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{Number(project.grades?.[r.id] || 0).toFixed(2)}</td>))}
                      <td className="py-3.5 px-4 text-center font-extrabold text-red-500 font-mono text-sm">{finalTotal.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center"><button type="button" onClick={() => setScoreVersionProjectId(project.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold cursor-pointer">Xem {(project.scoreVersions || []).length || 1} phiên bản</button></td>
                    </tr>
                  })}
                  {projects.filter(project => project.isGraded).length === 0 && (<tr><td colSpan={6 + rubric.length} className="py-8 text-center text-slate-500">Chưa có dữ liệu bài chấm nào. Hãy hoàn tất chấm bài ở Bước 2.</td></tr>)}
                </tbody>
              </table>
            </div>

            {/* DYNAMIC PROGRESS COVERAGE TRACKER */}
            {classListStats && (
              <div className="mt-2 p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 bg-emerald-950/20 border-emerald-500/35">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/15 p-2 rounded-full text-emerald-500 animate-pulse">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 block">Thống kê & Đối soát danh sách</span>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      Đã nhận <b>{classListStats.matchedCount} / {classListStats.totalCount}</b> bài nộp trong danh sách.
                      {classListStats.unmatchedCount > 0 && (
                        <span className="text-red-500 ml-1.5 font-bold">
                          ({classListStats.unmatchedCount} bài nộp không có dữ liệu trong danh sách lớp)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClassListComparisonModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" /> <span>Kiểm tra danh sách chi tiết</span>
                </button>
              </div>
            )}

            <div className={`flex justify-between pt-4 border-t mt-4 ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setCurrentStep(2)} className={`border font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /><span>Quay lại Bước 2</span></button>
              <button type="button" onClick={() => setCurrentStep(4)} className="bg-rose-500 hover:bg-rose-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"><span>Chuyển sang Bước 4</span><ChevronRight className="w-4 h-4" /></button>
            </div>
          </section>
        )}

        {/* ======================================= */}
        {/* STEP 4: EXPORT REPORTS & DISTRIBUTION    */}
        {/* ======================================= */}
        {currentStep === 4 && (
          <section className={`border rounded-3xl p-6 shadow-xl flex flex-col gap-6 animate-fade-in ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`flex flex-wrap items-center justify-between border-b pb-5 gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}><FileSpreadsheet className="w-5 h-5 text-emerald-500" />BƯỚC 4: Kết xuất bảng điểm & Phiếu phản hồi</h2>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Xuất tệp CSV tương thích chuẩn quản lý đào tạo hoặc in hàng loạt phiếu đánh giá chi tiết của Giảng viên.</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative group z-30">
                  <button type="button" className={`border py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'}`}>
                    <DownloadCloud className="w-3.5 h-3.5 text-rose-400" /><span>Lưu dữ liệu...</span>
                  </button>
                  <div className={`absolute left-0 top-full mt-1 hidden group-hover:flex flex-col rounded-lg shadow-xl border overflow-hidden whitespace-nowrap min-w-max ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <button type="button" onClick={handleExportProject} className={`text-left px-4 py-2.5 text-xs font-semibold hover:bg-rose-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu toàn bộ tiến trình (.json)</button>
                    <button type="button" onClick={handleExportGradingStyle} className={`text-left px-4 py-2.5 text-xs font-semibold hover:bg-indigo-500 hover:text-white transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Lưu cách chấm điểm của AI (.json)</button>
                  </div>
                </div>
                <button type="button" onClick={() => projectFileInputRef.current && projectFileInputRef.current.click()} className={`border py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'}`}><UploadCloud className="w-3.5 h-3.5 text-emerald-500" /><span>Nạp tiến trình (.json)</span></button>
                <button type="button" onClick={handleDownloadCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"><Download className="w-4 h-4" /><span>Tải tệp điểm (.csv)</span></button>
                <button type="button" onClick={handlePrintPDF} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"><FileText className="w-4 h-4" /><span>Tải toàn bộ PDF ({projects.filter(p => p.isGraded).length})</span></button>
              </div>
            </div>
            
            <div className={`overflow-x-auto border rounded-xl ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b font-mono ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-900/80' : 'border-slate-200 text-slate-600 bg-slate-100'}`}>
                    <th className="py-3 px-4 text-center">STT</th>
                    <th className="py-3 px-4">Loại tệp</th>
                    <th className="py-3 px-4">MSSV</th>
                    <th className="py-3 px-4">Sinh viên</th>
                    <th className="py-3 px-4">Nhóm</th>
                    {rubric.map(r => (<th key={r.id} className="py-3 px-4 text-center">{r.name} ({r.maxScore})</th>))}
                    <th className={`py-3 px-4 text-center font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Tổng điểm</th>
                    <th className="py-3 px-4 text-center font-bold">Xuất nhận xét</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {projects.map((projectItem, pIndex) => {
                    const sTotal = Object.values(projectItem.grades || {}).reduce((sum, val) => sum + val, 0);
                    const isPDF = projectItem.mimeType && projectItem.mimeType === "application/pdf";
                    const isWord = projectItem.mimeType === 'application/msword' || projectItem.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    
                    return (
                      <tr key={projectItem.id} className={theme === 'dark' ? 'hover:bg-slate-900/40' : 'hover:bg-slate-100/30'}>
                        <td className={`py-2 px-4 text-center font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{pIndex + 1}</td>
                        <td className="py-2 px-4">
                          <div className={`w-10 h-8 rounded overflow-hidden border flex items-center justify-center text-rose-500 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'}`}>
                            {isPDF ? <FileText className="w-4 h-4" /> : isWord ? <FileText className="w-4 h-4 text-blue-500" /> : <ImageIcon className="w-4 h-4 text-emerald-500" />}
                          </div>
                        </td>
                        <td className="py-2 px-4 font-mono text-emerald-500 font-bold">{projectItem.studentId || "---"}</td>
                        <td className={`py-2 px-4 font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{projectItem.studentName || "---"}</td>
                        <td className={`font-mono ${theme === 'dark' ? 'py-2 px-4 text-slate-400' : 'py-2 px-4 text-slate-600'}`}>{globalGroup || "---"}</td>
                        {rubric.map(r => (<td key={r.id} className={`py-2 px-4 text-center font-mono font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{(projectItem.grades[r.id] || 0).toFixed(2)}</td>))}
                        <td className="py-2 px-4 text-center font-black text-red-500 font-mono text-sm">{parseFloat(sTotal.toFixed(2))}</td>
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            disabled={!projectItem.isGraded}
                            onClick={() => handlePrintSinglePDF(projectItem)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm inline-flex items-center gap-1 ${
                              projectItem.isGraded 
                                ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95' 
                                : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>PDF Nhận xét</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (<tr><td colSpan={8 + rubric.length} className="py-8 text-center text-slate-500">Chưa có bài chấm nào trong danh sách hiện tại.</td></tr>)}
                </tbody>
              </table>
            </div>

            {/* Dynamic Class Grade Distribution Section */}
            {(() => {
              const distribution = getDistribution();
              const maxDistCount = Math.max(...distribution.map(d => d.count), 1);
              const gradedCount = projects.filter(p => p.isGraded).length;
              return (
                <div className={`border rounded-xl p-6 mt-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          <BarChart3 className="w-5 h-5 text-indigo-500" /> Biểu đồ Phổ điểm Lớp học
                          <span className={`text-sm font-normal ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{`(Tổng số bài đã chấm: ${gradedCount})`}</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                           <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Định dạng hiển thị:</span>
                           <select 
                             value={chartType} 
                             onChange={(e) => setChartType(e.target.value)}
                             className={`border text-xs px-2 py-1 rounded focus:outline-none focus:border-indigo-500 ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                           >
                             <option value="column">Dạng cột (Column)</option>
                             <option value="bar">Dạng thanh ngang (Bar)</option>
                             <option value="line">Dạng biểu đồ nét (Line)</option>
                           </select>
                        </div>
                    </div>
                    <button onClick={handlePrintDistributionPDF} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer">
                      <Download className="w-4 h-4" /> Xuất Phổ điểm (PDF)
                    </button>
                  </div>
                  
                  {chartType === 'column' && (
                      <div>
                          <div className={`flex items-end justify-around h-64 gap-2 pt-8 border-b pb-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-300'}`}>
                            {distribution.map((d, idx) => {
                               const heightPercent = (d.count / maxDistCount) * 100;
                               return (
                                 <div key={idx} className="flex flex-col items-center justify-end flex-1 h-full group relative">
                                   <span className={`text-xs font-bold mb-1 absolute -top-5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                     {d.count > 0 ? d.count : ''}
                                   </span>
                                   <div 
                                     className={`w-full max-w-[40px] rounded-t-md ${d.color} transition-all duration-500 opacity-90 hover:opacity-100`} 
                                     style={{ height: `${heightPercent}%`, minHeight: d.count > 0 ? '4px' : '0px' }}
                                   ></div>
                                 </div>
                               )
                            })}
                          </div>
                          <div className="flex items-start justify-around gap-2 mt-3">
                            {distribution.map((d, idx) => (
                              <div key={idx} className="flex flex-col items-center flex-1">
                                <span className={`text-[10px] font-bold text-center leading-tight mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{d.label}</span>
                                <span className={`text-[9px] font-normal text-center leading-tight mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{d.sub}</span>
                              </div>
                            ))}
                          </div>
                      </div>
                  )}

                  {chartType === 'bar' && (
                      <div className="flex flex-col gap-3 py-4">
                        {distribution.map((d, idx) => {
                          const widthPercent = (d.count / maxDistCount) * 100;
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <span className={`w-32 text-[10px] font-bold text-right leading-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{d.label} ({d.sub})</span>
                              <div className={`flex-1 h-6 rounded-r-md overflow-hidden flex items-center ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-200'}`}>
                                 <div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${widthPercent}%`, minWidth: d.count > 0 ? '4px' : '0px' }}></div>
                              </div>
                              <span className={`w-8 text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{d.count > 0 ? d.count : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                  )}

                  {chartType === 'line' && (
                      <div>
                        <div className={`h-64 pt-6 border-b pb-2 relative flex items-end ${theme === 'dark' ? 'border-slate-800' : 'border-slate-300'}`}>
                          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <polyline
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                                points={distribution.map((d, idx) => {
                                   const x = (idx + 0.5) * (100 / distribution.length);
                                   const y = 100 - (d.count / maxDistCount) * 90; 
                                   return `${x},${y}`;
                                }).join(' ')}
                             />
                             {distribution.map((d, idx) => {
                                   const x = (idx + 0.5) * (100 / distribution.length);
                                   const y = 100 - (d.count / maxDistCount) * 90; 
                                   return (
                                      <circle key={idx} cx={x} cy={y} r="3" fill={d.hex} vectorEffect="non-scaling-stroke" />
                                   )
                             })}
                          </svg>
                          <div className="flex items-end justify-around w-full h-full z-10">
                             {distribution.map((d, idx) => {
                                 const heightPercent = (d.count / maxDistCount) * 90;
                                 return (
                                   <div key={idx} className="flex flex-col items-center flex-1 h-full relative pointer-events-none">
                                       <div className="absolute w-full flex justify-center" style={{ bottom: `${heightPercent}%`, marginBottom: '10px' }}>
                                          <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{d.count > 0 ? d.count : ''}</span>
                                       </div>
                                   </div>
                                 )
                             })}
                          </div>
                        </div>
                        <div className="flex items-start justify-around gap-2 mt-3 relative z-10">
                          {distribution.map((d, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-1">
                              <span className={`text-[10px] font-bold text-center leading-tight mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{d.label}</span>
                              <span className={`text-[9px] font-normal text-center leading-tight mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{d.sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              );
            })()}

            {/* DYNAMIC PROGRESS COVERAGE TRACKER */}
            {classListStats && (
              <div className="mt-6 p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 bg-emerald-950/20 border-emerald-500/35">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/15 p-2 rounded-full text-emerald-500 animate-pulse">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 block">Thống kê & Đối soát danh sách</span>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      Đã nhận <b>{classListStats.matchedCount} / {classListStats.totalCount}</b> bài nộp trong danh sách.
                      {classListStats.unmatchedCount > 0 && (
                        <span className="text-red-500 ml-1.5 font-bold">
                          ({classListStats.unmatchedCount} bài nộp không có dữ liệu trong danh sách lớp)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClassListComparisonModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" /> <span>Kiểm tra danh sách chi tiết</span>
                </button>
              </div>
            )}

            <div className={`flex justify-between pt-2 border-t ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setCurrentStep(3)} className={`border font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /><span>Quay lại Bước 3</span></button>
            </div>
          </section>
        )}
      </main>

      {/* ======================================= */}
      {/* DIALOGS & MODAL DETAILED PANELS         */}
      {/* ======================================= */}
      
      {/* DETAILED GRADING DIALOG (Centered modal) */}
      {isGradedDrawerOpen && activeId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsGradedDrawerOpen(false)}></div>
          <div className={`relative w-full max-w-2xl max-h-[90vh] border rounded-3xl flex flex-col justify-between shadow-2xl z-10 overflow-hidden ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500">Phiếu đánh giá bài làm chi tiết</span>
                <h4 className={`text-lg font-black mt-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{activeProject.studentName || "Không Rõ"}</h4>
                
                {/* Visual warning for invalid Student ID */}
                <p className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  MSSV: <span className={`${(!activeProject.studentId || activeProject.studentId === "Không Rõ" || !/^1[a-zA-Z0-9]{7}$/i.test(activeProject.studentId)) ? 'text-red-500 underline decoration-wavy' : 'text-emerald-500'} font-bold`}>{activeProject.studentId}</span> 
                  {(!activeProject.studentId || activeProject.studentId === "Không Rõ" || !/^1[a-zA-Z0-9]{7}$/i.test(activeProject.studentId)) && (
                    <span className="text-red-500 font-extrabold text-[10px] ml-2 animate-pulse">(bắt đầu bằng 1, đủ 8 chữ và số)</span>
                  )}
                  {" "}| Môn học: {globalSubjectCode} - {globalSubject} - {globalGroup}
                </p>
              </div>
              <button type="button" onClick={() => setIsGradedDrawerOpen(false)} className={`border p-2.5 rounded-xl cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'}`}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              {activeProject.aiGeneratedStatus === 'suspected' && (
                <div className="bg-amber-950/40 border-2 border-amber-500/50 p-4 rounded-2xl flex flex-col gap-3 shadow-lg shadow-amber-900/20">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="uppercase tracking-wider">Cảnh báo: Phát hiện nghi vấn sử dụng AI</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    {activeProject.aiGeneratedDetails}
                  </p>
                  {activeProject.aiDetectionReport && <div className="rounded-xl border border-amber-500/20 bg-slate-950/40 p-3">
                    <div className="mb-2 flex flex-wrap gap-2"><span className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-400">Mức: {activeProject.aiDetectionReport.mucDo || "Cần kiểm tra"}</span><span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-400">Độ tin cậy: {Math.round(activeProject.aiDetectionReport.diemTinCay || 0)}%</span></div>
                    {(activeProject.aiDetectionReport.dauHieu || []).slice(0, 4).map((finding, index) => <div key={index} className="border-b border-slate-800/60 py-1.5 text-[10px] text-slate-300"><b>{finding.trang}</b> · {finding.nhomDauHieu} · <span className={finding.mucTinCay === 'Cao' ? 'text-rose-400' : 'text-amber-400'}>{finding.mucTinCay}</span><br />{finding.quanSatCuThe}</div>)}
                    {(activeProject.aiDetectionReport.dauHieu || []).length > 4 && <p className="mt-2 text-[9px] text-slate-500">Còn {(activeProject.aiDetectionReport.dauHieu || []).length - 4} dấu hiệu trong báo cáo đầy đủ.</p>}
                    {(activeProject.aiDetectionReport.cauHoiXacMinh || []).length > 0 && <div className="mt-2"><b className="text-[9px] uppercase text-indigo-400">Câu hỏi xác minh:</b>{activeProject.aiDetectionReport.cauHoiXacMinh.slice(0, 3).map((question, index) => <p key={index} className="mt-1 text-[10px] text-slate-300">{index + 1}. {question}</p>)}</div>}
                  </div>}
                  <div className="flex gap-2 justify-end mt-1">
                    <button 
                      onClick={() => { setAiAuditInstruction(""); setAiSuspectDetailProject(activeProject); }} 
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5"/> Xem & kiểm tra lại nghi vấn AI
                    </button>
                    <button 
                      onClick={() => handleVerifyStudentWorkClean(activeId)} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5"/> Xác nhận SV tự làm
                    </button>
                  </div>
                </div>
              )}
              {activeProject.aiGeneratedStatus === 'verified_clean' && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between gap-3 text-emerald-400">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /><span className="text-xs font-semibold">Bài đã được giảng viên xác nhận do sinh viên tự thực hiện (Đã xóa bỏ nghi vấn AI).</span></div>
                  <button type="button" onClick={() => { setAiAuditInstruction(""); setAiSuspectDetailProject(activeProject); }} className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1.5 text-[9px] font-bold text-emerald-300 cursor-pointer">Xem lịch sử kiểm tra</button>
                </div>
              )}
              {activeProject.aiGeneratedStatus === 'none' && (activeProject.aiDetectionVersions || []).length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 flex items-center justify-between gap-3 text-slate-400">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs font-semibold">Phiên bản kiểm tra đang chọn không duy trì cảnh báo nghi vấn AI.</span></div>
                  <button type="button" onClick={() => { setAiAuditInstruction(""); setAiSuspectDetailProject(activeProject); }} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[9px] font-bold text-slate-300 cursor-pointer">Xem lịch sử kiểm tra</button>
                </div>
              )}

              <div className="bg-red-950/20 border-2 border-red-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg shadow-red-900/30">
                <div>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">Tổng Điểm Thành Phần</span>
                  <span className={`text-[10px] block mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Hệ số chấm điểm chi tiết của Giảng viên</span>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-red-500 font-mono drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">{totalScore.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 block font-mono mt-0.5">/ {rubric.reduce((sum, r) => sum + (parseFloat(r.maxScore) || 0), 0).toFixed(2)}</span>
                  <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                    <button type="button" onClick={() => handleSaveManualScoreVersion(activeProject.id)} disabled={!activeProject.hasUnsavedManualScore} className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg px-2.5 py-1.5 text-[9px] font-bold cursor-pointer disabled:cursor-not-allowed"><Check className="w-3 h-3 inline mr-1" />Lưu phiên bản điểm</button>
                    <button type="button" onClick={() => setScoreVersionProjectId(activeProject.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2.5 py-1.5 text-[9px] font-bold cursor-pointer">Xem {(activeProject.scoreVersions || []).length || 1} phiên bản điểm</button>
                  </div>
                  {activeProject.hasUnsavedManualScore && <span className="text-[9px] text-rose-400 block mt-1 font-bold">Điểm GV vừa chỉnh chưa được lưu thành phiên bản</span>}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {rubric.map((criterion) => {
                  const currentScore = activeGrades[criterion.id] || 0;
                  const critReview = (activeProject.reviews && activeProject.reviews[criterion.id]) || "";
                  const reviewVersions = activeProject.rubricReviewVersions?.[criterion.id] || [];
                  const selectedReviewVersionId = activeProject.selectedRubricReviewVersions?.[criterion.id];
                  const isGeneratingReview = generatingRubricReviewKey === `${activeProject.id}-${criterion.id}`;
                  const isDirtyReview = Boolean(activeProject.dirtyRubricReviews?.[criterion.id]);
                  return (
                    <div key={criterion.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{criterion.name}</h4>
                          <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{criterion.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs font-black text-rose-500 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/30 font-mono">{currentScore.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-500 font-mono">/{criterion.maxScore}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] text-slate-500 font-mono">0.0</span>
                        <input type="range" min="0" max={criterion.maxScore} step="0.1" value={currentScore} onChange={(e) => updateActiveGrade(criterion.id, e.target.value, criterion.maxScore)} className="flex-1 accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                        <span className={`text-[9px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{criterion.maxScore}</span>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className={`text-[9px] uppercase font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Giảng viên nhận xét chi tiết:</label>
                          <div className="flex items-center gap-1.5">
                            {isDirtyReview && <button type="button" onClick={() => handleSaveManualRubricReviewVersion(activeProject.id, criterion.id)} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white cursor-pointer"><Check className="w-3 h-3 inline mr-1" />Lưu bản GV</button>}
                            <button type="button" onClick={() => handleRegenerateRubricReview(activeProject.id, criterion.id)} disabled={Boolean(generatingRubricReviewKey)} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-2 py-1 text-[9px] font-bold text-white cursor-pointer disabled:cursor-not-allowed">{isGeneratingReview ? <Sparkles className="w-3 h-3 inline mr-1 animate-spin" /> : <RotateCw className="w-3 h-3 inline mr-1" />}Tạo lại</button>
                          </div>
                        </div>
                        <textarea value={critReview} onChange={(e) => updateActiveReview(criterion.id, e.target.value)} onBlur={() => handleSaveManualRubricReviewVersion(activeProject.id, criterion.id)} rows="2" className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:border-rose-500/50 leading-relaxed ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="Chưa có ý kiến đánh giá nhận xét..." />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-500">Phiên bản:</span>
                          {reviewVersions.map((version, versionIndex) => {
                            const isSelectedReview = selectedReviewVersionId === version.id;
                            return <button key={version.id} type="button" onClick={() => handleSelectRubricReviewVersion(activeProject.id, criterion.id, version.id)} title={`${version.source || "Không rõ nguồn"} – ${version.createdAt ? new Date(version.createdAt).toLocaleString('vi-VN') : ""}`} className={`rounded-lg border px-2 py-1 text-[9px] font-bold cursor-pointer ${isSelectedReview ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300' : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:text-white'}`}>{version.label || `Bản ${versionIndex + 1}`}{isSelectedReview ? " ✓" : ""}</button>;
                          })}
                          {reviewVersions.length === 0 && <span className="text-[9px] italic text-slate-600">Chưa có bản đã lưu</span>}
                        </div>
                        <p className="mt-1 text-[9px] text-slate-500">Bản đang chọn sẽ được dùng khi xuất phiếu chấm PDF.</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`border-t pt-5 flex flex-col gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Nhận xét & Góp ý</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={`text-[9px] uppercase font-bold block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Đánh giá tổng quát đồ án</label>
                    <textarea value={activeProject.generalComment || ""} onChange={(e) => updateProjectField(activeId, 'generalComment', e.target.value)} rows="3" className={`w-full mt-1 border rounded-lg p-3 text-xs focus:outline-none leading-relaxed ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500'}`} placeholder="Nhập ý kiến nhận xét của Giảng viên về tổng quan bài làm..." />
                  </div>
                  <div>
                    <label className={`text-[9px] uppercase font-bold flex justify-between items-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Điểm cần sửa đổi / Khắc phục thẩm mỹ
                      <button type="button" onClick={() => { const currentImps = activeProject.improvements || []; updateProjectField(activeId, 'improvements', [...currentImps, ""]); }} className="text-[10px] text-rose-500 hover:text-rose-400 font-bold flex items-center gap-0.5"><Plus className="w-3.5 h-3 animate-pulse" /> Thêm điểm sửa</button>
                    </label>
                    <div className="flex flex-col gap-2 mt-1.5">
                      {(activeProject.improvements || []).map((imp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-bold w-4">{idx + 1}.</span>
                          <input type="text" value={imp} onChange={(e) => { const currentImps = [...(activeProject.improvements || [])]; currentImps[idx] = e.target.value; updateProjectField(activeId, 'improvements', currentImps); }} className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500'}`} placeholder="VD: Cân chỉnh lại tỷ lệ khối dựng hình sảnh chính" />
                          <button type="button" onClick={() => { const currentImps = (activeProject.improvements || []).filter((_, i) => i !== idx); updateProjectField(activeId, 'improvements', currentImps); }} className="text-slate-500 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Grader Tuning & Reassessment */}
              <div className={`border-t pt-5 flex flex-col gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex flex-col text-left">
                  <h3 className={`text-xs font-bold uppercase font-mono flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}><Sparkles className="w-4 h-4 text-rose-500" /> Góp ý cách chấm bài với AI & Tái thẩm định bài làm</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Yêu cầu AI phân tích lệch điểm, tự động chấm lại bài làm này và điều chỉnh cách chấm cho các bài tiếp theo</p>
                </div>
                <div className="flex flex-col gap-2">
                  <textarea value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} rows="3" className={`w-full border rounded-lg p-3 text-xs focus:outline-none leading-relaxed font-sans focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="Nhập nhận xét hiệu chỉnh..." />
                  <button type="button" onClick={handleSendGraderTuningFeedbackAndReGrade} disabled={isGeneratingTuning || !feedbackInput.trim()} className="self-end bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer">{isGeneratingTuning ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}<span>Gửi góp ý & Chấm lại</span></button>
                </div>
                {activeProject.aiImprovementSuggestions && (
                  <div className={`border rounded-xl p-4 flex flex-col gap-2.5 animate-fade-in text-left ${theme === 'dark' ? 'bg-slate-900/80 border-rose-500/20' : 'bg-rose-50/50 border-rose-200'}`}>
                    <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider flex items-center gap-1 font-mono"><Info className="w-3.5 h-3.5 text-rose-500" /> Phản hồi từ cố vấn IFA Grader</span>
                    <div className={`text-xs leading-relaxed whitespace-pre-wrap font-sans border p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>{activeProject.aiImprovementSuggestions}</div>
                  </div>
                )}
              </div>
              {Array.isArray(activeProject.gradingProgress) && activeProject.gradingProgress.length > 0 && (
                <div className={`border-t pt-5 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <h3 className={`text-xs font-bold uppercase font-mono mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Nhật ký AI đã xử lý</h3>
                  <div className={`max-h-24 overflow-y-auto rounded-xl border p-2 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    {[...activeProject.gradingProgress].reverse().map(item => <div key={item.id} className="flex gap-2 py-1 text-[10px]"><span className={item.status === 'error' ? 'text-rose-500' : item.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-emerald-500'}>●</span><span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{item.message}</span></div>)}
                  </div>
                </div>
              )}
            </div>
            
            <div className={`p-6 border-t flex justify-end gap-3 flex-wrap ${theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
              <button 
                type="button" 
                onClick={() => { setIsGradedDrawerOpen(false); analyzeWithAI(activeId); }} 
                disabled={loading && activeId === activeProject.id} 
                className={`border font-bold py-2.5 px-6 rounded-xl text-xs uppercase transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'}`}
              >
                {loading && activeId === activeProject.id ? <Sparkles className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                Chấm lại bằng AI
              </button>
              
              <button 
                type="button" 
                onClick={handleFinalizeActiveGrading} 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase transition-all shadow-md active:scale-95 flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Hoàn tất & Lưu phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {scoreVersionProjectId && (() => {
        const project = projects.find(item => item.id === scoreVersionProjectId);
        if (!project) return null;
        const versions = project.scoreVersions || [];
        const typeLabels = { ai_grading: "AI chấm", ai_regrade: "AI chấm lại", calibration: "Cân chỉnh điểm", manual_edit: "GV chỉnh thủ công", legacy: "Kết quả cũ" };
        return <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[88vh] overflow-hidden border rounded-3xl shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-slate-950 border-indigo-500/30' : 'bg-white border-indigo-200'}`}>
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4"><div><h3 className="text-base font-black text-indigo-400">Các phiên bản điểm – {project.studentName}</h3><p className="text-[11px] text-slate-500 mt-1">Chỉ phiên bản được chọn mới là điểm cuối dùng ở Bước 3, bảng điểm CSV và phiếu nhận xét.</p></div><button type="button" onClick={() => setScoreVersionProjectId(null)} className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button></div>
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {versions.map((version, index) => {
                const selected = project.selectedScoreVersionId === version.id;
                const previousVersion = index > 0 ? versions[index - 1] : null;
                const totalDelta = previousVersion ? Number((Number(version.totalScore || 0) - Number(previousVersion.totalScore || 0)).toFixed(2)) : 0;
                const highlightsChanges = ["calibration", "manual_edit"].includes(version.type) && Boolean(previousVersion);
                return <div key={version.id} className={`border rounded-2xl p-4 ${selected ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/40'}`}>
                  <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2 items-center"><h4 className="text-sm font-black text-slate-200">{version.label || `Lần ${index + 1}`}</h4><span className="text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg px-2 py-1">{typeLabels[version.type] || version.type}</span>{selected && <span className="text-[9px] font-bold bg-emerald-600 text-white rounded-lg px-2 py-1">ĐIỂM CUỐI</span>}</div><p className="text-[10px] text-slate-500 mt-1">{version.createdAt ? new Date(version.createdAt).toLocaleString('vi-VN') : "Không rõ thời gian"}</p></div><div className={`text-right text-2xl font-black font-mono ${highlightsChanges && Math.abs(totalDelta) >= 0.05 ? 'text-red-500' : 'text-slate-200'}`}>{Number(version.totalScore || 0).toFixed(2)}{highlightsChanges && Math.abs(totalDelta) >= 0.05 && <span className="block text-[10px] text-red-400">{Number(previousVersion.totalScore || 0).toFixed(1)} → {Number(version.totalScore || 0).toFixed(1)} ({totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)} điểm)</span>}</div></div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">{rubric.map(item => { const before = Number(previousVersion?.grades?.[item.id] || 0); const after = Number(version.grades?.[item.id] || 0); const delta = Number((after - before).toFixed(2)); const changed = highlightsChanges && Math.abs(delta) >= 0.05; return <div key={item.id} className={`flex justify-between gap-3 rounded-lg px-2.5 py-2 text-[10px] ${changed ? 'bg-red-950/30 border border-red-500/30' : 'bg-slate-950/60'}`}><span className={changed ? 'text-red-300 truncate' : 'text-slate-400 truncate'}>{item.name}</span><b className={changed ? 'text-red-400 font-mono' : 'text-slate-200 font-mono'}>{changed ? `${before.toFixed(1)} → ${after.toFixed(1)} (${delta > 0 ? '+' : ''}${delta.toFixed(1)})` : `${after.toFixed(1)} / ${Number(item.maxScore).toFixed(1)}`}</b></div>; })}</div>
                  {version.note && <p className="mt-3 text-[10px] leading-relaxed text-slate-300 border-l-2 border-indigo-500 pl-2">{version.note}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3"><span className={`text-[9px] font-bold ${version.aiGeneratedStatus === 'suspected' ? 'text-amber-400' : 'text-slate-500'}`}>{version.aiGeneratedStatus === 'suspected' ? 'Có cảnh báo nghi vấn AI ở phiên bản này' : 'Không có cảnh báo AI đang hoạt động'}</span>{!selected && <button type="button" onClick={() => handleSelectScoreVersion(project.id, version.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg px-3 py-2 text-[10px] cursor-pointer">Chọn làm điểm cuối</button>}</div>
                </div>;
              })}
              {versions.length === 0 && <div className="text-center text-xs text-slate-500 py-8">Bài này được nạp từ JSON cũ và chưa có lịch sử phiên bản. Điểm hiện tại vẫn là điểm cuối.</div>}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end"><button type="button" onClick={() => setScoreVersionProjectId(null)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer">Đóng</button></div>
          </div>
        </div>;
      })()}

      {showCalibrationReviewModal && calibrationReview && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[88vh] overflow-hidden border rounded-3xl shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-slate-950 border-violet-500/30' : 'bg-white border-violet-200'}`}>
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div><h3 className="text-base font-black text-violet-400">Kết quả cân chỉnh tương quan điểm</h3><p className="text-[11px] text-slate-500 mt-1">Đã so sánh {calibrationReview.entries.length} bài; {calibrationReview.entries.filter(item => item.changed).length} bài có thay đổi. GV có thể hoàn tác riêng từng bài.</p></div>
              <button type="button" onClick={() => setShowCalibrationReviewModal(false)} className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {calibrationReview.entries.map(entry => {
                const totalDelta = Number((entry.afterTotal - entry.beforeTotal).toFixed(2));
                return (
                <div key={entry.projectId} className={`border rounded-2xl p-4 ${entry.changed ? 'border-red-500/50 bg-red-950/15' : 'border-slate-800 bg-slate-900/40'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><h4 className="text-sm font-bold text-slate-200">{entry.studentName} <span className="text-[10px] text-slate-500 font-mono">{entry.studentId}</span></h4><p className="text-xs text-slate-300 mt-2 leading-relaxed">{entry.rationale}</p></div>
                    <div className="text-right flex-shrink-0"><div className="text-xs font-black font-mono"><span className="text-slate-500">{entry.beforeTotal.toFixed(2)}</span><span className={`mx-2 ${entry.changed ? 'text-red-400' : 'text-violet-400'}`}>→</span><span className={entry.changed ? 'text-red-400' : 'text-slate-300'}>{entry.afterTotal.toFixed(2)}</span>{entry.changed && <span className="ml-1.5 text-red-400">({totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)} điểm)</span>}</div><p className="text-[9px] text-slate-500 mt-1">{entry.relativeLevel}</p></div>
                  </div>
                  {entry.changedCriteria.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{entry.changedCriteria.map(item => { const delta = Number((item.after - item.before).toFixed(2)); return <span key={item.id} className="bg-red-950/30 border border-red-500/40 rounded-lg px-2 py-1 text-[9px] text-red-300">{item.name}: {item.before.toFixed(1)} → {item.after.toFixed(1)} ({delta > 0 ? '+' : ''}{delta.toFixed(1)} điểm)</span>; })}</div>}
                  {entry.changed && !entry.undone && <button type="button" onClick={() => handleUndoCalibration(entry.projectId, calibrationReview.id)} className="mt-3 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-lg text-[10px] flex items-center gap-1.5 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> Không đồng ý – hoàn tác bài này</button>}
                  {entry.undone && <p className="mt-3 text-[10px] font-bold text-emerald-400">Đã hoàn tác về điểm trước khi cân chỉnh.</p>}
                </div>
              );})}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end"><button type="button" onClick={() => setShowCalibrationReviewModal(false)} className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer">Đóng</button></div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN ZOOM MODAL (Trình xem ảnh/PDF/Word tối ưu không viền) */}
      {zoomedFile && (
        <div 
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-sm flex flex-col justify-between select-none transition-all animate-fade-in"
          style={{ zIndex: 99999 }}
          onClick={() => setZoomedFile(null)}
        >
          {zoomedFile.isPDF && zoomedFile.projectId && (
            <aside className="absolute left-4 top-4 bottom-24 w-72 bg-slate-950/95 border border-slate-800 rounded-2xl p-3 overflow-y-auto shadow-2xl" style={{ zIndex: 100001 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div><h4 className="text-xs font-black text-white">Đi nhanh theo mục chính</h4><p className="text-[9px] text-slate-500 mt-0.5">Tiêu đề trang + bookmark + mục lục</p></div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleAddPdfSection(zoomedFile.projectId, pdfPageNum)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2 py-1 text-[9px] font-bold cursor-pointer"><Plus className="w-3 h-3 inline" /> Thêm</button>
                  <button type="button" onClick={() => handleRedetectPdfStructure(zoomedFile.projectId)} className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-2 py-1 text-[9px] font-bold cursor-pointer"><RotateCw className="w-3 h-3 inline" /> Dò lại</button>
                </div>
              </div>
              {(viewerProject.pdfSections || []).length === 0 && <div className="text-[10px] text-slate-500 border border-dashed border-slate-700 rounded-xl p-3">Chưa nhận diện được mục chính. GV có thể đến trang cần thiết rồi bấm “Thêm”.</div>}
              <div className="flex flex-col gap-2">
                {(viewerProject.pdfSections || []).map((section, index) => (
                  <div key={`${section.startPage}-${index}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-2">
                    <button type="button" onClick={() => setPdfPageNum(section.startPage)} className="w-full text-left text-[10px] font-bold text-indigo-300 hover:text-white truncate cursor-pointer" title={`Đến trang ${section.startPage}`}>{section.label}</button>
                    <div className="grid grid-cols-[1fr_58px_28px] gap-1 mt-1.5">
                      <input value={section.label} onChange={(e) => handleUpdatePdfSection(zoomedFile.projectId, index, 'label', e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-slate-300 focus:outline-none focus:border-indigo-500" />
                      <input type="number" min="1" max={pdfTotalPages || 1} value={section.startPage} onChange={(e) => handleUpdatePdfSection(zoomedFile.projectId, index, 'startPage', e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[9px] text-center text-slate-300 focus:outline-none focus:border-indigo-500" title="Trang bắt đầu" />
                      <button type="button" onClick={() => handleRemovePdfSection(zoomedFile.projectId, index)} className="bg-rose-950/60 hover:bg-rose-700 text-rose-300 hover:text-white rounded cursor-pointer" title="Xóa mốc"><Trash2 className="w-3 h-3 mx-auto" /></button>
                    </div>
                    <p className="text-[8px] text-slate-600 mt-1">Trang {section.startPage}–{section.endPage} · {section.detectedBy}</p>
                  </div>
                ))}
              </div>
            </aside>
          )}
          {/* Floating glassmorphism control panel */}
          <div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 border border-slate-800/80 backdrop-blur-lg px-5 py-2.5 rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-w-[90vw] overflow-x-auto"
            style={{ zIndex: 100000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col text-left mr-2 min-w-[100px] border-r border-slate-800 pr-3">
              <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono">Đang thẩm duyệt</span>
              <h4 className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{zoomedFile.name || "Bài nộp sinh viên"}</h4>
            </div>

            {(!zoomedFile.isWord && !zoomedFile.isPDF) && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setZoomedFile(prev => ({ ...prev, rotation: ((prev.rotation || 0) - 90 + 360) % 360 })); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer" 
                  title="Xoay trái 90 độ"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setZoomedFile(prev => ({ ...prev, rotation: ((prev.rotation || 0) + 90) % 360 })); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer" 
                  title="Xoay phải 90 độ"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {(!zoomedFile.isWord && !zoomedFile.isPDF) && <div className="w-[1px] h-6 bg-slate-800"></div>}

            {zoomedFile.isPDF && pdfDoc && (
              <div className="flex items-center gap-2">
                <button 
                  disabled={pdfPageNum <= 1 || renderingPage} 
                  onClick={(e) => { e.stopPropagation(); setPdfPageNum(prev => Math.max(1, prev - 1)); }} 
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 font-bold whitespace-nowrap flex items-center gap-1">Trang <input type="number" min="1" max={pdfTotalPages || 1} value={pdfPageNum} onChange={(e) => setPdfPageNum(Math.min(pdfTotalPages || 1, Math.max(1, Number(e.target.value) || 1)))} className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1 text-center text-white focus:outline-none focus:border-indigo-500" /> / {pdfTotalPages}</span>
                <button 
                  disabled={pdfPageNum >= pdfTotalPages || renderingPage} 
                  onClick={(e) => { e.stopPropagation(); setPdfPageNum(prev => Math.min(pdfTotalPages, prev + 1)); }} 
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setPdfScale(prev => Math.max(0.6, prev - 0.2)); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer" 
                  title="Thu nhỏ PDF"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPdfScale(prev => Math.min(3.0, prev + 0.2)); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer" 
                  title="Phóng to PDF"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}

            {!zoomedFile.isPDF && !zoomedFile.isWord && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setImgScale(prev => Math.max(0.3, prev - 0.15)); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer" 
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-slate-200 w-12 text-center text-xs font-mono font-black">{Math.round(imgScale * 100)}%</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setImgScale(prev => Math.min(3.5, prev + 0.15)); }} 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer" 
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setImgScale(1.0); }} 
                  className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 rounded transition-all cursor-pointer"
                >
                  100%
                </button>
              </div>
            )}

            <div className="w-[1px] h-6 bg-slate-800"></div>

            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setZoomedFile(null); }} 
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 hover:scale-105 active:scale-95 shadow-md shadow-rose-900/20 cursor-pointer"
            >
              <X className="w-4 h-4" /> <span>Đóng</span>
            </button>
          </div>

          {/* Full Screen Viewport Area */}
          <div 
            className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-0" 
            onClick={() => setZoomedFile(null)}
          >
            {zoomedFile.isWord ? (
              <div className="w-full max-w-3xl bg-white text-black p-8 rounded shadow-2xl overflow-y-auto h-[85vh] font-serif text-sm whitespace-pre-wrap mt-8 mb-20" onClick={e => e.stopPropagation()}>
                 <div className="text-center font-bold text-rose-600 border-b-2 border-rose-100 pb-3 mb-5 uppercase tracking-widest text-lg">--- NỘI DUNG TÀI LIỆU WORD TRÍCH XUẤT ---</div>
                 {zoomedFile.extractedText}
              </div>
            ) : zoomedFile.isPDF ? (
              <div 
                className="relative shadow-2xl p-2 bg-slate-900/40 max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                {renderingPage && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-xs text-rose-400 gap-2 font-bold z-50">
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Đang kết xuất trang bản vẽ...</span>
                  </div>
                )}
                <canvas 
                  ref={canvasRef} 
                  className="shadow-2xl mx-auto transition-transform duration-300 bg-white" 
                  style={{ transform: `rotate(${zoomedFile.rotation || 0}deg)` }} 
                />
              </div>
            ) : (
              <div 
                className="flex items-center justify-center w-full h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={zoomedFile.src} 
                  alt="Full screen Immersive" 
                  className="max-w-none max-h-none object-contain shadow-2xl transition-transform duration-200 ease-out" 
                  style={{ 
                    transform: `rotate(${zoomedFile.rotation || 0}deg) scale(${imgScale})`,
                    transformOrigin: 'center center',
                    maxWidth: imgScale <= 1.0 ? '95vw' : 'none',
                    maxHeight: imgScale <= 1.0 ? '90vh' : 'none'
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI SUSPECT REPORT MODAL */}
      {aiSuspectDetailProject && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className={`border rounded-3xl p-6 max-w-3xl max-h-[92vh] overflow-y-auto w-full shadow-2xl animate-fade-in flex flex-col gap-4 text-left ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500"><Fingerprint className="w-5 h-5 animate-pulse" /></div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-wide ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Báo Cáo Nghi Vấn Can Thiệp AI</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sinh viên: {aiSuspectDetailProject.studentName} (MSSV: {aiSuspectDetailProject.studentId})</p>
                </div>
              </div>
              <button type="button" onClick={() => setAiSuspectDetailProject(null)} className={`p-1 rounded border cursor-pointer ${theme === 'dark' ? 'text-slate-500 hover:text-white bg-slate-950 border-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className={`rounded-xl p-4 border h-[240px] flex-shrink-0 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-2 font-mono">⚠️ Các đặc điểm bất thường phát hiện được:</span>
              <p className={`text-xs leading-relaxed whitespace-pre-wrap font-sans ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{aiSuspectDetailProject.aiGeneratedDetails || "Hệ thống đã gắn cờ để giảng viên kiểm tra thêm nhưng chưa trả mô tả chi tiết."}</p>
              {aiSuspectDetailProject.aiDetectionReport && (
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <div className="flex flex-wrap gap-2 mb-2"><span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg px-2 py-1 text-[9px] font-bold">Mức: {aiSuspectDetailProject.aiDetectionReport.mucDo}</span><span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg px-2 py-1 text-[9px] font-bold">Độ tin cậy cảnh báo: {Math.round(aiSuspectDetailProject.aiDetectionReport.diemTinCay || 0)}%</span></div>
                  {(aiSuspectDetailProject.aiDetectionReport.dauHieu || []).map((finding, index) => <div key={index} className="text-[10px] text-slate-300 py-1.5 border-b border-slate-800/60"><b>{finding.trang}</b> · {finding.nhomDauHieu} · <span className={finding.mucTinCay === 'Cao' ? 'text-rose-400' : 'text-amber-400'}>{finding.mucTinCay}</span><br />{finding.quanSatCuThe}</div>)}
                  {(aiSuspectDetailProject.aiDetectionReport.cauHoiXacMinh || []).length > 0 && <div className="mt-3"><b className="text-[9px] uppercase text-indigo-400">Câu hỏi GV nên xác minh:</b>{aiSuspectDetailProject.aiDetectionReport.cauHoiXacMinh.map((question, index) => <p key={index} className="text-[10px] text-slate-300 mt-1">{index + 1}. {question}</p>)}</div>}
                </div>
              )}
            </div>
            <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[9px] font-black uppercase text-slate-500">Phiên bản báo cáo:</span>{(aiSuspectDetailProject.aiDetectionVersions || []).map((version, index) => { const selected = aiSuspectDetailProject.selectedAiDetectionVersionId === version.id; return <button key={version.id} type="button" onClick={() => handleSelectAiDetectionVersion(aiSuspectDetailProject.id, version.id)} title={`${version.source || "Không rõ nguồn"} – ${version.createdAt ? new Date(version.createdAt).toLocaleString('vi-VN') : ""}`} className={`rounded-lg border px-2 py-1 text-[9px] font-bold cursor-pointer ${selected ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>{version.label || `Bản ${index + 1}`}{selected ? " ✓" : ""}</button>; })}{(aiSuspectDetailProject.aiDetectionVersions || []).length === 0 && <span className="text-[9px] italic text-slate-600">Chưa có lịch sử phiên bản</span>}</div>
              <p className="text-[9px] text-slate-500">Phiên bản đang chọn sẽ là cảnh báo/kết luận được dùng trong phiếu chấm PDF.</p>
            </div>
            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-indigo-500/25 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50'}`}>
              <label className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Yêu cầu hoặc kết luận của giảng viên</label>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-500">Ví dụ: “Kiểm tra kỹ trang 5–8, đối chiếu phối cảnh với mặt bằng”; hoặc “Bỏ qua nhiễu JPEG và lỗi render tại trang 3”. Nội dung này cũng có thể dùng làm kết luận thủ công của GV.</p>
              <textarea value={aiAuditInstruction} onChange={(event) => setAiAuditInstruction(event.target.value)} rows="3" className={`mt-2 w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none focus:border-indigo-500 ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-800'}`} placeholder="Nhập yêu cầu AI tìm thêm, lý do cần bỏ qua cảnh báo hoặc kết luận của giảng viên..." />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => handleRegenerateAiAudit(aiSuspectDetailProject.id, "recheck")} disabled={isRegeneratingAiAudit} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-3 py-2 text-[10px] font-bold text-white cursor-pointer"><RotateCw className={`mr-1 inline h-3.5 w-3.5 ${isRegeneratingAiAudit ? 'animate-spin' : ''}`} />Tạo lại báo cáo</button>
                <button type="button" onClick={() => handleRegenerateAiAudit(aiSuspectDetailProject.id, "find_more")} disabled={isRegeneratingAiAudit || !aiAuditInstruction.trim()} className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 px-3 py-2 text-[10px] font-bold text-white cursor-pointer"><Fingerprint className="mr-1 inline h-3.5 w-3.5" />AI tìm thêm theo yêu cầu</button>
                <button type="button" onClick={() => handleRegenerateAiAudit(aiSuspectDetailProject.id, "consider_clear")} disabled={isRegeneratingAiAudit || !aiAuditInstruction.trim()} className="rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 px-3 py-2 text-[10px] font-bold text-white cursor-pointer"><CheckCircle className="mr-1 inline h-3.5 w-3.5" />AI xem xét bỏ qua</button>
              </div>
            </div>
            <div className={`text-[10px] p-3 rounded-lg leading-relaxed font-sans border ${theme === 'dark' ? 'text-slate-400 bg-slate-950/40 border-slate-800/80' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
              <b>Nguyên tắc Human-in-the-loop:</b> Báo cáo AI chỉ hỗ trợ xác minh. Giảng viên có thể chọn một phiên bản AI, lưu kết luận nghi vấn thủ công hoặc xác nhận bỏ cảnh báo; quyết định của giảng viên mới là kết quả cuối cùng.
            </div>
            <div className={`flex flex-wrap justify-end gap-2.5 border-t pt-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setAiSuspectDetailProject(null)} className={`border font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Đóng báo cáo</button>
              <button type="button" onClick={() => handleConfirmAiSuspicion(aiSuspectDetailProject.id)} className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-1 shadow-lg cursor-pointer"><AlertTriangle className="w-4 h-4" /><span>GV xác nhận nghi vấn</span></button>
              <button type="button" onClick={() => handleVerifyStudentWorkClean(aiSuspectDetailProject.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-1 shadow-lg shadow-emerald-900/20 cursor-pointer"><Check className="w-4 h-4" /><span>Xác nhận SV tự làm</span></button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARISON LIST MODAL */}
      {showClassListComparisonModal && classListStats && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowClassListComparisonModal(false)}></div>
          <div className={`relative border rounded-3xl p-6 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col justify-between z-10 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500"><Users className="w-5 h-5" /></div>
                <div>
                  <h4 className={`text-base font-black uppercase ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>Bảng danh sách lớp</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">So sánh danh sách sinh viên lớp học với các bài đã nộp thực tế</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowClassListComparisonModal(false)} className={`p-1.5 rounded border cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-white bg-slate-950 border-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'}`}><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 pr-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: Match Submissions */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 uppercase w-full">
                    <UserCheck className="w-4 h-4 text-emerald-500" /> Đã nộp bài ({classListStats.matchedCount})
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pt-1">
                  {classList.filter(student => classListStats.submittedIds.has(student.studentId)).map(s => {
                    const matchProj = projects.find(p => p.studentId === s.studentId);
                    const isEditingThis = matchProj && editingProjId === matchProj.id;
                    const isModalIdError = !isEditingThis && matchProj && !/^1[a-zA-Z0-9]{7}$/i.test(matchProj.studentId);
                    const tempIdError = isEditingThis && tempStudentId && !/^1[a-zA-Z0-9]{7}$/i.test(tempStudentId);

                    return (
                      <div key={s.studentId} className={`p-3 rounded-xl border text-xs text-left transition-all ${theme === 'dark' ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-100' : 'bg-emerald-50/40 border-emerald-200/60 text-emerald-900'}`}>
                        {isEditingThis ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <input
                              type="text"
                              value={tempStudentName}
                              onChange={(e) => setTempStudentName(e.target.value)}
                              className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500'}`}
                              placeholder="Tên sinh viên"
                            />
                            
                            <div className="flex flex-col gap-1 w-full">
                              <input
                                type="text"
                                value={tempStudentId}
                                onChange={(e) => setTempStudentId(e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${
                                  tempIdError 
                                    ? 'border-red-500 text-red-500 bg-red-500/10 font-bold' 
                                    : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500')
                                }`}
                                placeholder="MSSV"
                              />
                              {tempIdError && (
                                <span className="text-red-500 text-[9px] font-bold animate-pulse">
                                  MSSV lỗi: bắt đầu từ 1, đủ 8 ký tự!
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  updateProjectField(matchProj.id, 'studentName', tempStudentName);
                                  updateProjectField(matchProj.id, 'studentId', tempStudentId);
                                  setEditingProjId(null);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProjId(null)}
                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold truncate">{s.studentName}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${isModalIdError ? 'text-red-500 font-extrabold animate-pulse' : 'text-emerald-600'}`}>
                              {s.studentId}
                              {isModalIdError && " (Sai định dạng)"}
                            </div>
                            {matchProj && (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-red-500">
                                  {matchProj.isGraded ? `Tổng điểm: ${Object.values(matchProj.grades || {}).reduce((a, b) => a + b, 0).toFixed(2)}đ` : "Chờ chấm"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProjId(matchProj.id);
                                    setTempStudentName(matchProj.studentName);
                                    setTempStudentId(matchProj.studentId);
                                  }}
                                  className="text-indigo-500 hover:text-indigo-400 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  Sửa
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {classListStats.matchedCount === 0 && (
                    <div className="text-xs text-slate-500 text-center py-8">Chưa có bài nộp nào khớp.</div>
                  )}
                </div>
              </div>

              {/* Column 2: Unsubmitted students */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 uppercase w-full">
                    <UserX className="w-4 h-4 text-amber-500" /> Chưa nộp bài ({classListStats.totalCount - classListStats.matchedCount})
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pt-1">
                  {classList.filter(student => !classListStats.submittedIds.has(student.studentId)).map(s => {
                    const isStudentIdError = !/^1[a-zA-Z0-9]{7}$/i.test(s.studentId);
                    const isEditingThis = editingClassStudentId === s.studentId;
                    const tempIdError = isEditingThis && tempStudentId && !/^1[a-zA-Z0-9]{7}$/i.test(tempStudentId);

                    return (
                      <div key={s.studentId} className={`p-3 rounded-xl border text-xs text-left transition-all ${theme === 'dark' ? 'bg-amber-950/25 border-amber-500/20 text-amber-100' : 'bg-amber-50/40 border-amber-200/60 text-amber-900'}`}>
                        {isEditingThis ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <input
                              type="text"
                              value={tempStudentName}
                              onChange={(e) => setTempStudentName(e.target.value)}
                              className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500'}`}
                              placeholder="Tên sinh viên"
                            />
                            
                            <div className="flex flex-col gap-1 w-full">
                              <input
                                type="text"
                                value={tempStudentId}
                                onChange={(e) => setTempStudentId(e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${
                                  tempIdError 
                                    ? 'border-red-500 text-red-500 bg-red-500/10 font-bold' 
                                    : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500')
                                }`}
                                placeholder="MSSV"
                              />
                              {tempIdError && (
                                <span className="text-red-500 text-[9px] font-bold animate-pulse">
                                  MSSV lỗi: bắt đầu từ 1, đủ 8 ký tự!
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveClassStudent(s.studentId)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClassStudentId(null)}
                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold truncate">{s.studentName}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${isStudentIdError ? 'text-red-500 font-extrabold animate-pulse' : 'text-amber-500'}`}>{s.studentId}</div>
                            <div className="mt-2.5 flex items-center justify-between">
                              <span className="text-[9px] text-amber-500 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> <span>Chờ nộp...</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingClassStudentId(s.studentId);
                                    setTempStudentName(s.studentName);
                                    setTempStudentId(s.studentId);
                                  }}
                                  className="text-indigo-500 hover:text-indigo-400 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClassStudent(s.studentId)}
                                  className="text-rose-500 hover:text-rose-400 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {classListStats.totalCount - classListStats.matchedCount === 0 && (
                    <div className="text-xs text-emerald-500 text-center py-8 font-bold">100% sinh viên đã nộp bài!</div>
                  )}
                </div>
              </div>

              {/* Column 3: Unmatched Submissions */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 uppercase w-full">
                    <AlertCircle className="w-4 h-4 text-rose-500" /> Không có dữ liệu ({classListStats.unmatchedCount})
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pt-1">
                  {classListStats.unmatchedProjects.map(p => {
                    const isEditingThis = editingProjId === p.id;
                    const isModalIdError = !isEditingThis && !/^1[a-zA-Z0-9]{7}$/i.test(p.studentId);
                    const tempIdError = isEditingThis && tempStudentId && !/^1[a-zA-Z0-9]{7}$/i.test(tempStudentId);

                    return (
                      <div key={p.id} className={`p-3 rounded-xl border text-xs text-left transition-all ${theme === 'dark' ? 'bg-rose-950/25 border-rose-500/20 text-rose-100' : 'bg-rose-50/40 border-rose-200/60 text-rose-900'}`}>
                        {isEditingThis ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={tempStudentName}
                              onChange={(e) => setTempStudentName(e.target.value)}
                              className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500'}`}
                              placeholder="Tên sinh viên"
                            />
                            
                            <div className="flex flex-col gap-1 w-full">
                              <input
                                type="text"
                                value={tempStudentId}
                                onChange={(e) => setTempStudentId(e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${
                                  tempIdError 
                                    ? 'border-red-500 text-red-500 bg-red-500/10 font-bold' 
                                    : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-800 focus:border-rose-500')
                                }`}
                                placeholder="MSSV"
                              />
                              {tempIdError && (
                                <span className="text-red-500 text-[9px] font-bold animate-pulse">
                                  MSSV lỗi: bắt đầu từ 1, đủ 8 ký tự!
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  updateProjectField(p.id, 'studentName', tempStudentName);
                                  updateProjectField(p.id, 'studentId', tempStudentId);
                                  setEditingProjId(null);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProjId(null)}
                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold truncate">{p.studentName || "Không Rõ"}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${isModalIdError ? 'text-red-500 font-extrabold animate-pulse' : 'text-rose-500'}`}>
                              {p.studentId || "Không Rõ"}
                              {isModalIdError && " (Sai định dạng)"}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[9px] text-slate-500 truncate max-w-[120px]" title={p.fileName}>{p.fileName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProjId(p.id);
                                  setTempStudentName(p.studentName || "");
                                  setTempStudentId(p.studentId || "");
                                }}
                                className="text-indigo-500 hover:text-indigo-400 font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Sửa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {classListStats.unmatchedCount === 0 && (
                    <div className="text-xs text-slate-500 text-center py-8">Không có bài nộp ngoài danh sách.</div>
                  )}
                </div>
              </div>

            </div>

            <div className={`flex justify-end gap-2 border-t pt-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  const missingList = classList.filter(student => !classListStats.submittedIds.has(student.studentId));
                  const headers = "MSSV,Họ Tên";
                  const rows = missingList.map(s => `${escapeCSV(s.studentId)},${escapeCSV(s.studentName)}`);
                  const csvContent = [headers, ...rows].join("\n");
                  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `Sinh_Vien_Chua_Nop_DAMH_${globalSubjectCode || 'Lop'}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={classList.filter(student => !classListStats.submittedIds.has(student.studentId)).length === 0}
                className={`border font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 hover:text-white' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
              >
                <Download className="w-3.5 h-3.5" /> Xuất danh sách chưa nộp (.csv)
              </button>

              <button
                type="button"
                onClick={() => setShowClassListComparisonModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-colors uppercase tracking-wider cursor-pointer"
              >
                đóng danh sách
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIDDEN INPUTS FOR FILE HANDLING */}
      <input type="file" ref={rubricFileInputRef} accept=".csv" onChange={handleImportRubric} className="hidden" />
      <input type="file" ref={projectFileInputRef} accept=".json" onChange={handleImportProject} className="hidden" />
      <input type="file" ref={smartRubricInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={handleSmartRubricUpload} className="hidden" />
      
      {/* Dynamic input for student Class List files */}
      <input type="file" ref={classListInputRef} accept=".csv" onChange={handleSmartClassListUpload} className="hidden" />

      {/* FOOTER */}
      <footer className={`mt-auto py-6 border-t flex flex-col items-center justify-center gap-1 z-10 transition-colors ${theme === 'dark' ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
         <span className="text-[10px] font-bold tracking-wider uppercase font-sans">Built by: <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Trần Quang Hải</span> <span className="normal-case text-indigo-400">• {APP_VERSION}</span></span>
         <span className="text-[9px] font-mono font-medium">Email: tranquanghai@tdtu.edu.vn</span>
      </footer>
    </div>
  );
}
