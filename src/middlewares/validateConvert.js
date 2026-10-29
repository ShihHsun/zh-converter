const AppError = require('../utils/AppError');
const config = require('../config');
const { DEFAULT_DIRECTION, getSupportedDirections } = require('../services/converterService');

// 驗證 POST /api/convert 的請求內容
// 由上往下檢查，遇到第一個錯誤就停止，不合法時交給 errorHandler 統一回應
function validateConvert(req, res, next) {
  const { text, direction = DEFAULT_DIRECTION } = req.body || {};

  if (text === undefined || text === null) {
    return next(new AppError(400, 'TEXT_REQUIRED', '請輸入要轉換的文字'));
  }

  if (typeof text !== 'string') {
    return next(new AppError(400, 'TEXT_INVALID_TYPE', '文字格式錯誤'));
  }

  // trim() 只用來判斷是不是空白，送去轉換的仍是原本的 text
  if (text.trim() === '') {
    return next(new AppError(400, 'TEXT_EMPTY', '請輸入要轉換的文字'));
  }

  // 用 [...text].length 計算字數，emoji 和罕見字才不會被算成 2 個字
  if ([...text].length > config.maxTextLength) {
    return next(
      new AppError(
        413,
        'TEXT_TOO_LONG',
        `文字太長，請分段轉換（上限 ${config.maxTextLength.toLocaleString()} 字）`
      )
    );
  }

  if (!getSupportedDirections().includes(direction)) {
    return next(new AppError(400, 'DIRECTION_UNSUPPORTED', '不支援這個轉換方向'));
  }

  next();
}

module.exports = validateConvert;
