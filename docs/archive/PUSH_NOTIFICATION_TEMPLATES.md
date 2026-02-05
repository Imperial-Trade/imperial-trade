# 📱 **PUSH NOTIFICATION TEMPLATES**
## iOS Notification Center & Android Notification Drawer

---

## 🎯 **HOW PUSH NOTIFICATIONS WORK:**

```
Database Trigger → Edge Function → sendPushNotification() → OneSignal API → iOS/Android
```

**Templates Used:** Same 9 templates as in-app notifications  
**Delivery:** OneSignal (configured with `ONESIGNAL_API_KEY` and `ONESIGNAL_APP_ID`)  
**Format:** `template.title` (heading) + `template.message` (content)

---

## 📋 **ALL 9 PUSH NOTIFICATION TEMPLATES:**

---

### **1. 🚀 NEW SIGNAL CREATED (BUY/SELL)**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 🚀 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (🚀 New BUY Signal)       │
│                                        │
│ BUY Signal is Posted on Gold at       │
│ $2650.50                               │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 🚀 Jacob Estayo (🚀 New BUY Signal)    │ 
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ BUY Signal is Posted on Gold at        │
│ $2650.50                               │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Blue (🔵 #3B82F6)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (🚀 New BUY Signal)`
- **Message:** `BUY Signal is Posted on Gold at $2650.50`
- **Badge:** `🚀 New BUY/SELL Signal`
- **Color:** Blue
- **Sound:** Yes
- **Priority:** 2 (Medium-High)

---

### **2. ⏳ PENDING LIMIT CREATED (BUY LIMIT/SELL LIMIT)**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ ⏳ Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (⏳ Pending BUY LIMIT)    │
│                                        │
│ Waiting to reached Gold at $2650.50   │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ ⏳ Jacob Estayo (⏳ Pending BUY LIMIT) │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Waiting to reached Gold at $2650.50   │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Yellow (🟡 #F59E0B)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (⏳ Pending BUY LIMIT)`
- **Message:** `Waiting to reached Gold at $2650.50`
- **Badge:** `⏳ Pending BUY/SELL Limit`
- **Color:** Yellow
- **Sound:** Yes
- **Priority:** 2 (Medium-High)

---

### **3. ✅ LIMIT ACTIVATED**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ ✅ Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (✅ BUY Limit Activated)  │
│                                        │
│ BUY LIMIT is activated on Gold at      │
│ $2650.50                               │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ ✅ Jacob Estayo (✅ BUY Limit          │
│    Activated)                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ BUY LIMIT is activated on Gold at      │
│ $2650.50                               │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Blue (🔵 #3B82F6)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (✅ BUY Limit Activated)`
- **Message:** `BUY LIMIT is activated on Gold at $2650.50`
- **Badge:** `✅ BUY/SELL Activated`
- **Color:** Blue
- **Sound:** Yes
- **Priority:** 3 (High)

---

### **4. 🎯 TAKE PROFIT HIT (TP1-TP5)**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 🎯 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (🎯 Take Profit Hit)      │
│                                        │
│ TP 1 HIT on Gold at $2700.00 |        │
│ +200.0 PIPS                            │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 🎯 Jacob Estayo (🎯 Take Profit Hit)   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ TP 1 HIT on Gold at $2700.00 |        │
│ +200.0 PIPS                            │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Green (🟢 #10B981)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (🎯 Take Profit Hit)`
- **Message:** `TP 1 HIT on Gold at $2700.00 | +200.0 PIPS`
- **Badge:** `🎯 Take Profit Hit`
- **Color:** Green
- **Sound:** Yes
- **Priority:** 3 (High)

**Note:** TP number changes (TP 2, TP 3, TP 4, TP 5) based on which TP was hit.

---

### **5. 🛑 STOP LOSS HIT**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 🛑 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (🛑 Stop Loss Hit)        │
│                                        │
│ SL HIT on Gold at $2600.00 |          │
│ -50.0 PIPS                             │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 🛑 Jacob Estayo (🛑 Stop Loss Hit)     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ SL HIT on Gold at $2600.00 |          │
│ -50.0 PIPS                             │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Red (🔴 #EF4444)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (🛑 Stop Loss Hit)`
- **Message:** `SL HIT on Gold at $2600.00 | -50.0 PIPS`
- **Badge:** `🛑 Stop Loss Hit`
- **Color:** Red
- **Sound:** Yes
- **Priority:** 3 (High)

---

### **6. 🔒 MANUALLY CLOSED**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 🔒 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (🔒 Manually Closed)      │
│                                        │
│ manually closed Gold                   │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 🔒 Jacob Estayo (🔒 Manually Closed)   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ manually closed Gold                   │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Grey (⚫ #6B7280)
Sound: ❌ SILENT
```

**Template Source:**
- **Title:** `Jacob Estayo (🔒 Manually Closed)`
- **Message:** `manually closed Gold`
- **Badge:** `🔒 Manually Closed`
- **Color:** Grey
- **Sound:** No (Silent)
- **Priority:** 1 (Low)

---

### **7. 💰 CLOSED IN PROFITS (Manual Close with TP Hit)**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 💰 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (💰 Closed in Profits)    │
│                                        │
│ Secured Profits on Gold | +150.0 PIPS │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 💰 Jacob Estayo (💰 Closed in Profits) │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Secured Profits on Gold | +150.0 PIPS │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Grey (⚫ #6B7280)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (💰 Closed in Profits)`
- **Message:** `Secured Profits on Gold | +150.0 PIPS`
- **Badge:** `💰 Closed in Profits`
- **Color:** Grey
- **Sound:** Yes
- **Priority:** 2 (Medium-High)

---

### **8. 🎉 ALL TPs HIT (COMBINED - OPTION C)**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 🎉 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (🎉 ALL TPs HIT)          │
│                                        │
│ Final TP 5 HIT on Gold at $2750.00 |  │
│ +500.0 PIPS | 🎉 ALL PROFITS SECURED  │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 🎉 Jacob Estayo (🎉 ALL TPs HIT)       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Final TP 5 HIT on Gold at $2750.00 |  │
│ +500.0 PIPS | 🎉 ALL PROFITS SECURED  │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Green (🟢 #10B981)
Sound: ✅ trading_alert
```

**Template Source:**
- **Title:** `Jacob Estayo (🎉 ALL TPs HIT)`
- **Message:** `Final TP 5 HIT on Gold at $2750.00 | +500.0 PIPS | 🎉 ALL PROFITS SECURED`
- **Badge:** `🎉 ALL TPs HIT`
- **Color:** Green
- **Sound:** Yes
- **Priority:** 3 (High)

**⚠️ IMPORTANT:** This is the ONLY notification sent when the last TP closes the signal. No separate "TP 5 HIT" notification is sent.

---

### **9. 📝 NOTES UPDATED**

**iOS Notification Center:**
```
┌────────────────────────────────────────┐
│ 📝 Trade Imperial                      │
├────────────────────────────────────────┤
│ Jacob Estayo (📝 Notes Updated)        │
│                                        │
│ Jacob Estayo updated notes for Gold   │
│                                        │
│ [View Signal →]                 [Tap]  │
└────────────────────────────────────────┘
```

**Android Notification Drawer:**
```
┌────────────────────────────────────────┐
│ 📝 Jacob Estayo (📝 Notes Updated)     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Jacob Estayo updated notes for Gold   │
│                                        │
│ Trade Imperial • now                   │
└────────────────────────────────────────┘
Color: Yellow (🟡 #F59E0B)
Sound: ❌ SILENT
```

**Template Source:**
- **Title:** `Jacob Estayo (📝 Notes Updated)`
- **Message:** `Jacob Estayo updated notes for Gold`
- **Badge:** `📝 Notes Updated`
- **Color:** Yellow
- **Sound:** No (Silent)
- **Priority:** 1 (Low)

---

## 🎨 **ANDROID-SPECIFIC FEATURES:**

### **Notification Colors (Accent Color):**
```typescript
Green:  #10B981 (TP Hit, All TPs Hit)
Red:    #EF4444 (Stop Loss)
Blue:   #3B82F6 (New Signal, Limit Activated)
Yellow: #F59E0B (Pending Limit, Notes Updated)
Grey:   #6B7280 (Manual Close, Closed in Profits)
```

### **Sound:**
- **With Sound:** `trading_alert` (custom sound file)
- **Silent:** No sound (for low-priority notifications)

### **Grouping:**
- All notifications grouped under `trading_signals`
- Prevents notification spam

### **Collapse ID:**
- Format: `signal_{signal_id}_{notification_type}`
- Updates existing notification instead of creating duplicates

---

## 📱 **iOS-SPECIFIC FEATURES:**

### **Sound:**
- **With Sound:** `trading_alert.wav` (custom sound file)
- **Silent:** Default iOS silent mode

### **Mutable Content:**
- Enabled for notification extensions
- Allows custom UI/actions in notification

### **Content Available:**
- Enables background updates
- App can process data before user opens notification

---

## 🔗 **DEEP LINKING:**

**All notifications link to:**
```
/dashboard/signal-stream?signal={signal_id}
```

### **What Happens When User Taps:**

1. **iOS:** Opens Trade Imperial app → Signal Stream → Specific Signal
2. **Android:** Opens Trade Imperial app → Signal Stream → Specific Signal
3. **Web:** Opens browser → Trade Imperial website → Signal Stream

### **Data Included in Deep Link:**
```javascript
{
  signal_id: "uuid-of-signal",
  type: "tp_hit",
  asset_name: "Gold",
  deep_link: "/dashboard/signal-stream?signal=uuid-of-signal"
}
```

---

## 🎯 **NOTIFICATION PRIORITY LEVELS:**

| Priority | Notifications | Behavior |
|----------|--------------|----------|
| **3 (High)** | TP Hit, Stop Loss, Limit Activated, All TPs Hit | Heads-up display, Sound, Vibration |
| **2 (Medium-High)** | New Signal, Pending Limit, Closed in Profits | Standard notification, Sound |
| **1 (Low)** | Manual Close, Notes Updated | Silent, No heads-up |

---

## ⏱️ **NOTIFICATION SETTINGS:**

### **Time-to-Live (TTL):**
- **3600 seconds (1 hour)**
- If device is offline, notification expires after 1 hour

### **Collapse Behavior:**
- Newer notifications replace older ones for the same signal+type
- Prevents notification drawer spam

---

## 🧪 **EXAMPLE: FULL NOTIFICATION LIFECYCLE**

### **Scenario: Gold Signal with 5 TPs**

1. **Signal Created:**
   ```
   🚀 Jacob Estayo (🚀 New BUY Signal)
   BUY Signal is Posted on Gold at $2650.50
   ```

2. **TP1 Hit:**
   ```
   🎯 Jacob Estayo (🎯 Take Profit Hit)
   TP 1 HIT on Gold at $2700.00 | +200.0 PIPS
   ```

3. **TP2 Hit:**
   ```
   🎯 Jacob Estayo (🎯 Take Profit Hit)
   TP 2 HIT on Gold at $2725.00 | +300.0 PIPS
   ```

4. **TP3 Hit:**
   ```
   🎯 Jacob Estayo (🎯 Take Profit Hit)
   TP 3 HIT on Gold at $2740.00 | +360.0 PIPS
   ```

5. **TP4 Hit:**
   ```
   🎯 Jacob Estayo (🎯 Take Profit Hit)
   TP 4 HIT on Gold at $2745.00 | +380.0 PIPS
   ```

6. **TP5 Hit (Final - ALL TPs HIT):**
   ```
   🎉 Jacob Estayo (🎉 ALL TPs HIT)
   Final TP 5 HIT on Gold at $2750.00 | +500.0 PIPS | 🎉 ALL PROFITS SECURED
   ```

**Total Notifications:** 6 (NOT 7)  
**Note:** No separate "TP 5 HIT" notification, only the combined "ALL TPs HIT"

---

## 🔐 **WHO RECEIVES PUSH NOTIFICATIONS:**

### **Requirements:**
1. ✅ User has `push_subscription_active = true` in profiles table
2. ✅ User has valid `onesignal_player_id` (not null, not 'dev_mock_player_id')
3. ✅ User is in the signal's audience (educator's followers, or all users for global signals)

### **Exclusions:**
- Users without OneSignal player ID
- Users with push disabled
- Test/dev mock player IDs

---

## 📊 **PUSH NOTIFICATION DATA:**

### **Full OneSignal Payload:**
```javascript
{
  app_id: ONESIGNAL_APP_ID,
  include_player_ids: ["player-id-1", "player-id-2"],
  
  headings: { 
    en: "Jacob Estayo (🎯 Take Profit Hit)" 
  },
  
  contents: { 
    en: "TP 1 HIT on Gold at $2700.00 | +200.0 PIPS" 
  },
  
  data: {
    signal_id: "uuid",
    type: "tp_hit",
    asset_name: "Gold",
    deep_link: "/dashboard/signal-stream?signal=uuid"
  },
  
  web_url: "https://tradeimperial.com/dashboard/signal-stream?signal=uuid",
  chrome_web_icon: "https://tradeimperial.com/icon-192.png",
  chrome_web_badge: "https://tradeimperial.com/badge-icon.png",
  
  web_buttons: [{
    id: "view-signal",
    text: "View Signal →",
    url: "/dashboard/signal-stream?signal=uuid"
  }],
  
  android_accent_color: "FF10B981",
  android_sound: "trading_alert",
  android_group: "trading_signals",
  
  ios_sound: "trading_alert.wav",
  
  priority: 3,
  ttl: 3600,
  collapse_id: "signal_uuid_tp_hit",
  mutable_content: true,
  content_available: true
}
```

---

## ✅ **SUMMARY:**

| Aspect | Details |
|--------|---------|
| **Templates** | Same 9 as in-app notifications |
| **Title** | `template.title` (includes emoji + educator name) |
| **Message** | `template.message` (includes asset, price, PIPS) |
| **Colors** | Green, Red, Blue, Yellow, Grey (Android accent) |
| **Sounds** | `trading_alert` (7 notifications) / Silent (2 notifications) |
| **Deep Link** | Opens app to specific signal |
| **Priority** | High (3), Medium (2), Low (1) |
| **TTL** | 1 hour |
| **Grouping** | All under "trading_signals" |
| **Delivery** | OneSignal API |

---

## 🎯 **WHAT USERS SEE:**

### **iOS Notification Center:**
- Clean card design
- Emoji + Educator name as heading
- Message with asset + price + PIPS
- "View Signal →" button
- Swipe for more options

### **Android Notification Drawer:**
- Colored accent bar (green/red/blue/yellow/grey)
- Icon + Educator name + emoji
- Message text
- "Trade Imperial • now" timestamp
- Tap to open, swipe to dismiss

**Both platforms:** Professional, clear, actionable notifications with all key trading info! 🚀

