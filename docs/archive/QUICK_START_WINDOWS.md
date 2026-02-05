# ⚡ Quick Start: What "Use Your Existing Windows PC" Means

## 🎯 What You Need to Do

**"Use existing Windows"** means: Use your **current Windows computer** (the one you're already using) to compile the EA and extract speed files. **You don't need to buy anything new!**

---

## 📋 The 3 Tasks (All on Your Windows PC)

### **Task 1: Compile the EA** (5 minutes)
1. Download MetaEditor (free) from mql5.com
2. Open `ImperialSync.mq5` (already downloaded to your project folder)
3. Press **F7** to compile
4. You'll get `ImperialSync.ex5` → Put it on your **Mac Desktop**

### **Task 2: Get EC Markets Speed File** (3 minutes)
1. Install EC Markets MT5 from ecmarkets.com
2. Open it once (let it connect)
3. Copy `C:\Program Files\EC Markets MT5\config\servers.dat`
4. Save to your **Mac Desktop** as `ec-servers.dat`

### **Task 3: Get XS.com Speed File** (3 minutes)
1. Install XS.com MT5 from xs.com
2. Open it once (let it connect)
3. Copy `C:\Program Files\XS MT5\config\servers.dat`
4. Save to your **Mac Desktop** as `xs-servers.dat`

---

## 🚀 Then Upload Everything (2 minutes)

After you have these 3 files on your **Mac Desktop**:

```bash
# Just run this one command from your Mac terminal:
./upload-to-vps.sh
```

**That's it!** The script will:
- ✅ Upload the compiled EA
- ✅ Upload both speed files
- ✅ Rebuild the Docker image
- ✅ Restart Go Brain

---

## 📁 Files You'll Have on Mac Desktop

After completing the Windows tasks:

```
~/Desktop/
├── ImperialSync.ex5      (compiled EA)
├── ec-servers.dat        (EC Markets speed file)
└── xs-servers.dat        (XS.com speed file)
```

---

## ❓ Common Questions

**Q: Do I need to buy a Windows VPS?**
- **No!** Use your existing Windows PC/laptop

**Q: Can I do this on Mac instead?**
- EA compilation: No, needs Windows MetaEditor
- Speed files: No, needs actual broker MT5 installations
- **BUT** upload is from your Mac (easy!)

**Q: How long does this take?**
- Total: ~15 minutes
- Most time is downloading/installing MT5

**Q: Can I skip the speed files?**
- Yes, but connections will be slower (30s vs 12s)
- The system will still work with generic files

**Q: What if I don't have Windows?**
- Option 1: Borrow a friend's Windows PC for 15 minutes
- Option 2: Use a Windows VM (VirtualBox/Parallels)
- Option 3: Skip EA compilation (system works but creates empty files)
- Option 4: Use a temporary Windows VPS for 1 day ($1-2)

---

## 📖 Full Instructions

See `WINDOWS_COMPILATION_GUIDE.md` for detailed step-by-step instructions with screenshots guide.

---

## ✅ Summary

1. **Windows PC** → Compile EA + Extract files (15 min)
2. **Mac** → Upload to VPS (2 min, automated script)
3. **Done!** → System is production-ready

**The files are already prepared in your project folder!**
- ✅ `ImperialSync.mq5` - EA source code (ready to compile)
- ✅ `upload-to-vps.sh` - Automated upload script
- ✅ `WINDOWS_COMPILATION_GUIDE.md` - Detailed instructions
