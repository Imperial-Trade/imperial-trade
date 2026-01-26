import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserCheck, UserCog, TrendingUp, Bell } from 'lucide-react';

interface AdminBottomNavProps {
  className?: string;
}

export function AdminBottomNav({ className = '' }: AdminBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentAdmin = new URLSearchParams(location.search).get('admin') || 'requests';
  
  const navItems = [
    { 
      icon: UserCheck, 
      label: 'Account Requests', 
      adminParam: 'requests',
      path: '/dashboard/admin-tools?admin=requests',
    },
    { 
      icon: UserCog, 
      label: 'User Management', 
      adminParam: 'users',
      path: '/dashboard/admin-tools?admin=users',
    },
    { 
      icon: TrendingUp, 
      label: 'Trading Signals', 
      adminParam: 'signals',
      path: '/dashboard/admin-tools?admin=signals',
    },
    { 
      icon: Bell, 
      label: 'Notifications', 
      adminParam: 'notifications',
      path: '/dashboard/admin-tools?admin=notifications',
    },
  ];

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t border-white/5 ${className}`} style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentAdmin === item.adminParam;
          
          return (
            <button
              key={item.adminParam}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all border ${
                isActive
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
              <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
