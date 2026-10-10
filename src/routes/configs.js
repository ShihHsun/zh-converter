const express = require('express');
const convertController = require('../controllers/convertController');

const router = express.Router();

// GET /api/configs：列出支援的轉換設定，前端用來產生選單
router.get('/', convertController.listConfigs);

module.exports = router;
