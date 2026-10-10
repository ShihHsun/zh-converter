專案結構與職責如下：
├── src/
│   ├── server.js                  # 讀 PORT、啟動 server（只做這件事）
│   ├── app.js                     # 建立 Express app、依序掛 middleware 與 routes
│   ├── config/
│   │   └── index.js               # 集中讀環境變數、給預設值
│   ├── routes/
│   │   ├── health.js              # GET /health
│   │   └── convert.js             # POST /api/convert
│   ├── controllers/
│   │   └── convertController.js   # 從 req 取值、呼叫 service、組回應
│   ├── services/
│   │   └── converterService.js    # 包裝 opencc-js 邏輯
│   ├── middlewares/
│   │   ├── validateConvert.js     # 檢查 text 與 direction
│   │   ├── rateLimiter.js         # 簡單的請求頻率限制
│   │   ├── notFound.js            # 找不到路由 → 404
│   │   └── errorHandler.js        # 統一錯誤出口
│   └── utils/
│       └── AppError.js            # 自訂錯誤類別，帶 statusCode 與 code
├── public/
│   ├── index.html                 # 簡單的操作介面
│   ├── style.css                  # 基本樣式
│   └── main.js                    # fetch 呼叫 POST /api/convert 並更新畫面
├── .env.example
├── package.json

