// 取得畫面元素
const form = document.getElementById('convert-form');
const directionSelect = document.getElementById('direction');
const input = document.getElementById('input');
const output = document.getElementById('output');
const convertBtn = document.getElementById('convert-btn');
const copyBtn = document.getElementById('copy-btn');
const message = document.getElementById('message');

// 顯示提示訊息；type 可為 'error'、'success' 或空字串
function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

// 從 API 載入支援的轉換方向；失敗時保留 HTML 中的預設選項
async function loadDirections() {
  try {
    const res = await fetch('/api/convert/directions');
    const body = await res.json();
    if (!body.success) return;

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
    const body = await res.json();

    // 後端統一格式：成功時 success 為 true，失敗時帶 error.message
    if (!res.ok || !body.success) {
      throw new Error(body.error?.message || `請求失敗（${res.status}）`);
    }

    output.value = body.data.result;
    showMessage('轉換完成', 'success');
  } catch (err) {
    showMessage(err.message || '無法連線到伺服器', 'error');
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

loadDirections();
