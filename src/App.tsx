import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketPriceProvider } from "@/contexts/WebSocketPriceContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Layout imports
import LandingLayout from "@/pages/layouts/LandingLayout";
import DashboardLayout from "@/pages/layouts/DashboardLayout";

// Page imports
import Landing from "@/pages/landing-page/landing/Landing";
import About from "@/pages/landing-page/about/About";
import Features from "@/pages/landing-page/features/Features";
import IBPartnership from "@/pages/landing-page/ib-partnership/IBPartnership";
import AccountRequest from "@/pages/landing-page/account-request/AccountRequest";
import AccountRequestStatus from "@/pages/landing-page/account-request-status/AccountRequestStatus";
import Signin from "@/pages/landing-page/signin/Signin";

// Dashboard page imports
import Home from "@/pages/dashboard/home/Home";
import Education from "@/pages/dashboard/education/Education";
import Forum from "@/pages/dashboard/forum/Forum";
import Live from "@/pages/dashboard/live/Live";
import AdvancedTools from "@/pages/dashboard/advanced-tools/AdvancedTools";
import Settings from "@/pages/dashboard/settings/Settings";
import MyProgress from "@/pages/dashboard/my-progress/MyProgress";
import AdminPanel from "@/pages/dashboard/admin-panel/AdminPanel";
import NewSignalPage from "@/pages/dashboard/new-signal/NewSignalPage";
import SignalStream from "@/pages/dashboard/signal-stream/SignalStream";
import DevTests from "@/pages/dashboard/dev-tests/DevTests";
import AthenaTest from "@/pages/dashboard/athena/AthenaTest";

import NotFound from "@/pages/NotFound";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <SignalRealtimeProvider>
                <WebSocketPriceProvider>
                  <div className="min-h-screen bg-background text-foreground">
                    <Toaster />
                    <Routes>
                      {/* Public Routes */}

                      <Route
                        path="/"
                        element={
                          <LandingLayout>
                            <Outlet />
                          </LandingLayout>
                        }
                      >
                        <Route index element={<Landing />} />
                        <Route path="about" element={<About />} />
                        <Route path="features" element={<Features />} />
                        <Route path="partnership" element={<IBPartnership />} />
                        <Route
                          path="account-request"
                          element={<AccountRequest />}
                        />
                        <Route
                          path="account-request-status"
                          element={<AccountRequestStatus />}
                        />

                        <Route path="signin" element={<Signin />} />
                      </Route>

                      {/* Protected Dashboard Routes */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardLayout>
                              <Outlet />
                            </DashboardLayout>
                          </ProtectedRoute>
                        }
                      >
                        <Route path="home" element={<Home />} />
                        <Route path="live" element={<Live />} />
                        <Route path="new-signal" element={<NewSignalPage />} />
                        <Route
                          path="signal-stream"
                          element={<SignalStream />}
                        />
                        <Route path="education" element={<Education />} />
                        <Route path="forum" element={<Forum />} />
                        <Route path="my-progress" element={<MyProgress />} />
                        <Route
                          path="advanced-tools"
                          element={<AdvancedTools />}
                        />
                        <Route path="settings" element={<Settings />} />
                        <Route path="athena" element={<AthenaTest />} />
                        <Route path="dev-tests" element={<DevTests />} />

                        {/* Admin Only Route */}
                        <Route
                          path="admin"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <AdminPanel />
                            </ProtectedRoute>
                          }
                        />
                      </Route>

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </WebSocketPriceProvider>
              </SignalRealtimeProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
