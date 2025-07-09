
import React from 'react';
import { Crown } from 'lucide-react';

interface SidebarBrandProps {
  isCollapsed: boolean;
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="flex items-center justify-center w-8 h-8">
        <Crown className="w-6 h-6 text-primary" />
      </div>
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-sidebar-foreground">
            IMPERIAL
          </span>
          <span className="text-xs text-muted-foreground">
            Trading Community
          </span>
        </div>
      )}
    </div>
  );
}
