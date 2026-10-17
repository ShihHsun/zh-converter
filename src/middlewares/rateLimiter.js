const AppError = require('../utils/AppError');
const config = require('../config');

// 簡單的「固定時間窗口」頻率限制（存在記憶體中）
// 注意：重啟後會歸零，且多台伺服器之間不共享，適合學習或小型專案使用
function createRateLimiter({ windowMs, max } = config.rateLimit) {
  // key：用戶端 IP；value：{ count: 已請求次數, resetAt: 窗口結束時間 }
  const hits = new Map();

  // 定期清除已過期的紀錄，避免 Map 無限成長
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, windowMs);
  cleanup.unref(); // 不讓這個計時器阻止程式結束

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const ip = req.ip;
    let entry = hits.get(ip);

    // 第一次請求，或上一個窗口已結束 → 開新窗口
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count += 1;

    // 在回應標頭告知用戶端目前的額度狀況
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new AppError(429, 'RATE_LIMITED', '請求太頻繁，請稍後再試'));
    }

    next();
  };
}

module.exports = createRateLimiter;
