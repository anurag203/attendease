const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Emergency migration endpoint (remove after use)
router.post('/migrate-proximity-token', async (req, res) => {
  try {
    console.log('🔧 Running proximity_token migration...');
    
    // Make teacher_bluetooth_address nullable
    await pool.query(`
      ALTER TABLE attendance_sessions 
      ALTER COLUMN teacher_bluetooth_address DROP NOT NULL;
    `);
    console.log('✅ Made teacher_bluetooth_address nullable');
    
    // Add proximity_token column if it doesn't exist
    await pool.query(`
      ALTER TABLE attendance_sessions 
      ADD COLUMN IF NOT EXISTS proximity_token VARCHAR(10);
    `);
    console.log('✅ Added proximity_token column');
    
    // Add index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_proximity_token 
      ON attendance_sessions(proximity_token) 
      WHERE status = 'active';
    `);
    console.log('✅ Added index');
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

// Migration for bluetooth_mac columns
router.post('/migrate-bluetooth-mac', async (req, res) => {
  try {
    console.log('🔧 Running bluetooth_mac migration...');
    
    // Add bluetooth_mac column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bluetooth_mac VARCHAR(17);
    `);
    console.log('✅ Added bluetooth_mac to users table');
    
    // Add teacher_bluetooth_mac column to courses table
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS teacher_bluetooth_mac VARCHAR(17);
    `);
    console.log('✅ Added teacher_bluetooth_mac to courses table');
    
    res.json({ 
      success: true, 
      message: 'Bluetooth MAC migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

module.exports = router;
