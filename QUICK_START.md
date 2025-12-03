# 🚀 Quick Start Guide

## Start the Full Application

### 1. Start Backend Services (Docker)

```bash
make up
```

This starts:
- PostgreSQL database on port 5432
- Backend API on port 3001

### 2. Start Mobile App (React Native Expo)

```bash
npm start
```

Then scan the QR code with Expo Go on your Android device.

---

## Common Commands

```bash
make up       # Start all Docker services
make down     # Stop all services
make logs     # View service logs
make status   # Check service status
make build    # Rebuild Docker images
make mobile   # Start mobile app
```

---

## API Base URL

- **Local Development:** `http://localhost:3001`
- **For Mobile Device:** `http://YOUR_LOCAL_IP:3001`

To find your local IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## Test Credentials

Use these to test the app:

**Teacher Account:**
- Email: `teacher@test.com`
- Password: `password123`

**Class Code:** `XYRBG5`

---

## Project Structure

```text
attendance_app/
├── backend/              # Express.js API
│   ├── src/
│   │   ├── config/       # Database & config
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Auth middleware
│   │   └── routes/       # API routes
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml    # Docker configuration
├── Makefile              # Easy commands
├── App.js                # React Native app
└── package.json          # Mobile dependencies
```

---

## What's Ready

✅ PostgreSQL database with migrations  
✅ Backend API with authentication  
✅ Docker setup with `make up`  
✅ JWT-based auth system  
✅ Teacher & student roles  
✅ Class management  
✅ Attendance tracking API  
✅ React Native Expo mobile app shell

---

## Next: Tell Me Your Full Requirements

Now that infrastructure is tested and working, tell me:

1. **What features do you want?**
   - Specific attendance marking flows?
   - Student self-check-in?
   - QR code scanning?
   - Reports/analytics?
   - Notifications?

2. **UI/UX preferences?**
   - Screens you need
   - Navigation structure
   - Design preferences

3. **Any other requirements?**
   - Integration needs
   - Special workflows
   - Additional features

I'll implement the complete app based on your requirements! 🎯
