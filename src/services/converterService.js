const OpenCC = require('opencc-js');

// 支援的轉換設定，代碼沿用 OpenCC 官方命名（例如 s2twp.json → s2twp）
// opencc-js 的地區代碼：cn 簡體、t OpenCC 標準繁體、tw 台灣、hk 香港、jp 日文新字體
// 結尾帶 p 的（twp、hkp）代表「連同地域用詞一起轉換」，例如「软件」→「軟體」
const CONFIGS = {
  // 簡體 → 繁體
  s2t: { from: 'cn', to: 't', label: '簡體 → OpenCC 標準繁體' },
  s2tw: { from: 'cn', to: 'tw', label: '簡體 → 台灣正體' },
  s2twp: { from: 'cn', to: 'twp', label: '簡體 → 台灣正體（轉換地域用詞）' },
  s2hk: { from: 'cn', to: 'hk', label: '簡體 → 香港繁體' },
  s2hkp: { from: 'cn', to: 'hkp', label: '簡體 → 香港繁體（轉換地域用詞）' },

  // 繁體 → 簡體
  t2s: { from: 't', to: 'cn', label: 'OpenCC 標準繁體 → 簡體' },
  tw2s: { from: 'tw', to: 'cn', label: '台灣正體 → 簡體' },
  tw2sp: { from: 'twp', to: 'cn', label: '台灣正體 → 簡體（轉換地域用詞）' },
  hk2s: { from: 'hk', to: 'cn', label: '香港繁體 → 簡體' },
  hk2sp: { from: 'hkp', to: 'cn', label: '香港繁體 → 簡體（轉換地域用詞）' },

  // 繁體之間的異體字轉換
  t2tw: { from: 't', to: 'tw', label: 'OpenCC 標準繁體 → 台灣正體' },
  tw2t: { from: 'tw', to: 't', label: '台灣正體 → OpenCC 標準繁體' },
  t2hk: { from: 't', to: 'hk', label: 'OpenCC 標準繁體 → 香港繁體' },
  hk2t: { from: 'hk', to: 't', label: '香港繁體 → OpenCC 標準繁體' },

  // 日文字體（探索性質）
  t2jp: { from: 't', to: 'jp', label: '日文舊字體 → 日文新字體', experimental: true },
  jp2t: { from: 'jp', to: 't', label: '日文新字體 → 日文舊字體', experimental: true },
};

// 轉換器建立成本較高，採「第一次用到才建立」並快取，避免啟動時一次載入全部字典
const converterCache = new Map();

function getConverter(configId) {
  if (!converterCache.has(configId)) {
    const { from, to } = CONFIGS[configId];
    converterCache.set(configId, OpenCC.Converter({ from, to }));
  }
  return converterCache.get(configId);
}

// 回傳所有支援的設定代碼，供驗證使用
function getConfigIds() {
  return Object.keys(CONFIGS);
}

// 回傳給前端顯示用的設定清單
function listConfigs() {
  return Object.entries(CONFIGS).map(([id, { from, to, label, experimental }]) => ({
    id,
    from,
    to,
    label,
    experimental: Boolean(experimental),
  }));
}

// 套用自訂詞庫
// 使用者以「原文寫法」填寫詞條（例如 ['鼠标', '滑鼠']），但自訂詞庫是套在「轉換後的結果」上，
// 所以先把每個原詞用同一個設定轉換一次（'鼠标' → '鼠標'），才能在結果中對上；目標詞則保持原樣
function applyCustomDict(converted, customDict, baseConverter) {
  const normalizedDict = customDict.map(([source, target]) => [baseConverter(source), target]);
  return OpenCC.CustomConverter(normalizedDict)(converted);
}

// 執行轉換；呼叫前應已通過驗證，這裡不再重複檢查
function convert(text, configId, customDict = []) {
  const baseConverter = getConverter(configId);
  const converted = baseConverter(text);

  if (customDict.length === 0) return converted;
  return applyCustomDict(converted, customDict, baseConverter);
}

module.exports = { getConfigIds, listConfigs, convert };
