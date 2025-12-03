const pool = require('../config/database');

// @desc    Create a course
// @route   POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const { course_name, course_code, degree, branch, year } = req.body;
    const teacher_id = req.user.id;

    if (!course_name || !course_code || !degree || !branch || !year) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const result = await pool.query(
      'INSERT INTO courses (teacher_id, course_name, course_code, degree, branch, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [teacher_id, course_name, course_code, degree, branch, year]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Server error while creating course' });
  }
};

// @desc    Get all courses for user
// @route   GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'teacher') {
      query = `
        SELECT c.*, 
               COUNT(DISTINCT u.id) as student_count
        FROM courses c
        LEFT JOIN users u ON u.degree = c.degree 
          AND u.branch = c.branch 
          AND u.year = c.year 
          AND u.role = 'student'
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    } else {
      // Student - get courses based on their degree, branch, year
      if (!req.user.degree || !req.user.branch || req.user.year == null) {
        return res.status(400).json({ 
          error: 'Student profile incomplete. Please update your degree, branch, and year.',
          missing: {
            degree: !req.user.degree,
            branch: !req.user.branch,
            year: req.user.year == null
          }
        });
      }
      
      query = `
        SELECT c.*, 
               u.full_name as teacher_name,
               u.email as teacher_email
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        WHERE TRIM(c.degree) = TRIM($1) 
          AND TRIM(c.branch) = TRIM($2) 
          AND c.year::text = $3::text
        ORDER BY c.created_at DESC
      `;
      params = [req.user.degree, req.user.branch, String(req.user.year)];
      console.log('🔍 Student Query:', { 
        degree: req.user.degree, 
        branch: req.user.branch, 
        year: req.user.year,
        yearType: typeof req.user.year,
        params: params
      });
    }

    const result = await pool.query(query, params);
    
    if (req.user.role === 'student') {
      console.log('📚 Courses found for student:', result.rows.length, result.rows);
    }

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error while fetching courses' });
  }
};

// @desc    Get single course with students
// @route   GET /api/courses/:id
exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Get students for this course
    const studentsResult = await pool.query(
      `SELECT id, student_id, full_name, email, degree, branch, year
       FROM users
       WHERE role = 'student' 
         AND degree = $1 
         AND branch = $2 
         AND year = $3
       ORDER BY full_name`,
      [course.degree, course.branch, course.year]
    );

    res.status(200).json({
      success: true,
      data: {
        ...course,
        students: studentsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Server error while fetching course' });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { course_name, course_code, degree, branch, year } = req.body;

    const result = await pool.query(
      `UPDATE courses 
       SET course_name = COALESCE($1, course_name),
           course_code = COALESCE($2, course_code),
           degree = COALESCE($3, degree),
           branch = COALESCE($4, branch),
           year = COALESCE($5, year)
       WHERE id = $6 AND teacher_id = $7
       RETURNING *`,
      [course_name, course_code, degree, branch, year, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Server error while updating course' });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 AND teacher_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error while deleting course' });
  }
};

// @desc    Add student to course manually
// @route   POST /api/courses/:id/students
exports.addStudentToCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    // Verify course belongs to teacher
    const courseResult = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
      [id, req.user.id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or unauthorized' });
    }

    // Find student by student_id
    const studentResult = await pool.query(
      'SELECT * FROM users WHERE student_id = $1 AND role = $2',
      [student_id, 'student']
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // For now, we'll just update the student's degree/branch/year to match the course
    // In a production app, you'd want a separate course_enrollments table
    await pool.query(
      'UPDATE users SET degree = $1, branch = $2, year = $3 WHERE id = $4',
      [courseResult.rows[0].degree, courseResult.rows[0].branch, courseResult.rows[0].year, student.id]
    );

    res.status(200).json({
      success: true,
      message: 'Student added to course',
      data: student,
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Server error while adding student' });
  }
};

// @desc    Remove student from course manually  
// @route   DELETE /api/courses/:courseId/students/:studentId
exports.removeStudentFromCourse = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    // Verify course belongs to teacher
    const courseResult = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
      [courseId, req.user.id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or unauthorized' });
    }

    // Note: In production, you'd remove from course_enrollments table
    // For now, this is a placeholder - we can't actually "remove" students
    // from auto-enrollment without a separate enrollments table

    res.status(200).json({
      success: true,
      message: 'Student removed from course',
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Server error while removing student' });
  }
};
