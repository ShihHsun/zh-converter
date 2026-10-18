const test = require('node:test');
const assert = require('node:assert/strict');
const fileService = require('../src/services/fileService');

test('.txt：轉換 UTF-8 文字並回傳 UTF-8 檔案', () => {
  const result = fileService.convertFileBuffer(Buffer.from('这个软件很好用', 'utf8'), 'article.txt');

  assert.equal(result.content.toString('utf8'), '這個軟體很好用');
  assert.equal(result.inputLength, 7);
  assert.equal(result.outputLength, 7);
  assert.match(result.filename, /^converted-\d+\.txt$/);
});

test('.txt：可解碼 GBK 檔案', () => {
  const input = Buffer.from([0xd5, 0xe2, 0xb8, 0xf6, 0xc8, 0xed, 0xbc, 0xfe]);
  const result = fileService.convertFileBuffer(input, 'article.txt');

  assert.equal(result.content.toString('utf8'), '這個軟體');
});

test('.txt：可解碼 UTF-8 BOM 與 UTF-16 BOM', () => {
  const utf8Bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('软件', 'utf8')]);
  const utf16Bom = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('软件', 'utf16le')]);

  assert.equal(fileService.convertFileBuffer(utf8Bom, 'utf8.txt').content.toString('utf8'), '軟體');
  assert.equal(fileService.convertFileBuffer(utf16Bom, 'utf16.txt').content.toString('utf8'), '軟體');
});

test('.txt：Big5 檔案以 Big5 解碼，不會被當成 GBK 變亂碼', () => {
  // 「這個軟體很好用」的 Big5 位元組
  const input = Buffer.from([
    0xb3, 0x6f, 0xad, 0xd3, 0xb3, 0x6e, 0xc5, 0xe9, 0xab, 0xdc, 0xa6, 0x6e, 0xa5, 0xce,
  ]);
  const result = fileService.convertFileBuffer(input, 'old.txt');

  assert.equal(result.content.toString('utf8'), '這個軟體很好用');
});

test('.txt：Big5 搭配 tw-to-cn 也使用正確解碼', () => {
  const input = Buffer.from([0xb3, 0x6e, 0xc5, 0xe9]);
  const result = fileService.convertFileBuffer(input, 'old.txt', 'tw-to-cn');

  assert.equal(result.content.toString('utf8'), '软件');
});

test('.txt：簡體 GBK 檔案不會被誤判為 Big5', () => {
  // 「资料库」的 GBK 位元組
  const result = fileService.convertFileBuffer(
    Buffer.from([0xd7, 0xca, 0xc1, 0xcf, 0xbf, 0xe2]),
    'a.txt'
  );

  assert.equal(result.content.toString('utf8'), '資料庫');
});

test('.srt：轉換字幕文字並原樣保留序號、時間軸與 CRLF 換行', () => {
  const input =
    '1\r\n00:00:01,000 --> 00:00:03,000\r\n这个软件很好用\r\n\r\n' +
    '2\r\n00:00:04,000 --> 00:00:06,000\r\n数据库默认设置\r\n';
  const expected =
    '1\r\n00:00:01,000 --> 00:00:03,000\r\n這個軟體很好用\r\n\r\n' +
    '2\r\n00:00:04,000 --> 00:00:06,000\r\n資料庫預設設定\r\n';
  const result = fileService.convertFileBuffer(Buffer.from(input, 'utf8'), 'captions.srt');

  assert.equal(result.content.toString('utf8'), expected);
  assert.match(result.filename, /^converted-\d+\.srt$/);
});

test('保留指定的轉換方向', () => {
  const result = fileService.convertFileBuffer(
    Buffer.from('軟體', 'utf8'),
    'article.txt',
    'tw-to-cn'
  );

  assert.equal(result.content.toString('utf8'), '软件');
});

test('不支援的副檔名會回傳 FILE_TYPE_UNSUPPORTED', () => {
  assert.throws(
    () => fileService.convertFileBuffer(Buffer.from('text'), 'article.pdf'),
    { code: 'FILE_TYPE_UNSUPPORTED', statusCode: 400 }
  );
});

test('空檔案與只有空白的檔案會回傳 FILE_EMPTY', () => {
  for (const input of [Buffer.alloc(0), Buffer.from(' \r\n\t', 'utf8')]) {
    assert.throws(() => fileService.convertFileBuffer(input, 'empty.txt'), {
      code: 'FILE_EMPTY',
      statusCode: 400,
    });
  }
});

test('無法以 UTF-8 或 GB18030 解碼的內容會回傳 FILE_ENCODING_UNSUPPORTED', () => {
  assert.throws(
    () => fileService.convertFileBuffer(Buffer.from([0x81]), 'invalid.txt'),
    { code: 'FILE_ENCODING_UNSUPPORTED', statusCode: 400 }
  );
});

test('不支援的轉換方向會回傳 DIRECTION_UNSUPPORTED', () => {
  assert.throws(
    () => fileService.convertFileBuffer(Buffer.from('你好', 'utf8'), 'article.txt', 'unknown'),
    { code: 'DIRECTION_UNSUPPORTED', statusCode: 400 }
  );
});

test('支援的副檔名檢查不區分大小寫', () => {
  assert.equal(fileService.isSupportedExtension('captions.SRT'), true);
  assert.equal(fileService.isSupportedExtension('article.TXT'), true);
  assert.equal(fileService.isSupportedExtension('article.pdf'), false);
});
