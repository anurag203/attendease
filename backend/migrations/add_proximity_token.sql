-- Add proximity_token column to attendance_sessions table
ALTER TABLE attendance_sessions 
ADD COLUMN IF NOT EXISTS proximity_token VARCHAR(10);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_proximity_token 
ON attendance_sessions(proximity_token) 
WHERE status = 'active';

-- Comment
COMMENT ON COLUMN attendance_sessions.proximity_token IS 'Bluetooth proximity token for name-based attendance verification';
