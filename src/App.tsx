
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketPriceProvider } from '@/contexts/WebSocketPriceContext';

// Import pages from their correct locations
import LandingPage from './pages/landing-page/landing/Landing';
import DashboardLayout from './pages/layouts/DashboardLayout';
import AccountRequest from './pages/landing-page/account-request/AccountRequest';
import AboutPage from './pages/landing-page/about/About';
import PartnershipPage from './pages/landing-page/ib-partnership/IBPartnership';
import FeaturesPage from './pages/landing-page/features/Features';
import SignalStream from './pages/dashboard/signal-stream/SignalStream';
import NewSignalPage from './pages/dashboard/new-signal/NewSignalPage';

// Create QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <WebSocketPriceProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/account-request" element={<AccountRequest />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/partnership" element={<PartnershipPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                
                {/* Dashboard Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<SignalStream />} />
                  <Route path="new-signal" element={<NewSignalPage />} />
                </Route>
              </Routes>
              <Toaster />
            </div>
          </WebSocketPriceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
