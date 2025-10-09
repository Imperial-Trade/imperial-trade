import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Users, User, TrendingUp, Bell, Monitor, Clock, 
  Activity, Sparkles, Server, Settings as SettingsIcon, Code, 
  Shield, ChevronLeft, ChevronRight 
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
  
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Auto-collapse on mobile/tablet, expand on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Adjust main content margin based on sidebar state (desktop only)
  useEffect(() => {
    const adjustMargin = () => {
      const mainContent = document.getElementById('admin-main-content');
      if (mainContent) {
        if (window.innerWidth >= 1280) {
          mainContent.style.marginRight = isCollapsed ? '80px' : '240px';
        } else {
          // On mobile/tablet, remove margin so content uses full width
          mainContent.style.marginRight = '0';
        }
      }
    };

    adjustMargin();
    window.addEventListener('resize', adjustMargin);
    return () => window.removeEventListener('resize', adjustMargin);
  }, [isCollapsed]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!isCollapsed && window.innerWidth < 1280) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCollapsed]);
  
  const navItems = [
    { value: 'requests', label: 'Account Requests', icon: Users, show: canAccessRequests },
    { value: 'users', label: 'User Management', icon: User, show: canAccessUsers },
    { value: 'signals', label: 'Trading Signals', icon: TrendingUp, show: canAccessSignals },
    { value: 'notifications', label: 'Notifications', icon: Bell, show: canAccessNotifications },
    { value: 'system', label: 'System Monitor', icon: Monitor, show: canAccessSystem },
    { value: 'rate-limits', label: 'Rate Limits', icon: Clock, show: canAccessRateLimits },
    { value: 'diagnostics', label: 'Diagnostics', icon: Activity, show: canAccessDiagnostics },
    { value: 'optimization', label: 'Optimization', icon: Sparkles, show: canAccessOptimization },
    { value: 'monitoring', label: 'Monitoring', icon: Server, show: canAccessMonitoring },
    { value: 'settings', label: 'Settings', icon: SettingsIcon, show: canAccessSettings },
    { value: 'devtools', label: 'Dev Tools', icon: Code, show: canAccessDevTools },
  ].filter(item => item.show);

  return (
    <>
      {/* Backdrop for mobile when sidebar is open */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 xl:hidden"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}
      
      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <nav className="h-full flex flex-col">
          {/* Header with padding-top for clearance */}
          <div className="pt-20 px-4 pb-4">
            <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
              <Shield className="w-8 h-8 shrink-0 text-primary" />
              {!isCollapsed && (
                <h2 className="nav-text text-lg font-bold text-foreground ml-3">
                  {userRole} Access
                </h2>
              )}
            </div>
            {!isCollapsed && (
              <>
                {isDevToolsEnabled && (
                  <Badge variant="outline" className="w-full justify-center py-2 bg-blue-500/10 border-blue-500/30 text-blue-400 mb-3">
                    <Code className="w-3 h-3 mr-2" />
                    <span className="nav-text text-xs">Dev Mode</span>
                  </Badge>
                )}
                <hr className="border-border/50 nav-text" />
              </>
            )}
          </div>

          {/* Navigation Items */}
          <ul className="space-y-2 flex-grow overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              
              return (
                <li key={item.value}>
                  <button
                    onClick={() => setActiveTab(item.value)}
                    className={`admin-sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-6 h-6 shrink-0" />
                    {!isCollapsed && (
                      <span className="nav-text text-sm font-medium">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Toggle Button (Circular Chevron) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`admin-toggle-button ${isCollapsed ? 'collapsed' : ''}`}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-6 h-6" />
        ) : (
          <ChevronRight className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
