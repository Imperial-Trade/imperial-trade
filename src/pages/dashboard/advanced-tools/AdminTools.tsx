import React, { useState, useEffect } from 'react';
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

export default function AdminTools() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('account-requests');
  
  // Auto-expand sidebar on desktop on mount
  useEffect(() => {
    if (window.innerWidth > 768) {
      setSidebarCollapsed(false);
    }
  }, []);

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

  return (
    <>
      <style>{`
        .admin-tools-container {
          background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%);
          position: relative;
        }
        
        .admin-tools-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .admin-sidebar {
          position: fixed;
          right: 0;
          top: 5rem;
          height: calc(100vh - 5rem);
          background: hsl(var(--card) / 0.6);
          backdrop-filter: blur(20px);
          border-left: 1px solid hsl(var(--border) / 0.3);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 40;
          overflow-y: auto;
          box-shadow: -10px 0 30px hsl(var(--background) / 0.3);
        }

        .admin-sidebar.expanded {
          width: 280px;
        }

        .admin-sidebar.collapsed {
          width: 88px;
        }

        .admin-content {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding-top: 4rem;
          min-height: calc(100vh - 4rem);
        }

        .admin-content.sidebar-open {
          margin-right: 312px;
          transform: scale(0.95);
        }

        .admin-content.sidebar-closed {
          margin-right: 120px;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          margin: 0.5rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 1rem;
          border: 1px solid transparent;
        }

        .admin-nav-item:hover {
          background: hsl(var(--accent) / 0.1);
          border-color: hsl(var(--primary) / 0.2);
          transform: translateX(-4px);
        }

        .admin-nav-item.active {
          background: linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--accent) / 0.15) 100%);
          border-color: hsl(var(--primary) / 0.4);
          box-shadow: 0 4px 12px hsl(var(--primary) / 0.2);
        }

        .admin-nav-item.collapsed {
          justify-content: center;
          padding: 0.875rem;
        }

        .admin-nav-item svg {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .admin-nav-item.collapsed svg {
          transform: scale(1.1);
        }

        .admin-nav-item.collapsed:hover svg {
          transform: scale(1.2);
        }

        .admin-nav-item.collapsed:hover::after {
          content: attr(data-label);
          position: absolute;
          left: 100%;
          margin-left: 0.5rem;
          padding: 0.5rem 1rem;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          white-space: nowrap;
          z-index: 60;
          box-shadow: 0 4px 12px hsl(var(--background) / 0.3);
        }

        .glass-card {
          background: hsl(var(--card) / 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 1rem;
          box-shadow: 0 8px 32px hsl(var(--background) / 0.3);
        }

        .toggle-button {
          position: fixed;
          top: 6rem;
          z-index: 50;
          background: hsl(var(--primary) / 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid hsl(var(--primary) / 0.5);
          border-radius: 0.5rem;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
        }

        .toggle-button.sidebar-expanded {
          right: 292px;
        }

        .toggle-button.sidebar-collapsed {
          right: 100px;
        }

        .toggle-button:hover {
          background: hsl(var(--primary));
          transform: scale(1.05);
          box-shadow: 0 6px 20px hsl(var(--primary) / 0.4);
        }

        @media (max-width: 768px) {
          .admin-sidebar.expanded {
            width: 240px;
          }

          .admin-sidebar.collapsed {
            width: 72px;
          }
          
          .admin-content.sidebar-open {
            margin-right: 260px;
          }

          .admin-content.sidebar-closed {
            margin-right: 88px;
          }

          .toggle-button.sidebar-expanded {
            right: 252px;
          }

          .toggle-button.sidebar-collapsed {
            right: 84px;
          }
        }
      `}</style>

      <div className="admin-tools-container min-h-screen w-full relative overflow-hidden">
        {/* Toggle Button */}
        <button
          className={`toggle-button ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-primary-foreground" />
          )}
        </button>

        {/* Admin Sidebar */}
        <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
          <div className="p-4">
            {/* Header - adapts to collapsed state */}
            <div className="mb-6">
              {sidebarCollapsed ? (
                <div className="flex items-center justify-center">
                  <Settings className="w-8 h-8 text-primary" />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-foreground px-2">
                    Admin Tools
                  </h2>
                  <hr className="mt-4 border-border/30" />
                </>
              )}
            </div>

            <nav>
              {adminSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <div
                    key={section.id}
                    className={`admin-nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                    data-label={section.label}
                  >
                    <Icon className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-6 h-6'} shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
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

        {/* Main Content */}
        <main className={`admin-content ${sidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}>
          <div className="container mx-auto p-6 md:p-8">
            <div className="glass-card p-8 md:p-12 min-h-[60vh] flex flex-col items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="mb-6">
                  <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Admin Tools Dashboard
                </h1>
                <p className="text-muted-foreground text-lg mb-6">
                  This content area automatically resizes and adapts when the sidebar is toggled.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Currently viewing: <strong className="text-primary">{activeSection.replace('-', ' ')}</strong>
                  </span>
                </div>
                <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Select a tool from the sidebar to begin managing your platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
