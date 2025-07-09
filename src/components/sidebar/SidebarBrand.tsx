
import React from 'react';
import { Crown } from 'lucide-react';

interface SidebarBrandProps {
  isCollapsed: boolean;
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
        <Crown className="w-4 h-4 text-primary-foreground" />
      </div>
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">
            Imperial Trading
          </span>
          <span className="text-xs text-muted-foreground">
            Premium Platform
          </span>
        </div>
      )}
    </div>
  );
}
