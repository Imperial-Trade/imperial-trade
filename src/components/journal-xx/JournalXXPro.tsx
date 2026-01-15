import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  NotebookIcon, SunIcon, MoonIcon, ArrowRightIcon, XIcon, SparklesIcon,
  TrendingUpIcon, TrendingDownIcon, MapIcon, PlayIcon, PauseIcon,
  BarChartIcon, CalculatorIcon, GamepadIcon, TargetIcon, CheckIcon, TreeIcon
} from './ui/Icons';
import { TradeFormData, TradeEntry } from './types';
import { TraderInsights } from './TraderInsights';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { calculateTraderDNA } from './utils/traderDNACalculator';
import { useAuth } from '@/contexts/AuthContext';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { BrokerSelection, BrokerType } from './BrokerSelection';
import { BrokerLoginForm } from './BrokerLoginForm';
import { AutoJournalView } from './AutoJournalView';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { supabase } from '@/integrations/supabase/client';

export interface JournalXXProProps {
  isDarkMode: boolean;
  onExit: () => void;
  onToggleTheme: () => void;
}

// Spotlight Card Component
const SpotlightCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    isDarkMode: boolean;
    tilt?: boolean;
    noPadding?: boolean;
}> = ({ children, className = '', isDarkMode, tilt = false, noPadding = false }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-2xl border ${isDarkMode ? 'border-white/10 bg-[#0D0D0D]' : 'border-black/10 bg-[#F5F5F0]'} ${noPadding ? '' : 'p-5'} ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${isDarkMode ? 'rgba(205, 127, 50, 0.1)' : 'rgba(234, 179, 8, 0.15)'}, transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
};

// News Ticker Component
const NewsTicker: React.FC = () => {
  const [tickerOffset, setTickerOffset] = useState(0);
  
  const btcPrice = useOptimizedLivePrice('BTCUSD', { debounceMs: 50 });
  const us30Price = useOptimizedLivePrice('U30USD', { debounceMs: 50 });
  const spxPrice = useOptimizedLivePrice('SPXUSD', { debounceMs: 50 });
  const ndxPrice = useOptimizedLivePrice('NDXUSD', { debounceMs: 50 });
  
  const prevPricesRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset(prev => (prev + 0.05) % 100);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const formatTickerItem = (
    priceData: ReturnType<typeof useOptimizedLivePrice>, 
    label: string,
    symbol: string
  ) => {
    const price = priceData.price || 0;
    const prevPrice = prevPricesRef.current[symbol] || price;
    
    if (price > 0 && price !== prevPrice) {
      prevPricesRef.current[symbol] = price;
    }
    
    const isUp = price > prevPrice;
    const isDown = price < prevPrice;
    const direction = isUp ? 'up' : isDown ? 'down' : (priceData.change >= 0 ? 'up' : 'down');
    
    if (price === 0) return null;
    
    const formattedPrice = price >= 1000 
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2);
    
    const isPriceUp = direction === 'up';
    
    return (
      <span key={label} className="text-[10px] mono mx-4 font-bold transition-colors duration-300">
        {label} {formattedPrice} <span className={isPriceUp ? "text-green-500" : "text-red-500"}>{isPriceUp ? "▲" : "▼"}</span>
      </span>
    );
  };

  const tickerItems = [
    formatTickerItem(btcPrice, 'BTC', 'BTCUSD'),
    formatTickerItem(us30Price, 'US30', 'U30USD'),
    formatTickerItem(spxPrice, 'S&P500', 'SPXUSD'),
    formatTickerItem(ndxPrice, 'NAS100', 'NDXUSD')
  ].filter(Boolean);

  return (
    <div className="absolute inset-0 flex items-center opacity-70 whitespace-nowrap will-change-transform" style={{ transform: `translateX(-${tickerOffset}%)` }}>
      {tickerItems}
        </div>
    );
};

export const JournalXXPro: React.FC<JournalXXProProps> = ({ isDarkMode, onExit, onToggleTheme }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Animation state for Imperial Score
  const [animatedImperialScore, setAnimatedImperialScore] = useState(0);
  const [activeTab, setActiveTab] = useState('JOURNAL');
  
  // Broker connection state
  const [brokerConnectionStep, setBrokerConnectionStep] = useState<'SELECT' | 'LOGIN' | 'CONNECTED'>('SELECT');
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  
  // Mobile swipe state
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const wheelCooldown = useRef(false);
  
  // Right sidebar view state
  const [rightSidebarView, setRightSidebarView] = useState<'TRADER_DNA' | 'INSIGHTS'>('TRADER_DNA');
  
  // Get auto-journaled trades from context
  const { entries: journalEntries } = useTradeJournal();
  
  // Filter for auto-journaled trades only (those with broker_trade_id)
  const autoTrades = useMemo(() => {
    return journalEntries
      .filter(entry => entry.broker_trade_id) // Only auto-journaled trades
      .map((entry): TradeEntry => ({
        id: entry.id,
        date: entry.trade_date || new Date().toISOString().split('T')[0],
        asset: entry.asset_ticker,
        pnl: entry.pnl,
        notes: entry.notes || '',
        imageUrl: entry.screenshot_url || undefined,
        imageUrls: entry.screenshot_urls || [],
        aiFeedback: entry.ai_positive_feedback || undefined,
        direction: entry.trade_type === 'Long' ? 'Long' : entry.trade_type === 'Short' ? 'Short' : undefined,
        outcome: entry.pnl >= 0 ? 'Win' : 'Loss',
        strategy: entry.strategy || undefined,
        session: entry.session || undefined,
        emotion: entry.emotion || undefined,
        followedPlan: entry.followed_plan ?? undefined,
        revengeTrade: entry.revenge_trade ?? undefined,
        createdAt: entry.created_at,
      }));
  }, [journalEntries]);
  
  // Calculate Trader DNA from auto trades
  const traderDNA = useMemo(() => calculateTraderDNA(autoTrades), [autoTrades]);
  
  // Calculate Net PnL
  const netPnL = useMemo(() => {
    return autoTrades.reduce((acc, curr) => acc + curr.pnl, 0);
  }, [autoTrades]);
  
  const formattedPnL = (netPnL >= 0 ? '+' : '-') + '$' + Math.abs(netPnL).toFixed(2);
  
  // Handle logo click to switch between journal-xx and journal-xx-pro
  const handleLogoClick = () => {
    if (location.pathname.includes('journal-xx-pro')) {
      navigate('/dashboard/journal-xx');
    } else {
      navigate('/dashboard/journal-xx-pro');
    }
  };
  
  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
      const maxSlides = 2; // Calendar, Trader DNA, Insights
      if (dy > minSwipeDistance) {
        if (activeMobileSlide < maxSlides) setActiveMobileSlide(s => s + 1);
      } else if (dy < -minSwipeDistance) {
        if (activeMobileSlide > 0) setActiveMobileSlide(s => s - 1);
      }
    }
  };
  
  // Imperial Score animation
  useEffect(() => {
    const traderDNASlide = 1;
    const isViewingTraderDNA = rightSidebarView === 'TRADER_DNA' || activeMobileSlide === traderDNASlide;
    if (!isViewingTraderDNA) {
      setAnimatedImperialScore(traderDNA.imperialScore);
      return;
    }
    
    const targetScore = traderDNA.imperialScore;
    const duration = 2000;
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (targetScore - startValue) * easeOutQuart;
      setAnimatedImperialScore(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [traderDNA.imperialScore, rightSidebarView, activeMobileSlide]);
  
  // Radar chart data
  const radarData = useMemo(() => [
    { subject: 'Discipline', A: traderDNA.discipline, fullMark: 100 },
    { subject: 'Execution', A: traderDNA.execution, fullMark: 100 },
    { subject: 'Risk Mgmt', A: traderDNA.riskManagement, fullMark: 100 },
    { subject: 'Patience', A: traderDNA.patience, fullMark: 100 },
    { subject: 'Focus', A: traderDNA.focus, fullMark: 100 },
    { subject: 'Win Rate', A: traderDNA.winRate, fullMark: 100 },
  ], [traderDNA]);
  
  const handleBrokerSelect = (broker: BrokerType) => {
    setSelectedBroker(broker);
    setBrokerConnectionStep('LOGIN');
  };
  
  const handleBrokerLoginSuccess = () => {
    setBrokerConnectionStep('CONNECTED');
  };

  // Check for existing broker connection on mount and when user changes
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!user) {
        setIsCheckingConnection(false);
        setBrokerConnectionStep('SELECT');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('broker_connections')
          .select('id, broker_type, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned (expected if no connection)
          console.error('Error checking broker connection:', error);
          setBrokerConnectionStep('SELECT');
          setIsCheckingConnection(false);
          return;
        }

        if (data && data.is_active) {
          // User has an active broker connection, show the connected view
          setBrokerConnectionStep('CONNECTED');
        } else {
          // No active connection, show broker selection
          setBrokerConnectionStep('SELECT');
        }
      } catch (err) {
        console.error('Error checking broker connection:', err);
        setBrokerConnectionStep('SELECT');
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkExistingConnection();
  }, [user]);
  
  // Re-check connection when brokerConnectionStep changes (after disconnect/connect)
  useEffect(() => {
    if (brokerConnectionStep === 'SELECT' && user) {
      // When reset to SELECT, verify no active connection exists
      const verifyNoConnection = async () => {
        try {
          const { data } = await supabase
            .from('broker_connections')
            .select('id, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          // If we find an active connection, switch back to CONNECTED
          if (data && data.is_active) {
            setBrokerConnectionStep('CONNECTED');
          }
        } catch (err) {
          // No connection found, stay on SELECT
        }
      };
      
      verifyNoConnection();
    }
  }, [brokerConnectionStep, user]);
  
  const handleBrokerLoginBack = () => {
    setBrokerConnectionStep('SELECT');
    setSelectedBroker(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Render Imperial Score indicator
  const renderImperialScoreIndicator = () => {
    const scoreForColor = Math.max(0, Math.min(100, animatedImperialScore));
    let constrainedPosition = animatedImperialScore <= 0 ? 0 : animatedImperialScore >= 100 ? 100 : animatedImperialScore;
    const padding = 30;
    const positionDecimal = constrainedPosition / 100;
    const actualLeft = `calc(${padding}px + (100% - ${padding * 2}px) * ${positionDecimal})`;
    
    let borderGradientColor: string;
    if (scoreForColor <= 50) {
      const ratio = scoreForColor / 50;
      const r = Math.round(239 + (251 - 239) * ratio);
      const g = Math.round(68 + (191 - 68) * ratio);
      const b = Math.round(68 + (36 - 68) * ratio);
      borderGradientColor = `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = (scoreForColor - 50) / 50;
      const r = Math.round(251 + (16 - 251) * ratio);
      const g = Math.round(191 + (185 - 191) * ratio);
      const b = Math.round(36 + (129 - 36) * ratio);
      borderGradientColor = `rgb(${r}, ${g}, ${b})`;
    }
    
    return (
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-20"
        style={{ 
          left: actualLeft,
          transform: 'translateX(-50%) translateY(-50%)',
        }}
      >
        <div
          className="rounded-full p-[5px]"
          style={{
            background: borderGradientColor,
            boxShadow: `0 0 25px ${borderGradientColor}90, 0 0 15px ${borderGradientColor}70, 0 0 8px ${borderGradientColor}50`,
          }}
        >
          <div className="h-5 rounded-full bg-black flex items-center justify-center px-2 min-w-[50px]">
            <span 
              className="text-[10px] font-black whitespace-nowrap"
              style={{ color: borderGradientColor }}
            >
              {animatedImperialScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen w-screen overflow-hidden ${isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAF5] text-black'}`}>
      {/* Mobile Layout */}
      <div className="lg:hidden h-full flex flex-col">
        {/* Mobile Header */}
        <div className={`shrink-0 px-4 py-3 flex items-center justify-between border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ArrowRightIcon className="w-5 h-5 rotate-180" />
            </button>
            <h1 className="text-lg font-black uppercase tracking-wider">Journal XX Pro</h1>
          </div>
          <button onClick={onToggleTheme} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mobile Content */}
        <div 
          className="flex-1 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {isCheckingConnection ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className={`w-8 h-8 border-2 ${isDarkMode ? 'border-bronze-500' : 'border-yellow-600'} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Loading...</p>
              </div>
            </div>
          ) : brokerConnectionStep !== 'CONNECTED' ? (
            <div className="h-full p-4">
              <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false}>
                {brokerConnectionStep === 'SELECT' && (
                  <BrokerSelection onSelect={handleBrokerSelect} isDarkMode={isDarkMode} />
                )}
                {brokerConnectionStep === 'LOGIN' && selectedBroker && (
                  <BrokerLoginForm 
                    broker={selectedBroker} 
                    onSuccess={handleBrokerLoginSuccess}
                    onBack={handleBrokerLoginBack}
                    isDarkMode={isDarkMode}
                  />
                )}
              </SpotlightCard>
            </div>
          ) : (
            <div 
              className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ transform: `translateY(-${activeMobileSlide * 100}%)` }}
            >
              {/* Slide 0: Auto Journal View */}
              <div className="w-full h-full p-4 pb-24">
                <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                  <AutoJournalView 
                    isDarkMode={isDarkMode} 
                    onDisconnect={() => {
                      setBrokerConnectionStep('SELECT');
                      setSelectedBroker(null);
                    }}
                  />
                </SpotlightCard>
              </div>
              
              {/* Slide 1: Trader DNA */}
              <div className="w-full h-full p-4 pb-24">
                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                  <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto">
                    {/* Imperial Score */}
                    <div className="mb-6 shrink-0 w-full pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">IMPERIAL SCORE</h3>
                        {traderDNA.imperialScore > 80 && (
                          <span className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">PRO</span>
                        )}
                      </div>
                      <div className="relative w-full h-4 rounded-full mb-3 overflow-visible px-[30px]"
                        style={{ background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)' }}
                      >
                        {renderImperialScoreIndicator()}
                      </div>
                      <div className="flex justify-between text-[8px] opacity-60">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    
                    {/* Trader DNA Radar */}
                    <div className="flex-1 min-h-0 rounded-xl bg-slate-800/30 border border-slate-700/30 p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                            <PolarAngleAxis 
                              dataKey="subject" 
                              tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar 
                              name="Performance" 
                              dataKey="A" 
                              stroke="url(#dnaGradientPro)" 
                              strokeWidth={2.5}
                              fill="url(#dnaGradientPro)" 
                              fillOpacity={0.6}
                            />
                            <defs>
                              <linearGradient id="dnaGradientPro" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                                <stop offset="50%" stopColor="#ea580c" stopOpacity={0.7} />
                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }} 
                              formatter={(value: number) => [`${value}%`, 'Score']} 
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
              
              {/* Slide 2: Trader Insights */}
              <div className="w-full h-full p-4 pb-24">
                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                  <TraderInsights 
                    trades={autoTrades}
                    traderDNA={traderDNA} 
                    isDarkMode={isDarkMode}
                    hasProcessingTrades={false}
                  />
                </SpotlightCard>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Slide Indicators */}
        {brokerConnectionStep === 'CONNECTED' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  activeMobileSlide === i 
                    ? `h-8 ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}` 
                    : `h-1.5 ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full flex-col">
        {/* Top Header - Matching JournalXXComponent */}
        <header 
          className={`shrink-0 flex justify-between items-center z-50 py-4 px-6 border-b transition-all duration-300 ${isDarkMode ? 'bg-[#050505] border-white/5' : 'bg-white border-black/5'}`}
        >
          <div className="flex items-center gap-3">
            {/* Logo - Clickable to switch between journal-xx and journal-xx-pro */}
            <div 
              onClick={handleLogoClick}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-3 border cursor-pointer ${
                'bg-gradient-to-br from-emerald-500/20 to-yellow-500/20 border-emerald-500/30 ring-2 ring-emerald-500/30'
              }`}
              title="Switch to Manual Journaling"
            >
              <TreeIcon className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            {/* Text Logo */}
            <div className="flex flex-col">
              <h1 className="font-light text-xl md:text-2xl tracking-[0.2em] uppercase flex items-center leading-none">
                <span className={isDarkMode ? 'text-white' : 'text-stone-900'}>JOURNAL</span>
                <span className="ml-2 font-bold bg-gradient-to-br from-emerald-400 via-yellow-400 to-emerald-500 bg-clip-text text-transparent">XX</span>
                <span className="ml-1 font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">PRO</span>
              </h1>
              {/* Mode indicator */}
              <span className={`text-[8px] md:text-[9px] font-medium tracking-wider mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                AUTO SYNC
              </span>
            </div>
          </div>

          {/* Market Data Ticker */}
          <div className={`hidden md:flex items-center gap-6 px-6 py-2 rounded-full border backdrop-blur-md overflow-hidden relative w-[400px] ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <NewsTicker />
          </div>

          {/* Right Side - Theme Toggle and Net PnL */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleTheme}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-black/5 text-stone-600 hover:bg-black/10'}`}
            >
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            {/* Net PnL */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${isDarkMode ? 'bg-slate-900/50 border-white/5 shadow-black/20' : 'bg-[#F5F5F0]/80 border-stone-200 shadow-stone-200/50'}`}>
              <div className={`h-6 w-1 rounded-full ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
              <div className="flex flex-col justify-center">
                <span className={`text-[8px] font-bold uppercase tracking-widest leading-tight ${isDarkMode ? 'text-dirty-white/60' : 'text-stone-500'}`}>Net PnL</span>
                <div className={`text-sm md:text-base font-bold font-sans tracking-wide leading-none mt-0.5 ${
                  netPnL >= 0 
                    ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-500')
                    : (isDarkMode ? 'text-rose-400' : 'text-rose-500')
                }`}>
                  {formattedPnL}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Navigation */}
        <div className={`w-16 shrink-0 flex flex-col items-center py-6 border-r ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <button onClick={onExit} className="p-3 hover:bg-white/10 rounded-xl transition-colors mb-6">
            <ArrowRightIcon className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex-1 flex flex-col items-center gap-2">
            <button 
              onClick={() => setActiveTab('JOURNAL')}
              className={`p-3 rounded-xl transition-all ${activeTab === 'JOURNAL' ? (isDarkMode ? 'bg-bronze-500/20 text-bronze-500' : 'bg-yellow-500/20 text-yellow-600') : 'hover:bg-white/10'}`}
            >
              <NotebookIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 p-6">
          
          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {isCheckingConnection ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className={`w-8 h-8 border-2 ${isDarkMode ? 'border-bronze-500' : 'border-yellow-600'} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Loading...</p>
                </div>
              </div>
            ) : brokerConnectionStep !== 'CONNECTED' ? (
              <SpotlightCard className="h-full" isDarkMode={isDarkMode} tilt={false}>
                {brokerConnectionStep === 'SELECT' && (
                  <BrokerSelection onSelect={handleBrokerSelect} isDarkMode={isDarkMode} />
                )}
                {brokerConnectionStep === 'LOGIN' && selectedBroker && (
                  <BrokerLoginForm 
                    broker={selectedBroker} 
                    onSuccess={handleBrokerLoginSuccess}
                    onBack={handleBrokerLoginBack}
                    isDarkMode={isDarkMode}
                  />
                )}
              </SpotlightCard>
            ) : (
              <SpotlightCard className="h-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                <AutoJournalView 
                  isDarkMode={isDarkMode} 
                  onDisconnect={() => {
                    setBrokerConnectionStep('SELECT');
                    setSelectedBroker(null);
                  }}
                />
              </SpotlightCard>
            )}
          </div>
        </div>
        
        {/* Right Sidebar - Trader DNA & Insights - Always Visible */}
          <div className={`w-80 shrink-0 flex flex-col border-l ${isDarkMode ? 'border-white/10' : 'border-black/10'} p-4 gap-4`}>
            {/* Toggle */}
            <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1">
              <button 
                onClick={() => setRightSidebarView('TRADER_DNA')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded ${rightSidebarView === 'TRADER_DNA' ? 'bg-white dark:bg-stone-700 shadow-sm' : 'opacity-50'}`}
              >
                Trader DNA
              </button>
              <button 
                onClick={() => setRightSidebarView('INSIGHTS')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded ${rightSidebarView === 'INSIGHTS' ? 'bg-white dark:bg-stone-700 shadow-sm' : 'opacity-50'}`}
              >
                Insights
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {rightSidebarView === 'TRADER_DNA' ? (
                <div className="space-y-4">
                  {/* Imperial Score */}
                  <SpotlightCard className="p-4" isDarkMode={isDarkMode} tilt={false}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">IMPERIAL SCORE</h3>
                      {traderDNA.imperialScore > 80 && (
                        <span className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">PRO</span>
                      )}
                    </div>
                    <div className="relative w-full h-4 rounded-full mb-3 overflow-visible px-[30px]"
                      style={{ background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)' }}
                    >
                      {renderImperialScoreIndicator()}
                    </div>
                    <div className="flex justify-between text-[8px] opacity-60">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </SpotlightCard>
                  
                  {/* Trader DNA Radar */}
                  <SpotlightCard className="p-4" isDarkMode={isDarkMode} tilt={false}>
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-4">TRADER DNA</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                          />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar 
                            name="Performance" 
                            dataKey="A" 
                            stroke="url(#dnaGradientProDesktop)" 
                            strokeWidth={2.5}
                            fill="url(#dnaGradientProDesktop)" 
                            fillOpacity={0.6}
                          />
                          <defs>
                            <linearGradient id="dnaGradientProDesktop" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                              <stop offset="50%" stopColor="#ea580c" stopOpacity={0.7} />
                              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }} 
                            formatter={(value: number) => [`${value}%`, 'Score']} 
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </SpotlightCard>
                </div>
              ) : (
                <SpotlightCard className="h-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                  <TraderInsights 
                    trades={autoTrades}
                    traderDNA={traderDNA} 
                    isDarkMode={isDarkMode}
                    hasProcessingTrades={false}
                  />
                </SpotlightCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default JournalXXPro;
