# 🔧 How to Open MetaEditor on Mac

## ✅ **QUICK METHOD (Easiest)**

### **Step 1: Open MetaTrader 5**
- Open the **MetaTrader 5** app from Applications
- Or press `Cmd + Space` and type "MetaTrader 5"

### **Step 2: Open MetaEditor**
**Option A: Keyboard Shortcut (Fastest)**
- Press **`F4`** key in MetaTrader 5
- MetaEditor will open automatically

**Option B: Menu**
- Click **Tools** → **MetaQuotes Language Editor**
- Or: **Tools** → **MetaEditor**

### **Step 3: Open Your EA File**
- In MetaEditor, press **`Cmd + O`** (or File → Open)
- Navigate to: `/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/`
- Select: **`ImperialSync.mq5`**
- Click **Open**

### **Step 4: Compile**
- Press **`F7`** key (or click **Compile** button)
- Wait for: **"0 error(s), 0 warning(s)"**
- ✅ **Done!** The compiled `.ex5` file will be created

---

## 📍 **File Locations**

**EA Source Code:**
```
/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/ImperialSync.mq5
```

**Compiled EA (after compilation):**
```
/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/ImperialSync.ex5
```

---

## 🎯 **Quick Reference**

| Action | Keyboard Shortcut |
|--------|------------------|
| Open MetaEditor | **F4** (in MT5) |
| Open File | **Cmd + O** |
| Compile | **F7** |
| Save | **Cmd + S** |

---

## ⚠️ **If MetaEditor Doesn't Open:**

1. **Check MT5 is running:**
   - Make sure MetaTrader 5 app is open (not just Wine version)

2. **Try alternative:**
   - Go to: **Tools** → **Options** → **Expert Advisors**
   - Click **Open Data Folder**
   - Navigate to `MQL5/Experts/`
   - Double-click `ImperialSync.mq5`
   - This should open in default editor (but compilation may not work)

3. **If F4 doesn't work:**
   - Look for MetaEditor in the Applications folder
   - Or check: `/Applications/MetaTrader 5.app/Contents/`

---

## ✅ **After Compilation:**

Once you see **"0 error(s), 0 warning(s)"**, tell me:
- ✅ **"EA compiled"** or **"Done"**

I'll immediately:
1. Find the compiled `.ex5` file
2. Upload it to the VPS
3. Test the complete system!

---

**Time Required:** ~2 minutes  
**Difficulty:** Easy (just F4 → Open File → F7)
