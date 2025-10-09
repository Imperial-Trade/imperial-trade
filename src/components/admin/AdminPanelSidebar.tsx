import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Users, Signal, Bell, Settings, RefreshCw, 
  Activity, Shield, BarChart3, Code, Menu 
} from 'lucide-react';

interface AdminPanelSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  canAccessRequests: boolean;
  canAccessUsers: boolean;
  canAccessSignals: boolean;
  canAccessNotifications: boolean;
  canAccessSystem: boolean;
  canAccessRateLimits: boolean;
  canAccessDiagnostics: boolean;
  canAccessOptimization: boolean;
  canAccessMonitoring: boolean;
  canAccessSettings: boolean;
  canAccessDevTools: boolean;
  userRole: string;
  isDevToolsEnabled: boolean;
}

export default function AdminPanelSidebar({
  activeTab,
  setActiveTab,
  canAccessRequests,
  canAccessUsers,
  canAccessSignals,
  canAccessNotifications,
  canAccessSystem,
  canAccessRateLimits,
  canAccessDiagnostics,
  canAccessOptimization,
  canAccessMonitoring,
  canAccessSettings,
  canAccessDevTools,
  userRole,
  isDevToolsEnabled,
}: AdminPanelSidebarProps) {
  
  const navItems = [
    { value: 'requests', label: 'Account Requests', icon: Users, show: canAccessRequests },
    { value: 'users', label: 'User Management', icon: Users, show: canAccessUsers },
    { value: 'signals', label: 'Trading Signals', icon: Signal, show: canAccessSignals },
    { value: 'notifications', label: 'Notifications', icon: Bell, show: canAccessNotifications },
    { value: 'system', label: 'System Monitor', icon: Settings, show: canAccessSystem },
    { value: 'rate-limits', label: 'Rate Limits', icon: RefreshCw, show: canAccessRateLimits },
    { value: 'diagnostics', label: 'Diagnostics', icon: Activity, show: canAccessDiagnostics },
    { value: 'optimization', label: 'Optimization', icon: Shield, show: canAccessOptimization },
    { value: 'monitoring', label: 'Monitoring', icon: BarChart3, show: canAccessMonitoring },
    { value: 'settings', label: 'Settings', icon: Settings, show: canAccessSettings },
    { value: 'devtools', label: 'Dev Tools', icon: Code, show: canAccessDevTools },
  ].filter(item => item.show);

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <Badge variant="outline" className="w-full justify-center py-2 admin-sidebar-badge">
          <Shield className="w-3 h-3 mr-2" />
          {userRole} Access
        </Badge>
        {isDevToolsEnabled && (
          <Badge variant="outline" className="w-full justify-center py-2 mt-2 bg-blue-500/10 border-blue-500/30 text-blue-400">
            <Code className="w-3 h-3 mr-2" />
            Dev Mode
          </Badge>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          
          return (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`admin-sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* MOBILE & TABLET: Hamburger Menu (< 1280px) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="xl:hidden fixed top-20 right-4 z-50 glass-effect border-border/50 hover:bg-primary/10"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0 admin-sidebar border-l">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* DESKTOP: Fixed Right Sidebar (≥ 1280px) */}
      <aside className="hidden xl:flex admin-sidebar">
        <SidebarContent />
      </aside>
    </>
  );
}
