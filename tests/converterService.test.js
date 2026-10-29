const test = require('node:test');
const assert = require('node:assert');
const { convert } = require('../src/services/converterService');

// ===== 基本轉換 =====
test('cn-to-tw：簡體轉台灣正體並轉換用語', () => {
  assert.strictEqual(convert('软件', 'cn-to-tw'), '軟體');
});

test('tw-to-cn：台灣正體轉簡體並轉回用語', () => {
  assert.strictEqual(convert('軟體', 'tw-to-cn'), '软件');
});

// ===== 邊界情境 =====
test('換行要原樣保留', () => {
  const input = '第一行\n第二行\n\n第四行';
  const output = convert(input, 'cn-to-tw');
  assert.strictEqual(output.split('\n').length, input.split('\n').length);
});

test('英文、數字、emoji 不能被改動', () => {
  const input = 'Hello 123 😀';
  assert.strictEqual(convert(input, 'cn-to-tw'), input);
});

test('不支援的方向要丟出錯誤', () => {
  assert.throws(() => convert('你好', 'xyz'));
  assert.throws(() => convert('你好', 'toString'));
});

// ===== 常見詞彙 =====
test('常見詞彙轉台灣用語', () => {
  const cases = [
    ['软件', '軟體'],
    ['视频', '影片'],
    ['数据库', '資料庫'],
    ['默认', '預設'],
    ['芒果干', '芒果乾'],
    ['干净', '乾淨'],
    ['干活', '幹活'],
    ['U盘', '隨身碟'],
  ];
  cases.forEach(([input, expected]) => {
    assert.strictEqual(convert(input, 'cn-to-tw'), expected);
  });
});

test('依上下文判斷「只」和「隻」', () => {
  assert.strictEqual(convert('这只是妄想', 'cn-to-tw'), '這只是妄想');
  assert.strictEqual(convert('这只小鸟很可爱', 'cn-to-tw'), '這隻小鳥很可愛');
});

// ===== 修正規則 =====
test('修正：干你什麼事', () => {
  assert.strictEqual(convert('这颗梨子干你什么事', 'cn-to-tw'), '這顆梨子干你什麼事');
});

test('修正：土豆是馬鈴薯', () => {
  assert.strictEqual(convert('土豆炖牛肉', 'cn-to-tw'), '馬鈴薯燉牛肉');
});

test('修正：預設轉回默认，來回轉換不會改掉原文', () => {
  const twText = convert('默认', 'cn-to-tw');
  assert.strictEqual(convert(twText, 'tw-to-cn'), '默认');
});

test('保護：预设立场不能被改成默认立场', () => {
  assert.strictEqual(convert('預設立場', 'tw-to-cn'), '预设立场');
});

test('防止誤改：常見的「於」「範」詞彙要保持正確', () => {
  const cases = [
    ['这本书属于小姐', '這本書屬於小姐'],
    ['终于先生回来了', '終於先生回來了'],
    ['由于先生不在', '由於先生不在'],
    ['位于小姐家旁边', '位於小姐家旁邊'],
    ['等于先生说的', '等於先生說的'],
    ['他是模范先生', '他是模範先生'],
    ['示范小姐', '示範小姐'],
    ['关于先生的事', '關於先生的事'],
  ];
  cases.forEach(([input, expected]) => {
    assert.strictEqual(convert(input, 'cn-to-tw'), expected);
  });
});