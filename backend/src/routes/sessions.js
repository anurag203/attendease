const express = require('express');
const {
  startSession,
  getActiveSessions,
  getSession,
  markAttendance,
  endSession,
  getCourseHistory,
  getStudentStats,
  deleteAttendance,
  deleteSession,
  getStudentCourseHistory,
  storeBeaconToken,
  verifyBeaconToken,
  verifyProximityAndMarkAttendance,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/start', protect, authorize('teacher'), startSession);
router.get('/active', protect, getActiveSessions);
router.get('/student/stats', protect, authorize('student'), getStudentStats);
router.get('/course/:courseId/history', protect, getCourseHistory);
router.get('/course/:courseId/student-history', protect, authorize('student'), getStudentCourseHistory);
router.get('/:id', protect, getSession);
router.post('/:id/mark', protect, authorize('student'), markAttendance);
router.post('/:id/end', protect, authorize('teacher'), endSession);
router.delete('/:id', protect, authorize('teacher'), deleteSession);

// BLE Beacon token routes
router.post('/:id/token', protect, authorize('teacher'), storeBeaconToken);
router.post('/:id/verify-token', protect, authorize('student'), verifyBeaconToken);

// Proximity-based attendance (Bluetooth name scanning)
router.post('/:id/mark-proximity', protect, authorize('student'), verifyProximityAndMarkAttendance);

// Attendance delete route (separate from sessions)
router.delete('/attendance/:attendanceId', protect, authorize('teacher'), deleteAttendance);

module.exports = router;
