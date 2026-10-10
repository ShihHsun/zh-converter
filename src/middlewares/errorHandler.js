const AppError = require('../utils/AppError');

// 統一錯誤出口：Express 以「四個參數」辨識錯誤處理 middleware，所以 next 不可省略
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // express.json() 解析失敗時會丟出 type 為 entity.parse.failed 的錯誤
  if (err.type === 'entity.parse.failed') {
    err = new AppError('請求內容不是合法的 JSON', 400, 'INVALID_JSON');
  } else if (err.type === 'entity.too.large') {
    err = new AppError('請求內容過大', 413, 'PAYLOAD_TOO_LARGE');
  }

  // 預期中的錯誤（AppError）直接回傳訊息；非預期錯誤則隱藏細節，避免洩漏內部資訊
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  if (!isAppError) {
    console.error('[未預期錯誤]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: isAppError ? err.code : 'INTERNAL_ERROR',
      message: isAppError ? err.message : '伺服器發生錯誤',
    },
  });
}

module.exports = errorHandler;
