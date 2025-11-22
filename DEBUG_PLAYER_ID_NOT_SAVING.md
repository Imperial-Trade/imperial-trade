# 🔍 DEBUG: Player ID Not Saving or Edge Function Not Finding It

## 🎯 **ISSUE**

Console script executed but notifications still failing with "No push-enabled users available"

**Possible Causes:**
1. Player ID didn't save to database
2. Edge function query not finding Player IDs
3. User ID mismatch in query

---

## 🔧 **VERIFICATION SCRIPT**

Run this in console to check if Player ID actually saved:

```javascript
(async () => {
  // Get current user
  const { data: { user } } = await window.supabase.auth.getUser();
  console.log('Current User ID:', user.id);
  
  // Check if Player ID is in database
  const { data: profile, error } = await window.supabase
    .from('profiles')
    .select('id, email, device_token, xeon_stream_subscription')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('❌ Error fetching profile:', error);
    return;
  }
  
  console.log('Profile Data:', profile);
  console.log('');
  console.log('device_token:', profile.device_token);
  console.log('xeon_stream_subscription:', profile.xeon_stream_subscription);
  
  if (profile.device_token) {
    console.log('✅ Player ID IS saved in database!');
  } else {
    console.log('❌ Player ID NOT saved - Subscribe script failed');
  }
})();
```

---

## 🎯 **EXPECTED RESULTS**

**If Player ID saved correctly:**
```
device_token: "abc123-def456-..."
xeon_stream_subscription: true
✅ Player ID IS saved in database!
```

**If NOT saved:**
```
device_token: null
xeon_stream_subscription: false or true
❌ Player ID NOT saved
```

---

## 🔧 **IF PLAYER ID NOT SAVED**

Try this alternative subscribe method:

```javascript
(async () => {
  console.log('🚀 Alternative subscribe method...');
  
  // Initialize OneSignal if not already
  if (typeof window.OneSignal === 'undefined') {
    console.error('❌ OneSignal not loaded!');
    return;
  }
  
  // Request permission
  const permission = await window.OneSignal.Notifications.requestPermission();
  console.log('Permission:', permission);
  
  if (!permission) {
    console.error('❌ Permission denied');
    return;
  }
  
  // Subscribe
  await window.OneSignal.User.PushSubscription.optIn();
  console.log('✅ Opted in');
  
  // Wait longer
  await new Promise(r => setTimeout(r, 3000));
  
  // Check subscription status
  const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
  console.log('Is Subscribed:', isSubscribed);
  
  // Get Player ID
  const playerId = await window.OneSignal.User.PushSubscription.id;
  console.log('Player ID from OneSignal:', playerId);
  
  if (!playerId) {
    console.error('❌ No Player ID from OneSignal!');
    return;
  }
  
  // Get user
  const { data: { user }, error: authError } = await window.supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ Not logged in:', authError);
    return;
  }
  
  console.log('User ID:', user.id);
  
  // Save to database with error checking
  const { data, error } = await window.supabase
    .from('profiles')
    .update({ 
      device_token: playerId,
      xeon_stream_subscription: true,
      device_platform: 'web',
      device_token_updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select();
  
  if (error) {
    console.error('❌ Database save failed:', error);
    return;
  }
  
  console.log('✅ Database updated:', data);
  console.log('');
  console.log('🎯 Verification - run this next:');
  console.log('Check if it saved by refreshing dashboard Subscriptions tab');
  console.log('Should show: With Player ID: 1');
})();
```

---

## 📊 **CHECK DASHBOARD SUBSCRIPTIONS TAB**

After running the script:
1. Go to Subscriptions tab
2. Look at "With Player ID" count
3. Should change from 0 → 1
4. Should see your email in the list with Player ID

---

**Run the verification script first to see if Player ID saved!**


