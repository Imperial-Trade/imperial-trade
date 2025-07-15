
import React from 'react';
import { Crown } from 'lucide-react';
import { SidebarCloseButton } from './SidebarCloseButton';

interface SidebarBrandProps {
  isCollapsed: boolean;
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-2">
      <div className="flex items-center gap-4">
        {/* Imperial Crown Logo - Matching Landing Page */}
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
          <Crown className="w-6 h-6 text-black" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-xl font-black imperial-gradient-text tracking-wider">
              IMPERIAL
            </span>
            <span className="text-xs text-white/70 uppercase tracking-widest font-medium">
              Trading Community
            </span>
          </div>
        )}
      </div>
      
      {/* Close button - always visible */}
      <SidebarCloseButton />
    </div>
  );
}
