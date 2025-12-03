const express = require('express');
const {
  startSession,
  getActiveSessions,
  getSession,
  markAttendance,
  endSession,
  getCourseHistory,
  getStudentStats,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/start', protect, authorize('teacher'), startSession);
router.get('/active', protect, getActiveSessions);
router.get('/student/stats', protect, authorize('student'), getStudentStats);
router.get('/course/:courseId/history', protect, getCourseHistory);
router.get('/:id', protect, getSession);
router.post('/:id/mark', protect, authorize('student'), markAttendance);
router.post('/:id/end', protect, authorize('teacher'), endSession);

module.exports = router;
