const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// 測試會連續送出很多請求，先把頻率上限調高，避免被限流擋下
// （要在載入 app 之前設定，config 才會讀到）
process.env.RATE_LIMIT_MAX = '1000';

const express = require('express');
const multer = require('multer');
const app = require('../src/app');
const createRateLimiter = require('../src/middlewares/rateLimiter');
const errorHandler = require('../src/middlewares/errorHandler');
const { toUploadError } = require('../src/middlewares/uploadFile');

const SAMPLES = path.join(__dirname, '..', 'docs', 'samples');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

// 送出 JSON 請求
function postJson(url, body) {
  return fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// 送出檔案上傳請求；files 是 [欄位名稱, 檔名, 內容] 的陣列
function postFile(files, fields = {}) {
  const form = new FormData();
  for (const [field, filename, content] of files) {
    form.append(field, new Blob([content]), filename);
  }
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return fetch(`${baseUrl}/api/convert/file`, { method: 'POST', body: form });
}

function sample(name) {
  return fs.readFileSync(path.join(SAMPLES, name));
}

// 確認錯誤回應的狀態碼與格式
async function assertError(res, statusCode, code) {
  assert.strictEqual(res.status, statusCode);
  const body = await res.json();
  assert.strictEqual(body.status, statusCode >= 500 ? 'error' : 'failed');
  assert.strictEqual(body.code, code);
  assert.strictEqual(typeof body.message, 'string');
}

// ===== GET /health =====
test('GET /health 回傳服務狀態', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok', service: 'zh-converter' });
});

// ===== GET /api/convert/directions =====
test('GET /api/convert/directions 回傳兩種轉換方向', async () => {
  const res = await fetch(`${baseUrl}/api/convert/directions`);
  const body = await res.json();
  assert.strictEqual(body.status, 'success');
  assert.deepStrictEqual(
    body.data.map((d) => d.value),
    ['cn-to-tw', 'tw-to-cn']
  );
});

// ===== POST /api/convert =====
test('文字轉換：沒帶方向時預設簡轉繁', async () => {
  const res = await postJson('/api/convert', { text: '这个软件' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), {
    status: 'success',
    data: { result: '這個軟體', direction: 'cn-to-tw', inputLength: 4, outputLength: 4 },
  });
});

test('文字轉換：繁轉簡', async () => {
  const res = await postJson('/api/convert', { text: '這個軟體', direction: 'tw-to-cn' });
  const body = await res.json();
  assert.strictEqual(body.data.result, '这个软件');
});

test('文字轉換：字數用實際看到的字計算（emoji 算 1 個字）', async () => {
  const res = await postJson('/api/convert', { text: '你好😀' });
  const body = await res.json();
  assert.strictEqual(body.data.inputLength, 3);
});

test('文字轉換的錯誤', async (t) => {
  await t.test('沒填 text → TEXT_REQUIRED', async () => {
    await assertError(await postJson('/api/convert', {}), 400, 'TEXT_REQUIRED');
  });
  await t.test('text 不是字串 → TEXT_INVALID_TYPE', async () => {
    await assertError(await postJson('/api/convert', { text: 123 }), 400, 'TEXT_INVALID_TYPE');
  });
  await t.test('text 只有空白 → TEXT_EMPTY', async () => {
    await assertError(await postJson('/api/convert', { text: '   ' }), 400, 'TEXT_EMPTY');
  });
  await t.test('方向不支援 → DIRECTION_UNSUPPORTED', async () => {
    const res = await postJson('/api/convert', { text: '你好', direction: 'abc' });
    await assertError(res, 400, 'DIRECTION_UNSUPPORTED');
  });
  await t.test('JSON 格式錯誤 → INVALID_JSON', async () => {
    await assertError(await postJson('/api/convert', '{ "text": '), 400, 'INVALID_JSON');
  });
  await t.test('超過 10,000 字 → TEXT_TOO_LONG', async () => {
    const res = await postJson('/api/convert', { text: '字'.repeat(10001) });
    await assertError(res, 413, 'TEXT_TOO_LONG');
  });
  await t.test('body 超過 100kb → PAYLOAD_TOO_LARGE', async () => {
    const res = await postJson('/api/convert', { text: 'a'.repeat(120000) });
    await assertError(res, 413, 'PAYLOAD_TOO_LARGE');
  });
});

// ===== POST /api/convert/file =====
test('檔案轉換：.srt 簡轉繁，時間軸不變，回傳檔案與字數標頭', async () => {
  const res = await postFile([['file', 'sample.srt', sample('sample.srt')]], {
    direction: 'cn-to-tw',
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /^attachment; filename=converted-\d+\.srt$/);
  assert.ok(Number(res.headers.get('x-input-length')) > 0);
  assert.ok(Number(res.headers.get('x-output-length')) > 0);

  const text = await res.text();
  assert.match(text, /00:00:01,000 --> 00:00:03,500/);
  assert.match(text, /這個軟體的預設設定在資料庫裡/);
});

test('檔案轉換：GBK 編碼的 .txt 也能正確讀取', async () => {
  const res = await postFile([['file', 'sample-gbk.txt', sample('sample-gbk.txt')]]);
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /這個軟體很好用/);
});

test('檔案轉換：Big5 編碼的 .txt 繁轉簡', async () => {
  const res = await postFile([['file', 'sample-big5.txt', sample('sample-big5.txt')]], {
    direction: 'tw-to-cn',
  });
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /这个软件很好用/);
});

test('檔案轉換的錯誤', async (t) => {
  await t.test('沒上傳檔案 → FILE_REQUIRED', async () => {
    await assertError(await postFile([], { direction: 'cn-to-tw' }), 400, 'FILE_REQUIRED');
  });
  await t.test('超過 1MB → FILE_TOO_LARGE', async () => {
    const big = Buffer.alloc(1024 * 1024 + 1, 'a');
    await assertError(await postFile([['file', 'big.txt', big]]), 413, 'FILE_TOO_LARGE');
  });
  await t.test('欄位名稱不是 file → FILE_FIELD_INVALID', async () => {
    const res = await postFile([['upload', 'sample.srt', sample('sample.srt')]]);
    await assertError(res, 400, 'FILE_FIELD_INVALID');
  });
  await t.test('一次傳兩個檔案 → FILE_TOO_MANY', async () => {
    const res = await postFile([
      ['file', 'sample.srt', sample('sample.srt')],
      ['file', 'sample-gbk.txt', sample('sample-gbk.txt')],
    ]);
    await assertError(res, 400, 'FILE_TOO_MANY');
  });
  await t.test('不是 .txt / .srt → FILE_TYPE_UNSUPPORTED', async () => {
    const res = await postFile([['file', 'a.pdf', 'hello']]);
    await assertError(res, 400, 'FILE_TYPE_UNSUPPORTED');
  });
  await t.test('方向不支援 → DIRECTION_UNSUPPORTED', async () => {
    const res = await postFile([['file', 'sample.srt', sample('sample.srt')]], { direction: 'abc' });
    await assertError(res, 400, 'DIRECTION_UNSUPPORTED');
  });
  await t.test('檔案只有空白 → FILE_EMPTY', async () => {
    const res = await postFile([['file', 'sample-empty.txt', sample('sample-empty.txt')]]);
    await assertError(res, 400, 'FILE_EMPTY');
  });
});

test('其他少見的上傳錯誤 → FILE_UPLOAD_INVALID', () => {
  for (const code of ['LIMIT_FIELD_KEY', 'LIMIT_FIELD_VALUE', 'LIMIT_PART_COUNT']) {
    const err = toUploadError(new multer.MulterError(code));
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.code, 'FILE_UPLOAD_INVALID');
  }
});

// ===== 其他 =====
test('不存在的路徑 → NOT_FOUND', async () => {
  await assertError(await fetch(`${baseUrl}/abc`), 404, 'NOT_FOUND');
});

test('請求太頻繁 → RATE_LIMITED', async () => {
  // 另外建一個上限只有 2 次的小 app 來測，不影響上面的測試
  const limited = express();
  limited.use(createRateLimiter({ windowMs: 60 * 1000, max: 2 }), (req, res) => res.json({ ok: true }));
  limited.use(errorHandler);
  const s = limited.listen(0);
  await new Promise((resolve) => s.once('listening', resolve));
  const url = `http://localhost:${s.address().port}`;

  try {
    await fetch(url);
    await fetch(url);
    await assertError(await fetch(url), 429, 'RATE_LIMITED');
  } finally {
    s.close();
  }
});
