// 自訂錯誤類別：除了訊息外，還帶有 HTTP 狀態碼與錯誤代碼
// 讓 errorHandler 能統一產生一致格式的錯誤回應
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = AppError;
