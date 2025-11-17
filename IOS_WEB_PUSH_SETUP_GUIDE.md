# iOS Web Push Notifications - Complete Setup Guide

## 📱 Overview

Trade Imperial now supports **web push notifications on iOS and iPadOS 16.4+**! This guide explains how to enable notifications on your iPhone or iPad.

---

## ✅ Requirements

Before you can receive push notifications on iOS:

1. **iOS/iPadOS Version**: 16.4 or higher
   - Check: Settings → General → About → iOS Version
   - Update if needed: Settings → General → Software Update

2. **Browser Support**: Works on Safari, Chrome, and Edge
   - ✅ **Safari** (recommended)
   - ✅ **Chrome** for iOS
   - ✅ **Edge** for iOS

3. **HTTPS Connection**: Trade Imperial is already served over HTTPS ✅

4. **Add to Home Screen**: **Required** for iOS notifications (see below)

---

## 🚀 How to Enable Notifications on iOS

### Step 1: Add Trade Imperial to Your Home Screen

**This is the most important step for iOS notifications!**

#### **Using Safari (Recommended)**

1. Open **tradeimperial.com** in Safari
2. Tap the **Share** button (box with arrow pointing up) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right corner
5. You'll see the Trade Imperial icon on your home screen

#### **Using Chrome or Edge**

1. Open **tradeimperial.com** in Chrome or Edge
2. Tap the **three dots** (⋯) menu
3. Tap **"Add to Home Screen"** or **"Install app"**
4. Tap **"Add"** or **"Install"**
5. The Trade Imperial icon appears on your home screen

---

### Step 2: Open Trade Imperial from Your Home Screen

**Important**: You must open the app from the home screen icon, not from the browser!

1. Tap the **Trade Imperial icon** on your home screen
2. The app will open in full-screen mode (no browser bars)
3. Log in to your account

---

### Step 3: Navigate to Signal Stream

1. Go to **Dashboard** → **Signal Stream**
2. Wait 2 seconds for the app to initialize

---

### Step 4: Enable Notifications

You'll see **TWO prompts** - both are required:

#### **First Prompt: Custom Modal (Trade Imperial)**
- Explains the benefits of notifications
- Shows what notifications you'll receive
- Click **"Enable Notifications"** to continue

#### **Second Prompt: iOS Native Prompt**
- This is the system security confirmation
- Shows "Trade Imperial Would Like to Send You Notifications"
- **Tap "Allow"** to enable notifications ✅

---

### Step 5: Verify Notifications Are Enabled

Look for the **bell icon** in the top right corner of Signal Stream:

- 🔔 **Ringing bell** (animated) = Notifications enabled ✅
- 🔕 **Bell with slash** (gray) = Notifications disabled ❌

---

## 🔔 What Notifications You'll Receive

Once enabled, you'll get instant notifications for:

### **Trade Signals**
- 🚨 New signals posted
- 💰 Take Profit (TP) hits
- ⚠️ Stop Loss (SL) hits
- ✅ Signal closed in profit
- 📝 Signal updates and notes

### **Notification Features**
- 🎵 Sound alerts
- 📊 Real-time price updates
- 💬 Provider notes
- 📈 Pips gain/loss
- ⏰ Timestamp

---

## 🛠️ Troubleshooting

### "I don't see the notification prompt"

**Solution**: You must:
1. Add the app to your home screen (Step 1)
2. Open from the home screen icon (Step 2)
3. Navigate to Signal Stream (Step 3)
4. Wait 2 seconds for the prompt to appear

### "I tapped 'Don't Allow' by mistake"

**Solution**: Re-enable notifications manually:
1. Go to iOS **Settings**
2. Scroll down to **Trade Imperial** (or **Safari** if using Safari)
3. Tap **Notifications**
4. Turn on **Allow Notifications**
5. Restart the Trade Imperial app

### "Notifications stopped working"

**Solution**: Try these steps:
1. **Hard refresh the app**: Swipe up to close, reopen from home screen
2. **Check iOS settings**: Settings → Trade Imperial → Notifications → Ensure enabled
3. **Reinstall to home screen**: Remove icon, re-add from Safari/Chrome
4. **Check iOS version**: Must be 16.4+ (Settings → General → About)
5. **Check internet connection**: Notifications require active internet

### "I'm on iOS 16.4+ but still not working"

**Common issues**:
- ❌ Opening from browser instead of home screen icon
- ❌ Not waiting for 2-second initialization delay
- ❌ Background App Refresh disabled (Settings → General → Background App Refresh)
- ❌ Low Power Mode enabled (disables push notifications)
- ❌ Focus Mode/Do Not Disturb enabled

---

## 📊 Browser Compatibility

| Browser | iOS Version | Status | Notes |
|---------|-------------|--------|-------|
| **Safari** | 16.4+ | ✅ Fully Supported | Recommended |
| **Chrome** | 16.4+ | ✅ Fully Supported | Install via Chrome menu |
| **Edge** | 16.4+ | ✅ Fully Supported | Install via Edge menu |
| Firefox | 16.4+ | ⚠️ Limited | No PWA support yet |

---

## 🔒 Privacy & Permissions

### What We Track
- Notification delivery status
- Device type (iOS, browser)
- Subscription status

### What We Don't Track
- Your location
- Browsing history
- Personal data (beyond email/name)

### Unsubscribe Anytime
- Tap the bell icon (🔕) in Signal Stream
- Or: iOS Settings → Trade Imperial → Notifications → Off

---

## 📱 iOS vs Desktop Notifications

| Feature | iOS (Home Screen) | Desktop (Browser) |
|---------|-------------------|-------------------|
| Requires Add to Home Screen | ✅ Yes | ❌ No |
| Modern popup modal | ✅ Yes | ✅ Yes |
| Native notification center | ✅ Yes | ✅ Yes |
| Sound alerts | ✅ Yes | ✅ Yes |
| Recent activity history | ✅ Yes | ✅ Yes |
| Works across logout | ✅ Yes | ✅ Yes |

---

## 🎯 Best Practices

### For Best Notification Experience:

1. **Always open from home screen icon**
   - Don't use Safari bookmarks or browser tabs
   - Use the dedicated home screen icon

2. **Keep app updated**
   - Check for updates regularly
   - Clear cache if experiencing issues (Settings → Safari → Clear History and Website Data)

3. **Enable Background App Refresh**
   - Settings → General → Background App Refresh → On

4. **Disable Low Power Mode**
   - Low Power Mode disables push notifications

5. **Check Focus Mode settings**
   - Ensure Trade Imperial is allowed during Focus

---

## 🧪 Testing Your Setup

### Quick Test (2 minutes):

1. Open Trade Imperial from home screen icon
2. Go to Signal Stream
3. Look for the bell icon (🔔) - should be animated
4. Wait for a new signal or notification
5. You should see:
   - Modern popup in upper right corner ✅
   - iOS notification banner at top ✅
   - Entry in Recent Activity bell icon ✅

---

## 📞 Need Help?

If you're still having issues after following this guide:

1. **Check our documentation**: [iOS Web Push Requirements](#requirements)
2. **Contact support**: support@tradeimperial.com
3. **Discord community**: Ask in #tech-support channel
4. **Include in your message**:
   - iOS version
   - Browser used
   - Screenshot of bell icon
   - Error messages (if any)

---

## 🔄 Updates & Improvements (2025)

### Recent Enhancements:
- ✅ Cross-browser support (Safari, Chrome, Edge)
- ✅ iOS 17+ improved reliability
- ✅ Better notification prompt UX
- ✅ Auto-subscription on login
- ✅ Persistent notification history

### Known Limitations:
- ⚠️ Must add to home screen (Apple requirement)
- ⚠️ Occasional reliability issues (monitoring in progress)
- ⚠️ Low Power Mode disables notifications
- ⚠️ Focus Mode may block notifications

---

## ✅ Technical Checklist (For Developers)

Trade Imperial has implemented all iOS web push requirements:

- ✅ **HTTPS**: Served over secure connection
- ✅ **Manifest**: Valid `manifest.json` with:
  - `$schema`: JSON schema for validation
  - `name`: "Trade Imperial"
  - `display`: "standalone"
  - `start_url`: "/"
  - `icons`: 192x192, 512x512 PNG icons
  - `id`: "?homescreen=1" for unique instances
- ✅ **Service Worker**: OneSignal service worker installed
- ✅ **Permission Prompt**: User-initiated (appears in Signal Stream)
- ✅ **Safari Web ID**: Configured for Safari push
- ✅ **OneSignal App ID**: `c6d5466e-9ca7-40b2-90db-57ec42d385ef`

---

## 📚 Additional Resources

- [Apple iOS Web Push Documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [OneSignal iOS Web Push Guide](https://documentation.onesignal.com/docs/ios-web-push-setup)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Web App Manifest Validator](https://manifest-validator.appspot.com/)

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.14  
**iOS Support**: 16.4+  
**Status**: ✅ Production Ready

