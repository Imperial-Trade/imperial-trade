
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationSystem from "@/components/notifications/NotificationSystem";
import "./styles/education.css";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import Pages from "./pages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
