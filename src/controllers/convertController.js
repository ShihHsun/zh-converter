const converterService = require('../services/converterService');

// 控制器只負責：從 req 取值 → 呼叫 service → 組成回應
// 驗證已由 validateConvert 完成，錯誤會自動交給 errorHandler（Express 5 支援）
function convert(req, res) {
  const { text, direction } = req.body;
  const result = converterService.convert(text, direction);

  res.json({
    success: true,
    data: { direction, original: text, result },
  });
}

// 列出支援的轉換方向，方便前端產生選單
function listDirections(req, res) {
  const directions = Object.entries(converterService.DIRECTIONS).map(([value, { label }]) => ({
    value,
    label,
  }));
  res.json({ success: true, data: directions });
}

module.exports = { convert, listDirections };
