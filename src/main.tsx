import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";
import { PostHogProvider } from "posthog-js/react";
import { RootErrorBoundary } from "./components/error-boundary/RootErrorBoundary";

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
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
                  // New update available
                  console.log('Trade Imperial SW: New version available');
                  // Could show update notification here
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
}

const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

const options = {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
};

// Debug React version
console.log('🔍 React version:', React.version);
console.log('🔍 React-DOM loaded:', !!document.getElementById("root"));

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <PostHogProvider apiKey={POSTHOG_KEY} options={options}>
      <App />
    </PostHogProvider>
  </RootErrorBoundary>
);
