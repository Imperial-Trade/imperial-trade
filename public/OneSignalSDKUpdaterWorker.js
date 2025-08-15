try {
  // Enhanced updater service worker with error handling - Web SDK v16 compatible
  console.log('[OneSignal SW Updater] Loading OneSignal Updater Service Worker v16...');
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
  console.log('[OneSignal SW Updater] OneSignal Updater Service Worker v16 loaded successfully');
} catch (error) {
  console.error('[OneSignal SW Updater] Failed to load OneSignal Updater Service Worker v16:', error);
  
  // Fallback to legacy version
  try {
    console.log('[OneSignal SW Updater] Attempting fallback to legacy version...');
    importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
    console.log('[OneSignal SW Updater] Legacy OneSignal Updater Service Worker loaded successfully');
  } catch (legacyError) {
    console.error('[OneSignal SW Updater] Failed to load legacy OneSignal Updater Service Worker:', legacyError);
  }
}
