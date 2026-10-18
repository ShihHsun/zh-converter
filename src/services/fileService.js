const { TextDecoder } = require('node:util');
const AppError = require('../utils/AppError');
const converterService = require('./converterService');

const ALLOWED_EXTENSIONS = ['.txt', '.srt'];
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16_LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16_BE_BOM = Buffer.from([0xfe, 0xff]);

const SRT_INDEX_LINE = /^\s*\d+\s*$/;
const SRT_TIME_LINE =
  /^\s*\d{2,}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{2,}:\d{2}:\d{2}[,.]\d{1,3}(?:\s+.*)?\s*$/;

function unsupportedEncodingError() {
  return new AppError(
    400,
    'FILE_ENCODING_UNSUPPORTED',
    '無法辨識檔案編碼，請另存為 UTF-8 或 GBK 後再上傳'
  );
}

function decode(buffer, encoding) {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(buffer);
  } catch {
    throw unsupportedEncodingError();
  }
}

// GB18030 幾乎能解碼任何位元組，Big5 檔案不會報錯而會變亂碼，所以先用位元組範圍判斷
// Big5 證據：前導 A4–AF（GB2312 在此為符號、Big5 為最常用字）或後導 40–7E（GB2312 不會出現）
// GBK 證據：前導 C9–F7（簡體常用字，Big5 較少用）
// 只有 Big5 證據嚴格較多時才選 Big5，平手維持 GB18030；字數極少時仍可能誤判
function looksLikeBig5(buffer) {
  let big5Score = 0;
  let gbkScore = 0;

  for (let i = 0; i < buffer.length - 1; i += 1) {
    const lead = buffer[i];
    if (lead < 0x81 || lead > 0xfe) continue;

    const trail = buffer[i + 1];
    i += 1;

    if ((lead >= 0xa4 && lead <= 0xaf) || (trail >= 0x40 && trail <= 0x7e)) big5Score += 1;
    if (lead >= 0xc9 && lead <= 0xf7 && trail >= 0xa1) gbkScore += 1;
  }

  if (big5Score <= gbkScore) return false;

  try {
    new TextDecoder('big5', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function decodeBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError(400, 'FILE_INVALID', '檔案內容格式錯誤');
  }

  if (buffer.subarray(0, 2).equals(UTF16_LE_BOM)) {
    return decode(buffer.subarray(2), 'utf-16le');
  }

  if (buffer.subarray(0, 2).equals(UTF16_BE_BOM)) {
    return decode(buffer.subarray(2), 'utf-16be');
  }

  const content = buffer.subarray(buffer.subarray(0, 3).equals(UTF8_BOM) ? 3 : 0);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return decode(content, looksLikeBig5(content) ? 'big5' : 'gb18030');
  }
}

function getExtension(originalName = '') {
  const lastDot = originalName.lastIndexOf('.');
  return lastDot === -1 ? '' : originalName.slice(lastDot).toLowerCase();
}

function isSupportedExtension(originalName) {
  return ALLOWED_EXTENSIONS.includes(getExtension(originalName));
}

function buildOutputFilename(originalName) {
  return `converted-${Date.now()}${getExtension(originalName)}`;
}

function convertSrt(text, direction, convert = converterService.convert) {
  return text
    .split(/(\r\n|\n|\r)/)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      if (part === '' || SRT_INDEX_LINE.test(part) || SRT_TIME_LINE.test(part)) return part;
      return convert(part, direction);
    })
    .join('');
}

function convertFileBuffer(buffer, originalName, direction = converterService.DEFAULT_DIRECTION) {
  const extension = getExtension(originalName);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new AppError(400, 'FILE_TYPE_UNSUPPORTED', '只支援 .txt、.srt 檔案');
  }

  if (!converterService.getSupportedDirections().includes(direction)) {
    throw new AppError(400, 'DIRECTION_UNSUPPORTED', '不支援這個轉換方向');
  }

  const text = decodeBuffer(buffer);
  if (text.trim() === '') {
    throw new AppError(400, 'FILE_EMPTY', '檔案沒有可轉換的文字');
  }

  const result =
    extension === '.srt'
      ? convertSrt(text, direction)
      : converterService.convert(text, direction);

  return {
    content: Buffer.from(result, 'utf8'),
    filename: buildOutputFilename(originalName),
    inputLength: [...text].length,
    outputLength: [...result].length,
  };
}

module.exports = {
  ALLOWED_EXTENSIONS,
  decodeBuffer,
  getExtension,
  isSupportedExtension,
  buildOutputFilename,
  convertSrt,
  convertFileBuffer,
};
