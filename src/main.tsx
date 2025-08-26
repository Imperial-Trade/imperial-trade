import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PostHogProvider } from "posthog-js/react";

const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

const options = {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
};

createRoot(document.getElementById("root")!).render(
  <PostHogProvider apiKey={POSTHOG_KEY} options={options}>
    <App />
  </PostHogProvider>
);
