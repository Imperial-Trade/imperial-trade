// 🔔 App Entry Point - Build: 2025-11-12T03:30:00Z (React Import Consolidated - Fix Duplicate)
import { useEffect, createElement, lazy, Suspense } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WelcomeProvider } from "@/contexts/WelcomeContext";
import { NotificationPromptProvider } from "@/contexts/NotificationPromptContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { SharedRealtimeProvider } from "@/contexts/SharedRealtimeContext";
import { OptimizedWebSocketPriceProvider } from "@/contexts/OptimizedWebSocketPriceContext";
import { GlobalPreviewControlProvider } from "@/contexts/GlobalPreviewControlContext";
import { RouteBasedEconomicProvider } from "@/contexts/RouteBasedEconomicProvider";
import { RealtimeHealthProvider } from "@/contexts/RealtimeHealthMonitor";
import { RealtimeConnectionManagerProvider } from "@/contexts/RealtimeConnectionManager";
import { TelemetryProvider } from "@/contexts/TelemetryContext";
import { RealtimeShutdownGuard } from "@/components/RealtimeShutdownGuard";
import { VersionChecker } from "@/components/VersionChecker";
import { CacheCleanerMount } from "@/hooks/useCacheCleaner";
import { SafeThemeProvider as ThemeProvider } from "@/contexts/SafeThemeProvider";
import { NavigationGuard } from "@/components/routing/NavigationGuard";
import { RouteErrorBoundary } from "@/components/error-boundary/RouteErrorBoundary";
import { ContextErrorBoundary } from "@/components/error-boundary/ContextErrorBoundary";
import { WebSocketErrorBoundary } from "@/components/error-boundary/WebSocketErrorBoundary";

import { GlobalWelcomeOverlay } from "@/components/ui/GlobalWelcomeOverlay";
import { initializeAppState } from "@/utils/appStateCleanup";
import { isDevToolsEnabled } from "@/utils/featureFlags";
import { verifyServiceWorkerSafety } from "@/utils/serviceWorkerVerification";
import ModernNotificationSystem from "@/components/notifications/ModernNotificationSystem";
import { capacitorNotificationService } from "@/services/CapacitorNotificationService";

// Auth Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Layout Components
import LandingLayout from "@/pages/layouts/LandingLayout";
import ResetPasswordLayout from "@/pages/layouts/ResetPasswordLayout";
import Layout from "@/components/Layout";

// Landing Pages - Lazy Loaded
const Landing = lazy(() => import("@/pages/landing-page/landing/Landing"));
const About = lazy(() => import("@/pages/landing-page/about/About"));
const Features = lazy(() => import("@/pages/landing-page/features/Features"));
const IBPartnership = lazy(() => import("@/pages/landing-page/ib-partnership/IBPartnership"));
const AdvancedToolsPage = lazy(() => import("@/pages/landing-page/advanced-tools/AdvancedToolsPage"));
const SignalsPage = lazy(() => import("@/pages/landing-page/signals/SignalsPage"));
const EducationPage = lazy(() => import("@/pages/landing-page/education/EducationPage"));
const LiveSessionsPage = lazy(() => import("@/pages/landing-page/live-sessions/LiveSessionsPage"));
const CommunityForumPage = lazy(() => import("@/pages/landing-page/community-forum/CommunityForumPage"));
const IBPartnershipPage = lazy(() => import("@/pages/landing-page/ib-partnership-page/IBPartnershipPage"));
const ImperialPartnership = lazy(() => import("@/pages/landing-page/imperial-partnership/ImperialPartnership"));
const Signin = lazy(() => import("@/pages/landing-page/signin/Signin"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password/ResetPasswordPage"));
const DisclaimersPage = lazy(() => import("@/pages/legal/DisclaimersPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage"));
const AccountRequest = lazy(() => import("@/pages/landing-page/account-request/AccountRequest"));
const AccountRequestStatus = lazy(() => import("@/pages/landing-page/account-request-status/AccountRequestStatus"));

// Dashboard Pages - Lazy Loaded
const Home = lazy(() => import("@/pages/dashboard/home/Home"));
const Live = lazy(() => import("@/pages/dashboard/live/Live"));
const SignalStreamOptimized = lazy(() => import("@/components/dashboard/SignalStreamOptimized"));
const NewSignalPage = lazy(() => import("@/pages/dashboard/new-signal/NewSignalPage"));
const Education = lazy(() => import("@/pages/dashboard/education/Education"));
const Forum = lazy(() => import("@/pages/dashboard/forum/Forum"));
const AdvancedTools = lazy(() => import("@/pages/dashboard/advanced-tools/AdvancedTools"));
const AdminTools = lazy(() => import("@/pages/dashboard/advanced-tools/AdminTools"));
const MyProgress = lazy(() => import("@/pages/dashboard/my-progress/MyProgress"));
const Progress = lazy(() => import("@/pages/dashboard/progress/Progress"));
const Settings = lazy(() => import("@/pages/dashboard/settings/Settings"));
const AdminPanel = lazy(() => import("@/pages/dashboard/admin-panel/AdminPanel"));
const AthenaTest = lazy(() => import("@/pages/dashboard/athena/AthenaTest"));
const DevTests = lazy(() => import("@/pages/dashboard/dev-tests/DevTests"));
const PriceTestingPage = lazy(() => import("@/pages/dashboard/dev-tests/PriceTestingPage"));

// Educator Pages - Lazy Loaded
const EducatorSignalManagement = lazy(() => import("@/pages/dashboard/educator/EducatorSignalManagement"));

// Other Components - Eager Load (small, always needed)
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import AccessDenied from "@/components/AccessDenied";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  console.log('🏗️ App component initializing...');

  // Initialize app state on startup
  useEffect(() => {
    console.log('🔧 Initializing app state...');
    try {
      initializeAppState();
      verifyServiceWorkerSafety();
      
      // Initialize Capacitor notification service
      capacitorNotificationService.initialize();
      
      console.log('✅ App state initialized successfully');
    } catch (error) {
      console.error('❌ Error during app state initialization:', error);
    }
  }, []);

  console.log('🚀 App: Rendering normal application flow...');

  // Normal app flow with all providers
  try {
    console.log('🌐 Rendering main application with all providers...');
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RealtimeShutdownGuard />
          <VersionChecker />
          <CacheCleanerMount />
          <Sonner />
          <BrowserRouter>
              <ScrollToTop />
              <AuthProvider>
                <ModernNotificationSystem />
                <WelcomeProvider>
                  <NotificationPromptProvider>
                    <NavigationGuard>
                       <RealtimeHealthProvider>
                         <RealtimeConnectionManagerProvider>
                           <TelemetryProvider>
                          <GlobalPreviewControlProvider>
                          <OptimizedWebSocketPriceProvider>
                          <WebSocketErrorBoundary>
                            <ContextErrorBoundary>
                              <SharedRealtimeProvider>
                                <RouteBasedEconomicProvider>
                                   <SignalRealtimeProvider>
                       <Suspense fallback={
                         <div className="min-h-screen flex items-center justify-center bg-background">
                           <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                         </div>
                       }>
                       <Routes>
                        {/* Landing Routes */}
                        <Route
                          path="/"
                          element={<LandingLayout />}
                          errorElement={<RouteErrorBoundary />}
                        >
                          <Route index element={<Landing />} />
                          <Route path="about" element={<About />} />
                          <Route path="features" element={<Features />} />
                          <Route
                            path="advanced-tools"
                            element={<AdvancedToolsPage />}
                          />
                          <Route path="signals" element={<SignalsPage />} />
                          <Route path="education" element={<EducationPage />} />
                          <Route
                            path="live-sessions"
                            element={<LiveSessionsPage />}
                          />
                          <Route
                            path="community-forum"
                            element={<CommunityForumPage />}
                          />
<Route
                            path="ib-partnership"
                            element={<ImperialPartnership />}
                          />
                          <Route
                            path="ib-partnership-new"
                            element={<ImperialPartnership />}
                          />
                          <Route
                            path="imperial-partnership"
                            element={<ImperialPartnership />}
                           />
                            <Route path="signin" element={<Signin />} />
                            <Route path="legal/disclaimers" element={<DisclaimersPage />} />
                           <Route path="legal/terms" element={<TermsPage />} />
                           <Route path="legal/privacy" element={<PrivacyPage />} />
                          <Route
                            path="account-request"
                            element={<AccountRequest />}
                          />
                          <Route
                            path="account-request-status"
                            element={<AccountRequestStatus />}
                          />
                          </Route>

                        {/* Reset Password Route - Clean Layout */}
                        <Route
                          path="reset-password" 
                          element={<ResetPasswordLayout />}
                          errorElement={<RouteErrorBoundary />}
                        >
                          <Route index element={<ResetPasswordPage />} />
                        </Route>

                         {/* Dashboard Routes */}
                         <Route
                           path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <TooltipProvider>
                                <Layout>
                                  <div></div>
                                </Layout>
                              </TooltipProvider>
                            </ProtectedRoute>
                          }
                          errorElement={<RouteErrorBoundary />}
                        >
                          <Route
                            index
                            element={<Navigate to="/dashboard/home" replace />}
                          />
                          <Route path="home" element={<Home />} />
                          <Route path="live" element={<Live />} />
                          <Route
                            path="signal-stream"
                            element={<SignalStreamOptimized />}
                          />
                  <Route
                    path="new-signal"
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'educator', 'educator+']}>
                        <NewSignalPage />
                      </ProtectedRoute>
                    }
                  />
            <Route
              path="advanced-tools"
              element={<AdvancedTools />}
            />
            <Route
              path="admin-tools"
              element={<AdminTools />}
            />
                          <Route path="my-progress" element={<MyProgress />} />
                          <Route path="progress" element={<Progress />} />
                           <Route path="settings" element={<Settings />} />
                           <Route path="education" element={<Education />} />
                           <Route path="forum" element={<Forum />} />
                            {isDevToolsEnabled() && (
                               <>
                                 <Route path="athena" element={<AthenaTest />} />
                                 <Route path="dev-tests" element={<DevTests />} />
                                 <Route path="price-testing" element={<PriceTestingPage />} />
                                  <Route 
                                    path="realtime-cost-status" 
                                    element={
                                      <ProtectedRoute requiredRoles={['admin']}>
                                 <div className="p-4">
                                          {createElement(
                                            lazy(() => import("@/pages/debug/RealtimeCostStatus"))
                                          )}
                                        </div>
                                      </ProtectedRoute>
                                    } 
                                  />
                               </>
                             )}

                          <Route
                            path="admin"
                            element={
                              <AdminRoute allowedRoles={['admin', 'moderator', 'educator', 'educator+']}>
                                <AdminPanel />
                              </AdminRoute>
                            }
                          />

                          <Route path="educator">
                            <Route
                              path="signals"
                              element={
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
                                  <EducatorSignalManagement />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="analytics"
                              element={
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
                                  <div className="p-6">
                                    <h1 className="text-2xl font-bold">
                                      Performance Analytics
                                    </h1>
                                    <p className="text-secondary">
                                      Coming soon...
                                    </p>
                                  </div>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="followers"
                              element={
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
                                  <div className="p-6">
                                    <h1 className="text-2xl font-bold">
                                      Followers & Engagement
                                    </h1>
                                    <p className="text-secondary">
                                      Coming soon...
                                    </p>
                                  </div>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="ib-dashboard"
                              element={
                                <ProtectedRoute requiredRoles={['educator+']}>
                                  <div className="p-6">
                                    <h1 className="text-2xl font-bold">
                                      IB Partner Dashboard
                                    </h1>
                                    <p className="text-secondary">
                                      Coming soon...
                                    </p>
                                  </div>
                                </ProtectedRoute>
                              }
                            />
                          </Route>
                        </Route>

                        {/* Error Routes */}
                        <Route
                          path="/access-denied"
                          element={<AccessDenied />}
                        />
                        <Route path="*" element={<NotFound />} />
                       </Routes>
                       </Suspense>
                                   </SignalRealtimeProvider>
                                </RouteBasedEconomicProvider>
                              </SharedRealtimeProvider>
                          </ContextErrorBoundary>
                        </WebSocketErrorBoundary>
                        </OptimizedWebSocketPriceProvider>
                        </GlobalPreviewControlProvider>
                         </TelemetryProvider>
                       </RealtimeConnectionManagerProvider>
                     </RealtimeHealthProvider>
                  </NavigationGuard>
                </NotificationPromptProvider>
                {/* Global Welcome Animation - renders outside all layouts */}
                <GlobalWelcomeOverlay />
              </WelcomeProvider>
            </AuthProvider>
          </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  } catch (error) {
    console.error('❌ Critical error rendering main application:', error);
    
    // Ultimate fallback - simple app that works
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ color: '#ff6b6b' }}>Trade Imperial - Loading Error</h1>
        <p>The application failed to load properly.</p>
        <p><strong>Error:</strong> {error instanceof Error ? error.message : String(error)}</p>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', marginRight: '10px' }}
          >
            Reload Page
          </button>
          <button 
            onClick={() => window.location.href = '/signin'} 
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Go to Sign In
          </button>
        </div>
        <details style={{ marginTop: '20px' }}>
          <summary style={{ cursor: 'pointer', color: '#ffc107' }}>Technical Details</summary>
          <pre style={{ background: '#2a2a2a', padding: '10px', marginTop: '10px', overflow: 'auto' }}>
            {error instanceof Error ? error.stack : 'No stack trace available'}
          </pre>
        </details>
      </div>
    );
  }
}

export default App;
