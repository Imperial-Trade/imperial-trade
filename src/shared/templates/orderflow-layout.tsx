import React from 'react';
import { NavigationProvider } from '../components/navigation/NavigationProvider';
import { SharedHeader } from '../components/navigation/SharedHeader';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { 
  Home,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  Users,
  Settings,
} from "lucide-react";

// OrderFlow-specific navigation configuration
const orderFlowNavigationItems = [
  { to: "/dashboard/home", icon: Home, label: "Dashboard" },
  { to: "/dashboard/charts", icon: TrendingUp, label: "Live Charts" },
  { to: "/dashboard/analysis", icon: BarChart3, label: "Market Analysis" },
  { to: "/dashboard/scanner", icon: Activity, label: "Order Scanner" },
  { to: "/dashboard/signals", icon: Target, label: "Trade Signals" },
  { to: "/dashboard/community", icon: Users, label: "Community" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

interface OrderFlowLayoutProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
}

export function OrderFlowLayout({ children, user, onLogout }: OrderFlowLayoutProps) {
  return (
    <NavigationProvider>
      <div className="min-h-screen flex w-full">
        <SharedHeader 
          baseUrl="/orderflow" 
          user={user}
          onLogout={onLogout}
        />
        
        <div className="flex min-h-screen w-full">
          <AppSidebar 
            user={user}
            navigationItems={orderFlowNavigationItems}
          />
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}