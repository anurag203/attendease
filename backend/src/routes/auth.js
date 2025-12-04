const express = require('express');
const { register, login, getMe, updateBluetoothMac } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/bluetooth-mac', protect, updateBluetoothMac);

module.exports = router;
