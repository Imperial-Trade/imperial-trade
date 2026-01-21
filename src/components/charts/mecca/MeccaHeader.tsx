import React, { useState, useRef, useEffect } from 'react';
import { NotebookPen, BarChart3, Calculator, Sparkles, LucideIcon, TrendingUp, ChevronDown } from 'lucide-react';
import { premiumGradients } from './neonTheme';

// Premium color configuration matching JournalXX
const premiumColors = {
  emerald: '#22c55e',
  emeraldDark: '#16a34a',
  gold: '#eab308',
  goldLight: '#facc15',
};

// Navigation items for MECCA header (desktop)
const NAV_ITEMS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'JOURNAL', icon: NotebookPen, label: 'Journal' },
  { id: 'MECCA', icon: BarChart3, label: 'Mecca' },
  { id: 'CALCU', icon: Calculator, label: 'Calcu' },
  { id: 'INSIGHT', icon: Sparkles, label: 'Insight' },
];

// Mobile tab items for MECCA XX dashboard
const MOBILE_TABS = [
  { id: 'chart', label: 'Chart', icon: '📊' },
  { id: 'economic', label: 'News', icon: '📅' },
  { id: 'analyze', label: 'AI', icon: '🧠' },
];

interface MeccaHeaderProps {
  isConnected?: boolean;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  mobileActiveTab?: 'chart' | 'economic' | 'analyze';
  onMobileTabChange?: (tabId: 'chart' | 'economic' | 'analyze') => void;
  showMobileTabs?: boolean;
}

const MeccaHeader: React.FC<MeccaHeaderProps> = ({ 
  activeTab = 'MECCA', 
  onTabChange,
  mobileActiveTab = 'chart',
  onMobileTabChange,
  showMobileTabs = false,
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside (same pattern as Journal XX modals)
  useEffect(() => {
    if (!mobileTabOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setMobileTabOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => { document.removeEventListener('mousedown', onOutside); document.removeEventListener('touchstart', onOutside); };
  }, [mobileTabOpen]);

  const currentTab = MOBILE_TABS.find((t) => t.id === mobileActiveTab);

  return (
    <header className="w-full shrink-0 flex flex-col py-3 border-b border-white/5 bg-[#050505] transition-all duration-300 relative">
      {/* Row 1: Logo (left) + Session (right) — leveled with items-center; ticker gets its own full-width row below */}
      <div className="flex flex-row justify-between items-center w-full px-4 sm:px-6">
      {/* Logo & Branding + Mobile Tab Dropdown - compact to match SessionIndicators height (~17px) */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        {/* Logo - sized to match SessionIndicators row height */}
        <div className="relative shrink-0">
          <div
            className="w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${premiumColors.emerald} 0%, ${premiumColors.emeraldDark} 100%)`,
              boxShadow: `0 0 12px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.15)`,
            }}
          >
            <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-black" strokeWidth={2.5} />
          </div>
        </div>

        {/* Branding: MECCA XX - text size to match SessionIndicators height */}
        <div className="shrink-0 flex items-center leading-none">
          <h1 className="text-[10px] md:text-xs font-bold tracking-wider flex items-center leading-none">
            <span className="text-white">MECCA</span>
            <span 
              className="ml-1 text-xs md:text-sm font-black animate-text-shimmer leading-none"
              style={{
                background: 'linear-gradient(135deg, #4ade80, #facc15, #4ade80)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              XX
            </span>
          </h1>
          <p className="text-[8px] md:text-[9px] hidden sm:block font-medium tracking-wide ml-1.5 leading-none" style={{ color: 'rgba(163, 163, 163, 0.6)' }}>
            Trading Analysis Hub
          </p>
        </div>

        {/* Mobile/Tablet: Trigger + slidable-down panel (Journal XX nav style) */}
        {showMobileTabs && (
          <div className="lg:hidden relative ml-2">
            {/* Trigger - Journal XX pill style, active when open */}
            <button
              onClick={() => setMobileTabOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] ${
                mobileTabOpen ? '' : 'hover:bg-white/5'
              }`}
              style={
                mobileTabOpen
                  ? {
                      background: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.2), rgba(234, 179, 8, 0.1))',
                      color: '#34d399',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      boxShadow: '0 0 15px rgba(52, 211, 153, 0.15)',
                    }
                  : { color: 'rgba(148, 163, 184, 0.9)', border: '1px solid transparent' }
              }
            >
              <span className="text-base">{currentTab?.icon ?? '📊'}</span>
              <span>{currentTab?.label ?? 'Chart'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${mobileTabOpen ? 'rotate-180' : ''}`}
                style={{ marginLeft: 2 }}
              />
            </button>

            {/* Slide-down panel - Journal XX bottom nav design (rounded-2xl, border, same button styles) */}
            <div
              className="absolute top-full right-0 mt-1 w-[min(220px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1E] shadow-2xl transition-[max-height,opacity] duration-300 ease-out z-[100]"
              style={{
                maxHeight: mobileTabOpen ? 220 : 0,
                opacity: mobileTabOpen ? 1 : 0,
              }}
            >
              <div className="p-2 flex flex-col gap-1">
                {MOBILE_TABS.map((tab) => {
                  const isActive = mobileActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onMobileTabChange?.(tab.id as 'chart' | 'economic' | 'analyze');
                        setMobileTabOpen(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive ? '' : 'opacity-70 hover:opacity-100 border border-transparent'
                      }`}
                      style={
                        isActive
                          ? {
                              background: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.2), rgba(234, 179, 8, 0.1))',
                              color: '#34d399',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              boxShadow: '0 0 15px rgba(52, 211, 153, 0.15)',
                            }
                          : { color: 'rgba(148, 163, 184, 0.9)', border: '1px solid transparent' }
                      }
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: slot for session only (portaled from MeccaXXDashboard); logo and session leveled in this row */}
      <div id="mecca-mobile-asset-slot" className="flex-1 flex items-center justify-end min-w-0 lg:hidden" />

      {/* Desktop Navigation - Centered pill style matching JournalXX */}
      <nav
        className="hidden lg:flex items-center gap-1 rounded-2xl p-1.5 relative z-[3] mecca-glass"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const isHovered = hoveredTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive ? '' : 'hover:bg-white/5'
              }`}
              style={isActive ? {
                background: premiumGradients.activeButton,
                color: premiumColors.emerald,
                border: `1px solid ${premiumGradients.activeButtonBorder}`,
                boxShadow: `0 0 15px ${premiumColors.emerald}20`,
              } : {
                color: isHovered ? '#fff' : 'rgba(148, 163, 184, 0.8)',
                border: '1px solid transparent',
              }}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              
              {/* Active indicator dot */}
              {isActive && (
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: premiumColors.emerald }}
                />
              )}
            </button>
          );
        })}
      </nav>
      </div>

      {/* Row 2: Ticker edge-to-edge within content band — px-4 sm:px-6 to match Journal XX (p-4) and Row 1 */}
      <div id="mecca-mobile-ticker-slot" className="w-full min-w-0 overflow-hidden px-4 sm:px-6 lg:hidden" />
    </header>
  );
};

export default MeccaHeader;
