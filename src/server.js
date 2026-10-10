const app = require('./app');
const config = require('./config');

// 只負責啟動 server，其他設定都在 app.js
app.listen(config.port, () => {
  console.log(`伺服器已啟動：http://localhost:${config.port}`);
});
