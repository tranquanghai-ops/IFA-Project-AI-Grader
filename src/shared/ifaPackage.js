import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";

const safePackageName = value => String(value || "file")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]+/g, "_")
  .replace(/^_+|_+$/g, "") || "file";

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30 * 60 * 1000);
};

export const createIfaPackage = async ({ fileName, progressData, files, onProgress }) => {
  const selectedFiles = Array.from(files || []).filter(item => item?.blob instanceof Blob);
  const totalBytes = selectedFiles.reduce((sum, item) => sum + item.blob.size, 0);
  let saveHandle = null;
  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    try {
      saveHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "Gói dữ liệu IFA (ZIP)", accept: { "application/zip": [".ifa"] } }]
      });
    } catch (error) {
      if (error?.name === "AbortError") return { cancelled: true };
      throw error;
    }
  }

  if (!saveHandle && totalBytes > 300 * 1024 * 1024) {
    throw new Error("Gói IFA lớn cần Chrome/Edge hỗ trợ hộp thoại lưu trực tiếp. Hãy mở ứng dụng bằng Chrome hoặc Edge rồi thử lại.");
  }

  const output = saveHandle ? await saveHandle.createWritable() : new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(output, { keepOrder: true, zip64: totalBytes >= 3.5 * 1024 * 1024 * 1024 });
  let completedBytes = 0;
  try {
    await zipWriter.add("progress.json", new TextReader(JSON.stringify(progressData)), { level: 6 });
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const item = selectedFiles[index];
      await zipWriter.add(item.path, new BlobReader(item.blob), {
        level: 0,
        onprogress: loaded => {
          const percent = totalBytes ? Math.min(99, Math.round(((completedBytes + loaded) / totalBytes) * 100)) : 99;
          onProgress?.({ percent, index: index + 1, total: selectedFiles.length, fileName: item.fileName });
        }
      });
      completedBytes += item.blob.size;
      onProgress?.({ percent: totalBytes ? Math.min(99, Math.round((completedBytes / totalBytes) * 100)) : 99, index: index + 1, total: selectedFiles.length, fileName: item.fileName });
    }
    const result = await zipWriter.close();
    if (!saveHandle) triggerDownload(result, fileName);
    onProgress?.({ percent: 100, index: selectedFiles.length, total: selectedFiles.length, fileName: "" });
    return { cancelled: false, totalBytes, fileCount: selectedFiles.length };
  } catch (error) {
    try { await zipWriter.close(); } catch (_) {}
    if (saveHandle) {
      try { await output.abort(); } catch (_) {}
    }
    throw error;
  }
};

export const buildIfaFileEntries = async (projects, getBlob) => {
  const files = [];
  const lightweightProjects = [];
  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];
    const blob = await getBlob(project);
    const extension = String(project.fileName || "").split(".").pop() || "bin";
    const path = blob ? `files/${String(index + 1).padStart(4, "0")}_${safePackageName(project.id)}_${safePackageName(project.fileName || `file.${extension}`)}` : "";
    const { base64: _base64, fileUrl: _fileUrl, thumbnailUrl: _thumbnailUrl, ...metadata } = project;
    lightweightProjects.push({
      ...metadata,
      base64: "",
      fileUrl: null,
      thumbnailUrl: null,
      ifaFilePath: path,
      fileStoredInIfa: Boolean(blob),
      requiresReattachAfterImport: !blob
    });
    if (blob) files.push({ path, blob, fileName: project.fileName || path, projectId: project.id });
  }
  return { files, lightweightProjects };
};

export const readIfaPackage = async (file, onProgress) => {
  const zipReader = new ZipReader(new BlobReader(file));
  try {
    const entries = await zipReader.getEntries();
    const entryByName = new Map(entries.filter(entry => !entry.directory).map(entry => [entry.filename, entry]));
    const progressEntry = entryByName.get("progress.json");
    if (!progressEntry) throw new Error("Gói IFA không có tệp progress.json.");
    const progressData = JSON.parse(await progressEntry.getData(new TextWriter()));
    const blobsByPath = new Map();
    const referencedPaths = Array.from(new Set((progressData.sketches || []).map(project => project?.ifaFilePath).filter(Boolean)));
    for (let index = 0; index < referencedPaths.length; index += 1) {
      const path = referencedPaths[index];
      const entry = entryByName.get(path);
      if (!entry) continue;
      const project = (progressData.sketches || []).find(item => item?.ifaFilePath === path) || {};
      const blob = await entry.getData(new BlobWriter(project.mimeType || "application/octet-stream"), {
        onprogress: (loaded, total) => {
          const entryPercent = total ? loaded / total : 0;
          const percent = Math.min(99, Math.round(((index + entryPercent) / Math.max(1, referencedPaths.length)) * 100));
          onProgress?.({ percent, index: index + 1, total: referencedPaths.length, fileName: project.fileName || path });
        }
      });
      blobsByPath.set(path, blob);
      onProgress?.({ percent: Math.min(99, Math.round(((index + 1) / Math.max(1, referencedPaths.length)) * 100)), index: index + 1, total: referencedPaths.length, fileName: project.fileName || path });
    }
    onProgress?.({ percent: 100, index: referencedPaths.length, total: referencedPaths.length, fileName: "" });
    return { progressData, blobsByPath };
  } finally {
    await zipReader.close();
  }
};
