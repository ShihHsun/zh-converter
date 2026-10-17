const AppError = require('../utils/AppError');
const config = require('../config');
const { getConfigIds } = require('../services/converterService');

// 單一詞條的最大長度，避免過長的詞條拖慢轉換
const MAX_DICT_WORD_LENGTH = 50;

// ===== 共用的檢查函式：發現問題時回傳 AppError，沒問題回傳 null =====

// 由上往下檢查，遇到第一個錯誤就停止
function checkText(text) {
  if (text === undefined || text === null) {
    return new AppError('請輸入要轉換的文字', 400, 'TEXT_REQUIRED');
  }
  if (typeof text !== 'string') {
    return new AppError('文字格式錯誤', 400, 'TEXT_INVALID_TYPE');
  }
  // trim() 只用來判斷是不是空白，送去轉換的仍是原本的 text
  if (text.trim() === '') {
    return new AppError('請輸入要轉換的文字', 400, 'TEXT_EMPTY');
  }
  // 用 [...text].length 計算字數，emoji 和罕見字才不會被算成 2 個字
  if ([...text].length > config.maxTextLength) {
    return new AppError(
      `文字太長，請分段轉換（上限 ${config.maxTextLength.toLocaleString()} 字）`,
      413,
      'TEXT_TOO_LONG'
    );
  }
  return null;
}

function checkConfigId(configId) {
  const supported = getConfigIds();
  if (typeof configId !== 'string' || configId === '') {
    return new AppError(`缺少 config，可用的有：${supported.join(', ')}`, 400, 'INVALID_CONFIG');
  }
  if (!supported.includes(configId)) {
    return new AppError(
      `不支援的轉換設定「${configId}」，可用的有：${supported.join(', ')}`,
      400,
      'INVALID_CONFIG'
    );
  }
  return null;
}

// customDict 為選填；格式為 [['原詞', '目標詞'], ...]
function checkCustomDict(customDict) {
  if (customDict === undefined) return null;

  if (!Array.isArray(customDict)) {
    return new AppError('customDict 必須是陣列', 400, 'INVALID_CUSTOM_DICT');
  }
  if (customDict.length > config.maxCustomDictEntries) {
    return new AppError(
      `customDict 最多 ${config.maxCustomDictEntries} 組詞條`,
      400,
      'INVALID_CUSTOM_DICT'
    );
  }

  const isValidWord = (w) =>
    typeof w === 'string' && w.length > 0 && w.length <= MAX_DICT_WORD_LENGTH;

  const badIndex = customDict.findIndex(
    (entry) =>
      !Array.isArray(entry) || entry.length !== 2 || !isValidWord(entry[0]) || !isValidWord(entry[1])
  );
  if (badIndex !== -1) {
    return new AppError(
      `customDict 第 ${badIndex + 1} 組格式錯誤，應為 ["原詞", "目標詞"]，且每個詞 1～${MAX_DICT_WORD_LENGTH} 字`,
      400,
      'INVALID_CUSTOM_DICT'
    );
  }
  return null;
}

// ===== Middleware =====

// POST /api/convert：{ text, config, customDict? }
function validateConvert(req, res, next) {
  const { text, config: configId, customDict } = req.body || {};
  next(checkText(text) || checkConfigId(configId) || checkCustomDict(customDict) || undefined);
}

// POST /api/convert/compare：{ text, configs: [...], customDict? }
function validateCompare(req, res, next) {
  const { text, configs, customDict } = req.body || {};

  const textError = checkText(text);
  if (textError) return next(textError);

  if (!Array.isArray(configs) || configs.length === 0) {
    return next(new AppError('configs 必須是非空陣列', 400, 'INVALID_CONFIGS'));
  }
  if (configs.length > config.maxCompareConfigs) {
    return next(
      new AppError(`configs 最多 ${config.maxCompareConfigs} 個`, 400, 'INVALID_CONFIGS')
    );
  }
  if (new Set(configs).size !== configs.length) {
    return next(new AppError('configs 不可重複', 400, 'INVALID_CONFIGS'));
  }

  for (const configId of configs) {
    const configError = checkConfigId(configId);
    if (configError) return next(configError);
  }

  next(checkCustomDict(customDict) || undefined);
}

module.exports = { validateConvert, validateCompare };
