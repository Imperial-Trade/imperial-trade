# Complete VPS MT5 Installation Guide

Step-by-step guide to install MetaTrader 5 on your Windows VPS and set up the broker sync service.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Windows VPS running (Vultr/DigitalOcean)
- [ ] Remote Desktop access to VPS
- [ ] Admin privileges on VPS
- [ ] Your broker credentials ready (Login ID, Password, Server)

---

## Part 1: Install MetaTrader 5 on VPS

### Step 1: Download MT5 Terminal

1. **Open Remote Desktop Connection** to your VPS
2. **Open Internet Explorer or Edge** on the VPS
3. **Navigate to MetaTrader 5 download page:**
   ```
   https://www.metatrader5.com/en/download
   ```
4. **Click "Download MetaTrader 5"** (Desktop version for Windows)
5. **Save the installer** to `C:\Downloads\` or Desktop

### Step 2: Install MT5

1. **Locate the downloaded file** (usually `mt5setup.exe`)
2. **Right-click** → **Run as Administrator**
3. **Follow the installation wizard:**
   - Click "Next" on welcome screen
   - Accept license agreement
   - Choose installation location (default: `C:\Program Files\MetaTrader 5`)
   - Click "Next" → "Install"
   - Wait for installation to complete (2-3 minutes)
   - Click "Finish"

### Step 3: Configure MT5 for Your Broker

1. **Launch MetaTrader 5** from Desktop or Start Menu
2. **On first launch**, you'll see the broker selection screen
3. **Search for your broker:**
   - **EC Markets**: Type "EC Markets" in search
   - **XS.com**: Type "XS.com" in search
   - **PU Prime**: Type "PU Prime" in search
4. **Select your broker** from the list
5. **Click "Next"**
6. **Enter your credentials:**
   - Login: Your MT5 account number
   - Password: Your MT5 password
   - Server: Select from dropdown (e.g., "ECMarkets-MT5-Live01")
7. **Click "Finish"**
8. **Wait for connection** - MT5 should connect and show your account

### Step 4: Verify MT5 Connection

1. **Check bottom right corner** of MT5 - should show "Connected" in green
2. **Right-click on your account** in Navigator panel → **Properties**
3. **Verify account info** is displayed correctly
4. **Keep MT5 running** - DO NOT close it (needed for Python scripts)

---

## Part 2: Install Python and MetaTrader5 Library

### Step 5: Install Python 3.8+

1. **Open a web browser** on VPS
2. **Go to:** https://www.python.org/downloads/
3. **Download Python 3.11** (or latest 3.x version)
4. **Run the installer:**
   - ✅ **IMPORTANT:** Check "Add Python to PATH"
   - Click "Install Now"
   - Wait for installation
5. **Verify installation:**
   - Open **Command Prompt** (cmd)
   - Type: `python --version`
   - Should show: `Python 3.11.x` (or similar)

### Step 6: Install MetaTrader5 Python Library

1. **Open Command Prompt as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Command Prompt (Admin)"
2. **Install the library:**
   ```bash
   pip install MetaTrader5
   ```
3. **Wait for installation** (may take 1-2 minutes)
4. **Verify installation:**
   ```bash
   pip list | findstr MetaTrader5
   ```
   Should show: `MetaTrader5 x.x.x`

---

## Part 3: Install Node.js

### Step 7: Download and Install Node.js

1. **Open browser** on VPS
2. **Go to:** https://nodejs.org/
3. **Download LTS version** (recommended, e.g., 20.x)
4. **Run the installer:**
   - Click through the wizard
   - Accept defaults
   - ✅ Make sure "Add to PATH" is checked
   - Click "Install"
5. **Verify installation:**
   - Open **new Command Prompt**
   - Type: `node --version`
   - Should show: `v20.x.x` (or similar)
   - Type: `npm --version`
   - Should show: `10.x.x` (or similar)

---

## Part 4: Set Up Broker Service

### Step 8: Copy Broker Service to VPS

**Option A: Using FileZilla (Recommended)**

1. **Download FileZilla** on your local machine: https://filezilla-project.org/
2. **Connect to VPS:**
   - Host: `sftp://YOUR_VPS_IP`
   - Username: `Administrator` (or your VPS username)
   - Password: Your VPS password
   - Port: `22` (or `22` for SFTP)
3. **Navigate to:** `C:\` on VPS (right side)
4. **Upload the `vps-broker-service` folder:**
   - Find `vps-broker-service` on your local machine (left side)
   - Drag and drop to `C:\` on VPS
   - Wait for upload to complete

**Option B: Using Shared Folder (If already set up)**

1. **Copy `vps-broker-service` folder** to shared folder
2. **On VPS**, copy from shared folder to `C:\`

**Option C: Using Git (If Git is installed on VPS)**

1. **Open Command Prompt** on VPS
2. **Navigate to C:\**
   ```bash
   cd C:\
   ```
3. **Clone or download** the service files

### Step 9: Install Service Dependencies

1. **Open Command Prompt** on VPS
2. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
3. **Install Node.js packages:**
   ```bash
   npm install
   ```
4. **Wait for installation** (2-3 minutes)
5. **Verify installation:**
   ```bash
   dir node_modules
   ```
   Should show many folders

### Step 10: Configure Environment Variables

1. **In the `vps-broker-service` folder**, find `.env.example`
2. **Copy it to `.env`:**
   ```bash
   copy .env.example .env
   ```
3. **Open `.env` in Notepad:**
   ```bash
   notepad .env
   ```
4. **Edit the file** with these values:

   ```env
   PORT=3000
   VPS_API_KEY=generate-a-random-secure-key-here
   ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

5. **Generate a secure API key:**
   - Open PowerShell
   - Run: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
   - Copy the result and paste as `VPS_API_KEY`
   - **OR** use an online generator: https://randomkeygen.com/
   - Use a 32+ character random string

6. **Save the file** (Ctrl+S) and close Notepad

### Step 11: Build and Test the Service

1. **Build TypeScript:**
   ```bash
   npm run build
   ```
2. **Verify build succeeded:**
   - Should see `dist` folder created
   - No error messages

3. **Test the service:**
   ```bash
   npm start
   ```
4. **You should see:**
   ```
   🚀 Imperial Trade Broker Service running on port 3000
   📝 API Key required: Set
   ```
5. **Keep this window open** for now (we'll set it up as a service next)

6. **Test health endpoint** (in a new Command Prompt):
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","service":"imperial-trade-broker-service"}`

7. **Stop the service** (in the first window, press `Ctrl+C`)

---

## Part 5: Set Up as Windows Service (24/7)

### Step 12: Install PM2 (Process Manager)

1. **Open Command Prompt as Administrator**
2. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```
3. **Wait for installation**

### Step 13: Start Service with PM2

1. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
2. **Start service with PM2:**
   ```bash
   pm2 start dist/index.js --name "imperial-broker-service"
   ```
3. **Check status:**
   ```bash
   pm2 status
   ```
   Should show `imperial-broker-service` as "online"

4. **Save PM2 configuration:**
   ```bash
   pm2 save
   ```

5. **Set up auto-start on boot:**
   ```bash
   pm2 startup
   ```
   This will show a command - **copy and run it** (it will be something like `pm2 startup windows`)

### Step 14: Configure Windows Firewall

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule:**
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP"
   - Enter port: `3000`
   - Select "Allow the connection"
   - Check all profiles (Domain, Private, Public)
   - Name: "Imperial Broker Service"
   - Click "Finish"

3. **Verify rule is active** (should appear in Inbound Rules list)

---

## Part 6: Get Your VPS IP Address

### Step 15: Find Your Public IP

1. **Open Command Prompt**
2. **Run:**
   ```bash
   curl ifconfig.me
   ```
   OR
   ```bash
   curl ipinfo.io/ip
   ```
3. **Copy the IP address** (e.g., `123.45.67.89`)
4. **This is your `VPS_MT5_SERVICE_URL`** = `http://123.45.67.89:3000`

---

## Part 7: Test Everything

### Step 16: Test from Your Local Machine

1. **On your local machine**, open a browser or terminal
2. **Test health endpoint:**
   ```bash
   curl http://YOUR_VPS_IP:3000/health
   ```
   Replace `YOUR_VPS_IP` with the IP from Step 15

3. **Should return:**
   ```json
   {"status":"ok","service":"imperial-trade-broker-service"}
   ```

4. **If it doesn't work:**
   - Check Windows Firewall (Step 14)
   - Verify service is running: `pm2 status`
   - Check VPS provider firewall settings (may need to open port 3000)

---

## Part 8: Configure Supabase

### Step 17: Set Supabase Secrets

1. **Go to Supabase Dashboard:** https://app.supabase.com
2. **Select your project**
3. **Go to:** Settings → Edge Functions → Secrets
4. **Add these secrets:**

   **Secret 1: VPS_MT5_SERVICE_URL**
   - Name: `VPS_MT5_SERVICE_URL`
   - Value: `http://YOUR_VPS_IP:3000` (from Step 15)

   **Secret 2: VPS_API_KEY**
   - Name: `VPS_API_KEY`
   - Value: (the same value you put in VPS `.env` file in Step 10)

   **Secret 3: ENCRYPTION_SECRET**
   - Name: `ENCRYPTION_SECRET`
   - Value: `ImperialTrade_BrokerEncryption_2025_v1`

5. **Click "Save"** for each secret

---

## Part 9: Deploy Edge Functions

### Step 18: Deploy from Your Local Machine

1. **Open terminal** on your local machine
2. **Navigate to project:**
   ```bash
   cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
   ```
3. **Login to Supabase** (if not already):
   ```bash
   supabase login
   ```
4. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find PROJECT_REF in Supabase dashboard → Settings → General)

5. **Deploy test-broker-connection:**
   ```bash
   supabase functions deploy test-broker-connection
   ```

6. **Deploy sync-broker-trades:**
   ```bash
   supabase functions deploy sync-broker-trades
   ```

7. **Verify deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - Both functions should be listed and "Active"

---

## Part 10: Final Testing

### Step 19: Test in Frontend

1. **Make sure frontend `.env` has:**
   ```env
   VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Go to Journal XX Pro** in your app

4. **Test broker connection:**
   - Select a broker (EC Markets, XS.com, or PU Prime)
   - Enter your MT5 credentials
   - Click "Connect Broker"
   - Should show success message

5. **Test trade sync:**
   - After connecting, click the sync button
   - Should fetch and display your trades

---

## Troubleshooting

### MT5 Not Connecting
- ✅ Ensure MT5 terminal is running on VPS
- ✅ Verify credentials are correct
- ✅ Check MT5 shows "Connected" in bottom right
- ✅ Try re-entering credentials in MT5

### Python Script Errors
- ✅ Verify MetaTrader5 library: `pip list | findstr MetaTrader5`
- ✅ Ensure MT5 is running when testing
- ✅ Check Python version: `python --version` (should be 3.8+)

### Service Not Starting
- ✅ Check Node.js: `node --version`
- ✅ Verify `.env` file exists and has correct values
- ✅ Check PM2 status: `pm2 status`
- ✅ View logs: `pm2 logs imperial-broker-service`

### Can't Access from Internet
- ✅ Check Windows Firewall (Step 14)
- ✅ Check VPS provider firewall (may need to open port 3000 in VPS dashboard)
- ✅ Verify service is running: `pm2 status`
- ✅ Test locally first: `curl http://localhost:3000/health`

### Edge Function Errors
- ✅ Verify Supabase secrets are set correctly
- ✅ Check VPS_API_KEY matches in both places
- ✅ Verify VPS_MT5_SERVICE_URL is correct (with http:// and :3000)
- ✅ Check Edge Function logs in Supabase dashboard

---

## Maintenance

### View Service Logs
```bash
pm2 logs imperial-broker-service
```

### Restart Service
```bash
pm2 restart imperial-broker-service
```

### Stop Service
```bash
pm2 stop imperial-broker-service
```

### Update Service
1. Stop service: `pm2 stop imperial-broker-service`
2. Update code
3. Rebuild: `npm run build`
4. Start: `pm2 start dist/index.js --name "imperial-broker-service"`
5. Save: `pm2 save`

---

## Success Checklist

- [ ] MT5 installed and connected to broker
- [ ] Python 3.8+ installed
- [ ] MetaTrader5 library installed
- [ ] Node.js 18+ installed
- [ ] Broker service copied to VPS
- [ ] Service dependencies installed (`npm install`)
- [ ] `.env` file configured with API key
- [ ] Service builds successfully (`npm run build`)
- [ ] Service runs locally (`npm start` works)
- [ ] PM2 installed and service running
- [ ] Windows Firewall configured
- [ ] Service accessible from internet (`curl http://IP:3000/health`)
- [ ] Supabase secrets configured
- [ ] Edge functions deployed
- [ ] Frontend can connect to broker
- [ ] Trade sync works

---

## Next Steps After Setup

1. **Monitor logs regularly:** `pm2 logs imperial-broker-service`
2. **Set up automatic sync** (already implemented - runs every 5 minutes)
3. **Monitor sync errors** in `broker_connections.last_error` table
4. **Consider adding SSL/HTTPS** for production (use reverse proxy like nginx)
5. **Set up alerts** for service downtime

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs imperial-broker-service`
3. Check Supabase Edge Function logs
4. Verify all secrets and environment variables match

Good luck! 🚀


Step-by-step guide to install MetaTrader 5 on your Windows VPS and set up the broker sync service.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Windows VPS running (Vultr/DigitalOcean)
- [ ] Remote Desktop access to VPS
- [ ] Admin privileges on VPS
- [ ] Your broker credentials ready (Login ID, Password, Server)

---

## Part 1: Install MetaTrader 5 on VPS

### Step 1: Download MT5 Terminal

1. **Open Remote Desktop Connection** to your VPS
2. **Open Internet Explorer or Edge** on the VPS
3. **Navigate to MetaTrader 5 download page:**
   ```
   https://www.metatrader5.com/en/download
   ```
4. **Click "Download MetaTrader 5"** (Desktop version for Windows)
5. **Save the installer** to `C:\Downloads\` or Desktop

### Step 2: Install MT5

1. **Locate the downloaded file** (usually `mt5setup.exe`)
2. **Right-click** → **Run as Administrator**
3. **Follow the installation wizard:**
   - Click "Next" on welcome screen
   - Accept license agreement
   - Choose installation location (default: `C:\Program Files\MetaTrader 5`)
   - Click "Next" → "Install"
   - Wait for installation to complete (2-3 minutes)
   - Click "Finish"

### Step 3: Configure MT5 for Your Broker

1. **Launch MetaTrader 5** from Desktop or Start Menu
2. **On first launch**, you'll see the broker selection screen
3. **Search for your broker:**
   - **EC Markets**: Type "EC Markets" in search
   - **XS.com**: Type "XS.com" in search
   - **PU Prime**: Type "PU Prime" in search
4. **Select your broker** from the list
5. **Click "Next"**
6. **Enter your credentials:**
   - Login: Your MT5 account number
   - Password: Your MT5 password
   - Server: Select from dropdown (e.g., "ECMarkets-MT5-Live01")
7. **Click "Finish"**
8. **Wait for connection** - MT5 should connect and show your account

### Step 4: Verify MT5 Connection

1. **Check bottom right corner** of MT5 - should show "Connected" in green
2. **Right-click on your account** in Navigator panel → **Properties**
3. **Verify account info** is displayed correctly
4. **Keep MT5 running** - DO NOT close it (needed for Python scripts)

---

## Part 2: Install Python and MetaTrader5 Library

### Step 5: Install Python 3.8+

1. **Open a web browser** on VPS
2. **Go to:** https://www.python.org/downloads/
3. **Download Python 3.11** (or latest 3.x version)
4. **Run the installer:**
   - ✅ **IMPORTANT:** Check "Add Python to PATH"
   - Click "Install Now"
   - Wait for installation
5. **Verify installation:**
   - Open **Command Prompt** (cmd)
   - Type: `python --version`
   - Should show: `Python 3.11.x` (or similar)

### Step 6: Install MetaTrader5 Python Library

1. **Open Command Prompt as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Command Prompt (Admin)"
2. **Install the library:**
   ```bash
   pip install MetaTrader5
   ```
3. **Wait for installation** (may take 1-2 minutes)
4. **Verify installation:**
   ```bash
   pip list | findstr MetaTrader5
   ```
   Should show: `MetaTrader5 x.x.x`

---

## Part 3: Install Node.js

### Step 7: Download and Install Node.js

1. **Open browser** on VPS
2. **Go to:** https://nodejs.org/
3. **Download LTS version** (recommended, e.g., 20.x)
4. **Run the installer:**
   - Click through the wizard
   - Accept defaults
   - ✅ Make sure "Add to PATH" is checked
   - Click "Install"
5. **Verify installation:**
   - Open **new Command Prompt**
   - Type: `node --version`
   - Should show: `v20.x.x` (or similar)
   - Type: `npm --version`
   - Should show: `10.x.x` (or similar)

---

## Part 4: Set Up Broker Service

### Step 8: Copy Broker Service to VPS

**Option A: Using FileZilla (Recommended)**

1. **Download FileZilla** on your local machine: https://filezilla-project.org/
2. **Connect to VPS:**
   - Host: `sftp://YOUR_VPS_IP`
   - Username: `Administrator` (or your VPS username)
   - Password: Your VPS password
   - Port: `22` (or `22` for SFTP)
3. **Navigate to:** `C:\` on VPS (right side)
4. **Upload the `vps-broker-service` folder:**
   - Find `vps-broker-service` on your local machine (left side)
   - Drag and drop to `C:\` on VPS
   - Wait for upload to complete

**Option B: Using Shared Folder (If already set up)**

1. **Copy `vps-broker-service` folder** to shared folder
2. **On VPS**, copy from shared folder to `C:\`

**Option C: Using Git (If Git is installed on VPS)**

1. **Open Command Prompt** on VPS
2. **Navigate to C:\**
   ```bash
   cd C:\
   ```
3. **Clone or download** the service files

### Step 9: Install Service Dependencies

1. **Open Command Prompt** on VPS
2. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
3. **Install Node.js packages:**
   ```bash
   npm install
   ```
4. **Wait for installation** (2-3 minutes)
5. **Verify installation:**
   ```bash
   dir node_modules
   ```
   Should show many folders

### Step 10: Configure Environment Variables

1. **In the `vps-broker-service` folder**, find `.env.example`
2. **Copy it to `.env`:**
   ```bash
   copy .env.example .env
   ```
3. **Open `.env` in Notepad:**
   ```bash
   notepad .env
   ```
4. **Edit the file** with these values:

   ```env
   PORT=3000
   VPS_API_KEY=generate-a-random-secure-key-here
   ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

5. **Generate a secure API key:**
   - Open PowerShell
   - Run: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
   - Copy the result and paste as `VPS_API_KEY`
   - **OR** use an online generator: https://randomkeygen.com/
   - Use a 32+ character random string

6. **Save the file** (Ctrl+S) and close Notepad

### Step 11: Build and Test the Service

1. **Build TypeScript:**
   ```bash
   npm run build
   ```
2. **Verify build succeeded:**
   - Should see `dist` folder created
   - No error messages

3. **Test the service:**
   ```bash
   npm start
   ```
4. **You should see:**
   ```
   🚀 Imperial Trade Broker Service running on port 3000
   📝 API Key required: Set
   ```
5. **Keep this window open** for now (we'll set it up as a service next)

6. **Test health endpoint** (in a new Command Prompt):
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","service":"imperial-trade-broker-service"}`

7. **Stop the service** (in the first window, press `Ctrl+C`)

---

## Part 5: Set Up as Windows Service (24/7)

### Step 12: Install PM2 (Process Manager)

1. **Open Command Prompt as Administrator**
2. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```
3. **Wait for installation**

### Step 13: Start Service with PM2

1. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
2. **Start service with PM2:**
   ```bash
   pm2 start dist/index.js --name "imperial-broker-service"
   ```
3. **Check status:**
   ```bash
   pm2 status
   ```
   Should show `imperial-broker-service` as "online"

4. **Save PM2 configuration:**
   ```bash
   pm2 save
   ```

5. **Set up auto-start on boot:**
   ```bash
   pm2 startup
   ```
   This will show a command - **copy and run it** (it will be something like `pm2 startup windows`)

### Step 14: Configure Windows Firewall

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule:**
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP"
   - Enter port: `3000`
   - Select "Allow the connection"
   - Check all profiles (Domain, Private, Public)
   - Name: "Imperial Broker Service"
   - Click "Finish"

3. **Verify rule is active** (should appear in Inbound Rules list)

---

## Part 6: Get Your VPS IP Address

### Step 15: Find Your Public IP

1. **Open Command Prompt**
2. **Run:**
   ```bash
   curl ifconfig.me
   ```
   OR
   ```bash
   curl ipinfo.io/ip
   ```
3. **Copy the IP address** (e.g., `123.45.67.89`)
4. **This is your `VPS_MT5_SERVICE_URL`** = `http://123.45.67.89:3000`

---

## Part 7: Test Everything

### Step 16: Test from Your Local Machine

1. **On your local machine**, open a browser or terminal
2. **Test health endpoint:**
   ```bash
   curl http://YOUR_VPS_IP:3000/health
   ```
   Replace `YOUR_VPS_IP` with the IP from Step 15

3. **Should return:**
   ```json
   {"status":"ok","service":"imperial-trade-broker-service"}
   ```

4. **If it doesn't work:**
   - Check Windows Firewall (Step 14)
   - Verify service is running: `pm2 status`
   - Check VPS provider firewall settings (may need to open port 3000)

---

## Part 8: Configure Supabase

### Step 17: Set Supabase Secrets

1. **Go to Supabase Dashboard:** https://app.supabase.com
2. **Select your project**
3. **Go to:** Settings → Edge Functions → Secrets
4. **Add these secrets:**

   **Secret 1: VPS_MT5_SERVICE_URL**
   - Name: `VPS_MT5_SERVICE_URL`
   - Value: `http://YOUR_VPS_IP:3000` (from Step 15)

   **Secret 2: VPS_API_KEY**
   - Name: `VPS_API_KEY`
   - Value: (the same value you put in VPS `.env` file in Step 10)

   **Secret 3: ENCRYPTION_SECRET**
   - Name: `ENCRYPTION_SECRET`
   - Value: `ImperialTrade_BrokerEncryption_2025_v1`

5. **Click "Save"** for each secret

---

## Part 9: Deploy Edge Functions

### Step 18: Deploy from Your Local Machine

1. **Open terminal** on your local machine
2. **Navigate to project:**
   ```bash
   cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
   ```
3. **Login to Supabase** (if not already):
   ```bash
   supabase login
   ```
4. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find PROJECT_REF in Supabase dashboard → Settings → General)

5. **Deploy test-broker-connection:**
   ```bash
   supabase functions deploy test-broker-connection
   ```

6. **Deploy sync-broker-trades:**
   ```bash
   supabase functions deploy sync-broker-trades
   ```

7. **Verify deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - Both functions should be listed and "Active"

---

## Part 10: Final Testing

### Step 19: Test in Frontend

1. **Make sure frontend `.env` has:**
   ```env
   VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Go to Journal XX Pro** in your app

4. **Test broker connection:**
   - Select a broker (EC Markets, XS.com, or PU Prime)
   - Enter your MT5 credentials
   - Click "Connect Broker"
   - Should show success message

5. **Test trade sync:**
   - After connecting, click the sync button
   - Should fetch and display your trades

---

## Troubleshooting

### MT5 Not Connecting
- ✅ Ensure MT5 terminal is running on VPS
- ✅ Verify credentials are correct
- ✅ Check MT5 shows "Connected" in bottom right
- ✅ Try re-entering credentials in MT5

### Python Script Errors
- ✅ Verify MetaTrader5 library: `pip list | findstr MetaTrader5`
- ✅ Ensure MT5 is running when testing
- ✅ Check Python version: `python --version` (should be 3.8+)

### Service Not Starting
- ✅ Check Node.js: `node --version`
- ✅ Verify `.env` file exists and has correct values
- ✅ Check PM2 status: `pm2 status`
- ✅ View logs: `pm2 logs imperial-broker-service`

### Can't Access from Internet
- ✅ Check Windows Firewall (Step 14)
- ✅ Check VPS provider firewall (may need to open port 3000 in VPS dashboard)
- ✅ Verify service is running: `pm2 status`
- ✅ Test locally first: `curl http://localhost:3000/health`

### Edge Function Errors
- ✅ Verify Supabase secrets are set correctly
- ✅ Check VPS_API_KEY matches in both places
- ✅ Verify VPS_MT5_SERVICE_URL is correct (with http:// and :3000)
- ✅ Check Edge Function logs in Supabase dashboard

---

## Maintenance

### View Service Logs
```bash
pm2 logs imperial-broker-service
```

### Restart Service
```bash
pm2 restart imperial-broker-service
```

### Stop Service
```bash
pm2 stop imperial-broker-service
```

### Update Service
1. Stop service: `pm2 stop imperial-broker-service`
2. Update code
3. Rebuild: `npm run build`
4. Start: `pm2 start dist/index.js --name "imperial-broker-service"`
5. Save: `pm2 save`

---

## Success Checklist

- [ ] MT5 installed and connected to broker
- [ ] Python 3.8+ installed
- [ ] MetaTrader5 library installed
- [ ] Node.js 18+ installed
- [ ] Broker service copied to VPS
- [ ] Service dependencies installed (`npm install`)
- [ ] `.env` file configured with API key
- [ ] Service builds successfully (`npm run build`)
- [ ] Service runs locally (`npm start` works)
- [ ] PM2 installed and service running
- [ ] Windows Firewall configured
- [ ] Service accessible from internet (`curl http://IP:3000/health`)
- [ ] Supabase secrets configured
- [ ] Edge functions deployed
- [ ] Frontend can connect to broker
- [ ] Trade sync works

---

## Next Steps After Setup

1. **Monitor logs regularly:** `pm2 logs imperial-broker-service`
2. **Set up automatic sync** (already implemented - runs every 5 minutes)
3. **Monitor sync errors** in `broker_connections.last_error` table
4. **Consider adding SSL/HTTPS** for production (use reverse proxy like nginx)
5. **Set up alerts** for service downtime

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs imperial-broker-service`
3. Check Supabase Edge Function logs
4. Verify all secrets and environment variables match

Good luck! 🚀


Step-by-step guide to install MetaTrader 5 on your Windows VPS and set up the broker sync service.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Windows VPS running (Vultr/DigitalOcean)
- [ ] Remote Desktop access to VPS
- [ ] Admin privileges on VPS
- [ ] Your broker credentials ready (Login ID, Password, Server)

---

## Part 1: Install MetaTrader 5 on VPS

### Step 1: Download MT5 Terminal

1. **Open Remote Desktop Connection** to your VPS
2. **Open Internet Explorer or Edge** on the VPS
3. **Navigate to MetaTrader 5 download page:**
   ```
   https://www.metatrader5.com/en/download
   ```
4. **Click "Download MetaTrader 5"** (Desktop version for Windows)
5. **Save the installer** to `C:\Downloads\` or Desktop

### Step 2: Install MT5

1. **Locate the downloaded file** (usually `mt5setup.exe`)
2. **Right-click** → **Run as Administrator**
3. **Follow the installation wizard:**
   - Click "Next" on welcome screen
   - Accept license agreement
   - Choose installation location (default: `C:\Program Files\MetaTrader 5`)
   - Click "Next" → "Install"
   - Wait for installation to complete (2-3 minutes)
   - Click "Finish"

### Step 3: Configure MT5 for Your Broker

1. **Launch MetaTrader 5** from Desktop or Start Menu
2. **On first launch**, you'll see the broker selection screen
3. **Search for your broker:**
   - **EC Markets**: Type "EC Markets" in search
   - **XS.com**: Type "XS.com" in search
   - **PU Prime**: Type "PU Prime" in search
4. **Select your broker** from the list
5. **Click "Next"**
6. **Enter your credentials:**
   - Login: Your MT5 account number
   - Password: Your MT5 password
   - Server: Select from dropdown (e.g., "ECMarkets-MT5-Live01")
7. **Click "Finish"**
8. **Wait for connection** - MT5 should connect and show your account

### Step 4: Verify MT5 Connection

1. **Check bottom right corner** of MT5 - should show "Connected" in green
2. **Right-click on your account** in Navigator panel → **Properties**
3. **Verify account info** is displayed correctly
4. **Keep MT5 running** - DO NOT close it (needed for Python scripts)

---

## Part 2: Install Python and MetaTrader5 Library

### Step 5: Install Python 3.8+

1. **Open a web browser** on VPS
2. **Go to:** https://www.python.org/downloads/
3. **Download Python 3.11** (or latest 3.x version)
4. **Run the installer:**
   - ✅ **IMPORTANT:** Check "Add Python to PATH"
   - Click "Install Now"
   - Wait for installation
5. **Verify installation:**
   - Open **Command Prompt** (cmd)
   - Type: `python --version`
   - Should show: `Python 3.11.x` (or similar)

### Step 6: Install MetaTrader5 Python Library

1. **Open Command Prompt as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Command Prompt (Admin)"
2. **Install the library:**
   ```bash
   pip install MetaTrader5
   ```
3. **Wait for installation** (may take 1-2 minutes)
4. **Verify installation:**
   ```bash
   pip list | findstr MetaTrader5
   ```
   Should show: `MetaTrader5 x.x.x`

---

## Part 3: Install Node.js

### Step 7: Download and Install Node.js

1. **Open browser** on VPS
2. **Go to:** https://nodejs.org/
3. **Download LTS version** (recommended, e.g., 20.x)
4. **Run the installer:**
   - Click through the wizard
   - Accept defaults
   - ✅ Make sure "Add to PATH" is checked
   - Click "Install"
5. **Verify installation:**
   - Open **new Command Prompt**
   - Type: `node --version`
   - Should show: `v20.x.x` (or similar)
   - Type: `npm --version`
   - Should show: `10.x.x` (or similar)

---

## Part 4: Set Up Broker Service

### Step 8: Copy Broker Service to VPS

**Option A: Using FileZilla (Recommended)**

1. **Download FileZilla** on your local machine: https://filezilla-project.org/
2. **Connect to VPS:**
   - Host: `sftp://YOUR_VPS_IP`
   - Username: `Administrator` (or your VPS username)
   - Password: Your VPS password
   - Port: `22` (or `22` for SFTP)
3. **Navigate to:** `C:\` on VPS (right side)
4. **Upload the `vps-broker-service` folder:**
   - Find `vps-broker-service` on your local machine (left side)
   - Drag and drop to `C:\` on VPS
   - Wait for upload to complete

**Option B: Using Shared Folder (If already set up)**

1. **Copy `vps-broker-service` folder** to shared folder
2. **On VPS**, copy from shared folder to `C:\`

**Option C: Using Git (If Git is installed on VPS)**

1. **Open Command Prompt** on VPS
2. **Navigate to C:\**
   ```bash
   cd C:\
   ```
3. **Clone or download** the service files

### Step 9: Install Service Dependencies

1. **Open Command Prompt** on VPS
2. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
3. **Install Node.js packages:**
   ```bash
   npm install
   ```
4. **Wait for installation** (2-3 minutes)
5. **Verify installation:**
   ```bash
   dir node_modules
   ```
   Should show many folders

### Step 10: Configure Environment Variables

1. **In the `vps-broker-service` folder**, find `.env.example`
2. **Copy it to `.env`:**
   ```bash
   copy .env.example .env
   ```
3. **Open `.env` in Notepad:**
   ```bash
   notepad .env
   ```
4. **Edit the file** with these values:

   ```env
   PORT=3000
   VPS_API_KEY=generate-a-random-secure-key-here
   ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

5. **Generate a secure API key:**
   - Open PowerShell
   - Run: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
   - Copy the result and paste as `VPS_API_KEY`
   - **OR** use an online generator: https://randomkeygen.com/
   - Use a 32+ character random string

6. **Save the file** (Ctrl+S) and close Notepad

### Step 11: Build and Test the Service

1. **Build TypeScript:**
   ```bash
   npm run build
   ```
2. **Verify build succeeded:**
   - Should see `dist` folder created
   - No error messages

3. **Test the service:**
   ```bash
   npm start
   ```
4. **You should see:**
   ```
   🚀 Imperial Trade Broker Service running on port 3000
   📝 API Key required: Set
   ```
5. **Keep this window open** for now (we'll set it up as a service next)

6. **Test health endpoint** (in a new Command Prompt):
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","service":"imperial-trade-broker-service"}`

7. **Stop the service** (in the first window, press `Ctrl+C`)

---

## Part 5: Set Up as Windows Service (24/7)

### Step 12: Install PM2 (Process Manager)

1. **Open Command Prompt as Administrator**
2. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```
3. **Wait for installation**

### Step 13: Start Service with PM2

1. **Navigate to service folder:**
   ```bash
   cd C:\vps-broker-service
   ```
2. **Start service with PM2:**
   ```bash
   pm2 start dist/index.js --name "imperial-broker-service"
   ```
3. **Check status:**
   ```bash
   pm2 status
   ```
   Should show `imperial-broker-service` as "online"

4. **Save PM2 configuration:**
   ```bash
   pm2 save
   ```

5. **Set up auto-start on boot:**
   ```bash
   pm2 startup
   ```
   This will show a command - **copy and run it** (it will be something like `pm2 startup windows`)

### Step 14: Configure Windows Firewall

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule:**
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP"
   - Enter port: `3000`
   - Select "Allow the connection"
   - Check all profiles (Domain, Private, Public)
   - Name: "Imperial Broker Service"
   - Click "Finish"

3. **Verify rule is active** (should appear in Inbound Rules list)

---

## Part 6: Get Your VPS IP Address

### Step 15: Find Your Public IP

1. **Open Command Prompt**
2. **Run:**
   ```bash
   curl ifconfig.me
   ```
   OR
   ```bash
   curl ipinfo.io/ip
   ```
3. **Copy the IP address** (e.g., `123.45.67.89`)
4. **This is your `VPS_MT5_SERVICE_URL`** = `http://123.45.67.89:3000`

---

## Part 7: Test Everything

### Step 16: Test from Your Local Machine

1. **On your local machine**, open a browser or terminal
2. **Test health endpoint:**
   ```bash
   curl http://YOUR_VPS_IP:3000/health
   ```
   Replace `YOUR_VPS_IP` with the IP from Step 15

3. **Should return:**
   ```json
   {"status":"ok","service":"imperial-trade-broker-service"}
   ```

4. **If it doesn't work:**
   - Check Windows Firewall (Step 14)
   - Verify service is running: `pm2 status`
   - Check VPS provider firewall settings (may need to open port 3000)

---

## Part 8: Configure Supabase

### Step 17: Set Supabase Secrets

1. **Go to Supabase Dashboard:** https://app.supabase.com
2. **Select your project**
3. **Go to:** Settings → Edge Functions → Secrets
4. **Add these secrets:**

   **Secret 1: VPS_MT5_SERVICE_URL**
   - Name: `VPS_MT5_SERVICE_URL`
   - Value: `http://YOUR_VPS_IP:3000` (from Step 15)

   **Secret 2: VPS_API_KEY**
   - Name: `VPS_API_KEY`
   - Value: (the same value you put in VPS `.env` file in Step 10)

   **Secret 3: ENCRYPTION_SECRET**
   - Name: `ENCRYPTION_SECRET`
   - Value: `ImperialTrade_BrokerEncryption_2025_v1`

5. **Click "Save"** for each secret

---

## Part 9: Deploy Edge Functions

### Step 18: Deploy from Your Local Machine

1. **Open terminal** on your local machine
2. **Navigate to project:**
   ```bash
   cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
   ```
3. **Login to Supabase** (if not already):
   ```bash
   supabase login
   ```
4. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find PROJECT_REF in Supabase dashboard → Settings → General)

5. **Deploy test-broker-connection:**
   ```bash
   supabase functions deploy test-broker-connection
   ```

6. **Deploy sync-broker-trades:**
   ```bash
   supabase functions deploy sync-broker-trades
   ```

7. **Verify deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - Both functions should be listed and "Active"

---

## Part 10: Final Testing

### Step 19: Test in Frontend

1. **Make sure frontend `.env` has:**
   ```env
   VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Go to Journal XX Pro** in your app

4. **Test broker connection:**
   - Select a broker (EC Markets, XS.com, or PU Prime)
   - Enter your MT5 credentials
   - Click "Connect Broker"
   - Should show success message

5. **Test trade sync:**
   - After connecting, click the sync button
   - Should fetch and display your trades

---

## Troubleshooting

### MT5 Not Connecting
- ✅ Ensure MT5 terminal is running on VPS
- ✅ Verify credentials are correct
- ✅ Check MT5 shows "Connected" in bottom right
- ✅ Try re-entering credentials in MT5

### Python Script Errors
- ✅ Verify MetaTrader5 library: `pip list | findstr MetaTrader5`
- ✅ Ensure MT5 is running when testing
- ✅ Check Python version: `python --version` (should be 3.8+)

### Service Not Starting
- ✅ Check Node.js: `node --version`
- ✅ Verify `.env` file exists and has correct values
- ✅ Check PM2 status: `pm2 status`
- ✅ View logs: `pm2 logs imperial-broker-service`

### Can't Access from Internet
- ✅ Check Windows Firewall (Step 14)
- ✅ Check VPS provider firewall (may need to open port 3000 in VPS dashboard)
- ✅ Verify service is running: `pm2 status`
- ✅ Test locally first: `curl http://localhost:3000/health`

### Edge Function Errors
- ✅ Verify Supabase secrets are set correctly
- ✅ Check VPS_API_KEY matches in both places
- ✅ Verify VPS_MT5_SERVICE_URL is correct (with http:// and :3000)
- ✅ Check Edge Function logs in Supabase dashboard

---

## Maintenance

### View Service Logs
```bash
pm2 logs imperial-broker-service
```

### Restart Service
```bash
pm2 restart imperial-broker-service
```

### Stop Service
```bash
pm2 stop imperial-broker-service
```

### Update Service
1. Stop service: `pm2 stop imperial-broker-service`
2. Update code
3. Rebuild: `npm run build`
4. Start: `pm2 start dist/index.js --name "imperial-broker-service"`
5. Save: `pm2 save`

---

## Success Checklist

- [ ] MT5 installed and connected to broker
- [ ] Python 3.8+ installed
- [ ] MetaTrader5 library installed
- [ ] Node.js 18+ installed
- [ ] Broker service copied to VPS
- [ ] Service dependencies installed (`npm install`)
- [ ] `.env` file configured with API key
- [ ] Service builds successfully (`npm run build`)
- [ ] Service runs locally (`npm start` works)
- [ ] PM2 installed and service running
- [ ] Windows Firewall configured
- [ ] Service accessible from internet (`curl http://IP:3000/health`)
- [ ] Supabase secrets configured
- [ ] Edge functions deployed
- [ ] Frontend can connect to broker
- [ ] Trade sync works

---

## Next Steps After Setup

1. **Monitor logs regularly:** `pm2 logs imperial-broker-service`
2. **Set up automatic sync** (already implemented - runs every 5 minutes)
3. **Monitor sync errors** in `broker_connections.last_error` table
4. **Consider adding SSL/HTTPS** for production (use reverse proxy like nginx)
5. **Set up alerts** for service downtime

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs imperial-broker-service`
3. Check Supabase Edge Function logs
4. Verify all secrets and environment variables match

Good luck! 🚀




