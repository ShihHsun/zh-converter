const express = require('express');
const { validateConvert, validateCompare } = require('../middlewares/validateConvert');
const convertController = require('../controllers/convertController');

const router = express.Router();

// POST /api/convert：先驗證，再交給 controller 處理
router.post('/', validateConvert, convertController.convert);

// POST /api/convert/compare：一次用多個設定轉換
router.post('/compare', validateCompare, convertController.compare);

module.exports = router;
