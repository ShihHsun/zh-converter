const express = require('express');

const router = express.Router();

// 健康檢查：用來確認服務是否正常運作（例如給監控或負載平衡器使用）
router.get('/', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;
