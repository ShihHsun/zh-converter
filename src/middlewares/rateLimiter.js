const AppError = require('../utils/AppError');
const config = require('../config');

// 簡單的「固定時間窗口」頻率限制（存在記憶體中）
// 注意：重啟後會歸零，且多台伺服器之間不共享，適合學習或小型專案使用
function createRateLimiter({ windowMs, max } = config.rateLimit) {
  // key：用戶端 IP；value：{ count: 已請求次數, resetAt: 窗口結束時間 }
  const hits = new Map();

  let nextCleanupAt = Date.now() + windowMs;

  // 清除已過期的紀錄，避免 Map 無限成長
  // 不用 setInterval：Cloudflare Workers 不允許在全域範圍設定計時器，改成在請求時順便清除
  function cleanup(now) {
    if (now < nextCleanupAt) return;
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
    nextCleanupAt = now + windowMs;
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    cleanup(now);
    // 部署在 Cloudflare 時，真實用戶端 IP 在 CF-Connecting-IP 標頭；本機執行時沒有此標頭，改用 req.ip
    const ip = req.get('cf-connecting-ip') || req.ip;
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
