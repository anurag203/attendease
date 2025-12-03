const { Pool } = require('pg');

// Render database connection
const DATABASE_URL = 'postgresql://attendease_db_user:yZfQG1mUd3tPw8gLPTzp9lZWz47Ye3iq@dpg-d4o7v85svqrc738o0tbg-a.oregon-postgres.render.com/attendease_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const viewAllData = async () => {
  try {
    console.log('\n📊 === RENDER DATABASE CONTENTS ===\n');

    // Users
    const users = await pool.query('SELECT * FROM users ORDER BY id');
    console.log('👥 USERS:', users.rows.length);
    users.rows.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.role.toUpperCase()} | ${u.full_name} | ${u.email}`);
      if (u.role === 'student') {
        console.log(`    Student ID: ${u.student_id} | ${u.degree} ${u.branch} Year ${u.year}`);
      } else {
        console.log(`    Department: ${u.department}`);
      }
    });

    // Courses
    console.log('\n📚 COURSES:');
    const courses = await pool.query(`
      SELECT c.*, u.full_name as teacher_name 
      FROM courses c 
      JOIN users u ON c.teacher_id = u.id 
      ORDER BY c.id
    `);
    console.log('Count:', courses.rows.length);
    courses.rows.forEach(c => {
      console.log(`  ID: ${c.id} | ${c.course_name} (${c.course_code})`);
      console.log(`    Teacher: ${c.teacher_name} | ${c.degree} ${c.branch} Year ${c.year}`);
    });

    // Course Exclusions
    console.log('\n🚫 COURSE EXCLUSIONS:');
    const exclusions = await pool.query(`
      SELECT ce.*, c.course_name, u.full_name as student_name 
      FROM course_exclusions ce
      JOIN courses c ON ce.course_id = c.id
      JOIN users u ON ce.student_id = u.id
      ORDER BY ce.id
    `);
    console.log('Count:', exclusions.rows.length);
    if (exclusions.rows.length > 0) {
      exclusions.rows.forEach(e => {
        console.log(`  ${e.student_name} excluded from ${e.course_name}`);
      });
    } else {
      console.log('  (none)');
    }

    // Sessions
    console.log('\n🎯 ATTENDANCE SESSIONS:');
    const sessions = await pool.query(`
      SELECT s.*, c.course_name, u.full_name as teacher_name
      FROM attendance_sessions s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.teacher_id = u.id
      ORDER BY s.id DESC
    `);
    console.log('Count:', sessions.rows.length);
    sessions.rows.forEach(s => {
      console.log(`  ID: ${s.id} | ${s.course_name} | ${s.status.toUpperCase()}`);
      console.log(`    Teacher: ${s.teacher_name} | Duration: ${s.duration_minutes}min`);
      console.log(`    Date: ${new Date(s.session_date).toLocaleString()}`);
    });

    // Attendance Records
    console.log('\n✅ ATTENDANCE RECORDS:');
    const attendance = await pool.query(`
      SELECT a.*, u.full_name, u.student_id, c.course_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN attendance_sessions s ON a.session_id = s.id
      JOIN courses c ON s.course_id = c.id
      ORDER BY a.id DESC
      LIMIT 20
    `);
    console.log('Count (last 20):', attendance.rows.length);
    if (attendance.rows.length > 0) {
      attendance.rows.forEach(a => {
        console.log(`  ${a.full_name} (${a.student_id}) attended ${a.course_name}`);
        console.log(`    Marked at: ${new Date(a.marked_at).toLocaleString()}`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n✅ Done!\n');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
};

viewAllData();
