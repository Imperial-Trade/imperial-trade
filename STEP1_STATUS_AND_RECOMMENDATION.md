# Step 1: MT5 Options Configuration Status

## ✅ Current Status:

The MT5 configuration file (`common.ini`) **already contains** the Supabase URL:
- Found: `AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co`
- Location: Appears to be in a `[WebRequest]` section

## ⚠️ Configuration File Format:

MT5 configuration files are in **UTF-16LE encoding**, making programmatic editing complex.

## 🔍 Verification Needed:

According to MT5 documentation, the URL should be in the `[Experts]` section as:
- `WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co`

However, the current file shows it in a `[WebRequest]` section as:
- `AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co`

## 📋 Options:

### Option A: Verify in MT5 GUI (Recommended)
1. Access MT5 on the VPS (via VNC/Remote Desktop)
2. Tools → Options → Expert Advisors
3. Check "Allow WebRequest for listed URL"
4. Verify URL is listed: `https://kmuoqkcxguafxulqlbmi.supabase.co`
5. If not, add it manually

### Option B: Test if Current Config Works
- The URL is already in the file
- May work in current format
- Test the EA to see if WebRequest works

## ✅ Next Steps:

Since the URL appears to be configured, we can:
1. **Proceed to Step 2** (Test broker connection)
2. **If WebRequest fails**, then manually configure via MT5 GUI
