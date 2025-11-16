import React from 'react';
import { createRoot } from "react-dom/client";
import { version } from "react";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";
import { RootErrorBoundary } from "./components/error-boundary/RootErrorBoundary";
import { detectAndFixReactDuplication } from "@/utils/reactDuplicationDetector";

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

// Defer PostHog initialization to prevent login freeze
if (POSTHOG_KEY && POSTHOG_HOST) {
  // Use requestIdleCallback to initialize PostHog when browser is idle
  const initPostHog = () => {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        // Disable surveys during initial load to prevent conflicts
        disable_surveys: true
      });
    } catch (error) {
      console.error('PostHog initialization failed:', error);
    }
  };
  
  // Defer initialization to prevent blocking main thread during login
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initPostHog, { timeout: 3000 });
  } else {
    setTimeout(initPostHog, 2000);
  }
}

// 🚨 CRITICAL: Detect and fix React duplication BEFORE rendering anything
console.log('🔍 [main.tsx] Checking for React duplication...');
detectAndFixReactDuplication();

// Debug React version
console.log('🔍 React version:', version);
console.log('🔍 React-DOM loaded:', !!document.getElementById("root"));

// Add comprehensive error handling for app mounting
try {
  console.log('🚀 Attempting to render React app...');
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error('Root element not found in DOM');
  }
  
  console.log('✅ Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('✅ React root created, rendering app...');
  root.render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Critical error during app mounting:', error);
  
  // Fallback rendering for debugging
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: monospace; background: #1a1a1a; color: #fff; min-height: 100vh;">
        <h1 style="color: #ff6b6b;">Application Failed to Load</h1>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
        <p>Please check the browser console for more details.</p>
        <button onclick="window.location.reload()" style="padding: 10px; margin-top: 10px; background: #007bff; color: white; border: none; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
