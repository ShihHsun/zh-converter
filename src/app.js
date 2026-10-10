const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const healthRouter = require('./routes/health');
const convertRouter = require('./routes/convert');
const createRateLimiter = require('./middlewares/rateLimiter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// CORS_ORIGIN 可為 * 或以逗號分隔的多個來源
const corsOrigin =
  config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((s) => s.trim());

// ===== 1. 全域 middleware（順序很重要） =====
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '100kb' })); // 解析 JSON body，並限制大小
app.use(express.static(path.join(__dirname, '..', 'public'))); // 提供前端靜態檔案

// ===== 2. 路由 =====
app.use('/health', healthRouter);
// 頻率限制只套用在 API，不影響靜態檔案與健康檢查
app.use('/api/convert', createRateLimiter(), convertRouter);

// ===== 3. 收尾：404 與統一錯誤處理（必須放在所有路由之後） =====
app.use(notFound);
app.use(errorHandler);

module.exports = app;
