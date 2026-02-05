# 🪟 Vultr Windows VPS Setup Guide

## ✅ **Recommendation: TEMPORARY VPS (1-2 days)**

**Why temporary?**
- ✅ You only need Windows for EA compilation (one-time task)
- ✅ Your production system runs on Ubuntu (already working)
- ✅ Cost: ~$0.20-0.40 vs $6-12/month permanent
- ✅ No ongoing maintenance needed

**When to use permanent?**
- ❌ Only if you plan to compile EAs frequently (weekly/monthly)
- ❌ Only if you need Windows for other tasks
- ❌ Not needed for your current setup

---

## 🚀 **Step-by-Step: Temporary Windows VPS**

### **Step 1: Sign Up for Vultr** (2 minutes)

1. Go to: https://www.vultr.com/
2. Click "Sign Up" (top right)
3. Create account (email + password)
4. **Verify email** (check inbox)
5. **Add payment method** (credit card - only charged for what you use)

**Note:** Vultr gives $5 free credit for new accounts!

---

### **Step 2: Create Windows VPS** (3 minutes)

1. **Login** to Vultr dashboard
2. Click **"Deploy"** → **"Deploy Server"**
3. **Settings:**
   - **Server Type:** Regular Performance
   - **Server Location:** Choose closest to you (e.g., New York, Los Angeles)
   - **Operating System:** Windows → **Windows Server 2022**
   - **Server Size:** **Regular Performance - $6/month** (smallest is fine)
   - **Auto Backups:** OFF (not needed for temporary)
   - **Enable IPv6:** OFF (not needed)
   - **SSH Keys:** Skip (we'll use RDP password)
4. Click **"Deploy Now"**

5. **Wait 2-3 minutes** for server to deploy
6. **Get credentials:**
   - Click on your server in dashboard
   - Go to **"Overview"** tab
   - You'll see:
     - **IP Address:** (e.g., 45.76.xxx.xxx)
     - **Username:** Administrator
     - **Password:** (click "Show" to reveal)

**Save these credentials!**

---

### **Step 3: Connect from Mac** (2 minutes)

1. **Install Microsoft Remote Desktop:**
   ```bash
   # Option 1: App Store
   open "macappstore://apps.apple.com/app/microsoft-remote-desktop/id1295203466"
   
   # Option 2: Download manually
   # https://apps.apple.com/app/microsoft-remote-desktop/id1295203466
   ```

2. **Add Connection:**
   - Open Microsoft Remote Desktop
   - Click **"+"** → **"Add PC"**
   - **PC Name:** Your VPS IP address (from Step 2)
   - **User Account:** Administrator
   - **Password:** (from Step 2)
   - Click **"Add"**

3. **Connect:**
   - Double-click the connection
   - Accept security certificate
   - You're now in Windows!

---

### **Step 4: Compile EA & Extract Files** (15 minutes)

Once connected to Windows VPS:

#### **4.1: Download MetaEditor**
1. Open **Edge browser** in Windows
2. Go to: https://www.mql5.com/en/download
3. Download **MetaEditor** (free, ~50MB)
4. Install it (default settings)

#### **4.2: Get EA Source Code**
1. In Windows, open **Notepad**
2. I'll provide the EA code (or you can download from your Mac)
3. Save as: `C:\Users\Administrator\Desktop\ImperialSync.mq5`

#### **4.3: Compile EA**
1. Open **MetaEditor**
2. File → Open → Select `ImperialSync.mq5`
3. Press **F7** (or click Compile button)
4. Look for: `✓ 0 error(s), 0 warning(s)`
5. Compiled file is at:
   ```
   C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\Common\MQL5\Experts\ImperialSync.ex5
   ```
6. **Copy to Desktop** for easy access

#### **4.4: Install EC Markets MT5**
1. Go to: https://ecmarkets.com/mt5-download
2. Download EC Markets MT5 installer
3. Install it
4. Open MT5 once (let it connect)
5. Copy `C:\Program Files\EC Markets MT5\config\servers.dat`
6. Save to Desktop as: `ec-servers.dat`

#### **4.5: Install XS.com MT5**
1. Go to: https://xs.com/mt5
2. Download XS.com MT5 installer
3. Install it
4. Open MT5 once (let it connect)
5. Copy `C:\Program Files\XS MT5\config\servers.dat`
6. Save to Desktop as: `xs-servers.dat`

#### **4.6: Download Files to Mac**
In Microsoft Remote Desktop:
1. Right-click the connection → **"Edit"**
2. Go to **"Redirection"** tab
3. Enable **"Drives"** → Select your Mac's drive
4. Reconnect
5. In Windows, open **File Explorer**
6. You'll see your Mac drive under **"This PC"**
7. Copy these 3 files to your Mac Desktop:
   - `ImperialSync.ex5`
   - `ec-servers.dat`
   - `xs-servers.dat`

---

### **Step 5: Upload to Ubuntu VPS** (2 minutes)

Back on your Mac:

```bash
# Make sure files are on Desktop
ls ~/Desktop/ImperialSync.ex5
ls ~/Desktop/ec-servers.dat
ls ~/Desktop/xs-servers.dat

# Run upload script
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
./upload-to-vps.sh
```

---

### **Step 6: Destroy Windows VPS** (1 minute)

1. Go back to Vultr dashboard
2. Click on your Windows server
3. Click **"Settings"** → **"Destroy"**
4. Type server name to confirm
5. **Done!** (You'll only be charged for the hours used)

**Cost:** ~$0.20-0.40 for 1-2 days of use

---

## 💰 **Cost Breakdown**

| Item | Cost |
|------|------|
| Vultr Windows VPS ($6/month) | $0.20/day |
| Used for 1-2 days | $0.20-0.40 |
| **Total** | **~$0.30** |

**With $5 free credit:** Actually **FREE** for first use! 🎉

---

## ⚡ **Quick Command Reference**

### **From Mac Terminal:**

```bash
# 1. Download EA source (if needed)
scp root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.mq5 ~/Desktop/

# 2. After compiling on Windows VPS, upload:
./upload-to-vps.sh

# 3. Verify on Ubuntu VPS:
ssh root@209.222.12.247 "ls -la /root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.ex5"
```

---

## ✅ **Checklist**

- [ ] Vultr account created
- [ ] Windows VPS deployed
- [ ] Connected via Remote Desktop
- [ ] MetaEditor installed
- [ ] EA compiled successfully
- [ ] Speed files extracted
- [ ] Files copied to Mac
- [ ] Uploaded to Ubuntu VPS
- [ ] Windows VPS destroyed
- [ ] System tested and working

---

## 🆘 **Troubleshooting**

**Q: Can't connect via RDP?**
- Check Windows VPS is running (green status in Vultr)
- Verify IP address is correct
- Make sure password is copied correctly (no extra spaces)

**Q: MetaEditor won't compile?**
- Make sure you copied the ENTIRE EA code
- Check for typos
- Try downloading latest MetaEditor version

**Q: Can't find servers.dat?**
- Make sure you opened MT5 at least once after installing
- Check: `C:\Program Files\*MT5*\config\servers.dat`
- Or search for "servers.dat" in File Explorer

**Q: Files not showing in Mac drive?**
- Re-enable drive redirection in Remote Desktop settings
- Reconnect after enabling
- Try copying to Windows Desktop first, then to Mac drive

---

## 🎯 **My Recommendation**

**YES, use temporary Vultr Windows VPS!**

**Why:**
- ✅ Fastest method (20 minutes total)
- ✅ Cheapest ($0.20-0.40, or FREE with credit)
- ✅ No long-term commitment
- ✅ Easy to set up
- ✅ One-time task

**After compilation:**
- Destroy the VPS
- Your Ubuntu VPS handles everything
- No ongoing Windows costs

**Ready to start?** Follow the steps above! 🚀
