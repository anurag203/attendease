const pool = require('./database');

const createTables = async () => {
  try {
    console.log('🔄 Running database migrations...');

    // Users table (both teachers and students)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
        student_id VARCHAR(50) UNIQUE,
        degree VARCHAR(50),
        branch VARCHAR(100),
        year INTEGER,
        department VARCHAR(100),
        bluetooth_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
anan@1233
    // Courses table (replacing classes)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_name VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) NOT NULL,
        degree VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Attendance sessions (live sessions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        teacher_bluetooth_address VARCHAR(255) NOT NULL,
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INTEGER DEFAULT 2,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Attendance records (for each session)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bluetooth_verified BOOLEAN DEFAULT false,
        UNIQUE(session_id, student_id)
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_degree_branch_year ON users(degree, branch, year);
      CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_course ON attendance_sessions(course_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON attendance_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    `);

    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Export for use in server.js
const runMigrations = async () => {
  try {
    await createTables();
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
