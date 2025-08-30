
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { WelcomeProvider } from "@/contexts/WelcomeContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { WebSocketPriceProvider } from "@/contexts/WebSocketPriceContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { NavigationGuard } from "@/components/routing/NavigationGuard";

// Landing Pages
import AccountRequestPage from "@/pages/landing-page/account-request/AccountRequest";
import AccountRequestStatusPage from "@/pages/landing-page/account-request-status/AccountRequestStatus";
import SigninPage from "@/pages/landing-page/signin/Signin";
import SignupPage from "@/pages/auth/Signup";

// Dashboard Pages (lazy loaded)
import { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/layout/LoadingSpinner";

// Create placeholder dashboard components for now
const DashboardHome = lazy(() => import("@/pages/dashboard/home/Home").catch(() => ({
  default: () => <div className="p-8 text-white">Dashboard Home - Coming Soon</div>
})));

const SignalsPage = lazy(() => import("@/pages/landing-page/signals/SignalsPage").catch(() => ({
  default: () => <div className="p-8 text-white">Signals Page - Coming Soon</div>
})));

const EducationPage = lazy(() => Promise.resolve({
  default: () => <div className="p-8 text-white">Education Page - Coming Soon</div>
}));

const AdminPage = lazy(() => import("@/pages/dashboard/admin-panel/AdminPanel").catch(() => ({
  default: () => <div className="p-8 text-white">Admin Page - Coming Soon</div>
})));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="imperial-ui-theme">
        <Router>
          <AuthProvider>
            <WelcomeProvider>
              <SignalRealtimeProvider>
                <WebSocketPriceProvider>
                  <NavigationGuard>
                    <Routes>
                      {/* Default redirect to signin */}
                      <Route path="/" element={<Navigate to="/signin" replace />} />
                      
                      {/* Authentication Routes */}
                      <Route path="/signin" element={<SigninPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      
                      {/* Account Request Routes */}
                      <Route path="/account-request" element={<AccountRequestPage />} />
                      <Route path="/account-request-status" element={<AccountRequestStatusPage />} />
                      
                      {/* Dashboard Routes - Protected */}
                      <Route path="/dashboard/*" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <Routes>
                            <Route path="home" element={<DashboardHome />} />
                            <Route path="signals" element={<SignalsPage />} />
                            <Route path="education" element={<EducationPage />} />
                            <Route path="admin" element={<AdminPage />} />
                            <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
                          </Routes>
                        </Suspense>
                      } />
                      
                      {/* Catch all - redirect to signin */}
                      <Route path="*" element={<Navigate to="/signin" replace />} />
                    </Routes>
                  </NavigationGuard>
                  <Toaster />
                </WebSocketPriceProvider>
              </SignalRealtimeProvider>
            </WelcomeProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
