const FILE_LIMIT_BYTES = 50 * 1024 * 1024;
const PROCESSING_TIMEOUT_MS = 90000;

const delay = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timeout = setTimeout(resolve, milliseconds);
  signal?.addEventListener('abort', () => {
    clearTimeout(timeout);
    reject(new DOMException('Đã dừng theo yêu cầu.', 'AbortError'));
  }, { once: true });
});

export const base64ToBlob = (base64, mimeType = 'application/octet-stream') => {
  const parts = [];
  const chunkSize = 4 * 1024 * 1024;
  for (let offset = 0; offset < String(base64 || '').length; offset += chunkSize) {
    const decoded = atob(base64.slice(offset, offset + chunkSize));
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
    parts.push(bytes);
  }
  return new Blob(parts, { type: mimeType });
};

const readMetadata = async (apiKey, fileName, signal) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(apiKey)}`, { signal });
  if ([400, 404].includes(response.status)) return null;
  if (!response.ok) throw new Error(`Files API ${response.status}: ${(await response.text()).slice(0, 250)}`);
  return response.json();
};

export const getActiveGeminiFile = async ({ apiKey, fileName, signal }) => {
  if (!fileName || !String(fileName).startsWith('files/')) return null;
  const metadata = await readMetadata(apiKey, fileName, signal);
  const notExpired = !metadata?.expirationTime || new Date(metadata.expirationTime).getTime() > Date.now() + 30000;
  return metadata?.state === 'ACTIVE' && metadata?.uri && notExpired ? metadata : null;
};

export const uploadGeminiFile = async ({ apiKey, blob, displayName, mimeType, signal }) => {
  if (blob.size > FILE_LIMIT_BYTES) throw new Error(`Tệp ${(blob.size / 1024 / 1024).toFixed(1)} MB vượt giới hạn 50 MB của Gemini Files API.`);
  const start = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json', 'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(blob.size),
      'X-Goog-Upload-Header-Content-Type': mimeType
    },
    body: JSON.stringify({ file: { displayName } })
  });
  if (!start.ok) throw new Error(`Files API ${start.status}: ${(await start.text()).slice(0, 250)}`);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini không cung cấp URL tải tệp.');
  const finalized = await fetch(uploadUrl, {
    method: 'POST', signal, body: blob,
    headers: { 'Content-Type': mimeType, 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }
  });
  if (!finalized.ok) throw new Error(`Không thể hoàn tất tải tệp Gemini: ${finalized.status}`);
  let metadata = await finalized.json();
  metadata = metadata?.file || metadata;
  const startedAt = Date.now();
  while (metadata?.state === 'PROCESSING' || !metadata?.state) {
    if (Date.now() - startedAt > PROCESSING_TIMEOUT_MS) throw new Error('Gemini xử lý tệp quá thời gian cho phép.');
    await delay(1500, signal);
    metadata = await readMetadata(apiKey, metadata.name, signal);
  }
  if (metadata?.state !== 'ACTIVE' || !metadata?.uri) throw new Error(metadata?.error?.message || `Tệp Gemini ở trạng thái ${metadata?.state || 'không xác định'}.`);
  return metadata;
};

export const ensureGeminiProjectFile = async ({ project, apiKey, signal, onStatus }) => {
  if (project.mimeType !== 'application/pdf') return null;
  if (project.geminiFileName) {
    onStatus?.('Đang kiểm tra Gemini còn lưu PDF hay không...');
    const existing = await getActiveGeminiFile({ apiKey, fileName: project.geminiFileName, signal });
    if (existing) {
      onStatus?.(`Gemini còn lưu PDF; đang tái sử dụng tệp ${existing.name}, không gửi lại.`);
      return existing;
    }
    onStatus?.('Tệp Gemini đã hết hạn; đang gửi lại PDF...');
  } else {
    onStatus?.('Đang lưu PDF tạm trên Gemini để dùng lại khi chấm lại...');
  }
  if (!project.base64) throw new Error('Ứng dụng không còn dữ liệu PDF gốc để tải lên Gemini.');
  return uploadGeminiFile({
    apiKey, signal,
    blob: base64ToBlob(project.base64, project.mimeType),
    mimeType: project.mimeType,
    displayName: project.fileName || project.studentName || 'IFA Project PDF'
  });
};
