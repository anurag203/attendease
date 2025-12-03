# 📱 AttendEase - Complete Setup & User Guide

## 🎯 Overview

**AttendEase** is a smart Bluetooth-based attendance system for MNIT that prevents proxy attendance and makes marking attendance fast and simple for both teachers and students.

### Key Features
- ✅ Bluetooth proximity-based attendance verification
- 👨‍🏫 Teacher portal for course management and live sessions
- 🎓 Student portal for marking attendance
- 📊 Real-time attendance tracking
- 📈 Attendance history and statistics
- 🔒 Secure authentication with JWT
- 🎨 Modern, clean UI with dark theme

---

## 🚀 Quick Start

### 1. Start Backend Services

```bash
make up
```

This starts:
- PostgreSQL database (port 5432)
- Backend API (port 3001)

### 2. Start Mobile App

**Option A: Run on Physical Android Device (Recommended)**

```bash
npm start
```

Then:
1. Install **Expo Go** app from Play Store
2. Scan the QR code with Expo Go
3. App loads on your device!

**Option B: Build APK for Installation**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

---

## 📖 User Guide

### For Teachers

#### 1. Sign Up
- Select "I am a Teacher"
- Enter email, password, and department
- Create account

#### 2. Create Courses
- Click "+ Add Course" on dashboard
- Enter course name and code (e.g., "Data Structures", "CS101")
- Select target students: Degree, Branch, Year
- Students are automatically mapped based on their profile

#### 3. Start Attendance Session
- Select a course
- Click "Start Session"
- **Enable Bluetooth** when prompted
- Choose session duration (1-5 minutes)
- Click "🚀 Start Attendance Session"

#### 4. Monitor Live Session
- View real-time list of students marking attendance
- See student names and IDs as they join
- Students must be in Bluetooth range to mark attendance

#### 5. End Session
- Click "⏹ End Session" when done
- Session automatically saves to history

#### 6. View History
- Click "History" on any course card
- See all past sessions with date/time
- View attendance count for each session

---

### For Students

#### 1. Sign Up
- Select "I am a Student"
- Enter:
  - Student ID
  - Email
  - Password
  - Degree (B.Tech/M.Tech)
  - Branch (CS/ECE/Mechanical/etc.)
  - Year (1-4)

#### 2. View Courses
- Dashboard automatically shows courses for your degree/branch/year
- See all courses taught by teachers

#### 3. Join Live Session
- When teacher starts session, "🔴 LIVE SESSION" badge appears
- Click "Join Session" on the course card

#### 4. Mark Attendance
- **Enable Bluetooth** when prompted
- App automatically scans for teacher's device
- Move close to classroom/teacher
- When teacher's device is detected:
  - Shows "✅ Teacher Device Found!"
  - Attendance marks **automatically**
  - Success screen appears

#### 5. View Attendance History
- Click "View History" on any course
- See:
  - Total classes attended
  - Total classes held
  - Attendance percentage
  - Color-coded progress bar

---

## 🔧 Technical Details

### Architecture

```
AttendEase/
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── config/            # Database config & migrations
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Authentication
│   │   └── routes/            # API routes
│   └── Dockerfile
├── src/                       # React Native App
│   ├── screens/
│   │   ├── auth/             # Login, Signup screens
│   │   ├── teacher/          # Teacher dashboard, sessions
│   │   └── student/          # Student dashboard, join session
│   ├── services/
│   │   ├── api.js            # API client
│   │   └── bluetoothService.js
│   ├── context/
│   │   └── AuthContext.js    # Global auth state
│   └── utils/
│       └── constants.js      # App constants
├── docker-compose.yml
├── Makefile
└── App.js                     # Main app entry
```

### Database Schema

**users**
- id, email, password, role (teacher/student)
- student_id, degree, branch, year (for students)
- department (for teachers)
- bluetooth_address

**courses**
- id, teacher_id, course_name, course_code
- degree, branch, year (target students)

**attendance_sessions**
- id, course_id, teacher_id
- teacher_bluetooth_address
- session_date, duration_minutes, status

**attendance**
- id, session_id, student_id
- marked_at, bluetooth_verified

---

## 🔐 API Endpoints

### Authentication
```
POST /api/auth/register    # Register teacher/student
POST /api/auth/login       # Login
GET  /api/auth/me          # Get current user
```

### Courses
```
POST   /api/courses        # Create course (teacher)
GET    /api/courses        # Get user's courses
GET    /api/courses/:id    # Get course details
PUT    /api/courses/:id    # Update course (teacher)
DELETE /api/courses/:id    # Delete course (teacher)
```

### Sessions
```
POST /api/sessions/start                    # Start session (teacher)
GET  /api/sessions/active                   # Get active sessions
GET  /api/sessions/:id                      # Get session details
POST /api/sessions/:id/mark                 # Mark attendance (student)
POST /api/sessions/:id/end                  # End session (teacher)
GET  /api/sessions/course/:courseId/history # Get course history
GET  /api/sessions/student/stats            # Get student stats
```

---

## 📱 Bluetooth Implementation

### How It Works

**Teacher Side:**
1. Teacher enables Bluetooth
2. App captures device Bluetooth address
3. Address is broadcast during session
4. Session stored in database with teacher's BT address

**Student Side:**
1. Student enables Bluetooth
2. App scans for nearby devices (every 5 seconds)
3. Compares found devices with teacher's address
4. If match found → auto-marks attendance
5. Attendance record saved with `bluetooth_verified: true`

### Permissions Required (Android)
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT` (Android 12+)
- `BLUETOOTH_SCAN` (Android 12+)
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`

All permissions are configured in `app.json`

---

## 🎨 UI/UX Features

- **Dark Theme** - Easy on the eyes
- **Modern Design** - Clean, minimal interface
- **Real-time Updates** - Live session monitoring
- **Auto-detection** - Attendance marks automatically
- **Color Coding** - Green for present, Red for absent
- **Progress Bars** - Visual attendance percentage
- **Live Badges** - Shows active sessions prominently

---

## 🛠️ Development Commands

```bash
make up          # Start backend services
make down        # Stop services
make logs        # View logs
make status      # Check service status
make build       # Rebuild Docker images
make mobile      # Start mobile app

npm start        # Start Expo dev server
npm run android  # Run on Android emulator
```

---

## 📊 Testing the App

### Test Flow

1. **Start Backend:**
   ```bash
   make up
   ```

2. **Register Teacher:**
   - Open app → "I am a Teacher"
   - Email: `teacher@mnit.ac.in`
   - Password: `teacher123`
   - Department: Computer Science

3. **Create Course:**
   - Course Name: "Data Structures"
   - Code: "CS201"
   - Degree: B.Tech, Branch: Computer Science, Year: 2

4. **Register Student:**
   - Open app on another device (or logout/login)
   - "I am a Student"
   - Student ID: `2021UCS001`
   - Email: `student@mnit.ac.in`
   - Password: `student123`
   - Degree: B.Tech, Branch: Computer Science, Year: 2

5. **Start Session (Teacher):**
   - Select course → "Start Session"
   - Enable Bluetooth
   - Duration: 2 minutes
   - Start!

6. **Mark Attendance (Student):**
   - Student dashboard shows LIVE badge
   - Click "Join Session"
   - Enable Bluetooth
   - Move close to teacher device
   - Attendance marks automatically!

---

## 🔍 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
make down
make up
```

**Database connection failed:**
```bash
make clean
make build
make up
```

### Mobile App Issues

**Metro bundler cache:**
```bash
npm start -- --reset-cache
```

**Can't connect to API:**
- Update `API_URL` in `src/services/api.js`
- Use your computer's local IP (not localhost) when testing on device
- Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

**Bluetooth not working:**
- Check permissions in app settings
- Ensure location services are enabled (Android requirement)
- Try restarting Bluetooth

**Expo Go not loading:**
- Ensure both devices are on same WiFi network
- Try scanning QR code again
- Check firewall settings

---

## 📝 Important Notes

### Security
- Change JWT secret in production (`backend/.env`)
- Use HTTPS in production
- Implement rate limiting
- Add password strength requirements

### Bluetooth Range
- Typical Bluetooth range: 10-30 meters
- Works best within same room
- Physical obstacles may reduce range
- Teacher device should remain stationary during session

### Performance
- Sessions auto-scan every 5 seconds
- Database uses indexes for fast queries
- Connection pooling enabled
- Optimized for hundreds of concurrent users

---

## 🚀 Production Deployment

### Backend

1. Update environment variables
2. Use production database
3. Enable HTTPS
4. Set up reverse proxy (nginx)
5. Configure domain name

### Mobile App

```bash
# Build production APK
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

---

## 📞 Support

- Check logs: `make logs`
- Check API health: `curl http://localhost:3001/health`
- View Docker status: `make status`

---

## 🎉 Success!

Your AttendEase app is now ready! 

**Key Points:**
✅ Backend running on port 3001
✅ Database migrated and ready
✅ Mobile app configured for Android
✅ Bluetooth permissions set up
✅ All screens implemented
✅ Real-time attendance working

Start by running `make up` and `npm start`!

---

**Made with ❤️ for MNIT**
