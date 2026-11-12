import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import app from './src/app.js';

// 頻率限制改用 Cloudflare 的 Rate Limiting binding（見 wrangler.jsonc 的 ratelimits）
app.locals.rateLimitBinding = env.RATE_LIMITER;

app.listen(3000);
export default httpServerHandler({ port: 3000 });
