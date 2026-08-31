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

// Đọc JSON tiến trình theo từng bài và tách riêng giá trị Base64 ngay khi luồng
// đi qua. Chuỗi Base64 không bao giờ được ghép thành một String khổng lồ; mỗi
// khối được giải mã thành Uint8Array rồi phần văn bản tạm được giải phóng.
export const parseProgressJsonStream = async (file, { onProgress, onProject } = {}) => {
  if (!file) throw new Error("Không tìm thấy tệp JSON.");
  if (!file.size) throw new Error("Tệp JSON có dung lượng 0 byte hoặc chưa được lưu hoàn chỉnh.");
  if (!file.stream || typeof TextDecoder === "undefined") {
    const data = JSON.parse(await readJsonFileWithProgress(file, percent => onProgress?.({ percent, projectCount: 0, totalProjectCount: 0 })));
    for (let index = 0; index < (data.sketches || []).length; index += 1) await onProject?.(data.sketches[index], index, null);
    return data;
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  const parsedProjects = [];
  let metadata = null;
  let prefixText = "";
  let tailParts = [];
  let mode = "prefix";
  let loadedBytes = 0;
  let collectingProject = false;
  let objectDepth = 0;
  let inString = false;
  let escapedCharacter = false;
  let projectParts = [];
  let markerCarry = "";
  let readingBase64 = false;
  let base64Carry = "";
  let base64ByteParts = [];
  let base64ByteLength = 0;

  const decodeBase64Block = value => {
    const compact = String(value || "").replace(/\s+/g, "");
    if (!compact) return;
    const combined = base64Carry + compact;
    const completeLength = combined.length - (combined.length % 4);
    if (!completeLength) { base64Carry = combined; return; }
    const binary = atob(combined.slice(0, completeLength));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    base64ByteParts.push(bytes);
    base64ByteLength += bytes.byteLength;
    base64Carry = combined.slice(completeLength);
  };

  const finishBase64 = () => {
    if (base64Carry) {
      const binary = atob(base64Carry);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      base64ByteParts.push(bytes);
      base64ByteLength += bytes.byteLength;
      base64Carry = "";
    }
  };

  const appendProjectSegment = segmentValue => {
    let segment = String(segmentValue || "");
    while (segment) {
      if (readingBase64) {
        const quoteIndex = segment.indexOf('"');
        if (quoteIndex < 0) {
          decodeBase64Block(segment);
          return;
        }
        decodeBase64Block(segment.slice(0, quoteIndex));
        finishBase64();
        readingBase64 = false;
        segment = segment.slice(quoteIndex + 1);
        continue;
      }

      const candidate = markerCarry + segment;
      markerCarry = "";
      const marker = /"base64"\s*:\s*"/.exec(candidate);
      if (marker) {
        projectParts.push(candidate.slice(0, marker.index), '"base64":""');
        readingBase64 = true;
        segment = candidate.slice(marker.index + marker[0].length);
        continue;
      }
      const retainedLength = Math.min(96, candidate.length);
      const safeLength = candidate.length - retainedLength;
      if (safeLength > 0) projectParts.push(candidate.slice(0, safeLength));
      markerCarry = candidate.slice(safeLength);
      return;
    }
  };

  const finishProject = async () => {
    if (readingBase64) throw new Error(`Dữ liệu Base64 của bài ${parsedProjects.length + 1} chưa được ghi đầy đủ.`);
    if (markerCarry) projectParts.push(markerCarry);
    markerCarry = "";
    let projectText;
    try { projectText = projectParts.join(""); }
    catch (error) { throw new Error(`Phần dữ liệu chữ của bài ${parsedProjects.length + 1} quá lớn: ${error?.message || "Invalid string length"}`); }
    projectParts = [];
    let parsedProject;
    try { parsedProject = JSON.parse(projectText); }
    catch (error) { throw new Error(`JSON của bài ${parsedProjects.length + 1} sai cú pháp: ${error?.message || "Không xác định"}`); }
    projectText = null;
    const streamedBlob = base64ByteLength
      ? new Blob(base64ByteParts, { type: parsedProject.mimeType || parsedProject.type || "application/octet-stream" })
      : null;
    base64ByteParts = [];
    base64ByteLength = 0;
    base64Carry = "";
    if (typeof onProject === "function") await onProject(parsedProject, parsedProjects.length, streamedBlob);
    parsedProjects.push(parsedProject);
    onProgress?.({
      percent: Math.min(99, Math.round((loadedBytes / file.size) * 100)),
      projectCount: parsedProjects.length,
      totalProjectCount: Number(metadata?.projectCount || 0)
    });
    await new Promise(resolve => window.setTimeout(resolve, 0));
  };

  const consumeSketches = async textValue => {
    let index = 0;
    let segmentStart = collectingProject ? 0 : -1;
    while (index < textValue.length) {
      if (!collectingProject) {
        while (index < textValue.length && /[\s,]/.test(textValue[index])) index += 1;
        if (index >= textValue.length) return;
        if (textValue[index] === "]") {
          mode = "tail";
          tailParts.push(textValue.slice(index + 1));
          return;
        }
        if (textValue[index] !== "{") throw new Error(`Cấu trúc danh sách bài không hợp lệ tại bài ${parsedProjects.length + 1}.`);
        collectingProject = true;
        objectDepth = 1;
        inString = false;
        escapedCharacter = false;
        segmentStart = index;
        index += 1;
        continue;
      }
      if (inString) {
        if (escapedCharacter) { escapedCharacter = false; index += 1; continue; }
        const nextQuote = textValue.indexOf('"', index);
        const nextBackslash = textValue.indexOf("\\", index);
        if (nextQuote < 0 && nextBackslash < 0) { index = textValue.length; break; }
        if (nextBackslash >= 0 && (nextQuote < 0 || nextBackslash < nextQuote)) {
          index = nextBackslash + 1;
          escapedCharacter = true;
          continue;
        }
        inString = false;
        index = nextQuote + 1;
        continue;
      }
      const character = textValue[index];
      if (character === '"') { inString = true; index += 1; }
      else if (character === "{") { objectDepth += 1; index += 1; }
      else if (character === "}") {
        objectDepth -= 1;
        index += 1;
        if (objectDepth === 0) {
          appendProjectSegment(textValue.slice(segmentStart, index));
          collectingProject = false;
          segmentStart = -1;
          await finishProject();
        }
      } else index += 1;
    }
    if (collectingProject && segmentStart >= 0) appendProjectSegment(textValue.slice(segmentStart));
  };

  const consumeDecoded = async textValue => {
    if (!textValue) return;
    if (mode === "tail") { tailParts.push(textValue); return; }
    if (mode === "prefix") {
      prefixText += textValue;
      const marker = /,\s*"sketches"\s*:\s*\[/.exec(prefixText);
      if (!marker) {
        if (prefixText.length > 20 * 1024 * 1024) throw new Error("Không tìm thấy trường sketches trong phần đầu tệp JSON.");
        return;
      }
      try { metadata = JSON.parse(prefixText.slice(0, marker.index) + "}"); }
      catch (error) { throw new Error(`Phần thông tin chung của JSON sai cú pháp: ${error?.message || "Không xác định"}`); }
      const remainder = prefixText.slice(marker.index + marker[0].length);
      prefixText = "";
      mode = "sketches";
      await consumeSketches(remainder);
      return;
    }
    await consumeSketches(textValue);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      loadedBytes += value.byteLength;
      await consumeDecoded(decoder.decode(value, { stream: true }));
      onProgress?.({ percent: Math.min(99, Math.round((loadedBytes / file.size) * 100)), projectCount: parsedProjects.length, totalProjectCount: Number(metadata?.projectCount || 0) });
    }
    await consumeDecoded(decoder.decode());
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }

  if (mode !== "tail" || collectingProject) throw new Error("Tệp JSON chưa được ghi đầy đủ hoặc bị cắt trong danh sách bài.");
  let tailText;
  try { tailText = tailParts.join(""); }
  catch (error) { throw new Error(`Phần cuối JSON quá lớn: ${error?.message || "Invalid string length"}`); }
  tailParts = [];
  const trimmedTail = tailText.trim();
  if (!trimmedTail.endsWith("}")) throw new Error("Tệp JSON chưa được ghi đầy đủ hoặc bị cắt ở cuối.");
  const tailWithoutComma = trimmedTail.replace(/^\s*,/, "");
  let tailData;
  try { tailData = JSON.parse("{" + tailWithoutComma); }
  catch (error) { throw new Error(`Phần cuối JSON sai cú pháp: ${error?.message || "Không xác định"}`); }
  tailText = null;
  onProgress?.({ percent: 100, projectCount: parsedProjects.length, totalProjectCount: Number(metadata?.projectCount || parsedProjects.length) });
  return { ...(metadata || {}), ...tailData, sketches: parsedProjects };
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
