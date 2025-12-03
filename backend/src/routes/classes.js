const express = require('express');
const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  addStudentToCourse,
  removeStudentFromCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('teacher'), createCourse);
router.get('/', protect, getCourses);
router.get('/:id', protect, getCourse);
router.put('/:id', protect, authorize('teacher'), updateCourse);
router.delete('/:id', protect, authorize('teacher'), deleteCourse);

// Student management routes
router.post('/:id/students', protect, authorize('teacher'), addStudentToCourse);
router.delete('/:courseId/students/:studentId', protect, authorize('teacher'), removeStudentFromCourse);

module.exports = router;
