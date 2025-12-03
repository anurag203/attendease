const pool = require('../config/database');

// Generate random class code
const generateClassCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// @desc    Create a class
// @route   POST /api/classes
exports.createClass = async (req, res) => {
  try {
    const { name } = req.body;
    const teacher_id = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Please provide class name' });
    }

    const code = generateClassCode();

    const result = await pool.query(
      'INSERT INTO classes (name, teacher_id, code) VALUES ($1, $2, $3) RETURNING *',
      [name, teacher_id, code]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Server error while creating class' });
  }
};

// @desc    Get all classes
// @route   GET /api/classes
exports.getClasses = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'teacher') {
      query = 'SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC';
      params = [req.user.id];
    } else {
      // Student - get enrolled classes
      query = `
        SELECT c.*, u.full_name as teacher_name
        FROM classes c
        JOIN class_enrollments ce ON c.id = ce.class_id
        JOIN users u ON c.teacher_id = u.id
        WHERE ce.student_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Server error while fetching classes' });
  }
};

// @desc    Get single class with students
// @route   GET /api/classes/:id
exports.getClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classResult = await pool.query('SELECT * FROM classes WHERE id = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get enrolled students
    const studentsResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.student_id, ce.enrolled_at
       FROM users u
       JOIN class_enrollments ce ON u.id = ce.student_id
       WHERE ce.class_id = $1
       ORDER BY u.full_name`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...classResult.rows[0],
        students: studentsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Server error while fetching class' });
  }
};

// @desc    Enroll in a class
// @route   POST /api/classes/enroll
exports.enrollInClass = async (req, res) => {
  try {
    const { code } = req.body;
    const student_id = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Please provide class code' });
    }

    // Find class by code
    const classResult = await pool.query('SELECT * FROM classes WHERE code = $1', [code]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid class code' });
    }

    const classData = classResult.rows[0];

    // Check if already enrolled
    const enrollCheck = await pool.query(
      'SELECT * FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
      [classData.id, student_id]
    );

    if (enrollCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this class' });
    }

    // Enroll student
    await pool.query(
      'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2)',
      [classData.id, student_id]
    );

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in class',
      data: classData,
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Server error while enrolling in class' });
  }
};
