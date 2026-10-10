// 比較模式一次最多可勾選幾個設定（需與後端 MAX_COMPARE_CONFIGS 一致）
const MAX_COMPARE = 5;
// 比較模式預設勾選的設定
const DEFAULT_COMPARE = ['s2tw', 's2twp'];

// 取得畫面元素
const app = document.getElementById('app');
const form = document.getElementById('convert-form');
const configSelect = document.getElementById('config');
const compareConfigsBox = document.getElementById('compare-configs');
const compareCount = document.getElementById('compare-count');
const compareResults = document.getElementById('compare-results');
const input = document.getElementById('input');
const output = document.getElementById('output');
const customDictInput = document.getElementById('custom-dict');
const convertBtn = document.getElementById('convert-btn');
const copyBtn = document.getElementById('copy-btn');
const message = document.getElementById('message');

document.getElementById('compare-max').textContent = MAX_COMPARE;

// 設定代碼 → 顯示名稱，載入設定清單後填入
const configLabels = {};

// 顯示提示訊息；type 可為 'error'、'success' 或空字串
function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

// ===== 網址參數：讓目前的模式與設定可以分享或加入書籤 =====
// 單一轉換：?config=s2twp
// 比較模式：?mode=compare&configs=s2tw,s2twp

function readUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    mode: params.get('mode') === 'compare' ? 'compare' : 'single',
    config: params.get('config'),
    configs: params.get('configs')?.split(',').filter(Boolean) || null,
  };
}

function updateUrl() {
  // 設定代碼只含英數字，可以直接組字串，讓網址保持易讀（逗號不會被編碼成 %2C）
  const query =
    getMode() === 'compare'
      ? `?mode=compare&configs=${getCheckedConfigs().join(',')}`
      : `?config=${configSelect.value}`;
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

configSelect.addEventListener('change', updateUrl);

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

// ===== 載入設定清單 =====

// 從 API 取得轉換設定，同時產生「單一轉換」的下拉選單與「比較模式」的勾選清單
async function loadConfigs() {
  const state = readUrlState();
  let configs = [];

  try {
    const res = await fetch('/api/configs');
    const body = await res.json();
    if (body.success) configs = body.data;
  } catch {
    // 載入失敗時保留 HTML 中的預設選項
  }

  if (configs.length > 0) {
    configSelect.innerHTML = '';
    compareConfigsBox.innerHTML = '';

    const preselected = new Set((state.configs || DEFAULT_COMPARE).slice(0, MAX_COMPARE));

    for (const { id, label, experimental } of configs) {
      const text = experimental ? `${label}（試驗中）` : label;
      configLabels[id] = text;

      const option = document.createElement('option');
      option.value = id;
      option.textContent = text;
      configSelect.appendChild(option);

      const checkboxLabel = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = id;
      checkbox.checked = preselected.has(id);
      checkboxLabel.append(checkbox, text);
      compareConfigsBox.appendChild(checkboxLabel);
    }
  }

  if (state.config && configLabels[state.config]) {
    configSelect.value = state.config;
  }
  refreshCompareCheckboxes();
  setMode(state.mode);
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

// ===== 呼叫 API =====

// 送出 POST 請求；後端統一格式為成功時 success 為 true，失敗時帶 error.message
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || `請求失敗（${res.status}）`);
  }
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
      const data = await postJson('/api/convert', { ...payload, config: configSelect.value });
      output.value = data.result;
    }

    showMessage('轉換完成', 'success');
  } catch (err) {
    showMessage(err.message || '無法連線到伺服器', 'error');
  } finally {
    convertBtn.disabled = false;
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
    card.className = 'result-card';

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = configLabels[config] || config;

    const badge = document.createElement('span');
    badge.className = 'badge';
    if (isBaseline) badge.textContent = '基準';
    else if (diffCount === null) badge.textContent = '文字過長，未標示差異';
    else if (diffCount === 0) badge.textContent = '與基準相同';
    else badge.textContent = `與基準不同 ${diffCount} 處`;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'secondary copy';
    copy.textContent = '複製';
    copy.addEventListener('click', () => copyText(result));

    header.append(title, badge, copy);
    card.append(header, element);
    compareResults.appendChild(card);
  });
}

// ===== 複製 =====

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

loadConfigs();
