# 📦 HOW TO INSTALL NODE.JS (Required for npm install)

## 🚨 **CURRENT ISSUE:**

**Error when trying to run npm:**
```
The term 'node' is not recognized...
```

**This means:** Node.js is NOT installed on your system.

---

## ✅ **INSTALL NODE.JS (5 MINUTES):**

### **Step 1: Download Node.js**

1. **Go to:** https://nodejs.org/

2. **Download LTS version** (Recommended for most users)
   - Click the big green "LTS" button
   - Should be version 20.x or newer
   - Choose Windows Installer (.msi)

### **Step 2: Install**

1. **Run the installer** (double-click the .msi file)

2. **Accept all defaults:**
   - ✅ Accept license agreement
   - ✅ Install location: `C:\Program Files\nodejs\`
   - ✅ Custom Setup: Leave all boxes checked
   - ✅ Install

3. **Wait for installation** (2-3 minutes)

### **Step 3: Verify Installation**

1. **Close ALL terminals** (PowerShell, CMD, etc.)

2. **Open NEW terminal** (important - old terminals won't see Node.js)

3. **Run these commands:**
   ```powershell
   node --version
   # Expected output: v20.x.x (or v22.x.x)
   
   npm --version
   # Expected output: 10.x.x
   ```

**If you see version numbers:** ✅ Node.js is installed!

**If you still see errors:** Restart your computer and try again

---

## 🚀 **THEN INSTALL DEPENDENCIES:**

### **After Node.js is installed:**

```powershell
# Navigate to project:
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"

# Install all dependencies:
npm install
```

**This will:**
- Create `node_modules` folder
- Download all packages (React, TypeScript, etc.)
- Fix TypeScript errors in VSCode
- Take 2-3 minutes

---

## 🎯 **VERIFICATION:**

### **After `npm install` completes:**

1. **Check VSCode:**
   - TypeScript errors should disappear
   - Red squiggles should be gone

2. **Run dev server (optional):**
   ```powershell
   npm run dev
   ```
   - Should see: "VITE ready in XXXms"
   - Open: http://localhost:5173

---

## ⚠️ **REMINDER:**

**Push notifications already work WITHOUT this!**

- ✅ Edge functions are deployed
- ✅ Production site is operational
- ✅ OneSignal is integrated
- ✅ You can test push notifications right now at https://tradeimperial.com

**This npm install is ONLY needed for:**
- Fixing TypeScript errors in VSCode
- Running local development server
- Building locally for production

---

## 📝 **SUMMARY:**

1. ✅ Install Node.js from https://nodejs.org/
2. ✅ Close and reopen terminal
3. ✅ Run `npm install` in project folder
4. ✅ TypeScript errors will disappear

**Time Required:** 5-10 minutes total

---

*Node.js Download: https://nodejs.org/*  
*Choose: LTS version (recommended)*  
*OS: Windows*

