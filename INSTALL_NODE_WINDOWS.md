# 📦 INSTALL NODE.JS ON WINDOWS (Multiple Options)

## 🖥️ **YOUR SYSTEM:**

**OS:** Windows 10/11 (Build 26200)  
**Shell:** PowerShell

---

## ⚡ **OPTION 1: WINGET (Fastest - Recommended)**

### **If you have Windows Package Manager (winget):**

```powershell
# Install Node.js LTS via winget:
winget install OpenJS.NodeJS.LTS

# Or install latest version:
winget install OpenJS.NodeJS
```

**After installation:**
1. Close and reopen PowerShell
2. Verify: `node --version`

**Time:** 2-3 minutes ⚡

---

## 🌐 **OPTION 2: DIRECT DOWNLOAD (Most Common)**

### **From nodejs.org:**

1. **Go to:** https://nodejs.org/
2. **Click:** Green "LTS" button (v20.x or v22.x)
3. **Download:** Windows Installer (.msi)
4. **Run installer** and accept defaults
5. **Restart terminal**
6. **Verify:** `node --version`

**Time:** 5 minutes

---

## 🍫 **OPTION 3: CHOCOLATEY (If installed)**

### **If you have Chocolatey package manager:**

```powershell
# Run PowerShell as Administrator, then:
choco install nodejs-lts

# Or latest version:
choco install nodejs
```

**After installation:**
1. Close and reopen PowerShell
2. Verify: `node --version`

**Time:** 3 minutes

---

## 🔧 **OPTION 4: SCOOP (If installed)**

### **If you have Scoop package manager:**

```powershell
scoop install nodejs-lts

# Or latest version:
scoop install nodejs
```

**After installation:**
1. Close and reopen PowerShell
2. Verify: `node --version`

**Time:** 3 minutes

---

## 🐧 **OPTION 5: WSL + HOMEBREW (Advanced)**

### **If you have WSL (Windows Subsystem for Linux) installed:**

```bash
# In WSL terminal:
# Install Homebrew first (if not installed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js:
brew install node

# Verify:
node --version
```

**Note:** This installs Node.js in WSL only, not in Windows PowerShell.

**Time:** 10-15 minutes (if setting up WSL + Homebrew)

---

## ⚠️ **IMPORTANT NOTE ABOUT HOMEBREW:**

**Homebrew is for macOS and Linux, NOT native Windows.**

Your system is **Windows**, so:
- ❌ `brew install node` won't work in PowerShell
- ✅ Use **winget**, **direct download**, **chocolatey**, or **scoop** instead
- ⚠️ Homebrew ONLY works if you have WSL installed

---

## ✅ **RECOMMENDED FOR YOU:**

### **Best Option for Windows:**

**Use WINGET (if available)** or **Direct Download**

```powershell
# Check if winget is available:
winget --version

# If yes, run:
winget install OpenJS.NodeJS.LTS

# If no, download from: https://nodejs.org/
```

---

## 🧪 **AFTER INSTALLATION - VERIFY:**

```powershell
# Close ALL terminals, open NEW PowerShell, then run:
node --version
# Expected: v20.x.x or v22.x.x

npm --version
# Expected: 10.x.x

# Then install project dependencies:
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
npm install
```

---

## 📊 **COMPARISON:**

| Method | Speed | Ease | Requirements |
|--------|-------|------|--------------|
| **winget** | ⚡ Fastest | ✅ Easy | Windows 10 1709+ |
| **Direct Download** | 🟢 Fast | ✅ Easy | None |
| **Chocolatey** | 🟢 Fast | 🟡 Medium | Admin + Chocolatey |
| **Scoop** | 🟢 Fast | 🟡 Medium | Scoop installed |
| **WSL + Homebrew** | 🔴 Slow | 🔴 Hard | WSL setup |

---

## 🎯 **RECOMMENDATION:**

1. **Try winget first** (fastest)
2. **If winget not available**, use **direct download** (easiest)
3. **Avoid Homebrew** unless you specifically need WSL

---

## 💡 **QUICK START (Copy-Paste):**

```powershell
# Try winget first:
winget install OpenJS.NodeJS.LTS

# If that fails, download from:
# https://nodejs.org/

# After installation:
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
npm install
```

**Time to get running:** 5-10 minutes total

---

*System detected: Windows 10/11*  
*Recommended: winget or direct download*  
*Homebrew: macOS/Linux only (not for Windows PowerShell)*

