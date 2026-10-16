const OpenCC = require('opencc-js');

// 支援的轉換方向與對應的 opencc-js 設定
// cn：簡體中文、tw：台灣正體、twp：台灣正體（含慣用詞轉換，如「软件」→「軟體」）
const DIRECTIONS = {
  'cn-to-tw': { from: 'cn', to: 'twp', label: '簡體 → 繁體（台灣用詞）' },
  'tw-to-cn': { from: 'tw', to: 'cn', label: '繁體 → 簡體' },
};

// 沒有指定方向時使用的預設值
const DEFAULT_DIRECTION = 'cn-to-tw';

// 建立轉換器的成本較高，所以啟動時先建好並快取起來，之後重複使用
const converters = {};
for (const [key, { from, to }] of Object.entries(DIRECTIONS)) {
  converters[key] = OpenCC.Converter({ from, to });
}

// 回傳所有支援的方向代碼，供驗證使用
function getSupportedDirections() {
  return Object.keys(DIRECTIONS);
}

// 執行轉換；呼叫前應已通過驗證，這裡不再重複檢查
function convert(text, direction) {
  return converters[direction](text);
}

module.exports = { DIRECTIONS, DEFAULT_DIRECTION, getSupportedDirections, convert };
