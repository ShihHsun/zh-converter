// 自訂錯誤類別：除了訊息外，還帶有 HTTP 狀態碼與錯誤代碼
// 用法：next(new AppError(400, 'TEXT_EMPTY', '請輸入要轉換的文字'))
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = AppError;
