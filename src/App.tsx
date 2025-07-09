import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import LandingPage from './pages/LandingPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import AccountRequest from './pages/AccountRequest';
import AboutPage from './pages/AboutPage';
import PartnershipPage from './pages/PartnershipPage';
import FeaturesPage from './pages/FeaturesPage';
import SignalStream from './pages/dashboard/signal-stream/SignalStream';
import NewSignalPage from './pages/dashboard/new-signal/NewSignalPage';
import { QueryClient } from '@tanstack/react-query';
import { WebSocketPriceProvider } from '@/contexts/WebSocketPriceContext';

function App() {
  return (
    <Router>
      <QueryClient>
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
      </QueryClient>
    </Router>
  );
}

export default App;
