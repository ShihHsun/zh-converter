const express = require('express');
const validateConvert = require('../middlewares/validateConvert');
const uploadFile = require('../middlewares/uploadFile');
const convertController = require('../controllers/convertController');

const router = express.Router();

// GET /api/convert/directions：取得支援的轉換方向
router.get('/directions', convertController.listDirections);

// POST /api/convert：先驗證，再交給 controller 處理
router.post('/', validateConvert, convertController.convert);

// POST /api/convert/file：先收檔案，再交給 controller 轉換並回傳檔案
router.post('/file', uploadFile, convertController.convertFile);

module.exports = router;
