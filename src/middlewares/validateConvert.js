const AppError = require('../utils/AppError');
const config = require('../config');
const { getSupportedDirections } = require('../services/converterService');

// 驗證 POST /api/convert 的請求內容
// 不合法時丟出 AppError，交由 errorHandler 統一回應
function validateConvert(req, res, next) {
  const { text, direction } = req.body || {};

  if (typeof text !== 'string' || text.trim() === '') {
    return next(new AppError('text 必須是非空字串', 400, 'INVALID_TEXT'));
  }

  if (text.length > config.maxTextLength) {
    return next(
      new AppError(`text 長度不可超過 ${config.maxTextLength} 字`, 400, 'TEXT_TOO_LONG')
    );
  }

  const supported = getSupportedDirections();
  if (!supported.includes(direction)) {
    return next(
      new AppError(
        `direction 必須是以下其中之一：${supported.join(', ')}`,
        400,
        'INVALID_DIRECTION'
      )
    );
  }

  next();
}

module.exports = validateConvert;
