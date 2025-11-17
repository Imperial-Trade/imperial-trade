import React from 'react';
import { Search, Filter, TrendingUp, Users, Clock, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSignalTheme } from '@/hooks/useSignalTheme';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface SignalStreamBottomNavProps {
  filters: FilterState;
  onOpenSheet: (type: 'search' | 'filters' | 'notifications') => void;
  educatorOptions: Array<{ id: string; name: string }>;
  unreadNotifications?: number;
  onBellClick?: () => void;
  canCreateSignals?: boolean;
  onCreateClick?: () => void;
}

const navItems = [
  {
    name: 'Search',
    icon: Search,
    type: 'search' as const,
  },
  {
    name: 'Filter',
    icon: Filter,
    type: 'filters' as const,
  },
];

export const SignalStreamBottomNav: React.FC<SignalStreamBottomNavProps> = ({
  filters,
  onOpenSheet,
  educatorOptions,
  unreadNotifications = 0,
  onBellClick,
  canCreateSignals = false,
  onCreateClick,
}) => {
  const { colors } = useSignalTheme();

  const isActive = (type: string) => {
    switch (type) {
      case 'search':
        return filters.search !== '';
      case 'filters':
        return (filters.status !== 'all' && filters.status !== '') ||
               (filters.tradeType !== 'all' && filters.tradeType !== '') ||
               (filters.educator !== 'all' && filters.educator !== '');
      case 'notifications':
        return false;
      default:
        return false;
    }
  };

  // Calculate active filter count for badge
  const activeFilterCount = [
    filters.status !== 'all' && filters.status !== '',
    filters.tradeType !== 'all' && filters.tradeType !== '',
    filters.educator !== 'all' && filters.educator !== '',
  ].filter(Boolean).length;

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 z-[100] pb-safe bottom-nav-fixed"
      style={{
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      <div className="flex justify-around items-center py-2">
        {/* Notification Bell */}
        <button
          onClick={() => onOpenSheet('notifications')}
          className="flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 relative"
        >
          <Clock className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute top-1 right-4 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-bounce bg-red-500 border-2 border-background"
            >
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </Badge>
          )}
          <span className="text-xs font-medium">Recent</span>
        </button>

        {navItems.map((item) => {
          const active = isActive(item.type);
          return (
            <button
              key={item.type}
              onClick={() => onOpenSheet(item.type)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg relative ${
                active
                  ? 'glass-emerald border-emerald-primary/20'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
              style={active ? {
                color: colors.accent.primary,
              } : undefined}
            >
              <item.icon 
                className={`w-6 h-6 ${active ? 'fill-emerald-primary/20 drop-shadow-lg' : ''}`} 
              />
              {/* Filter count badge */}
              {item.type === 'filters' && activeFilterCount > 0 && (
                <Badge 
                  className="absolute top-1 right-4 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center border-2 border-background"
                  style={{
                    background: colors.accent.primary,
                    color: 'white'
                  }}
                >
                  {activeFilterCount}
                </Badge>
              )}
              <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </button>
          );
        })}

        {/* Create Alert Button - Educators/Admins Only */}
        {canCreateSignals && (
          <button
            onClick={onCreateClick}
            className="flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg relative group hover:scale-105 active:scale-95"
            style={{
              background: colors.state.ctaGradient,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `1px solid ${colors.border.active}`,
            }}
          >
            <Plus 
              className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90"
              style={{
                color: colors.text.accent,
              }}
            />
            <span className="text-xs font-bold text-white">
              Create
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
