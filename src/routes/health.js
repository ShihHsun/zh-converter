const express = require('express');

const router = express.Router();

// GET /health：確認服務有正常啟動，部署後也用來檢查是否上線成功
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'zh-converter' });
});

module.exports = router;
