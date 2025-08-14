try {
  // Enhanced updater service worker with error handling
  console.log('[OneSignal SW Updater] Loading OneSignal Updater Service Worker...');
  importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
  console.log('[OneSignal SW Updater] OneSignal Updater Service Worker loaded successfully');
} catch (error) {
  console.error('[OneSignal SW Updater] Failed to load OneSignal Updater Service Worker:', error);
}
