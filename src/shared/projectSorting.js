export const PROJECT_SORT_OPTIONS = [
  { value: "upload", label: "Thứ tự tải lên" },
  { value: "name", label: "Tên sinh viên A–Z" },
  { value: "score_desc", label: "Điểm cao → thấp" },
  { value: "score_asc", label: "Điểm thấp → cao" }
];

export const getProjectTotalScore = project => Number(Object.values(project?.grades || {}).reduce((sum, value) => sum + Number(value || 0), 0));

export const sortProjects = (projects, mode = "upload") => [...(projects || [])].sort((left, right) => {
  if (mode === "name") return String(left.studentName || left.fileName || "").localeCompare(String(right.studentName || right.fileName || ""), "vi");
  if (mode === "score_desc") return getProjectTotalScore(right) - getProjectTotalScore(left);
  if (mode === "score_asc") return getProjectTotalScore(left) - getProjectTotalScore(right);
  return Number(left.uploadOrder || 0) - Number(right.uploadOrder || 0);
});
