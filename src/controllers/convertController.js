const converterService = require('../services/converterService');

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

// 列出支援的轉換方向，方便前端產生選單
function listDirections(req, res) {
  const directions = Object.entries(converterService.DIRECTIONS).map(([value, { label }]) => ({
    value,
    label,
  }));
  res.json({ status: 'success', data: directions });
}

module.exports = { convert, listDirections };
