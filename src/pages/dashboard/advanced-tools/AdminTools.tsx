import { useSearchParams } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AdminTools() {
  const [searchParams] = useSearchParams();
  const adminSection = searchParams.get('admin');

  return (
    <div className="min-h-screen w-full bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Admin Tools</h1>
            <p className="text-muted-foreground mt-1">
              Use the Admin Arsenal sidebar on the right to select a tool
            </p>
          </div>
        </div>
        
        {/* Dynamic content based on selected admin section */}
        <div className="glass-container rounded-3xl p-8 border border-border">
          {adminSection === 'requests' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Account Requests</h2>
              <p className="text-muted-foreground">Review and approve new account applications</p>
            </div>
          )}
          
          {adminSection === 'users' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">User Management</h2>
              <p className="text-muted-foreground">Manage user roles, permissions, and status</p>
            </div>
          )}
          
          {adminSection === 'signals' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Trading Signals Management</h2>
              <p className="text-muted-foreground">Monitor and manage all trading signals</p>
            </div>
          )}
          
          {adminSection === 'notifications' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Notifications</h2>
              <p className="text-muted-foreground">Send system-wide notifications and alerts</p>
            </div>
          )}
          
          {adminSection === 'monitor' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">System Monitor</h2>
              <p className="text-muted-foreground">Real-time system health and performance</p>
            </div>
          )}
          
          {adminSection === 'limits' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
              <p className="text-muted-foreground">Configure API rate limits and throttling</p>
            </div>
          )}
          
          {adminSection === 'diagnostics' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Diagnostics</h2>
              <p className="text-muted-foreground">System diagnostics and troubleshooting</p>
            </div>
          )}
          
          {adminSection === 'optimization' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Optimization</h2>
              <p className="text-muted-foreground">Performance optimization and tuning</p>
            </div>
          )}
          
          {adminSection === 'monitoring' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Monitoring</h2>
              <p className="text-muted-foreground">Analytics and monitoring dashboards</p>
            </div>
          )}
          
          {!adminSection && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-xl text-muted-foreground">
                Select a tool from the Admin Arsenal to begin
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Swipe from the right edge or press <kbd className="px-2 py-1 bg-accent rounded text-xs border border-border">Alt+A</kbd>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
