# 📊 EC Markets MT5 Setup for Price Feeder

## ✅ Important: EC Markets MT5 is for Price Feeder!

**YES** - `EC Markets MetaTrader 5` is for the **Imperial Price Feeder** service.

## 🔑 Key Differences

### EC Markets MT5 (Price Feeder)
- **Purpose**: Live price streaming to your website
- **Login**: `81071266`
- **Server**: `ECMarkets-MT5-Live01`
- **Path**: `C:\Program Files\MetaTrader 5\terminal64.exe` (Standard installation)
- **Portable Mode**: ❌ **NO** - Uses standard installation
- **Shortcut**: Can create one, but doesn't need `/portable` argument

### Generic MT5 (Broker Service)
- **Purpose**: User broker connections (EC Markets, XS.com, etc.)
- **Login**: User's broker account
- **Server**: User's broker server
- **Path**: `C:\MT5_BrokerService\terminal64.exe` (Portable mode)
- **Portable Mode**: ✅ **YES** - Uses isolated folder
- **Shortcut**: `MT5 Broker Service.lnk` (with `/portable`)

## 🚨 Why Live Prices Don't Work

**Common reasons:**
1. **EC Markets MT5 is NOT logged in**
   - Price Feeder needs MT5 to be open and logged in
   - Login: `81071266`
   - Server: `ECMarkets-MT5-Live01`

2. **Price Feeder service is stopped**
   - Check: `pm2 status`
   - Should show: `Imperial Price Feeder` as "online"

3. **MT5 terminal is closed**
   - Price Feeder needs MT5 to stay open

## 🔧 How to Fix Live Prices

### Step 1: Check Price Feeder Status
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 20
```

### Step 2: Open EC Markets MT5
- **Path**: `C:\Program Files\MetaTrader 5\terminal64.exe`
- **OR** use the desktop shortcut (if it exists)
- **DO NOT** use `/portable` argument (standard installation is fine)

### Step 3: Log In to EC Markets MT5
- **Login**: `81071266`
- **Password**: (Your EC Markets password)
- **Server**: `ECMarkets-MT5-Live01`
- **Keep MT5 open and logged in**

### Step 4: Restart Price Feeder
```powershell
pm2 restart "Imperial Price Feeder"
pm2 save
```

### Step 5: Verify Connection
```powershell
pm2 logs "Imperial Price Feeder" --lines 20
```

**Look for:**
- ✅ `MT5 connected`
- ✅ `Streaming prices to Imperial Trade...`
- ✅ Price updates in logs

## 📋 Creating EC Markets MT5 Shortcut (Optional)

If you want a shortcut for EC Markets MT5 (for Price Feeder):

```powershell
$desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "EC Markets MT5 (Price Feeder).lnk"

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\Program Files\MetaTrader 5\terminal64.exe"
$Shortcut.Arguments = ""  # NO /portable - uses standard installation
$Shortcut.WorkingDirectory = "C:\Program Files\MetaTrader 5"
$Shortcut.Description = "EC Markets MT5 for Price Feeder - Login: 81071266"
$Shortcut.IconLocation = "C:\Program Files\MetaTrader 5\terminal64.exe,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $shortcutPath" -ForegroundColor Green
```

## 🎯 Summary

| Service | MT5 Type | Portable Mode | Shortcut |
|---------|----------|---------------|----------|
| **Price Feeder** | EC Markets MT5 | ❌ NO | Optional (standard path) |
| **Broker Service** | Generic MT5 | ✅ YES | `MT5 Broker Service.lnk` |

---

**Status**: 🔍 **CHECKING PRICE FEEDER STATUS**
