const AppError = require('../utils/AppError');
const config = require('../config');

// 頻率限制，依執行環境自動選擇：
// - Cloudflare Workers：使用 Rate Limiting binding（設定在 wrangler.jsonc 的 ratelimits）
// - 本機 Node：簡單的「固定時間窗口」計數（存在記憶體中）
//   注意：重啟後會歸零，且多台伺服器之間不共享，適合學習或小型專案使用
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

  // Cloudflare Workers 版：交給 Cloudflare 的 Rate Limiting binding 計數
  // 記憶體版的計數在 Workers 上不可靠（請求會分散到不同的執行環境，彼此不共享 Map）
  async function limitWithBinding(binding, ip, next) {
    try {
      const { success } = await binding.limit({ key: ip });
      if (!success) {
        return next(new AppError(429, 'RATE_LIMITED', '請求太頻繁，請稍後再試'));
      }
      next();
    } catch (err) {
      // binding 故障時放行請求：頻率限制只是保護機制，不應該讓整個 API 跟著掛掉
      console.error('[頻率限制] binding 發生錯誤，本次請求放行：', err);
      next();
    }
  }

  return function rateLimiter(req, res, next) {
    // 部署在 Cloudflare 時，真實用戶端 IP 在 CF-Connecting-IP 標頭；本機執行時沒有此標頭，改用 req.ip
    const ip = req.get('cf-connecting-ip') || req.ip;

    // worker.js 會把 binding 放在 app.locals；本機用 Node 執行時沒有，改用下面的記憶體版
    const binding = req.app.locals.rateLimitBinding;
    if (binding) return limitWithBinding(binding, ip, next);

    const now = Date.now();
    cleanup(now);
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
