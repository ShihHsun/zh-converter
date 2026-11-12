const converterService = require('../services/converterService');
const fileService = require('../services/fileService');

// 控制器只負責：從 req 取值 → 呼叫 service → 組成回應
// 驗證已由 validateConvert 完成，錯誤會自動交給 errorHandler（Express 5 支援）
function convert(req, res) {
  const { text, direction = converterService.DEFAULT_DIRECTION } = req.body;
  const result = converterService.convert(text, direction);

  res.json({
    status: 'success',
    data: {
      result,
      direction,
      inputLength: [...text].length,
      outputLength: [...result].length,
    },
  });
}

// 轉換上傳的檔案，直接回傳轉好的檔案供下載
// 檔案已由 uploadFile 收進 req.file；副檔名、方向、編碼的檢查在 fileService 裡
function convertFile(req, res) {
  const { content, filename, inputLength, outputLength } = fileService.convertFileBuffer(
    req.file.buffer,
    req.file.originalname,
    req.body.direction
  );

  res.attachment(filename); // 讓瀏覽器以下載方式處理，並帶上檔名
  res.type('text/plain; charset=utf-8');
  res.set({
    'X-Input-Length': String(inputLength),
    'X-Output-Length': String(outputLength),
  });
  res.send(content);
}

// 列出支援的轉換方向，方便前端產生選單
function listDirections(req, res) {
  const directions = Object.entries(converterService.DIRECTIONS).map(([value, { label }]) => ({
    value,
    label,
  }));
  res.json({ status: 'success', data: directions });
}

module.exports = { convert, convertFile, listDirections };
