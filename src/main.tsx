import React from 'react';
import { createRoot } from "react-dom/client";
import { version } from "react";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";
import { RootErrorBoundary } from "./components/error-boundary/RootErrorBoundary";
import { detectAndFixReactDuplication } from "@/utils/reactDuplicationDetector";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️  SERVICE WORKER DISABLED - OneSignal handles all SW needs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// The custom /sw.js Service Worker was causing conflicts with OneSignal's
// Service Worker (/OneSignalSDKWorker.js). To fix the repeated errors:
// "[Worker Messenger] Could not get ServiceWorkerRegistration to postMessage!"
// 
// We now let OneSignal's SDK handle ALL Service Worker registration.
// This ensures push notifications work correctly across all platforms.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('ℹ️ [Service Worker] Custom SW disabled - OneSignal SDK handles all registration');

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
