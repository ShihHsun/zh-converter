const express = require('express');
const validateConvert = require('../middlewares/validateConvert');
const convertController = require('../controllers/convertController');

const router = express.Router();

// GET /api/convert/directions：取得支援的轉換方向
router.get('/directions', convertController.listDirections);

// POST /api/convert：先驗證，再交給 controller 處理
router.post('/', validateConvert, convertController.convert);

module.exports = router;
