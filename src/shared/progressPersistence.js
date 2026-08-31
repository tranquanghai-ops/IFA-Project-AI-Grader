export const makeLocalFileReference = (project = {}) => ({
  name: String(project.fileName || project.localFileReference?.name || ""),
  size: Number(project.fileSize || project.localFileReference?.size || 0),
  lastModified: Number(project.fileLastModified || project.localFileReference?.lastModified || 0),
  relativePath: String(project.sourceRelativePath || project.localFileReference?.relativePath || ""),
  mimeType: String(project.mimeType || project.localFileReference?.mimeType || "")
});

// Trình duyệt không cung cấp đường dẫn tuyệt đối của tệp. Bản nhẹ giữ dấu vân tay
// để ứng dụng đối chiếu đúng tệp khi giảng viên chọn lại tệp/thư mục trên máy.
export const stripEmbeddedFileData = (project = {}) => ({
  ...project,
  base64: "",
  fileUrl: null,
  thumbnailUrl: null,
  localFileReference: makeLocalFileReference(project),
  fileStoredInJson: false,
  fileUrlIsTemporaryPreview: false,
  requiresReattachAfterImport: true,
  isEmbeddingFile: false,
  embeddingProgress: 0,
  embeddingError: "Bản tiến trình nhẹ không chứa tệp gốc; hãy chọn lại tệp khi cần xem hoặc chấm lại."
});

export const readJsonFileWithProgress = async (file, onProgress) => {
  if (!file) throw new Error("Không tìm thấy tệp JSON.");
  const total = Math.max(1, Number(file.size || 0));
  if (!file.stream || typeof TextDecoderStream === "undefined") {
    onProgress?.(5);
    const text = await file.text();
    onProgress?.(100);
    return text;
  }
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  const chunks = [];
  let bytesRead = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    bytesRead += new Blob([value]).size;
    onProgress?.(Math.min(99, Math.round((bytesRead / total) * 100)));
  }
  onProgress?.(100);
  return chunks.join("");
};

export const saveJsonDownload = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  return blob.size;
};
