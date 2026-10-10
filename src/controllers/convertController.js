const converterService = require('../services/converterService');

// 控制器只負責：從 req 取值 → 呼叫 service → 組成回應
// 驗證已由 validateConvert 完成，錯誤會自動交給 errorHandler（Express 5 支援）

// POST /api/convert：用單一設定轉換
function convert(req, res) {
  const { text, config, customDict } = req.body;
  const result = converterService.convert(text, config, customDict);

  res.json({
    success: true,
    data: { config, original: text, result },
  });
}

// POST /api/convert/compare：同一段文字用多個設定轉換，方便比較差異
function compare(req, res) {
  const { text, configs, customDict } = req.body;
  const results = configs.map((config) => ({
    config,
    result: converterService.convert(text, config, customDict),
  }));

  res.json({
    success: true,
    data: { original: text, results },
  });
}

// GET /api/configs：列出所有支援的轉換設定
function listConfigs(req, res) {
  res.json({ success: true, data: converterService.listConfigs() });
}

module.exports = { convert, compare, listConfigs };
