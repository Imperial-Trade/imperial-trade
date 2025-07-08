
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check role if required
  if (requiredRole) {
    const userRole = user.user_metadata?.access_level as string;
    
    if (requiredRole === 'admin' && userRole !== 'admin') {
      return <Navigate to="/dashboard/home" replace />;
    }
  }

  return <>{children}</>;
};
</rov-write>

Now I'll update the main App component to use the AuthProvider:

<lov-write file_path="src/App.tsx">
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
