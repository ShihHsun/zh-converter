// 集中讀取環境變數，並提供預設值
// 其他模組一律從這裡取設定，不直接讀 process.env
require('dotenv').config({ quiet: true });

// 將字串轉為整數，失敗時回傳預設值
function toInt(value, defaultValue) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? defaultValue : n;
}

module.exports = {
  port: toInt(process.env.PORT, 3000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxTextLength: toInt(process.env.MAX_TEXT_LENGTH, 10000),
  maxCustomDictEntries: toInt(process.env.MAX_CUSTOM_DICT_ENTRIES, 100),
  maxCompareConfigs: toInt(process.env.MAX_COMPARE_CONFIGS, 5),
  maxFileSize: toInt(process.env.MAX_FILE_SIZE, 1024 * 1024), // 單位：位元組（預設 1MB）
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 30),
  },
};
