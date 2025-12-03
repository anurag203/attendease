const express = require('express');
const {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('teacher'), markAttendance);
router.get('/class/:classId', protect, getClassAttendance);
router.get('/student/:studentId', protect, getStudentAttendance);

module.exports = router;
