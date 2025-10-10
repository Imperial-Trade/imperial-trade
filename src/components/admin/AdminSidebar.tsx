import React from 'react';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Bell, 
  Activity, 
  Timer, 
  Zap, 
  BarChart3, 
  LineChart, 
  Settings, 
  Code,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

const adminSections = [
  { id: 'account-requests', label: 'Account Requests', icon: FileText },
  { id: 'user-management', label: 'User Management', icon: Users },
  { id: 'trading-signals', label: 'Trading Signals', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system-monitor', label: 'System Monitor', icon: Activity },
  { id: 'rate-limits', label: 'Rate Limits', icon: Timer },
  { id: 'diagnostics', label: 'Diagnostics', icon: Zap },
  { id: 'optimization', label: 'Optimization', icon: BarChart3 },
  { id: 'monitoring', label: 'Monitoring', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'dev-tools', label: 'Dev Tools', icon: Code },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useAdminSidebar();

  return (
    <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="p-4">
        {/* Toggle Button - FIRST ELEMENT */}
        <button
          className={`toggle-button ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="w-6 h-6 text-primary" />
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-primary">Collapse</span>
              <ChevronRight className="w-5 h-5 text-primary" />
            </div>
          )}
        </button>

        {/* Admin Tools Header */}
        {!sidebarCollapsed && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4 px-2">
              Admin Tools
            </h2>
            <hr className="mb-4 border-border/30" />
          </>
        )}

        <nav>
          {adminSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <div
                key={section.id}
                className={`admin-nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => onSectionChange(section.id)}
                data-tooltip={sidebarCollapsed ? section.label : undefined}
              >
                <Icon 
                  className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-6 h-6'} shrink-0 transition-all duration-300 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`} 
                />
                {!sidebarCollapsed && (
                  <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {section.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
