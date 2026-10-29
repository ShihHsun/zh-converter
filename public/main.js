// 比較模式一次最多可勾選幾個設定（需與後端 MAX_COMPARE_CONFIGS 一致）
const MAX_COMPARE = 5;
// 比較模式預設勾選的設定
const DEFAULT_COMPARE = ['s2tw', 's2twp'];

// 取得畫面元素
const app = document.getElementById('app');
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
const swapBtn = document.getElementById('swap-btn');
const bridge = document.querySelector('.bridge');
const customDictInput = document.getElementById('custom-dict');

const compareConfigsBox = document.getElementById('compare-configs');
const compareCount = document.getElementById('compare-count');
const compareResults = document.getElementById('compare-results');

const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const fileConvertBtn = document.getElementById('file-convert-btn');
const fileDownloadBtn = document.getElementById('file-download-btn');
const fileMessage = document.getElementById('file-message');
const fileInfo = document.getElementById('file-info');

const ALLOWED_EXTENSIONS = ['.txt', '.srt'];

// 各轉換方向在卡片上顯示的徽章、語言名稱與原文欄提示文字
const DIRECTION_LABELS = {
  'cn-to-tw': {
    source: ['简', '简体中文'],
    target: ['繁', '繁體中文（台灣）'],
    placeholder: '请输入要转换的文字…',
  },
  'tw-to-cn': {
    source: ['繁', '繁體中文（台灣）'],
    target: ['简', '简体中文'],
    placeholder: '請輸入要轉換的文字…',
  },
};

// 檔案轉換結果：{ blob, filename }，尚未轉換或已失效時為 null
let fileResult = null;

// 設定代碼 → 顯示名稱，載入設定清單後填入
const configLabels = {};

document.getElementById('compare-max').textContent = MAX_COMPARE;

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

// 依目前的轉換方向更新卡片標籤與配色；未知的方向保持目前的標籤不變
function applyDirection() {
  const labels = DIRECTION_LABELS[directionSelect.value];
  if (!labels) return;

  document.body.dataset.direction = directionSelect.value;
  for (const role of ['source', 'target']) {
    const [badge, name] = labels[role];
    document.querySelector(`[data-role="${role}-badge"]`).textContent = badge;
    document.querySelector(`[data-role="${role}-name"]`).textContent = name;
  }
  input.placeholder = labels.placeholder;
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

// ===== 網址參數：讓目前的模式與設定可以分享或加入書籤 =====
// 單一轉換：?direction=cn-to-tw
// 比較模式：?mode=compare&configs=s2tw,s2twp

function readUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    mode: params.get('mode') === 'compare' ? 'compare' : 'single',
    direction: params.get('direction'),
    configs: params.get('configs')?.split(',').filter(Boolean) || null,
  };
}

function updateUrl() {
  // 代碼只含英數字與連字號，可以直接組字串，讓網址保持易讀（逗號不會被編碼成 %2C）
  const query =
    getMode() === 'compare'
      ? `?mode=compare&configs=${getCheckedConfigs().join(',')}`
      : `?direction=${directionSelect.value}`;
  history.replaceState(null, '', query); // 只改網址，不重新載入頁面
}

// ===== 模式切換 =====

function getMode() {
  return app.dataset.mode;
}

function setMode(mode) {
  app.dataset.mode = mode; // CSS 依此值顯示或隱藏對應區塊
  form.elements.mode.value = mode;
  showMessage('');
}

form.elements.mode.forEach((radio) => {
  radio.addEventListener('change', () => {
    setMode(radio.value);
    updateUrl();
  });
});

// ===== 比較模式：設定勾選 =====

function getCheckedConfigs() {
  return [...compareConfigsBox.querySelectorAll('input:checked')].map((cb) => cb.value);
}

// 更新計數，並在達到上限時停用其餘未勾選的選項
function refreshCompareCheckboxes() {
  const checked = getCheckedConfigs();
  compareCount.textContent = checked.length;
  for (const cb of compareConfigsBox.querySelectorAll('input')) {
    cb.disabled = !cb.checked && checked.length >= MAX_COMPARE;
  }
}

compareConfigsBox.addEventListener('change', () => {
  refreshCompareCheckboxes();
  updateUrl();
});

// 從 API 取得轉換設定，產生「比較模式」的勾選清單
async function loadConfigs(state) {
  let configs = [];

  try {
    const res = await fetch('/api/configs');
    const body = await res.json();
    if (res.ok && body.status === 'success') configs = body.data;
  } catch {
    // 載入失敗時清單維持空白，送出時會提示至少勾選 2 個設定
  }

  const preselected = new Set((state.configs || DEFAULT_COMPARE).slice(0, MAX_COMPARE));
  compareConfigsBox.innerHTML = '';

  for (const { id, label, experimental } of configs) {
    const text = experimental ? `${label}（試驗中）` : label;
    configLabels[id] = text;

    const checkboxLabel = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = id;
    checkbox.checked = preselected.has(id);
    checkboxLabel.append(checkbox, text);
    compareConfigsBox.appendChild(checkboxLabel);
  }

  refreshCompareCheckboxes();
}

// ===== 自訂詞庫 =====

// 將自訂詞庫文字解析成 [['原詞', '目標詞'], ...]
// 每行一組，以空白分隔；空行略過，格式不對的行回報行號
function parseCustomDict(text) {
  const dict = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 2) {
      throw new Error(`自訂詞庫第 ${i + 1} 行格式錯誤，應為「原詞 目標詞」`);
    }
    dict.push(parts);
  }
  return dict;
}

// ===== 文字轉換 =====

input.addEventListener('input', () => {
  setCount(inputCount, countChars(input.value));
});

// 送出 POST 請求；後端統一格式：成功時為 { status: 'success', data }
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));

  const body = await res.json();
  if (body.status !== 'success') throw new Error(body.message || '轉換失敗');
  return body.data;
}

// 送出表單：依目前模式呼叫不同的 API
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // 阻止表單預設的整頁重新載入

  const text = input.value;
  if (text.trim() === '') {
    showMessage('請先輸入文字', 'error');
    return;
  }

  convertBtn.disabled = true;
  bridge.classList.add('is-busy');
  showMessage('轉換中…');

  try {
    const payload = { text };
    const customDict = parseCustomDict(customDictInput.value);
    if (customDict.length > 0) payload.customDict = customDict;

    if (getMode() === 'compare') {
      const configs = getCheckedConfigs();
      if (configs.length < 2) {
        throw new Error('比較模式請至少勾選 2 個設定');
      }
      const data = await postJson('/api/convert/compare', { ...payload, configs });
      renderCompareResults(data.results);
    } else {
      const data = await postJson('/api/convert', { ...payload, direction: directionSelect.value });
      output.value = data.result;
      setCount(inputCount, data.inputLength);
      setCount(outputCount, data.outputLength);
    }

    showMessage('轉換完成', 'success');
  } catch (err) {
    // fetch 本身失敗（伺服器沒開、斷線）時是 TypeError
    showMessage(err instanceof TypeError ? '無法連線到伺服器' : err.message, 'error');
  } finally {
    convertBtn.disabled = false;
    bridge.classList.remove('is-busy');
  }
});

// ===== 比較模式：差異標示 =====

// 逐字比較 base 與 other，回傳一個陣列，標記 other 的每個字是否與 base 不同
// - 長度相同（最常見，簡繁轉換多半一字對一字）：同位置逐字比對
// - 長度不同（例如「U盘」→「隨身碟」）：用最長共同子序列（LCS）找出相同的字
// - 文字太長時 LCS 太耗資源，回傳 null 表示不標示
// 用 Array.from 拆字，避免罕用字（兩個 UTF-16 單位）被拆成兩半
function diffMask(base, other) {
  const a = Array.from(base);
  const b = Array.from(other);

  if (a.length === b.length) {
    return b.map((ch, i) => ch !== a[i]);
  }

  const n = a.length;
  const m = b.length;
  if (n * m > 1_000_000) return null;

  // dp[i][j]：a 的前 i 字與 b 的前 j 字的 LCS 長度，以一維陣列存放
  const width = m + 1;
  const dp = new Uint16Array((n + 1) * width);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i * width + j] =
        a[i - 1] === b[j - 1]
          ? dp[(i - 1) * width + (j - 1)] + 1
          : Math.max(dp[(i - 1) * width + j], dp[i * width + (j - 1)]);
    }
  }

  // 從表格右下角往回走，屬於 LCS 的字標為「相同」，其餘為「不同」
  const mask = new Array(m).fill(true);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      mask[j - 1] = false;
      i--;
      j--;
    } else if (dp[(i - 1) * width + j] >= dp[i * width + (j - 1)]) {
      i--;
    } else {
      j--;
    }
  }
  return mask;
}

// 依差異標記組出結果段落；不同的字用 <mark> 包起來
// 一律用 textContent 放入文字，避免使用者輸入的內容被當成 HTML 執行
function buildHighlightedText(text, mask) {
  const pre = document.createElement('pre');
  pre.className = 'result-text';

  if (!mask) {
    pre.textContent = text;
    return { element: pre, diffCount: null };
  }

  const chars = Array.from(text);
  let diffCount = 0;
  let i = 0;

  // 將連續相同狀態的字合併成一段，減少 DOM 節點數量
  while (i < chars.length) {
    const isDiff = mask[i];
    let j = i;
    while (j < chars.length && mask[j] === isDiff) j++;

    const segment = chars.slice(i, j).join('');
    if (isDiff) {
      const mark = document.createElement('mark');
      mark.textContent = segment;
      pre.appendChild(mark);
      diffCount++;
    } else {
      pre.appendChild(document.createTextNode(segment));
    }
    i = j;
  }
  return { element: pre, diffCount };
}

// 產生比較結果卡片；第一個設定作為基準，其他設定與它比較
function renderCompareResults(results) {
  compareResults.innerHTML = '';
  const baseline = results[0].result;

  results.forEach(({ config, result }, index) => {
    const isBaseline = index === 0;
    const mask = isBaseline ? new Array(Array.from(result).length).fill(false) : diffMask(baseline, result);
    const { element, diffCount } = buildHighlightedText(result, mask);

    const card = document.createElement('article');
    card.className = 'card result-card';

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = configLabels[config] || config;

    const status = document.createElement('span');
    status.className = 'diff-status';
    if (isBaseline) status.textContent = '基準';
    else if (diffCount === null) status.textContent = '文字過長，未標示差異';
    else if (diffCount === 0) status.textContent = '與基準相同';
    else status.textContent = `與基準不同 ${diffCount} 處`;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'secondary copy';
    copy.textContent = '複製';
    copy.addEventListener('click', () => copyText(result));

    header.append(title, status, copy);
    card.append(header, element);
    compareResults.appendChild(card);
  });
}

// 對調轉換方向；已有結果時把結果搬到原文欄，方便直接再轉回去
swapBtn.addEventListener('click', () => {
  const options = [...directionSelect.options];
  if (options.length < 2) return;

  const next = (directionSelect.selectedIndex + 1) % options.length;
  directionSelect.selectedIndex = next;
  // 觸發 change，讓卡片標籤與檔案轉換結果一併更新
  directionSelect.dispatchEvent(new Event('change'));

  if (output.value) {
    input.value = output.value;
    output.value = '';
    setCount(inputCount, countChars(input.value));
    setCount(outputCount, 0);
    showMessage('');
  }
});

// 複製文字到剪貼簿；單一轉換的結果與比較模式的每張卡片共用
async function copyText(text) {
  if (!text) {
    showMessage('目前沒有可複製的結果', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showMessage('已複製到剪貼簿', 'success');
  } catch {
    showMessage('複製失敗，請手動選取文字', 'error');
  }
}

copyBtn.addEventListener('click', () => copyText(output.value));

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
  applyDirection();
  updateUrl();
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

// 初始化：先載入選單，再依網址參數還原模式與設定
async function init() {
  const state = readUrlState();
  await Promise.all([loadDirections(), loadConfigs(state)]);

  if (state.direction && [...directionSelect.options].some((o) => o.value === state.direction)) {
    directionSelect.value = state.direction;
  }
  applyDirection();
  setMode(state.mode);
}

init();
