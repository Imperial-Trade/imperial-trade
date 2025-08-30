
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import SigninPage from "./pages/landing-page/signin/Signin";
import SignupPage from "./pages/auth/Signup";
import AccountRequestPage from "./pages/landing-page/account-request/AccountRequest";
import AccountRequestStatusPage from "./pages/landing-page/account-request-status/AccountRequestStatus";
import DashboardLayout from "./components/layout/DashboardLayout";
import Home from "./pages/dashboard/home/Home";
import SignalsList from "./pages/dashboard/signals/SignalsList";
import VideosList from "./pages/dashboard/videos/VideosList";
import VideoPlayer from "./pages/dashboard/videos/VideoPlayer";
import LiveSessionsList from "./pages/dashboard/live-sessions/LiveSessionsList";
import LiveSessionViewer from "./pages/dashboard/live-sessions/LiveSessionViewer";
import TradingJournalList from "./pages/dashboard/trading-journal/TradingJournalList";
import PortfolioTracker from "./pages/dashboard/portfolio/PortfolioTracker";
import CommunityForum from "./pages/dashboard/community/CommunityForum";
import ProfilePage from "./pages/dashboard/profile/ProfilePage";
import AthenaChat from "./pages/dashboard/athena/AthenaChat";
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import { AuthProvider } from "./contexts/AuthContext";
import { SignalRealtimeProvider } from "./contexts/SignalRealtimeContext";
import { WebSocketPriceProvider } from "./contexts/WebSocketPriceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import AdminRoute from "./components/routing/AdminRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SignalRealtimeProvider>
            <WebSocketPriceProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <div className="min-h-screen bg-background font-sans antialiased">
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/signin" element={<SigninPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/account-request" element={<AccountRequestPage />} />
                      <Route path="/account-request-status" element={<AccountRequestStatusPage />} />
                      
                      {/* Protected dashboard routes */}
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
                        <Route path="signals" element={<SignalsList />} />
                        <Route path="videos" element={<VideosList />} />
                        <Route path="videos/:id" element={<VideoPlayer />} />
                        <Route path="live-sessions" element={<LiveSessionsList />} />
                        <Route path="live-sessions/:id" element={<LiveSessionViewer />} />
                        <Route path="trading-journal" element={<TradingJournalList />} />
                        <Route path="portfolio" element={<PortfolioTracker />} />
                        <Route path="community" element={<CommunityForum />} />
                        <Route path="athena" element={<AthenaChat />} />
                        <Route path="profile" element={<ProfilePage />} />
                        
                        {/* Admin routes */}
                        <Route
                          path="admin"
                          element={
                            <AdminRoute>
                              <AdminDashboard />
                            </AdminRoute>
                          }
                        />
                      </Route>
                    </Routes>
                  </div>
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </ThemeProvider>
            </WebSocketPriceProvider>
          </SignalRealtimeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
