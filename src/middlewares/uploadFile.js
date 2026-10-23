const multer = require('multer');
const AppError = require('../utils/AppError');
const config = require('../config');

// 用 multer 接收 multipart/form-data 的 file 欄位
// 檔案只放在記憶體（req.file.buffer），不寫入硬碟
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize, files: 1 },
}).single('file');

// 把 multer 的錯誤轉成統一的錯誤格式
function toUploadError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const limitMB = config.maxFileSize / (1024 * 1024);
    return new AppError(413, 'FILE_TOO_LARGE', `檔案太大（上限 ${limitMB}MB）`);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError(400, 'FILE_TOO_MANY', '一次只能上傳一個檔案');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'FILE_FIELD_INVALID', '請用 file 欄位上傳檔案');
  }
  // 其他少見的上傳錯誤（例如表單欄位名稱太長）
  return new AppError(400, 'FILE_UPLOAD_INVALID', '檔案上傳失敗，請檢查上傳內容');
}

function uploadFile(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) return next(toUploadError(err));
    if (err) return next(err);

    if (!req.file) {
      return next(new AppError(400, 'FILE_REQUIRED', '請選擇要上傳的檔案'));
    }

    next();
  });
}

module.exports = uploadFile;
module.exports.toUploadError = toUploadError;
