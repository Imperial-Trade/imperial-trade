import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";
import { RootErrorBoundary } from "./components/error-boundary/RootErrorBoundary";

// Service Worker Registration for PWA (conditionally enabled)
const enableServiceWorker = import.meta.env.VITE_ENABLE_SW === 'true';

if (enableServiceWorker && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Trade Imperial SW: Registered successfully', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available - activate immediately and reload
                  console.log('Trade Imperial SW: New version available, activating...');
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                  });
                } else {
                  // First time install
                  console.log('Trade Imperial SW: App is ready for offline use');
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Trade Imperial SW: Registration failed', error);
      });
  });
} else {
  console.log('Trade Imperial SW: Service Worker disabled via VITE_ENABLE_SW flag');
  
  // Automatically clean up any existing service workers and caches
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Unregister all service workers for this origin
        const registrations = await navigator.serviceWorker.getRegistrations();
        let unregisteredCount = 0;
        for (const registration of registrations) {
          await registration.unregister();
          unregisteredCount++;
        }
        
        // Clear all caches
        let clearedCacheCount = 0;
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(async (cacheName) => {
              await caches.delete(cacheName);
              clearedCacheCount++;
            })
          );
        }
        
        if (unregisteredCount > 0 || clearedCacheCount > 0) {
          console.log(`Trade Imperial SW: Cleanup complete - unregistered ${unregisteredCount} service workers, cleared ${clearedCacheCount} caches`);
        } else {
          console.log('Trade Imperial SW: No cleanup needed - no service workers or caches found');
        }
      } catch (error) {
        console.error('Trade Imperial SW: Cleanup failed', error);
      }
    });
  }
}

const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

// Initialize PostHog directly
if (POSTHOG_KEY && POSTHOG_HOST) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
    });
  } catch (error) {
    console.error('PostHog initialization failed:', error);
  }
}

// Debug React version
console.log('🔍 React version:', React.version);
console.log('🔍 React-DOM loaded:', !!document.getElementById("root"));

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
