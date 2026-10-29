const OpenCC = require('opencc-js');
const { CUSTOM_RULES } = require('./customRules');

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

// 主畫面的兩個轉換方向，各自對應一個轉換設定
// 修正規則（customRules.js）以方向為單位撰寫，套用在對應的設定上
const DIRECTIONS = {
  'cn-to-tw': { config: 's2twp', label: '簡體 → 繁體（台灣用詞）' },
  'tw-to-cn': { config: 'tw2sp', label: '繁體 → 簡體' },
};

// 沒有指定方向時使用的預設值
const DEFAULT_DIRECTION = 'cn-to-tw';

const RULES_BY_CONFIG = Object.fromEntries(
  Object.entries(DIRECTIONS).map(([direction, { config }]) => [config, CUSTOM_RULES[direction] || []])
);

// 轉換器建立成本較高，採「第一次用到才建立」並快取，避免啟動時一次載入全部字典
const converterCache = new Map();

function getConverter(configId) {
  if (!converterCache.has(configId)) {
    const { from, to } = CONFIGS[configId];
    const baseConverter = OpenCC.Converter({ from, to });
    const fixRules = OpenCC.CustomConverter(RULES_BY_CONFIG[configId] || []);
    // 先用 opencc 轉換，再套用我們的修正規則
    converterCache.set(configId, (text) => fixRules(baseConverter(text)));
  }
  return converterCache.get(configId);
}

// 方向代碼（cn-to-tw）轉成設定代碼（s2twp）；本身就是設定代碼時原樣回傳
// 用 Object.hasOwn 避免 'toString' 這類原型上的屬性被當成合法代碼
function resolveConfigId(id) {
  if (Object.hasOwn(DIRECTIONS, id)) return DIRECTIONS[id].config;
  if (Object.hasOwn(CONFIGS, id)) return id;
  throw new Error(`不支援的轉換設定：${id}`);
}

// 回傳所有支援的設定代碼，供驗證使用
function getConfigIds() {
  return Object.keys(CONFIGS);
}

// 回傳所有支援的方向代碼，供驗證使用
function getSupportedDirections() {
  return Object.keys(DIRECTIONS);
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

// 執行轉換；id 可為方向代碼或設定代碼
// 正常情況下呼叫前已通過驗證，resolveConfigId 再加一層防呆
function convert(text, id, customDict = []) {
  const baseConverter = getConverter(resolveConfigId(id));
  const converted = baseConverter(text);

  if (customDict.length === 0) return converted;
  return applyCustomDict(converted, customDict, baseConverter);
}

module.exports = {
  CONFIGS,
  DIRECTIONS,
  DEFAULT_DIRECTION,
  getConfigIds,
  getSupportedDirections,
  listConfigs,
  convert,
};
