// Service Worker Verification for Development
import { isDevToolsEnabled } from '@/utils/featureFlags';

export function verifyServiceWorkerSafety() {
  if (!isDevToolsEnabled()) return;
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        console.log('🔧 DEV: Service Workers found:', registrations.length);
        registrations.forEach((registration, index) => {
          console.log(`🔧 DEV: SW ${index + 1}:`, {
            scope: registration.scope,
            state: registration.active?.state,
            scriptURL: registration.active?.scriptURL
          });
        });
      } else {
        console.log('✅ DEV: No Service Workers registered');
      }
    }).catch(err => {
      console.warn('🔧 DEV: Service Worker check failed:', err);
    });
  } else {
    console.log('🔧 DEV: Service Worker not supported');
  }
}