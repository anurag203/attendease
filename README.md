# 📋 Attendance App

A modern React Native attendance tracking app built with Expo.

## Features

- ✅ Mark students as present/absent with a simple tap
- ➕ Add new students dynamically
- 📊 Real-time attendance counter
- 🎨 Modern dark theme UI
- 📱 Optimized for Android

## Prerequisites

Before running the app, make sure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Expo Go app** installed on your Android device - [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

OR

- **Android Studio** with an Android emulator set up - [Setup guide](https://docs.expo.dev/workflow/android-studio-emulator/)

## Installation

The dependencies are already installed. If you need to reinstall them:

```bash
npm install
```

## Running on Android

### Option 1: Physical Android Device (Easiest)

1. **Start the development server:**

   ```bash
   npm start
   ```

2. **Open Expo Go app** on your Android device

3. **Scan the QR code** that appears in the terminal with the Expo Go app

4. The app will load on your device! 🎉

### Option 2: Android Emulator

1. **Start your Android emulator** in Android Studio

2. **Run the app:**

   ```bash
   npm run android
   ```

3. The app will automatically build and launch on the emulator

### Option 3: Web Preview (for testing)

```bash
npm run web
```

## Usage

- **Mark Attendance:** Tap on any student card to toggle between Present (green) and Absent (red)
- **Add Student:** Type a name in the input field and press the "+ Add" button
- **View Stats:** The header shows the current attendance count

## Project Structure

```text
attendance_app/
├── App.js              # Main application component
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── assets/             # Images and icons
```

## Building for Production

### Generate APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### Generate AAB (for Play Store)

```bash
eas build --platform android --profile production
```

## Technologies Used

- **React Native 0.81.5** - Mobile framework
- **Expo ~54.0** - Development platform
- **React 19.1** - UI library

## Troubleshooting

### Metro bundler issues

```bash
npm start -- --reset-cache
```

### Port already in use

```bash
npm start -- --port 8082
```

### Android build fails

- Make sure Android Studio is properly installed
- Check that ANDROID_HOME environment variable is set
- Ensure you have accepted all Android SDK licenses

## Future Enhancements

- 💾 Persistent storage with AsyncStorage
- 📅 Date-wise attendance history
- 📧 Export attendance reports
- 🔔 Push notifications
- 👤 User authentication

## License

MIT License - feel free to use this project for learning or commercial purposes!

---

**Happy Coding!** 🚀
