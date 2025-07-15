
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Search, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full sophisticated-bg-mesh">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Dashboard Header */}
          <header className="sticky top-0 z-50 w-full border-b glass-effect">
            <div className="container flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                <div className="hidden md:flex items-center gap-3">
                  <h1 className="text-xl font-bold imperial-gradient-text">
                    IMPERIAL DASHBOARD
                  </h1>
                  {user?.user_metadata?.access_level === 'admin' && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-medium">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="relative hover:bg-white/10 transition-colors">
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>
                
                <Button variant="ghost" size="sm" className="relative hover:bg-white/10 transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Notifications</span>
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white animate-pulse"
                  >
                    3
                  </Badge>
                </Button>

                <Button variant="ghost" size="sm" className="hover:bg-white/10 transition-colors">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
