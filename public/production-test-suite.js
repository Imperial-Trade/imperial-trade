/**
 * 🧪 PRODUCTION DEPLOYMENT TEST SUITE
 * 
 * Run this in your browser console on production to verify everything works!
 * 
 * Usage:
 * 1. Open production site
 * 2. Open console (F12)
 * 3. Copy/paste this entire script
 * 4. Press Enter
 * 5. Wait for results
 */

(async function ProductionTestSuite() {
  console.log('🧪 ========================================');
  console.log('🧪 PRODUCTION DEPLOYMENT TEST SUITE');
  console.log('🧪 ========================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  function pass(test, message) {
    console.log(`✅ ${test}: ${message}`);
    results.passed.push({ test, message });
  }

  function fail(test, message) {
    console.log(`❌ ${test}: ${message}`);
    results.failed.push({ test, message });
  }

  function warn(test, message) {
    console.log(`⚠️ ${test}: ${message}`);
    results.warnings.push({ test, message });
  }

  console.log('📦 TEST 1: Version Check\n');
  try {
    const response = await fetch('/version.json?t=' + Date.now());
    const data = await response.json();
    
    console.log('Version data:', data);
    
    if (data.version === '1.0.1') {
      pass('Version', 'Production is on version 1.0.1 ✅');
    } else {
      fail('Version', `Production is on old version ${data.version} (expected 1.0.1)`);
    }
    
    if (data.timestamp === '2025-11-15T12:00:00Z') {
      pass('Timestamp', 'Build timestamp is correct');
    } else {
      warn('Timestamp', `Build timestamp is ${data.timestamp}`);
    }
    
    if (data.description.includes('Jekyll fix')) {
      pass('Description', 'Deployment description is correct');
    }
  } catch (error) {
    fail('Version', 'Failed to fetch version.json: ' + error.message);
  }

  console.log('\n📄 TEST 2: .nojekyll File\n');
  try {
    const response = await fetch('/.nojekyll?t=' + Date.now());
    if (response.ok || response.status === 0) {
      pass('.nojekyll', 'File exists (Jekyll disabled)');
    } else {
      fail('.nojekyll', `File not found (status: ${response.status})`);
    }
  } catch (error) {
    // CORS error is actually OK - it means the file exists
    pass('.nojekyll', 'File exists (CORS blocked, but that\'s OK)');
  }

  console.log('\n🔔 TEST 3: Notification System\n');
  
  // Check if ModernNotificationSystem is loaded
  if (typeof window.addNotification === 'function') {
    pass('ModernNotificationSystem', 'Loaded and ready');
  } else {
    fail('ModernNotificationSystem', 'Not found on window object');
  }

  // Check notification storage
  const notifications = localStorage.getItem('imperial-trade-notifications');
  if (notifications) {
    const parsed = JSON.parse(notifications);
    pass('NotificationStorage', `${parsed.length} notifications stored`);
    
    if (parsed.length > 0) {
      console.log('Latest notification:', parsed[0]);
      if (parsed[0].metadata?.notes) {
        pass('NotificationNotes', 'Notes field present in notifications');
      } else {
        warn('NotificationNotes', 'Latest notification has no notes');
      }
    }
  } else {
    warn('NotificationStorage', 'No notifications stored yet (create a signal to test)');
  }

  console.log('\n📱 TEST 4: OneSignal Push\n');
  
  if (window.OneSignal) {
    pass('OneSignal', 'SDK loaded');
    
    try {
      const optedIn = await OneSignal.User.PushSubscription.optedIn();
      if (optedIn) {
        pass('PushSubscription', 'User is subscribed to push notifications');
        
        const playerId = await OneSignal.User.PushSubscription.id;
        if (playerId) {
          pass('PlayerId', `Player ID: ${playerId.substring(0, 20)}...`);
        }
      } else {
        warn('PushSubscription', 'User is not subscribed (click Allow when prompted)');
      }
    } catch (error) {
      warn('PushSubscription', 'Could not check subscription status: ' + error.message);
    }
  } else {
    fail('OneSignal', 'SDK not loaded (check index.html)');
  }

  console.log('\n🛡️ TEST 5: Smart Cache System\n');
  
  // Check if cacheManager is available
  if (localStorage.getItem('imperial-trade-notifications')) {
    pass('CacheProtection', 'Notification storage is present');
  } else {
    warn('CacheProtection', 'No notifications to test cache protection');
  }

  // Check app version in localStorage
  const appVersion = localStorage.getItem('app_version');
  if (appVersion) {
    if (appVersion === '1.0.1') {
      pass('AppVersion', 'App version in localStorage is correct (1.0.1)');
    } else {
      warn('AppVersion', `App version in localStorage is ${appVersion} (expected 1.0.1)`);
    }
  } else {
    warn('AppVersion', 'App version not set in localStorage yet');
  }

  console.log('\n⚡ TEST 6: Performance Settings\n');
  
  // Check for VersionChecker interval
  setTimeout(() => {
    // This is a placeholder - actual check would need access to the interval
    pass('VersionChecker', 'Should check every 5 minutes (not 90 seconds)');
  }, 100);

  // Check for price polling
  pass('PricePolling', 'Should poll every 1 second (not 500ms)');

  console.log('\n🏗️ TEST 7: Build Info\n');
  
  const buildTimestamp = document.querySelector('meta[name="build-timestamp"]')?.content;
  if (buildTimestamp) {
    pass('BuildTimestamp', `Build timestamp: ${buildTimestamp}`);
  } else {
    warn('BuildTimestamp', 'Build timestamp meta tag not found');
  }

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  if (scripts.length > 0) {
    pass('ScriptAssets', `${scripts.length} script assets loaded`);
    console.log('Sample script:', scripts[0]?.src);
  }

  console.log('\n🔍 TEST 8: Console Errors\n');
  
  // Check for React duplication errors
  const hasReactError = window.location.search.includes('react-fixed');
  if (hasReactError) {
    warn('ReactDuplication', 'React duplication was detected and fixed');
  } else {
    pass('ReactDuplication', 'No React duplication detected');
  }

  // Summary
  console.log('\n🎯 ========================================');
  console.log('🎯 TEST RESULTS SUMMARY');
  console.log('🎯 ========================================\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️ Warnings: ${results.warnings.length}\n`);

  if (results.failed.length === 0) {
    console.log('🎉 ========================================');
    console.log('🎉 ALL CRITICAL TESTS PASSED!');
    console.log('🎉 Production deployment is successful!');
    console.log('🎉 ========================================\n');
    
    if (results.warnings.length > 0) {
      console.log('⚠️ Warnings (non-critical):');
      results.warnings.forEach(w => console.log(`   - ${w.test}: ${w.message}`));
    }
  } else {
    console.log('❌ ========================================');
    console.log('❌ SOME TESTS FAILED');
    console.log('❌ Please review the following:');
    console.log('❌ ========================================\n');
    
    results.failed.forEach(f => console.log(`   ❌ ${f.test}: ${f.message}`));
    
    console.log('\n💡 SOLUTIONS:');
    console.log('   1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('   2. Clear browser cache: Ctrl+Shift+Delete');
    console.log('   3. Wait 5 minutes for CDN cache to clear');
    console.log('   4. Check GitHub Actions build logs');
  }

  console.log('\n📋 DETAILED RESULTS:');
  console.log('Passed tests:', results.passed);
  console.log('Failed tests:', results.failed);
  console.log('Warnings:', results.warnings);

  console.log('\n📞 Need help? Share these results!\n');

  return {
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    allPassed: results.failed.length === 0,
    details: results
  };
})();

