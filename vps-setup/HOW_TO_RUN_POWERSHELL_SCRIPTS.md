# 🔧 How to Run PowerShell Scripts on VPS

## ❌ Common Error

**Error:** `The term '.\QUICK_CHECK_JOURNAL_XX_PRO.ps1' is not recognized`

## ✅ Solutions

### **Solution 1: Use Execution Policy Bypass (RECOMMENDED)**

```powershell
cd C:\vps-broker-service\vps-setup
powershell.exe -ExecutionPolicy Bypass -File .\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```

### **Solution 2: Use Full Path**

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```

### **Solution 3: Change Execution Policy (One-Time)**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
cd C:\vps-broker-service\vps-setup
.\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```

### **Solution 4: Use & Operator**

```powershell
cd C:\vps-broker-service\vps-setup
& .\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```

---

## 🔍 Why It Fails

1. **Script doesn't exist** - File wasn't copied to VPS
2. **Execution Policy** - PowerShell blocks unsigned scripts
3. **Path issues** - Wrong directory or path

---

## ✅ Correct Command Format

**Always use:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\SCRIPT_NAME.ps1
```

**Or:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\full\path\to\SCRIPT_NAME.ps1
```

---

## 📝 Quick Test

**To verify script exists:**
```powershell
Test-Path C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```

**Should return:** `True`

---

## ✅ RECOMMENDED COMMAND

```powershell
cd C:\vps-broker-service\vps-setup
powershell.exe -ExecutionPolicy Bypass -File .\QUICK_CHECK_JOURNAL_XX_PRO.ps1
```
