const AppError = require('../utils/AppError');

// 所有路由都沒匹配到時，會落到這裡，產生 404 錯誤
function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', '找不到這個路徑'));
}

module.exports = notFound;
