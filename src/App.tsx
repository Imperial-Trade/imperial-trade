import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { WebSocketPriceProvider } from "@/contexts/WebSocketPriceContext";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Layout Components
import LandingLayout from "@/pages/layouts/LandingLayout";
import DashboardLayout from "@/pages/layouts/DashboardLayout";

// Landing Pages
import Landing from "@/pages/landing-page/landing/Landing";
import About from "@/pages/landing-page/about/About";
import Features from "@/pages/landing-page/features/Features";
import IBPartnership from "@/pages/landing-page/ib-partnership/IBPartnership";
import Signin from "@/pages/landing-page/signin/Signin";
import AccountRequest from "@/pages/landing-page/account-request/AccountRequest";
import AccountRequestStatus from "@/pages/landing-page/account-request-status/AccountRequestStatus";

// Dashboard Pages
import Home from "@/pages/dashboard/home/Home";
import Live from "@/pages/dashboard/live/Live";
import SignalStream from "@/pages/dashboard/signal-stream/SignalStream";
import NewSignalPage from "@/pages/dashboard/new-signal/NewSignalPage";
import Education from "@/pages/dashboard/education/Education";
import AdvancedTools from "@/pages/dashboard/advanced-tools/AdvancedTools";
import MyProgress from "@/pages/dashboard/my-progress/MyProgress";
import Settings from "@/pages/dashboard/settings/Settings";
import AdminPanel from "@/pages/dashboard/admin-panel/AdminPanel";
import AthenaTest from "@/pages/dashboard/athena/AthenaTest";
import DevTests from "@/pages/dashboard/dev-tests/DevTests";

// Educator Pages
import EducatorTradeSignalsPage from "@/pages/dashboard/educator/EducatorTradeSignalsPage";

// Other Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AccessDenied from "@/components/AccessDenied";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <SignalRealtimeProvider>
                <WebSocketPriceProvider>
                  <Routes>
                    {/* Landing Routes */}
                    <Route path="/" element={<LandingLayout />}>
                      <Route index element={<Landing />} />
                      <Route path="about" element={<About />} />
                      <Route path="features" element={<Features />} />
                      <Route path="ib-partnership" element={<IBPartnership />} />
                      <Route path="signin" element={<Signin />} />
                      <Route path="account-request" element={<AccountRequest />} />
                      <Route path="account-request-status" element={<AccountRequestStatus />} />
                    </Route>

                    {/* Dashboard Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/dashboard/home" replace />} />
                      <Route path="home" element={<Home />} />
                      <Route path="live" element={<Live />} />
                      <Route path="signal-stream" element={<SignalStream />} />
                      <Route path="new-signal" element={<NewSignalPage />} />
                      <Route path="education" element={<Education />} />
                      <Route path="advanced-tools" element={<AdvancedTools />} />
                      <Route path="my-progress" element={<MyProgress />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="athena" element={<AthenaTest />} />
                      <Route path="dev-tests" element={<DevTests />} />
                      
                      {/* Admin Routes */}
                      <Route
                        path="admin"
                        element={
                          <ProtectedRoute requiredAccessLevel="admin">
                            <AdminPanel />
                          </ProtectedRoute>
                        }
                      />

                      {/* Educator Routes */}
                      <Route path="educator">
                        <Route
                          path="signals"
                          element={
                            <ProtectedRoute requiredUserType={["educator", "ib_partner"]}>
                              <EducatorTradeSignalsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="analytics"
                          element={
                            <ProtectedRoute requiredUserType={["educator", "ib_partner"]}>
                              <div className="p-6">
                                <h1 className="text-2xl font-bold">Performance Analytics</h1>
                                <p className="text-secondary">Coming soon...</p>
                              </div>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="followers"
                          element={
                            <ProtectedRoute requiredUserType={["educator", "ib_partner"]}>
                              <div className="p-6">
                                <h1 className="text-2xl font-bold">Followers & Engagement</h1>
                                <p className="text-secondary">Coming soon...</p>
                              </div>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="ib-dashboard"
                          element={
                            <ProtectedRoute requiredUserType={["ib_partner"]}>
                              <div className="p-6">
                                <h1 className="text-2xl font-bold">IB Partner Dashboard</h1>
                                <p className="text-secondary">Coming soon...</p>
                              </div>
                            </ProtectedRoute>
                          }
                        />
                      </Route>
                    </Route>

                    {/* Error Routes */}
                    <Route path="/access-denied" element={<AccessDenied />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </WebSocketPriceProvider>
              </SignalRealtimeProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
