
import React from 'react';
import type { User } from '@supabase/supabase-js';

interface MenuItem {
  title: string;
  url: string;
  accessLevel: string;
}

interface SidebarProps {
  user: User | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentPageName: string;
  filteredMenuItems: MenuItem[];
  getUserAccessLevel: () => string;
  getAccessLevelDisplay: (level: string) => { label: string; color: string };
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  sidebarOpen,
  setSidebarOpen,
  currentPageName,
  filteredMenuItems,
  getUserAccessLevel,
  getAccessLevelDisplay
}) => {
  return (
    <>
      <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 w-64 bg-surface/95 backdrop-blur-xl border-r border-border/50 transform transition-transform duration-300 ease-in-out pt-16 lg:pt-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          {user && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-amber-300/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-amber-300 flex items-center justify-center text-white font-bold">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-sm text-primary">
                    {user.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getAccessLevelDisplay(getUserAccessLevel()).label} Access
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="space-y-2">
            {filteredMenuItems.map((item) => (
              <a
                key={item.title}
                href={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentPageName.toLowerCase() === item.title.toLowerCase().replace(/\s+/g, '')
                    ? "bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <span className="font-medium">{item.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
