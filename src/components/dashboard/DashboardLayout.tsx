
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Search, Settings, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full relative">
        {/* Background Video - Similar to Landing Page */}
        <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover dark:brightness-[0.3] light:brightness-[0.6] transition-all duration-300"
          >
            <source src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4" type="video/mp4" />
            <source src="https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20"></div>
          <div className="absolute inset-0 sophisticated-bg-mesh opacity-80"></div>
        </div>

        <AppSidebar />
        
        <div className="flex-1 flex flex-col relative z-10">
          {/* Imperial Dashboard Header */}
          <header className="sticky top-0 z-50 w-full glass-effect border-b border-white/10">
            <div className="container flex h-20 items-center justify-between px-6">
              <div className="flex items-center gap-6">
                <SidebarTrigger className="lg:hidden text-white hover:bg-white/10" />
                <div className="flex items-center gap-4">
                  {/* Imperial Crown Logo */}
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Crown className="w-8 h-8 text-black" />
                  </div>
                  <div className="hidden md:block">
                    <h1 className="text-2xl font-black imperial-gradient-text tracking-wider">
                      IMPERIAL
                    </h1>
                    <p className="text-xs text-white/70 uppercase tracking-widest font-medium">
                      Trading Dashboard
                    </p>
                  </div>
                  {user?.user_metadata?.access_level === 'admin' && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-bold border-0">
                      ADMIN
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="relative text-white hover:bg-white/10 transition-all duration-300">
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
                
                <Button variant="ghost" size="sm" className="relative text-white hover:bg-white/10 transition-all duration-300">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white animate-pulse border-0">
                    3
                  </Badge>
                </Button>

                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-300">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto relative">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <LoadingSpinner />
                  <p className="mt-4 text-white/80">Loading Imperial Dashboard...</p>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
