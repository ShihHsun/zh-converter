const OpenCC = require('opencc-js');
const { CUSTOM_RULES } = require('./customRules');

// 支援的轉換方向與對應的 opencc-js 設定
// cn：簡體中文、tw：台灣正體、twp：台灣正體（含慣用詞轉換，如「软件」→「軟體」）
const DIRECTIONS = {
  'cn-to-tw': { from: 'cn', to: 'twp', label: '簡體 → 繁體（台灣用詞）' },
  'tw-to-cn': { from: 'twp', to: 'cn', label: '繁體 → 簡體' },
};

// 沒有指定方向時使用的預設值
const DEFAULT_DIRECTION = 'cn-to-tw';

// 建立轉換器的成本較高，所以啟動時先建好並快取起來，之後重複使用
const converters = {};
for (const [key, { from, to }] of Object.entries(DIRECTIONS)) {
  const baseConverter = OpenCC.Converter({ from, to });
  const fixRules = OpenCC.CustomConverter(CUSTOM_RULES[key] || []);
  // 先用 opencc 轉換，再套用我們的修正規則
  converters[key] = (text) => fixRules(baseConverter(text));
}

// 回傳所有支援的方向代碼，供驗證使用
function getSupportedDirections() {
  return Object.keys(DIRECTIONS);
}

// 執行轉換；正常情況下呼叫前已通過驗證，這裡再加一層防呆
function convert(text, direction) {
  if (!Object.hasOwn(converters, direction)) {
    throw new Error(`不支援的轉換方向：${direction}`);
  }
  return converters[direction](text);
}

module.exports = { DIRECTIONS, DEFAULT_DIRECTION, getSupportedDirections, convert };
