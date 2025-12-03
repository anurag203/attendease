const pool = require('../config/database');

// @desc    Start attendance session
// @route   POST /api/sessions/start
exports.startSession = async (req, res) => {
  try {
    const { course_id, teacher_bluetooth_address, duration_minutes } = req.body;
    const teacher_id = req.user.id;

    if (!course_id || !teacher_bluetooth_address) {
      return res.status(400).json({ error: 'Please provide course_id and teacher_bluetooth_address' });
    }

    // Verify teacher owns the course
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
      [course_id, teacher_id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this course' });
    }

    // Check if there's already an active session for this course
    const activeSession = await pool.query(
      `SELECT * FROM attendance_sessions 
       WHERE course_id = $1 AND status = 'active'`,
      [course_id]
    );

    if (activeSession.rows.length > 0) {
      return res.status(400).json({ error: 'An active session already exists for this course' });
    }

    // Create session
    const result = await pool.query(
      `INSERT INTO attendance_sessions 
       (course_id, teacher_id, teacher_bluetooth_address, duration_minutes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [course_id, teacher_id, teacher_bluetooth_address, duration_minutes || 2]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error while starting session' });
  }
};

// @desc    Get active sessions
// @route   GET /api/sessions/active
exports.getActiveSessions = async (req, res) => {
  try {
    // First, auto-end expired sessions
    const endResult = await pool.query(`
      UPDATE attendance_sessions
      SET status = 'ended', ended_at = NOW()
      WHERE status = 'active' 
        AND (session_date + (duration_minutes || ' minutes')::INTERVAL) < NOW()
      RETURNING id, session_date, duration_minutes
    `);
    
    if (endResult.rows.length > 0) {
      console.log('⏰ Auto-ended sessions:', endResult.rows.length, endResult.rows);
    }

    let query;
    let params = [];

    if (req.user.role === 'teacher') {
      // Get teacher's active sessions
      query = `
        SELECT s.*, c.course_name, c.course_code
        FROM attendance_sessions s
        JOIN courses c ON s.course_id = c.id
        WHERE s.teacher_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
      `;
      params = [req.user.id];
    } else {
      // Get active sessions for student's courses with attendance status
      query = `
        SELECT s.*, c.course_name, c.course_code, u.full_name as teacher_name,
               CASE WHEN a.id IS NOT NULL THEN true ELSE false END as attendance_marked
        FROM attendance_sessions s
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON s.teacher_id = u.id
        LEFT JOIN attendance a ON s.id = a.session_id AND a.student_id = $4
        WHERE c.degree = $1 AND c.branch = $2 AND c.year = $3 
          AND s.status = 'active'
        ORDER BY s.created_at DESC
      `;
      params = [req.user.degree, req.user.branch, req.user.year, req.user.id];
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ error: 'Server error while fetching sessions' });
  }
};

// @desc    Get session with attendance
// @route   GET /api/sessions/:id
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Get session details
    const sessionResult = await pool.query(
      `SELECT s.*, c.course_name, c.course_code, c.degree, c.branch, c.year
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get marked attendance
    const attendanceResult = await pool.query(
      `SELECT a.*, u.full_name, u.student_id, u.email
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       WHERE a.session_id = $1
       ORDER BY a.marked_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...session,
        marked_students: attendanceResult.rows,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error while fetching session' });
  }
};

// @desc    Mark attendance in session
// @route   POST /api/sessions/:id/mark
exports.markAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { bluetooth_verified } = req.body;
    const student_id = req.user.id;

    // Check if session exists and is active
    const sessionResult = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1 AND status = $\'active\'',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Mark attendance
    const result = await pool.query(
      `INSERT INTO attendance (session_id, student_id, bluetooth_verified)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, student_id) 
       DO UPDATE SET marked_at = CURRENT_TIMESTAMP, bluetooth_verified = $3
       RETURNING *`,
      [id, student_id, bluetooth_verified || false]
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

// @desc    End session
// @route   POST /api/sessions/:id/end
exports.endSession = async (req, res) => {
  try {
    const { id } = req.params;

    // First get the session to calculate actual duration
    const session = await pool.query(
      `SELECT session_date FROM attendance_sessions 
       WHERE id = $1 AND teacher_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found or unauthorized' });
    }

    // Calculate actual duration in minutes
    const startTime = new Date(session.rows[0].session_date);
    const endTime = new Date();
    const actualDurationMinutes = Math.ceil((endTime - startTime) / (1000 * 60));

    // Update session with ended_at and actual duration
    const result = await pool.query(
      `UPDATE attendance_sessions 
       SET status = 'ended', 
           ended_at = CURRENT_TIMESTAMP,
           duration_minutes = $3
       WHERE id = $1 AND teacher_id = $2 AND status = 'active'
       RETURNING *`,
      [id, req.user.id, actualDurationMinutes]
    );

    console.log(`📊 Session ended - Actual duration: ${actualDurationMinutes} minutes`);

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error while ending session' });
  }
};

// @desc    Get attendance history for a course
// @route   GET /api/sessions/course/:courseId/history
exports.getCourseHistory = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      `SELECT s.*, 
              COUNT(a.id) as total_attendance
       FROM attendance_sessions s
       LEFT JOIN attendance a ON s.id = a.session_id
       WHERE s.course_id = $1
       GROUP BY s.id
       ORDER BY s.session_date DESC`,
      [courseId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get course history error:', error);
    res.status(500).json({ error: 'Server error while fetching history' });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/sessions/attendance/:attendanceId
exports.deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const result = await pool.query(
      `DELETE FROM attendance 
       WHERE id = $1
       RETURNING *`,
      [attendanceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Server error while deleting attendance' });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all attendance records for this session first
    await pool.query(
      `DELETE FROM attendance WHERE session_id = $1`,
      [id]
    );

    // Then delete the session
    const result = await pool.query(
      `DELETE FROM attendance_sessions 
       WHERE id = $1 AND teacher_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Server error while deleting session' });
  }
};

// @desc    Get student course history
// @route   GET /api/sessions/course/:courseId/student-history
exports.getStudentCourseHistory = async (req, res) => {
  try {
    const { courseId } = req.params;
    const student_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        s.id,
        s.session_date,
        s.ended_at,
        s.duration_minutes,
        s.status,
        CASE 
          WHEN a.id IS NOT NULL THEN true 
          ELSE false 
        END as attended,
        a.marked_at,
        a.bluetooth_verified
       FROM attendance_sessions s
       LEFT JOIN attendance a ON s.id = a.session_id AND a.student_id = $1
       WHERE s.course_id = $2
       ORDER BY s.session_date DESC`,
      [student_id, courseId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get student course history error:', error);
    res.status(500).json({ error: 'Server error while fetching history' });
  }
};

// @desc    Get student attendance stats
// @route   GET /api/sessions/student/stats
exports.getStudentStats = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { course_id } = req.query;

    let query = `
      SELECT 
        c.id as course_id,
        c.course_name,
        c.course_code,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT a.id) as attended_sessions,
        CASE 
          WHEN COUNT(DISTINCT s.id) > 0 
          THEN ROUND((COUNT(DISTINCT a.id)::numeric / COUNT(DISTINCT s.id)::numeric * 100), 2)
          ELSE 0
        END as attendance_percentage
      FROM courses c
      LEFT JOIN attendance_sessions s ON c.id = s.course_id AND s.status = 'ended'
      LEFT JOIN attendance a ON s.id = a.session_id AND a.student_id = $1
      WHERE c.degree = $2 AND c.branch = $3 AND c.year = $4
    `;

    const params = [student_id, req.user.degree, req.user.branch, req.user.year];

    if (course_id) {
      query += ' AND c.id = $5';
      params.push(course_id);
    }

    query += ' GROUP BY c.id, c.course_name, c.course_code ORDER BY c.course_name';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ error: 'Server error while fetching stats' });
  }
};
