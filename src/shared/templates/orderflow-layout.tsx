import React from 'react';
import { NavigationProvider } from '../components/navigation/NavigationProvider';
import { SharedHeader } from '../components/navigation/SharedHeader';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { 
  Home,
  BarChart,
  TrendingUp,
  Activity,
  Settings,
  Zap,
} from "lucide-react";

// OrderFlow-specific navigation configuration
const orderFlowNavigationItems = [
  { to: "/dashboard/home", icon: Home, label: "Dashboard" },
  { to: "/dashboard/market-depth", icon: BarChart, label: "Market Depth" },
  { to: "/dashboard/order-flow", icon: Activity, label: "Order Flow" },
  { to: "/dashboard/footprint", icon: TrendingUp, label: "Footprint Charts" },
  { to: "/dashboard/scalping", icon: Zap, label: "Scalping Tools" },
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