# Testing Instructions

## ✅ System Status

**Port 3001 Service**: ✅ **RUNNING**
- Health endpoint: Working
- Service: imperial-broker-service (PM2)
- Status: Online

## 🧪 Manual Testing Steps

### Step 1: Open the Application

1. **Navigate to**: https://tradeimperial.com/dashboard/journal-xx-pro
   - This is the Journal XX Pro page with broker connection functionality
   
2. **Or navigate to**: https://tradeimperial.com/dashboard/journal-xx
   - This is the Journal XX page

### Step 2: Login (if not already logged in)

- Sign in with your credentials

### Step 3: Test Broker Connection

1. **Look for the broker connection section**
   - Should be in the Auto Journal View or Journal XX Pro interface
   
2. **Try to connect a broker**:
   - Enter broker credentials (XS Markets, EC Markets, etc.)
   - Click "Connect" or "Save"
   
3. **Check the browser console** (F12 → Console tab):
   - Look for any errors
   - Check for connection status messages
   - Verify Edge Function calls

### Step 4: Test Manual Sync

1. **If a broker is already connected**:
   - Look for a "Sync Now" or "Sync Trades" button
   - Click it to trigger the `sync-broker-trades` Edge Function
   
2. **Monitor the console**:
   - Should see Edge Function call to `sync-broker-trades`
   - Edge Function should call: `http://209.222.12.247:3001/fetch-trades`
   - Check for success/error messages

### Step 5: Verify Service Communication

**Expected Flow:**
```
Frontend → Edge Function (sync-broker-trades) → VPS Service (port 3001) → Response
```

**Check for:**
- ✅ No "Connection timed out" errors
- ✅ No "Service not responding" errors  
- ✅ Successful API calls
- ✅ Trade data synced to database

## 🔍 What to Look For

### ✅ Success Indicators:
- Broker connection status updates
- Trades appearing in the journal
- No console errors
- Successful API responses

### ❌ Error Indicators:
- "Connection timed out"
- "Service not responding"
- "Edge Function returned non-2xx"
- Network errors in console

## 📋 Quick Test Checklist

- [ ] Open application at `/dashboard/journal-xx-pro`
- [ ] Open browser console (F12)
- [ ] Try connecting a broker OR sync existing connection
- [ ] Check console for errors
- [ ] Verify service communication
- [ ] Check if trades appear

---

## 🚀 System is Ready!

The VPS service is running and accessible. You can now test the complete flow!
