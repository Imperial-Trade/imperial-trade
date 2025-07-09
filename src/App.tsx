import React from "react";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebSocketPriceProvider } from "@/contexts/WebSocketPriceContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotificationSystem from "@/components/notifications/NotificationSystem";
import "./styles/education.css";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import Pages from "./pages";

// Create QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WebSocketPriceProvider>
            <AuthProvider>
              <ErrorBoundary componentName="Toast Notifications">
                <Toaster />
                <Sonner />
              </ErrorBoundary>
              <ErrorBoundary componentName="Notification System">
                <NotificationSystem />
              </ErrorBoundary>
              <ErrorBoundary componentName="Application Router">
                <Pages />
              </ErrorBoundary>
            </AuthProvider>
          </WebSocketPriceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
