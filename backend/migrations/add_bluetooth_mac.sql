-- Add bluetooth_mac column to users table (for teachers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bluetooth_mac VARCHAR(17);

-- Add teacher_bluetooth_mac column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS teacher_bluetooth_mac VARCHAR(17);

-- Comment
COMMENT ON COLUMN users.bluetooth_mac IS 'Teacher Bluetooth MAC address for proximity attendance';
COMMENT ON COLUMN courses.teacher_bluetooth_mac IS 'Teacher Bluetooth MAC address copied from teacher profile when course is created';
