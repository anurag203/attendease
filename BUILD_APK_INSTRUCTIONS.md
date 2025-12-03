# 📱 Building APK for AttendEase

## Option 1: EAS Build (Cloud Build - RECOMMENDED)

### Step 1: Login to EAS
```bash
eas login
# Use your email: anuragagarwal203@gmail.com
```

### Step 2: Configure Build
```bash
eas build:configure
```

### Step 3: Build APK
```bash
# Build APK (not AAB)
eas build -p android --profile preview
```

This will:
- ✅ Build on Expo's cloud servers
- ✅ Take ~10-15 minutes
- ✅ Give you a download link for the APK
- ✅ APK can be installed on ANY Android device
- ✅ No need for same network

### Cost: FREE for first build, then requires paid plan

---

## Option 2: Local Build with expo-dev-client

### Step 1: Install dependencies
```bash
npm install expo-dev-client
```

### Step 2: Prebuild
```bash
npx expo prebuild
```

### Step 3: Build locally
```bash
npx expo run:android --variant release
```

This will create an APK in: `android/app/build/outputs/apk/release/`

---

## Option 3: Use Tunnel Mode (NO APK NEEDED!)

If both devices can access internet:

### Step 1: Stop current expo
```bash
# Press Ctrl+C in terminal running expo
```

### Step 2: Start with tunnel
```bash
npx expo start --tunnel
```

### Step 3: Scan QR code on other device
- Works on ANY network
- Both devices just need internet
- No APK build needed!

---

## 🎯 RECOMMENDED APPROACH:

**For Quick Testing:** Use **Option 3 (Tunnel Mode)**
- Fastest
- No build required
- Works across networks

**For Distribution:** Use **Option 1 (EAS Build)**
- Professional APK
- Can share with anyone
- No Expo Go needed

---

## Current Backend Configuration:

Your backend is currently configured for: `192.168.0.102:3001`

**For other networks, you need to either:**
1. Deploy backend to cloud (Heroku, Railway, etc.)
2. Use ngrok to expose local backend
3. Update API_URL in `src/services/api.js` to public IP

---

## Quick Steps for Tunnel Mode (RIGHT NOW):

1. Stop expo: `Ctrl+C` in terminal
2. Run: `npx expo start --tunnel`
3. Scan new QR code on any device
4. App will work!

**Note:** Backend still needs to be accessible. For testing on different network, you need to:
- Deploy backend to cloud, OR
- Use ngrok for backend: `ngrok http 3001`
