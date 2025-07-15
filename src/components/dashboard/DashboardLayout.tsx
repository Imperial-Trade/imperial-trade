
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Search, Settings, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      {/* Sophisticated Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/30 to-background pointer-events-none">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-accent/8 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="flex min-h-screen w-full relative">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Premium Financial Dashboard Header */}
          <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <div className="relative container flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-6">
                <SidebarTrigger className="lg:hidden glass-button" />
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Trading Dashboard
                      </h1>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Markets Open
                      </div>
                    </div>
                  </div>
                  {user?.user_metadata?.access_level === 'admin' && (
                    <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                      Admin Access
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Live Market Indicator */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <BarChart3 className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">S&P +0.75%</span>
                </div>

                <Button variant="ghost" size="sm" className="relative glass-button hover:bg-primary/10 group">
                  <Search className="h-4 w-4 transition-colors group-hover:text-primary" />
                  <span className="sr-only">Search</span>
                </Button>
                
                <Button variant="ghost" size="sm" className="relative glass-button hover:bg-primary/10 group">
                  <Bell className="h-4 w-4 transition-colors group-hover:text-primary" />
                  <span className="sr-only">Notifications</span>
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-bounce bg-red-500 border-2 border-background"
                  >
                    3
                  </Badge>
                </Button>

                <Button variant="ghost" size="sm" className="glass-button hover:bg-primary/10 group">
                  <Settings className="h-4 w-4 transition-colors group-hover:text-primary" />
                  <span className="sr-only">Settings</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content with Enhanced Container */}
          <main className="flex-1 overflow-auto relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/5 to-transparent pointer-events-none"></div>
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
