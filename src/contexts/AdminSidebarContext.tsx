import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminSidebarContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Auto-expand sidebar on desktop on mount
  useEffect(() => {
    if (window.innerWidth > 768) {
      setSidebarCollapsed(false);
    }
  }, []);
  
  return (
    <AdminSidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error('useAdminSidebar must be used within AdminSidebarProvider');
  }
  return context;
}
