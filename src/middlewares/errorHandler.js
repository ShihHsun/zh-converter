const AppError = require('../utils/AppError');

// 統一錯誤出口：Express 以「四個參數」辨識錯誤處理 middleware，所以 next 不可省略
// 回應格式：{ status: 'failed' | 'error', code, message }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // express.json() 解析失敗或 body 太大時，丟出的錯誤會帶 type
  if (err.type === 'entity.parse.failed') {
    err = new AppError(400, 'INVALID_JSON', '請求格式錯誤，請送出 JSON');
  } else if (err.type === 'entity.too.large') {
    err = new AppError(413, 'PAYLOAD_TOO_LARGE', '送出的資料太大');
  }

  // 預期中的錯誤（使用者的錯）→ failed
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'failed',
      code: err.code,
      message: err.message,
    });
    return;
  }

  // 非預期錯誤（伺服器的錯）→ error；完整錯誤只印在 log，不回傳細節給使用者
  console.error('[未預期錯誤]', err);
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: '系統發生錯誤，請稍後再試',
  });
}

module.exports = errorHandler;
