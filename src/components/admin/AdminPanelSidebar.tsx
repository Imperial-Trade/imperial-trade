import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Signal, Bell, Settings, RefreshCw, 
  Activity, Shield, BarChart3, Code 
} from 'lucide-react';

interface AdminPanelSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
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
  isCollapsed,
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
  ].filter(item => item.show);

  return (
    <aside 
      id="admin-sidebar" 
      className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      <nav className="h-full flex flex-col">
        {/* Header */}
        <div className="pt-20 px-2">
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
            <Shield className="w-8 h-8 shrink-0 text-gray-300" />
            {!isCollapsed && (
              <h2 className="nav-text text-xl font-bold text-gray-200 ml-2">
                {userRole} Access
              </h2>
            )}
          </div>
          {!isCollapsed && (
            <>
              {isDevToolsEnabled && (
                <Badge variant="outline" className="w-full justify-center py-2 mb-2 bg-blue-500/10 border-blue-500/30 text-blue-400">
                  <Code className="w-3 h-3 mr-2" />
                  <span className="nav-text">Dev Mode</span>
                </Badge>
              )}
              <hr className="my-4 border-gray-600 nav-text" />
            </>
          )}
        </div>

        {/* Navigation Items */}
        <ul className="space-y-2 flex-grow px-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            
            return (
              <li key={item.value}>
                <button
                  onClick={() => setActiveTab(item.value)}
                  className={`sidebar-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-6 h-6 shrink-0" />
                  <span className="nav-text">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Bottom Section */}
        <div className="p-2">
          {!isCollapsed && <hr className="my-2 border-gray-600 nav-text" />}
          {canAccessSettings && (
            <button 
              className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-6 h-6 shrink-0" />
              <span className="nav-text">Settings</span>
            </button>
          )}
          {canAccessDevTools && (
            <button 
              className={`sidebar-btn ${activeTab === 'devtools' ? 'active' : ''}`}
              onClick={() => setActiveTab('devtools')}
            >
              <Code className="w-6 h-6 shrink-0" />
              <span className="nav-text">Dev Tools</span>
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
}
