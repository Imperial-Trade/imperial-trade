import React, { useState } from 'react';
import { BarChart3, Activity } from 'lucide-react';
import { AdminSidebarProvider } from '@/contexts/AdminSidebarContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminSidebarStyles } from '@/components/admin/AdminSidebarStyles';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

function AdminToolsContent() {
  const [activeSection, setActiveSection] = useState('account-requests');
  const { sidebarCollapsed } = useAdminSidebar();

  return (
    <>
      <AdminSidebarStyles />
      
      <div className="admin-tools-container min-h-screen w-full relative">
        <AdminSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
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

export default function AdminTools() {
  return (
    <AdminSidebarProvider>
      <AdminToolsContent />
    </AdminSidebarProvider>
  );
}
