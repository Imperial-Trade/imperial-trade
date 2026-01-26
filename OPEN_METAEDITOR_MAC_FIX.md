# 🔧 Opening MetaEditor on Mac (F4 Issue Fix)

## ❌ **Problem:**
- F4 key opens **Spotlight Search** instead of MetaEditor
- This is normal Mac behavior (function keys have system shortcuts)

## ✅ **SOLUTION: 3 Ways to Open MetaEditor**

### **Option 1: Use Menu (Easiest)** ⭐ RECOMMENDED

1. **In MetaTrader 5:**
   - Click **Tools** at the top menu bar
   - Select **MetaQuotes Language Editor**
   - Or: **Tools** → **MetaEditor**

2. **MetaEditor window opens!**

---

### **Option 2: Use Fn + F4**

1. **Hold `Fn` key**
2. **Press `F4`** (while holding Fn)
3. This sends the actual F4 key to MT5 (not Spotlight)
4. MetaEditor opens!

---

### **Option 3: Keyboard Shortcuts Menu**

1. In MetaTrader 5:
   - Click **Tools** → **Options** (or Preferences)
   - Look for **Keyboard Shortcuts** or **Hotkeys**
   - Find **MetaEditor** or **Language Editor**
   - See what key is assigned (or change it)

---

## 🎯 **RECOMMENDED: Use Menu Method**

**Just do this:**
1. ✅ MetaTrader 5 is open
2. ✅ Click **Tools** (top menu)
3. ✅ Click **MetaQuotes Language Editor**
4. ✅ MetaEditor opens!
5. ✅ Press `Cmd + O` to open file
6. ✅ Navigate to: `ImperialSync.mq5`
7. ✅ Press `F7` to compile (F7 usually works without Fn)

---

## 📝 **After MetaEditor Opens:**

1. **Open File:**
   - `Cmd + O` (or File → Open)
   - Navigate to:
   ```
   /Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/
   ```
   - Select: **ImperialSync.mq5**

2. **Compile:**
   - Press **F7** (or click Compile button)
   - Wait for: **"0 error(s), 0 warning(s)"**

3. **Done!**
   - Tell me: **"EA compiled"** or **"Done"**

---

**Quick Path: Tools → MetaQuotes Language Editor → Open File → Compile (F7)**
