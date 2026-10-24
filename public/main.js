// 取得畫面元素
const form = document.getElementById('convert-form');
const directionSelect = document.getElementById('direction');
const input = document.getElementById('input');
const output = document.getElementById('output');
const inputCount = document.getElementById('input-count');
const outputCount = document.getElementById('output-count');
const convertBtn = document.getElementById('convert-btn');
const copyBtn = document.getElementById('copy-btn');
const clearBtn = document.getElementById('clear-btn');
const message = document.getElementById('message');

const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const fileConvertBtn = document.getElementById('file-convert-btn');
const fileDownloadBtn = document.getElementById('file-download-btn');
const fileMessage = document.getElementById('file-message');
const fileInfo = document.getElementById('file-info');

const ALLOWED_EXTENSIONS = ['.txt', '.srt'];

// 檔案轉換結果：{ blob, filename }，尚未轉換或已失效時為 null
let fileResult = null;

// 顯示提示訊息；type 可為 'error'、'success' 或空字串
function setMessage(el, text, type = '') {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function showMessage(text, type) {
  setMessage(message, text, type);
}

function showFileMessage(text, type) {
  setMessage(fileMessage, text, type);
}

// 用 [...text].length 計算字數，和後端算法一致（emoji、罕見字算 1 個字）
function countChars(text) {
  return [...text].length;
}

function setCount(el, n) {
  el.textContent = `${Number(n).toLocaleString()} 字`;
}

// 取得副檔名（含點、轉小寫），沒有副檔名時回傳空字串
function getExtension(name) {
  const lastDot = name.lastIndexOf('.');
  return lastDot === -1 ? '' : name.slice(lastDot).toLowerCase();
}

// 從失敗的回應取出後端的錯誤訊息：{ status: 'failed' | 'error', code, message }
// 回應不是 JSON 時（例如伺服器沒回應），改顯示狀態碼
async function readError(res) {
  try {
    const body = await res.json();
    if (body.message) return body.message;
  } catch {
    // 不是 JSON，使用下方的預設訊息
  }
  return `請求失敗（${res.status}）`;
}

// 從 Content-Disposition 解析下載檔名，優先使用 filename*（UTF-8 編碼）
function parseFilename(header) {
  if (!header) return null;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1]);
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

// 從 API 載入支援的轉換方向；失敗時保留 HTML 中的預設選項
async function loadDirections() {
  try {
    const res = await fetch('/api/convert/directions');
    const body = await res.json();
    if (!res.ok || body.status !== 'success') return;

    directionSelect.innerHTML = '';
    for (const { value, label } of body.data) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      directionSelect.appendChild(option);
    }
  } catch {
    // 忽略錯誤，使用預設選項
  }
}

// ===== 文字轉換 =====

input.addEventListener('input', () => {
  setCount(inputCount, countChars(input.value));
});

// 送出表單：呼叫 POST /api/convert 並更新畫面
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // 阻止表單預設的整頁重新載入

  const text = input.value;
  if (text.trim() === '') {
    showMessage('請先輸入文字', 'error');
    return;
  }

  convertBtn.disabled = true;
  showMessage('轉換中…');

  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, direction: directionSelect.value }),
    });

    if (!res.ok) throw new Error(await readError(res));

    // 後端統一格式：成功時為 { status: 'success', data }
    const body = await res.json();
    if (body.status !== 'success') throw new Error(body.message || '轉換失敗');

    const { result, inputLength, outputLength } = body.data;
    output.value = result;
    setCount(inputCount, inputLength);
    setCount(outputCount, outputLength);
    showMessage('轉換完成', 'success');
  } catch (err) {
    // fetch 本身失敗（伺服器沒開、斷線）時是 TypeError
    showMessage(err instanceof TypeError ? '無法連線到伺服器' : err.message, 'error');
  } finally {
    convertBtn.disabled = false;
  }
});

// 複製結果到剪貼簿
copyBtn.addEventListener('click', async () => {
  if (!output.value) {
    showMessage('目前沒有可複製的結果', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(output.value);
    showMessage('已複製到剪貼簿', 'success');
  } catch {
    showMessage('複製失敗，請手動選取文字', 'error');
  }
});

// 清除原文與結果
clearBtn.addEventListener('click', () => {
  input.value = '';
  output.value = '';
  setCount(inputCount, 0);
  setCount(outputCount, 0);
  showMessage('');
  input.focus();
});

// ===== 檔案轉換 =====

// 清掉上一次的轉換結果；換檔或換方向後，舊結果已和目前設定不符
function resetFileResult() {
  fileResult = null;
  fileDownloadBtn.disabled = true;
  fileInfo.textContent = '';
}

fileInput.addEventListener('change', () => {
  resetFileResult();
  const file = fileInput.files[0];

  if (!file) {
    fileName.textContent = '尚未選擇檔案';
    fileConvertBtn.disabled = true;
    showFileMessage('');
    return;
  }

  fileName.textContent = file.name;

  // 先在前端擋掉不支援的副檔名，後端仍會再檢查一次
  if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
    fileConvertBtn.disabled = true;
    showFileMessage('只支援 .txt、.srt 檔案', 'error');
    return;
  }

  fileConvertBtn.disabled = false;
  showFileMessage('');
});

directionSelect.addEventListener('change', () => {
  if (fileResult) {
    resetFileResult();
    showFileMessage('轉換方向已變更，請重新轉換檔案');
  }
});

// 上傳檔案：呼叫 POST /api/convert/file，成功時回應本身就是轉好的檔案
fileConvertBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  resetFileResult();
  fileConvertBtn.disabled = true;
  showFileMessage('轉換中…');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('direction', directionSelect.value);

  try {
    // 不要自己設定 Content-Type，瀏覽器會自動帶上 multipart 的 boundary
    const res = await fetch('/api/convert/file', { method: 'POST', body: formData });

    if (!res.ok) throw new Error(await readError(res));

    const blob = await res.blob();
    const filename =
      parseFilename(res.headers.get('Content-Disposition')) ||
      `converted${getExtension(file.name)}`;

    fileResult = { blob, filename };
    fileDownloadBtn.disabled = false;

    const inputLength = Number(res.headers.get('X-Input-Length') || 0);
    const outputLength = Number(res.headers.get('X-Output-Length') || 0);
    fileInfo.textContent = `輸出檔名：${filename}　字數：${inputLength.toLocaleString()} → ${outputLength.toLocaleString()}`;
    showFileMessage('轉換完成，可以下載結果', 'success');
  } catch (err) {
    showFileMessage(err instanceof TypeError ? '無法連線到伺服器' : err.message, 'error');
  } finally {
    fileConvertBtn.disabled = false;
  }
});

// 下載轉換結果：用暫時的連結觸發瀏覽器下載
fileDownloadBtn.addEventListener('click', () => {
  if (!fileResult) return;

  const url = URL.createObjectURL(fileResult.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileResult.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

loadDirections();
