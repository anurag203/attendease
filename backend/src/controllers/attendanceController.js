const pool = require('../config/database');

// @desc    Mark attendance
// @route   POST /api/attendance
exports.markAttendance = async (req, res) => {
  try {
    const { class_id, student_id, date, status } = req.body;
    const marked_by = req.user.id;

    // Validate
    if (!class_id || !student_id || !date || !status) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if teacher owns the class
    if (req.user.role === 'teacher') {
      const classCheck = await pool.query(
        'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2',
        [class_id, req.user.id]
      );
      if (classCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to mark attendance for this class' });
      }
    }

    // Insert or update attendance
    const result = await pool.query(
      `INSERT INTO attendance (class_id, student_id, date, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (class_id, student_id, date)
       DO UPDATE SET status = $4, marked_by = $5, marked_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [class_id, student_id, date, status, marked_by]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error while marking attendance' });
  }
};

// @desc    Get attendance for a class
// @route   GET /api/attendance/class/:classId
exports.getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    let query = `
      SELECT a.*, u.full_name as student_name, u.student_id
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.class_id = $1
    `;
    const params = [classId];

    if (date) {
      query += ' AND a.date = $2';
      params.push(date);
    }

    query += ' ORDER BY a.date DESC, u.full_name';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ error: 'Server error while fetching attendance' });
  }
};

// @desc    Get student attendance
// @route   GET /api/attendance/student/:studentId
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT a.*, c.name as class_name
       FROM attendance a
       JOIN classes c ON a.class_id = c.id
       WHERE a.student_id = $1
       ORDER BY a.date DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Server error while fetching attendance' });
  }
};
