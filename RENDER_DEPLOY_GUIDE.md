# 🆓 Deploy AttendEase Backend to Render.com (100% FREE)

## ✅ **Why Render?**
- 100% FREE forever
- No credit card required
- Free PostgreSQL database
- Auto-deploy from GitHub

---

## 📝 **Quick Deployment Steps:**

### **Step 1: Push Code to GitHub**

```bash
cd /Users/anuagar2/Desktop/attendance_app

# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "AttendEase - Complete app with all features"

# Create repo on GitHub (via browser)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/attendease.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy PostgreSQL Database**

1. Go to: https://dashboard.render.com/
2. Click "New" → "PostgreSQL"
3. Settings:
   - Name: `attendease-db`
   - Database: `attendease`
   - User: `attendease`
   - Region: `Singapore` (closest to India)
   - Plan: **Free** ✅
4. Click "Create Database"
5. **Copy the "Internal Database URL"** (we'll need this)

---

### **Step 3: Deploy Backend**

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - Name: `attendease-backend`
   - Region: `Singapore`
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Docker`
   - Plan: **Free** ✅
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<paste Internal Database URL from Step 2>
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ```
5. Click "Create Web Service"

---

### **Step 4: Run Migrations**

After backend deploys:

1. Go to your backend service
2. Click "Shell" tab
3. Run:
   ```bash
   npm run migrate
   ```

---

### **Step 5: Get Your Backend URL**

Your backend will be at:
```
https://attendease-backend.onrender.com
```

Copy this URL!

---

### **Step 6: Update Mobile App**

Update the API URL in your mobile app:

```javascript
// src/services/api.js
const API_URL = 'https://attendease-backend.onrender.com/api';
```

Then rebuild your APK:
```bash
eas build -p android --profile preview
```

---

## 🎉 **Done!**

Your app will now work on ANY network, ANY device!

---

## ⚡ **Important Notes:**

### **Free Tier Limitations:**
- ⏱️ **Spins down after 15 min of inactivity**
- ⏰ **First request after sleep takes ~30-60 seconds**
- 💾 **750 hours/month free** (enough for small usage)
- 🗄️ **Database: 1GB storage, 97 connections**

### **For Production:**
Consider upgrading to paid tier ($7/month) for:
- No spin down
- Instant responses
- More resources

---

## 🚨 **Cold Start Fix:**

To keep service warm, use a cron job:
```bash
# Ping every 14 minutes
*/14 * * * * curl https://attendease-backend.onrender.com/health
```

Or use: https://uptimerobot.com/ (free)

---

## 📊 **Current Status:**

✅ EAS Build: Running (APK being built)
⏳ Next: Deploy backend to Render
📱 Then: Update API URL and rebuild APK

---

**Ready to deploy? Follow the steps above!**
