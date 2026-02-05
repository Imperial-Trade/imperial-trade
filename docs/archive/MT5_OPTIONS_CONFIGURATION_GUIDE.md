# MT5 Options Configuration Guide

## Step 1: Configure MT5 Options

Since MT5 requires GUI access to configure options, you have two options:

### Option A: Manual Configuration (Via Remote Desktop/VNC)

1. **Connect to VPS with GUI access:**
   - Use VNC, Remote Desktop, or X11 forwarding
   - Or access MT5 directly on the VPS if you have GUI access

2. **Open MT5 Options:**
   - Tools → Options → Expert Advisors tab

3. **Add WebRequest URL:**
   - Check "Allow WebRequest for listed URL"
   - Click "+ add new URL"
   - Add: `https://kmuoqkcxguafxulqlbmi.supabase.co`
   - Click OK

### Option B: Programmatic Configuration (If Available)

MT5 settings are typically stored in registry or configuration files. Checking for programmatic methods...
