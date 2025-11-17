# 📱 iOS Notification Center Templates

This document shows the **exact notification formats** that will appear in iOS Notification Center, Lock Screen, and Banners for all signal types.

---

## 🎨 Notification Format

All notifications follow this structure:
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ [EMOJI] [EDUCATOR NAME] - [ACTION] -    │
│ [ASSET]                                  │
│ [DETAILED MESSAGE]                       │
│ [PIPS/ADDITIONAL INFO]                   │
└─────────────────────────────────────────┘
```

**Key Elements:**
- **Line 1**: "Trade Imperial" + timestamp
- **Line 2**: `[EMOJI] [Educator Name] - [Action] - [Asset]`
- **Line 3-4**: Detailed message + pips/price information

---

## 📋 All Notification Templates

### **1. Welcome Notification** (After Subscribing)
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ Welcome to Trade Imperial               │
│ You are now Subscribed to receive       │
│ alerts                                   │
└─────────────────────────────────────────┘
```

---

### **2. New BUY/SELL Signal**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 🚀 Jacob Estayo - New BUY Signal        │
│ Jacob Estayo posted a new BUY signal on │
│ Gold at $2,650.00                        │
└─────────────────────────────────────────┘
```

---

### **3. Pending Limit Order Created**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ ⏳ Jacob Estayo - Pending BUY LIMIT     │
│ Waiting to reach EUR/USD at 1.0900      │
└─────────────────────────────────────────┘
```

---

### **4. Limit Order Activated**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ ✅ Jacob Estayo - BUY Limit Activated   │
│ BUY LIMIT is activated on EUR/USD at    │
│ 1.0900                                   │
└─────────────────────────────────────────┘
```

---

### **5. Take Profit 1 Hit (TP1)**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 💰 Jacob Estayo - TP1 Hit               │
│ Gold hit Take Profit 1 at $2,650.00     │
│ +180.5 PIPS                              │
└─────────────────────────────────────────┘
```

---

### **6. Take Profit 2 Hit (TP2)**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 💰 Jacob Estayo - TP2 Hit               │
│ Bitcoin hit Take Profit 2 at $46,500    │
│ +220.3 PIPS                              │
└─────────────────────────────────────────┘
```

---

### **7. Take Profit 3 Hit (TP3)**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 💰 Jacob Estayo - TP3 Hit               │
│ EUR/USD hit Take Profit 3 at 1.0950     │
│ +95.0 PIPS                               │
└─────────────────────────────────────────┘
```

---

### **8. Take Profit 4 Hit (TP4)**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 💰 Jacob Estayo - TP4 Hit               │
│ GBP/USD hit Take Profit 4 at 1.2850     │
│ +130.2 PIPS                              │
└─────────────────────────────────────────┘
```

---

### **9. Take Profit 5 Hit (TP5) - ALL TPs HIT** 🎉
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 🎉 Jacob Estayo - ALL TPs HIT           │
│ Gold hit Final TP5 at $2,700.00          │
│ +500.0 PIPS 🏆 ALL PROFITS SECURED      │
└─────────────────────────────────────────┘
```

---

### **10. Stop Loss Hit**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ ⚠️ Jacob Estayo - Stop Loss Hit         │
│ EUR/USD hit Stop Loss at 1.0850         │
│ -50.2 PIPS                               │
└─────────────────────────────────────────┘
```

---

### **11. Signal Manually Closed**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 🔒 Jacob Estayo - Signal Closed         │
│ GBP/USD manually closed                 │
└─────────────────────────────────────────┘
```

---

### **12. Signal Closed in Profit** (Manual close after TP hits)
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ ✅ Jacob Estayo - Signal Closed in      │
│ Profit                                   │
│ Gold closed in profit at $2,680.00      │
│ +300.0 PIPS 🎉                           │
└─────────────────────────────────────────┘
```

---

### **13. Notes Updated**
```
┌─────────────────────────────────────────┐
│ Trade Imperial                     now  │
│ 📝 Jacob Estayo - Notes Updated         │
│ Jacob Estayo updated notes for Gold:    │
│ Watch for resistance at $2,700           │
└─────────────────────────────────────────┘
```

---

## 🎨 Visual Elements

### **Lock Screen Appearance:**
```
┌────────────────── iPhone ─────────────────┐
│                                            │
│           Monday, November 17              │
│                 10:30 AM                   │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ 👑 Trade Imperial            now      │ │
│  │ 💰 Jacob Estayo - TP1 Hit           │ │
│  │ Gold hit Take Profit 1 at $2,650     │ │
│  │ +180.5 PIPS                          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│         [Swipe to view all]                │
└────────────────────────────────────────────┘
```

### **Notification Center (Swipe Down):**
```
┌────────────────── Notifications ──────────┐
│                                            │
│  Trade Imperial                            │
│  ┌──────────────────────────────────────┐ │
│  │ 💰 Jacob Estayo - TP1 Hit       now  │ │
│  │ Gold hit Take Profit 1 at $2,650     │ │
│  │ +180.5 PIPS                          │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ 🚀 Jacob Estayo - New BUY Signal    │ │
│  │                                 2m ago│
│  │ Jacob Estayo posted a new BUY...     │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ Welcome to Trade Imperial       5m ago│
│  │ You are now Subscribed to receive... │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Clear All]                               │
└────────────────────────────────────────────┘
```

### **Banner Notification (Top of Screen):**
```
┌────────────────────────────────────────────┐
│ 👑 Trade Imperial                     now  │
│ 💰 Jacob Estayo - TP1 Hit                 │
│ Gold hit Take Profit 1 at $2,650           │
│ +180.5 PIPS                                │
└────────────────────────────────────────────┘
```
*Slides down from top, stays for 5 seconds, then slides up*

---

## 🔔 Notification Features

### **Each notification includes:**
- ✅ **App Icon**: Trade Imperial crown logo 👑
- ✅ **Educator Name**: Always displayed (e.g., "Jacob Estayo")
- ✅ **Asset Name**: Always displayed (e.g., "Gold", "EUR/USD")
- ✅ **Action**: What happened (e.g., "TP1 Hit", "New BUY Signal")
- ✅ **Price**: Entry/trigger price (e.g., "$2,650.00")
- ✅ **Pips**: Gain/loss in pips (e.g., "+180.5 PIPS", "-50.2 PIPS")
- ✅ **Sound**: Default iOS notification sound
- ✅ **Badge**: Red number on app icon (counts unread)
- ✅ **Timestamp**: "now", "2m ago", "1h ago"
- ✅ **Tap action**: Opens Trade Imperial app → Signal Stream

---

## ⚙️ iOS Settings Available

After subscribing, users can customize:

### **Notification Style**
- **Lock Screen**: Show/Hide
- **Notification Center**: Show/Hide
- **Banners**: Temporary or Persistent

### **Notification Options**
- **Sounds**: On/Off
- **Badges**: On/Off (red number on app icon)
- **Show Previews**: Always, When Unlocked, Never

### **Banner Style**
- **Temporary**: Disappears after 5 seconds
- **Persistent**: Stays until dismissed

---

## 📊 Example Notification Flow

Here's a typical notification sequence for a Gold signal:

1. **New Signal** 🚀
   ```
   🚀 Jacob Estayo - New BUY Signal
   Jacob Estayo posted a new BUY signal on Gold at $2,620.00
   ```

2. **TP1 Hit** 💰
   ```
   💰 Jacob Estayo - TP1 Hit
   Gold hit Take Profit 1 at $2,650.00
   +30.0 PIPS
   ```

3. **TP2 Hit** 💰
   ```
   💰 Jacob Estayo - TP2 Hit
   Gold hit Take Profit 2 at $2,670.00
   +50.0 PIPS
   ```

4. **Closed in Profit** ✅
   ```
   ✅ Jacob Estayo - Signal Closed in Profit
   Gold closed in profit at $2,680.00
   +60.0 PIPS 🎉
   ```

---

## 🎯 Key Points

1. **Educator name is ALWAYS visible** in every notification
2. **Asset name is ALWAYS visible** in every notification
3. **Action is clear** (e.g., "TP1 Hit", "New BUY Signal", "Stop Loss Hit")
4. **Pips are shown** for all TP hits, SL hits, and closed signals
5. **Emojis help identify** the notification type at a glance
6. **Format is consistent** across all notification types

---

## 🔗 Related Documentation

- [IOS_WEB_PUSH_SETUP_GUIDE.md](./IOS_WEB_PUSH_SETUP_GUIDE.md) - Complete setup guide
- [WELCOME_NOTIFICATION_FEATURE.md](./WELCOME_NOTIFICATION_FEATURE.md) - Welcome notification details
- [NATIVE_IOS_PROMPT_IMPLEMENTATION.md](./NATIVE_IOS_PROMPT_IMPLEMENTATION.md) - Technical implementation

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0

