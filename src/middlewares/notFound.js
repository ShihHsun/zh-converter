const AppError = require('../utils/AppError');

// 所有路由都沒匹配到時，會落到這裡，產生 404 錯誤
function notFound(req, res, next) {
  next(new AppError(`找不到路徑：${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

module.exports = notFound;
