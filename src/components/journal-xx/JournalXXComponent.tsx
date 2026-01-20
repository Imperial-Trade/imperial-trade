import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  SettingsIcon, MaximizeIcon, BrainCircuitIcon, MicIcon, 
  HomeIcon, PlusIcon, BarChartIcon, BookIcon, ArrowRightIcon,
  NotebookIcon, CalendarIcon, UploadIcon, ActivityIcon, FolderIcon,
  TrendingUpIcon, TrendingDownIcon, MapIcon, PlayIcon, PauseIcon,
  LayersIcon, TreeIcon, SparklesIcon, SunIcon, MoonIcon, CalculatorIcon, UserIcon, CheckIcon, GamepadIcon, BarChart3Icon,
  ChevronLeftIcon, ChevronRightIcon
} from './ui/Icons';
import { TradeFormData, TradeEntry } from './types';
import { TraderInsights } from './TraderInsights';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { analyzeTradeWithGemini } from './services/geminiService';
import { extractTradeDataFromScreenshot } from './services/tradeDataExtractor';
import { calculateTraderDNA } from './utils/traderDNACalculator';
import { PhaseLoader } from './PhaseLoader';
import { Typewriter } from './Typewriter';
import { useAuth } from '@/contexts/AuthContext';
import { TradeJournalEntry as TJEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { compressImage } from '@/utils/imageCompression';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { BrokerSelection, BrokerType } from './BrokerSelection';
import { BrokerLoginForm } from './BrokerLoginForm';
import { AutoJournalView } from './AutoJournalView';
import RiskCalculator from '@/components/tools/RiskCalculator';
import { GeminiSetupAnalyzer } from '@/components/charts/GeminiSetupAnalyzer';
import { MeccaHeader } from '@/components/charts/mecca';

// Broker options for mobile AUTO mode
const BROKERS = [
  {
    id: 'xs',
    name: 'XS.com',
    description: 'Global multi-asset broker with competitive spreads',
    defaultServer: 'XSFintech-REAL-1',
    servers: ['XSFintech-REAL-1', 'XSFintech-REAL-2', 'XSFintech-REAL-3', 'XSMarkets-REAL-1', 'XSFintech-DEMO', 'XSMarkets-DEMO'],
  },
  {
    id: 'ecmarkets',
    name: 'EC Markets',
    description: 'Premium forex and CFD broker',
    defaultServer: 'ECMarketsLtd-Demo',
    servers: ['ECMarketsLtd-Demo', 'ECMarkets-MT5-Live01', 'ECMarketsLtd-MT5-Live02', 'ECMarketsLtd-MT5-Live03', 'ECMarketsNZ-MT5-Live04'],
  },
];

export interface JournalXXProps {
  isDarkMode: boolean;
  onExit: () => void;
  onToggleTheme: () => void;
  onSubmit: (data: TradeFormData, id?: string) => void;
  onDelete: (id: string) => void;
  trades: TradeEntry[];
}

// --- CONSTANTS ---

const STRATEGIES = [
  "Breakout", 
  "Reversal", 
  "Continuation", 
  "Trend Following", 
  "Support/Resistance", 
  "Fibonacci", 
  "Moving Average", 
  "RSI Divergence", 
  "News Trading", 
  "Scalping", 
  "Swing Trading", 
  "Day Trading", 
  "Custom Strategy"
];

const EMOTIONS = [
  "Confident", 
  "Anxious", 
  "Greedy", 
  "Fearful", 
  "Neutral", 
  "Excited", 
  "Frustrated", 
  "Disciplined", 
  "Impulsive", 
  "Focused"
];

const SESSIONS = [
  "Sydney (9PM-6AM GMT)", 
  "Tokyo (11PM-8AM GMT)", 
  "London (7AM-4PM GMT)", 
  "New York (12PM-9PM GMT)"
];

const NAV_ITEMS = [
  { id: 'JOURNAL', icon: NotebookIcon, label: 'Journal' },
  { id: 'MECCA', icon: BarChartIcon, label: 'Mecca' }, // Analysis
  { id: 'CALCU', icon: CalculatorIcon, label: 'Calcu' },
  { id: 'GAMES', icon: GamepadIcon, label: 'Games' }, // Replaced Profile
];

// --- UTILS ---

/**
 * Parse a date string (YYYY-MM-DD or ISO format) into year, month, day components
 * This avoids timezone issues where new Date("2025-12-21") creates UTC midnight
 * which can shift to the previous day in local timezones
 */
const parseDateString = (dateStr: string): { year: number; month: number; day: number } => {
    const datePart = dateStr.split('T')[0]; // Handle ISO format
    const [year, month, day] = datePart.split('-').map(Number);
    return { year, month: month - 1, day }; // JS months are 0-indexed
};

/**
 * Create a Date object from a date string in local timezone
 * Unlike new Date("YYYY-MM-DD") which creates UTC midnight,
 * this creates local midnight
 */
const parseLocalDate = (dateStr: string): Date => {
    const { year, month, day } = parseDateString(dateStr);
    return new Date(year, month, day);
};

/**
 * Format a date string (YYYY-MM-DD) for display without timezone issues
 */
const formatDateForDisplay = (dateStr: string): string => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString();
};

const getCalendarDays = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to make Sunday index 0
    startOfWeek.setDate(date.getDate() - day);
    
    const week = [];
    for(let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        week.push(d);
    }
    return week;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- SUB-COMPONENTS ---

const NewsTicker: React.FC = () => {
    // Get live prices for all symbols with real-time updates
    const goldPrice = useOptimizedLivePrice('XAUUSD', { debounceMs: 50 });
    const btcPrice = useOptimizedLivePrice('BTCUSD', { debounceMs: 50 });
    const us30Price = useOptimizedLivePrice('U30USD', { debounceMs: 50 });
    const spxPrice = useOptimizedLivePrice('SPXUSD', { debounceMs: 50 });
    const ndxPrice = useOptimizedLivePrice('NDXUSD', { debounceMs: 50 });
    
    // Track previous prices to determine direction
    const prevPricesRef = useRef<Record<string, number>>({});

    // Format prices and determine arrow direction based on actual price movement
    const formatTickerItem = (
        priceData: ReturnType<typeof useOptimizedLivePrice>, 
        label: string,
        symbol: string
    ) => {
        const price = priceData.price || 0;
        const prevPrice = prevPricesRef.current[symbol] || price;
        
        // Update previous price if we have a valid current price and it's different
        if (price > 0 && price !== prevPrice) {
            prevPricesRef.current[symbol] = price;
        }
        
        // Determine direction: up if price increased, down if decreased
        const isUp = price > prevPrice;
        const isDown = price < prevPrice;
        // Use change from hook as fallback if prices are the same
        const direction = isUp ? 'up' : isDown ? 'down' : (priceData.change >= 0 ? 'up' : 'down');
        
        if (price === 0) {
            return null; // Don't show if no price data
        }
        
        // Format price based on magnitude
        let formattedPrice: string;
        if (price >= 1000) {
            formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            formattedPrice = price.toFixed(2);
        }
        
        const isPriceUp = direction === 'up';
        
        return (
            <span key={label} className="text-[10px] md:text-[11px] font-medium transition-colors duration-300 flex items-center gap-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-white/90">{formattedPrice}</span>
                <span className={isPriceUp ? "text-emerald-400" : "text-red-400"}>{isPriceUp ? "▲" : "▼"}</span>
            </span>
        );
    };

    const tickerItems = [
        formatTickerItem(goldPrice, 'GOLD', 'XAUUSD'),
        formatTickerItem(btcPrice, 'BTC', 'BTCUSD'),
        formatTickerItem(us30Price, 'US30', 'U30USD'),
        formatTickerItem(spxPrice, 'S&P500', 'SPXUSD'),
        formatTickerItem(ndxPrice, 'NAS100', 'NDXUSD')
    ].filter(Boolean); // Remove null items

    return (
        <div className="relative w-full overflow-hidden py-1">
            <div 
                className="inline-flex items-center gap-8 md:gap-12 whitespace-nowrap will-change-transform animate-ticker-scroll"
            >
                {/* Duplicate items for seamless loop */}
                <div className="inline-flex items-center gap-8 md:gap-12 shrink-0">
                    {tickerItems}
                </div>
                <div className="inline-flex items-center gap-8 md:gap-12 shrink-0">
                    {tickerItems}
                </div>
            </div>
            <style>{`
                @keyframes tickerScrollAnim {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-scroll {
                    animation: tickerScrollAnim 25s linear infinite;
                }
            `}</style>
        </div>
    );
};

const SpotlightCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  isDarkMode: boolean;
  tilt?: boolean;
  onClick?: () => void;
  noPadding?: boolean;
}> = ({ children, className = "", isDarkMode, tilt = false, onClick, noPadding = false }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tiltValues, setTiltValues] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x, y });

    if (tilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -1; 
        const tiltY = ((x - centerX) / centerX) * 1;
        setTiltValues({ x: tiltX, y: tiltY });
    }
  };

  const spotlightColor = isDarkMode ? "rgba(205, 127, 50, 0.15)" : "rgba(234, 179, 8, 0.25)";
  const borderColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const heightClass = className.includes('h-fit') ? '' : 'h-full';

  return (
    <div 
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTiltValues({ x: 0, y: 0 })}
      onClick={onClick}
      className={`relative rounded-3xl transition-transform duration-300 ease-out ${className}`}
      style={{
          transform: tilt ? `perspective(1000px) rotateX(${tiltValues.x}deg) rotateY(${tiltValues.y}deg)` : 'none',
      }}
    >
      <div className="absolute inset-0 rounded-3xl pointer-events-none z-0" style={{ background: borderColor }} />
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)` }}
      />
      <div className={`relative w-full p-[1px] rounded-3xl z-10 ${heightClass}`}>
          <div className={`relative w-full bg-[#F5F5F0] dark:bg-[#0A0A0A] rounded-[23px] overflow-hidden flex flex-col ${heightClass} ${noPadding ? '' : 'p-6'}`}>
             {children}
          </div>
      </div>
    </div>
  );
};

// ... TradeReplayWidget, PatternDojo, MacroCalendar components remain same ...
const TradeReplayWidget: React.FC<{ isDarkMode: boolean, trades: TradeEntry[] }> = ({ isDarkMode, trades }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTradeIndex, setCurrentTradeIndex] = useState(0);

    const activeTrade = trades.length > 0 ? trades[currentTradeIndex] : { 
        asset: 'BTC/USD', 
        pnl: 500, 
        direction: 'Long', 
        outcome: 'Win'
    };

    const candles = useMemo(() => {
        const count = 80;
        const result = [];
        let price = 50000;
        for (let i = 0; i < count; i++) {
            const move = (Math.random() - 0.5) * 100;
            price += move;
            const open = price - move/2;
            const close = price + move/2;
            const high = Math.max(open, close) + Math.random() * 50;
            const low = Math.min(open, close) - Math.random() * 50;
            result.push({ open, close, high, low });
        }
        return result;
    }, [activeTrade]);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 100) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return p + 0.5;
                });
            }, 30);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Trade Replay</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono font-bold">{activeTrade.asset}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${activeTrade.pnl > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                            {activeTrade.pnl > 0 ? 'WIN' : 'LOSS'}
                        </span>
                    </div>
                </div>
                
                <button 
                    onClick={() => {
                         if (trades.length > 0) setCurrentTradeIndex((prev) => (prev + 1) % trades.length);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase hover:opacity-70 transition-opacity p-2 border rounded-lg border-white/10"
                >
                    <span>Next Trade</span>
                    <PlayIcon className="w-3 h-3" />
                </button>
            </div>

            <div className={`flex-1 rounded-xl relative overflow-hidden flex items-end px-4 pb-4 gap-1 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                 {candles.map((c, i) => {
                     const isVisible = (i / candles.length) * 100 < progress + 20;
                     const isActive = (i / candles.length) * 100 < progress;
                     if (!isVisible && !isPlaying) return <div key={i} className="flex-1" />;

                     const isGreen = c.close > c.open;
                     const heightPct = Math.min(100, Math.max(10, ((c.high - c.low) / 200) * 100));
                     const wickHeight = Math.min(100, Math.max(20, ((c.high - c.low) / 150) * 100));
                     
                     return (
                         <div key={i} className={`flex-1 flex flex-col justify-center items-center h-full transition-opacity duration-300 ${isActive || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                             <div className={`w-[1px] opacity-50 ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: `${wickHeight}%` }} />
                             <div className={`w-2 sm:w-3 rounded-[1px] ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: `${Math.abs(c.open - c.close) / 2}%`, minHeight: '4px' }} />
                         </div>
                     )
                 })}
                 
                 {!isPlaying && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                         <button onClick={() => setIsPlaying(true)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            <div className="ml-1 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-current border-b-[8px] border-b-transparent" />
                         </button>
                     </div>
                 )}

                <div className="absolute top-4 left-4">
                    <div className="px-3 py-1 rounded bg-black/40 backdrop-blur border border-white/10 text-[10px] font-mono text-white">
                        {isPlaying ? 'REPLAYING SESSION...' : 'WAITING SETUP...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PatternDojo: React.FC<{ isDarkMode: boolean, onOutcome: (win: boolean) => void }> = ({ isDarkMode, onOutcome }) => {
    const [flipped, setFlipped] = useState(false);
    const [result, setResult] = useState<'WIN' | 'LOSS' | null>(null);

    const handleGuess = (direction: 'LONG' | 'SHORT') => {
        if(flipped) return;
        const outcome = Math.random() > 0.5 ? 'LONG' : 'SHORT';
        const isWin = direction === outcome;
        setResult(isWin ? 'WIN' : 'LOSS');
        setFlipped(true);
        onOutcome(isWin);
        
        setTimeout(() => {
            setFlipped(false);
            setResult(null);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
             <div className="flex justify-between items-center mb-2 z-10">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Pattern Dojo</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">XP Grinder</span>
            </div>
            
            <div className="flex-1 relative rounded-xl overflow-hidden bg-black group border border-white/5 shadow-2xl">
                <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-all duration-500 ${flipped ? 'blur-sm scale-95 opacity-50' : 'hover:scale-105'}`}></div>
                {flipped && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in duration-300">
                        <div className={`text-5xl font-black tracking-tighter drop-shadow-2xl ${result === 'WIN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {result}
                        </div>
                    </div>
                )}
                <div className={`absolute bottom-4 inset-x-4 flex gap-3 transition-transform duration-300 ${flipped ? 'translate-y-20' : 'translate-y-0'}`}>
                    <button onClick={() => handleGuess('SHORT')} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg border border-white/10">Short</button>
                    <button onClick={() => handleGuess('LONG')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg border border-white/10">Long</button>
                </div>
            </div>
        </div>
    );
};

const MacroCalendar: React.FC<{ 
    isDarkMode: boolean, 
    trades: TradeEntry[],
    timeFilter: 'D'|'W'|'M'|'Y',
    setTimeFilter: (filter: 'D'|'W'|'M'|'Y') => void,
    viewDate: Date,
    setViewDate: (date: Date) => void
}> = ({ isDarkMode, trades, timeFilter, setTimeFilter, viewDate, setViewDate }) => {
    const [viewMode, setViewMode] = useState<'CALENDAR'|'MACRO'>('CALENDAR');

    const handleNavigation = (offset: number) => {
        const newDate = new Date(viewDate);
        if (timeFilter === 'Y') newDate.setFullYear(newDate.getFullYear() + offset);
        else if (timeFilter === 'M') newDate.setMonth(newDate.getMonth() + offset);
        else if (timeFilter === 'W') newDate.setDate(newDate.getDate() + (offset * 7));
        else newDate.setDate(newDate.getDate() + offset);
        setViewDate(newDate);
    };

    const headerDateText = useMemo(() => {
        if (timeFilter === 'Y') return viewDate.getFullYear().toString();
        if (timeFilter === 'W') {
             const startOfWeek = new Date(viewDate);
             startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
             const endOfWeek = new Date(startOfWeek);
             endOfWeek.setDate(startOfWeek.getDate() + 6);
             return `${startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${endOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} ${endOfWeek.getFullYear()}`;
        }
        if (timeFilter === 'D') return viewDate.toLocaleDateString(undefined, { weekday:'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
        return viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
    }, [viewDate, timeFilter]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // Memoized Lookups
    const dailyPnL = useMemo(() => {
        const map: Record<string, { pnl: number, count: number, trades: TradeEntry[] }> = {};
        // Deduplicate trades by ID to prevent showing the same trade multiple times
        const seenTradeIds = new Set<string>();
        const uniqueTrades = trades.filter(t => {
            if (seenTradeIds.has(t.id)) {
                console.warn(`⚠️ Duplicate trade detected: ${t.id} - ${t.asset} - ${t.pnl}. Skipping duplicate.`);
                return false;
            }
            seenTradeIds.add(t.id);
            return true;
        });
        
        uniqueTrades.forEach(t => {
            // Parse YYYY-MM-DD string correctly to avoid timezone issues
            // When new Date("2025-12-21") is called, it creates UTC midnight which can shift to previous day in local timezone
            const dateParts = t.date.split('T')[0].split('-');
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
            const day = parseInt(dateParts[2], 10);
            const key = `${year}-${month}-${day}`;
            if (!map[key]) map[key] = { pnl: 0, count: 0, trades: [] };
            map[key].pnl += t.pnl;
            map[key].count += 1;
            map[key].trades.push(t);
        });
        
        // Log if duplicates were found
        if (uniqueTrades.length !== trades.length) {
            console.warn(`⚠️ Found ${trades.length - uniqueTrades.length} duplicate trade(s). Original count: ${trades.length}, Unique count: ${uniqueTrades.length}`);
        }
        
        return map;
    }, [trades]);

    // VIEW RENDERERS
    const renderYearView = () => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        return (
            <div className="grid grid-cols-3 grid-rows-4 h-full gap-1.5 animate-in fade-in zoom-in duration-300 overflow-y-auto custom-scrollbar">
                {months.map(m => {
                    const date = new Date(year, m, 1);
                    const monthName = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
                    const daysInMonth = new Date(year, m + 1, 0).getDate();
                    const firstDayOfWeek = new Date(year, m, 1).getDay();
                    const emptySlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);
                    
                    // Calculate monthly PnL and build daily data
                    let monthlyPnL = 0;
                    let tradeCount = 0;
                    const monthDailyData: Record<number, { pnl: number, hasData: boolean }> = {};
                    
                    trades.forEach(t => {
                        const parsed = parseDateString(t.date);
                        if(parsed.year === year && parsed.month === m) {
                            monthlyPnL += t.pnl;
                            tradeCount++;
                            const day = parsed.day;
                            if (!monthDailyData[day]) monthDailyData[day] = { pnl: 0, hasData: false };
                            monthDailyData[day].pnl += t.pnl;
                            monthDailyData[day].hasData = true;
                        }
                    });
                    
                    const isProfitable = monthlyPnL > 0;
                    const hasMonthData = tradeCount > 0;
                    
                    // Background color for the month card
                    const cardBgClass = hasMonthData
                        ? (isProfitable 
                            ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-100/80 border-emerald-200')
                            : (isDarkMode ? 'bg-rose-500/20 border-rose-500/30' : 'bg-rose-100/80 border-rose-200'))
                        : (isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10');
                    
                    return (
                        <div key={m} onClick={() => { setViewDate(new Date(year, m, 1)); setTimeFilter('M'); }} className={`rounded-xl border p-1.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 min-h-0 ${cardBgClass}`}>
                            <span className="text-[9px] font-bold opacity-60 mb-1 shrink-0">{monthName}</span>
                            
                            {/* Mini calendar grid for days */}
                            <div className="grid grid-cols-7 gap-[1px] mb-1.5 flex-1 min-h-0">
                                {emptySlots.map(i => <div key={`empty-${i}`} />)}
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                    const dayData = monthDailyData[day];
                                    const dayPnl = dayData?.pnl || 0;
                                    const hasDayData = dayData?.hasData || false;
                                    
                                    let dayColor = isDarkMode ? 'text-stone-700' : 'text-stone-300'; // Empty/even days
                                    if (hasDayData) {
                                        dayColor = dayPnl > 0 
                                            ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                                            : (isDarkMode ? 'text-rose-400' : 'text-rose-600');
                                    }
                                    
                                    return (
                                        <div key={day} className={`text-[6px] font-bold text-center leading-tight ${dayColor}`}>
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="shrink-0 self-end flex flex-col items-end">
                                <div className={`text-xs font-black text-right ${hasMonthData ? (isProfitable ? 'text-emerald-500' : 'text-rose-500') : 'text-emerald-500 opacity-30'}`}>{hasMonthData ? (monthlyPnL >= 0 ? '+' : '-') + '$' + Math.abs(monthlyPnL).toFixed(2) : '+PNL'}</div>
                                <div className="text-[7px] opacity-40 font-mono text-right">{tradeCount} {tradeCount === 0 || tradeCount === 1 ? 'Trade' : 'Trades'}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    };

    const renderMonthView = () => {
        const days = getCalendarDays(year, month);
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const emptySlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);
        return (
            <div className="grid grid-cols-7 grid-rows-6 h-full gap-x-2 gap-y-0.5 animate-in fade-in duration-300" style={{ gridAutoRows: '1fr' }}>
                 {['S','M','T','W','T','F','S'].map((d, idx) => <div key={`day-header-${idx}`} className="flex items-center justify-center text-[8px] opacity-30 font-bold h-4">{d}</div>)}
                 {emptySlots.map(i => <div key={`empty-${i}`} />)}
                 {days.map((day) => {
                     const key = `${year}-${month}-${day}`;
                     const data = dailyPnL[key];
                     const pnl = data?.pnl || 0;
                     const hasData = !!data;
                     const isWin = pnl > 0;
                     const tradeCount = data?.count || 0;
                     
                     // Background colors based on PnL - only for days with trades
                     const bgClass = hasData 
                         ? (isWin 
                             ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-100/80 border-emerald-200')
                             : (isDarkMode ? 'bg-rose-500/20 border-rose-500/30' : 'bg-rose-100/80 border-rose-200'))
                         : '';
                     
                     // Only add rounded and full border classes for days with trades
                     const containerClass = hasData 
                         ? `rounded border ${bgClass}`
                         : '';
                     
                     return (
                         <div key={day} onClick={() => { setViewDate(new Date(year, month, day)); setTimeFilter('D'); }} className={`relative group transition-all duration-300 cursor-pointer flex flex-col p-0.5 sm:p-1 border-t pt-0.5 h-full overflow-hidden ${containerClass} ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                             <span className={`text-[8px] sm:text-[10px] font-bold shrink-0 ${hasData ? (isDarkMode ? 'text-white' : 'text-stone-900') : (isDarkMode ? 'text-stone-500' : 'text-stone-400')} group-hover:text-stone-900 dark:group-hover:text-white`}>{day}</span>
                            {hasData && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0 px-0.5 overflow-hidden">
                                    <div className={`text-[7px] sm:text-[9px] md:text-xs font-bold font-sans tracking-tight leading-[1.0] break-all ${isWin ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-rose-400' : 'text-rose-600')}`}>{(pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toFixed(2)}</div>
                                    <div className="text-[6px] sm:text-[7px] opacity-40 font-mono mt-0.5 whitespace-nowrap">{tradeCount} {tradeCount === 1 ? 'Trade' : 'Trades'}</div>
                                </div>
                            )}
                         </div>
                     )
                 })}
            </div>
        );
    };

    const renderWeekView = () => {
        const weekDays = getWeekDays(viewDate);
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                {weekDays.map((d, i) => {
                    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    const data = dailyPnL[key];
                    const tradesForDay = data?.trades || [];
                    const isToday = new Date().toDateString() === d.toDateString();
                    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
                    const isLastDay = i === weekDays.length - 1;
                    return (
                        <div key={i} className={`flex flex-1 ${!isLastDay ? `border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'}` : ''} group transition-colors hover:bg-white/[0.02] min-h-0 overflow-hidden`}>
                            <div className={`w-20 shrink-0 flex flex-col justify-center px-2 border-r ${isDarkMode ? 'border-white/5' : 'border-black/5'} ${isToday ? 'bg-yellow-500/5 dark:bg-bronze-500/5' : ''}`}>
                                <span className={`text-[10px] font-bold tracking-widest ${isToday ? (isDarkMode ? 'text-bronze-500' : 'text-yellow-600') : 'text-stone-500'}`}>{dayName},</span>
                                <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{datePart}</span>
                            </div>
                            <div className={`flex-1 flex overflow-x-auto custom-scrollbar min-w-0`} style={{ touchAction: 'pan-x' }}>
                                {tradesForDay.length === 0 ? (
                                    <div className={`w-full flex flex-col items-center justify-center border-r ${isDarkMode ? 'bg-white/5 border-white/5 text-stone-600' : 'bg-stone-200/50 border-black/5 text-stone-400'}`}><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">No Trades</span></div>
                                ) : (
                                    tradesForDay.map(trade => {
                                        const isWin = trade.pnl > 0;
                                        const boxClass = isWin ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-100/80 border-emerald-200') : (isDarkMode ? 'bg-rose-500/20 border-rose-500/30' : 'bg-rose-100/80 border-rose-200');
                                        const textPnlClass = isWin ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400';
                                        return (
                                            <div key={trade.id} className={`shrink-0 min-w-[50%] max-w-[50%] p-2 sm:p-3 border-r ${isDarkMode ? 'border-white/5' : 'border-black/5'} flex flex-col justify-between h-full overflow-hidden ${boxClass}`}>
                                                <div className="flex justify-between items-start min-w-0 gap-1">
                                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase truncate flex-1 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{trade.asset}</span>
                                                    <span className={`text-[9px] sm:text-xs font-mono font-bold shrink-0 ${textPnlClass}`}>{(trade.pnl >= 0 ? '+' : '-') + '$' + Math.abs(trade.pnl).toFixed(2)}</span>
                                                </div>
                                                <div className={`text-[8px] sm:text-[9px] line-clamp-2 leading-relaxed opacity-80 font-medium ${isDarkMode?'text-stone-300':'text-stone-700'}`}>{trade.notes}</div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className={`w-16 sm:w-20 shrink-0 flex flex-col justify-center items-center px-0.5 sm:px-1 gap-1 bg-transparent border-l ${isDarkMode ? 'border-white/5' : 'border-black/5'} min-w-0 overflow-hidden`}>
                                {data ? (
                                    <div className="text-center w-full min-w-0 px-0.5">
                                        <div className={`text-[9px] sm:text-xs md:text-sm font-black font-mono mb-0.5 break-all leading-tight ${data.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(data.pnl >= 0 ? '+' : '-') + '$' + Math.abs(data.pnl).toFixed(2)}</div>
                                        <div className="text-[7px] sm:text-[8px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide whitespace-nowrap">{data.count} {data.count === 1 ? 'Trade' : 'Trades'}</div>
                                    </div>
                                ) : (
                                    <span className="text-xl font-bold text-stone-800 dark:text-stone-800 opacity-20 select-none">—</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const key = `${viewDate.getFullYear()}-${viewDate.getMonth()}-${viewDate.getDate()}`;
        const data = dailyPnL[key];
        const dayTrades = data?.trades || [];
        return (
            <div className="h-full flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2 px-2 shrink-0">
                    <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'} Found</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-2" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', maxHeight: '100%' }}>
                    {dayTrades.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30"><NotebookIcon className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold uppercase">No Activity</span></div>
                    ) : (
                        dayTrades.map(trade => (
                            <div key={trade.id} className={`p-3 rounded-xl border flex gap-3 shrink-0 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className={`w-1 rounded-full shrink-0 ${trade.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} /><div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-1"><span className="font-bold text-xs">{trade.asset}</span><span className={`font-mono font-bold text-xs ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(trade.pnl >= 0 ? '+' : '-') + '$' + Math.abs(trade.pnl).toFixed(2)}</span></div><div className="flex gap-2 mb-1"><span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 border border-white/5 uppercase opacity-70">{trade.strategy || 'Setup'}</span><span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 border border-white/5 uppercase opacity-70">{trade.session || 'Session'}</span></div><p className="text-[10px] opacity-60 leading-relaxed line-clamp-2">{trade.notes}</p></div></div>
                        ))
                    )}
                </div>
            </div>
        )
    };

    const renderMacroMap = () => {
        const weeks = Array.from({ length: 52 }, (_, i) => i);
        const dayRows = [0,1,2,3,4,5,6]; 
        return (
            <div className="flex h-full gap-1 overflow-x-auto pb-2 animate-in fade-in duration-300" style={{ touchAction: 'pan-x' }}>
                {weeks.map(w => (
                    <div key={w} className="flex flex-col gap-1 h-full min-w-[10px]">
                        {dayRows.map(d => {
                            const dayOfYear = (w * 7) + d;
                            const date = new Date(year, 0, 1 + dayOfYear);
                            if (date.getFullYear() !== year) return <div key={d} className="flex-1" />;
                            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                            const data = dailyPnL[key];
                            const opacity = data ? Math.min(1, Math.abs(data.pnl) / 500 + 0.2) : 0.05;
                            const color = data ? (data.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500') : (isDarkMode ? 'bg-white' : 'bg-black');
                            return (
                                <div key={d} className={`flex-1 rounded-[2px] ${color}`} style={{ opacity: opacity }} title={`${date.toDateString()}: ${data ? data.pnl : 0}`} />
                            );
                        })}
                    </div>
                ))}
            </div>
        )
    };

    const renderCurrentView = () => {
        if (viewMode === 'MACRO') return renderMacroMap();
        switch(timeFilter) {
            case 'Y': return renderYearView();
            case 'W': return renderWeekView();
            case 'D': return renderDayView();
            default: return renderMonthView();
        }
    };

    return (
        <div className="h-full flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 cursor-pointer hover:text-yellow-500" onClick={() => setViewMode(v => v === 'CALENDAR' ? 'MACRO' : 'CALENDAR')}>
                    {viewMode === 'MACRO' ? 'Market Cycles' : headerDateText}
                </h3>
                <div className="flex gap-1">
                   <div className="flex gap-1">
                        <button onClick={() => handleNavigation(-1)} className="p-1 hover:bg-white/10 rounded"><ArrowRightIcon className="w-3 h-3 rotate-180" /></button>
                        <button onClick={() => handleNavigation(1)} className="p-1 hover:bg-white/10 rounded"><ArrowRightIcon className="w-3 h-3" /></button>
                   </div>
                   <div className="w-[1px] bg-white/10 mx-1"></div>
                   <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                       {['D','W','M','Y'].map(t => (
                           <button key={t} onClick={() => { setTimeFilter(t as any); setViewMode('CALENDAR'); }} className={`px-2 py-0.5 text-[8px] font-bold rounded ${timeFilter === t && viewMode === 'CALENDAR' ? 'bg-white dark:bg-stone-700 shadow-sm' : 'opacity-50'}`}>{t}</button>
                       ))}
                   </div>
                </div>
            </div>
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                {renderCurrentView()}
            </div>
        </div>
    );
};

export const JournalXX: React.FC<JournalXXProps> = ({ isDarkMode, onExit, onToggleTheme, onSubmit, onDelete, trades }) => {
  const { user } = useAuth();
  const { refreshEntries } = useTradeJournal(); // Get refreshEntries from context
  const savedTradeIdRef = useRef<string | null>(null); // Track saved trade ID
  const { isConnected: meccaConnected } = useOptimizedLivePrice('XAUUSD', { debounceMs: 50 });

  // --- STATE & DATA ---
  // Animation state for Imperial Score
  const [animatedImperialScore, setAnimatedImperialScore] = useState(0);
  const [activeTab, setActiveTab] = useState('JOURNAL');
  const [tiltMode, setTiltMode] = useState(false);
  const [viewState, setViewState] = useState<'FORM' | 'ANALYZING' | 'REVIEW'>('FORM');
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  
  // Desktop slide state (Calendar vs Performance Curve)
  const [activeDesktopSlide, setActiveDesktopSlide] = useState<0 | 1>(0); // 0 = Calendar, 1 = Performance Curve
  
  // LOG ENTRY vs HISTORY Toggle
  const [logMode, setLogMode] = useState<'ENTRY' | 'HISTORY'>('ENTRY');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Simple vs Advanced Log Entry Toggle
  const [entryMode, setEntryMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  
  // JOURNAL MODE: Manual vs Auto (Broker Sync)
  const [journalMode, setJournalMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  
  // AUTO MODE: Broker connection state for mobile
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [brokerConnectionStep, setBrokerConnectionStep] = useState<'SELECT' | 'LOGIN' | 'CONNECTED'>('SELECT');
  const [brokerLoginId, setBrokerLoginId] = useState('');
  const [brokerPassword, setBrokerPassword] = useState('');
  const [brokerServer, setBrokerServer] = useState('');
  const [isConnectingBroker, setIsConnectingBroker] = useState(false);
  const [brokerConnectError, setBrokerConnectError] = useState<string | null>(null);
  
  // Mobile Trader DNA/Insights toggle (for the combined slide in AUTO mode)
  const [mobileDnaView, setMobileDnaView] = useState<'DNA' | 'INSIGHTS'>('DNA');
  
  // Filter trades based on journal mode - COMPLETELY SEPARATE
  const filteredTrades = useMemo(() => {
    if (journalMode === 'MANUAL') {
      // MANUAL mode: Only show trades that are EXPLICITLY NOT synced
      // Must be false or undefined/null (legacy manual trades) AND no broker_connection_id
      const manualTrades = trades.filter(trade => 
        (trade.is_synced === false || 
         trade.is_synced === undefined || 
         trade.is_synced === null ||
         !trade.is_synced) && // Handle any falsy value
        (!trade.broker_connection_id || trade.broker_connection_id === null || trade.broker_connection_id === '') // No broker connection = manual
      );
      console.log(`🔍 [FILTER] MANUAL mode: ${trades.length} total trades → ${manualTrades.length} manual trades`);
      if (manualTrades.length < trades.length) {
        const syncedInManual = trades.filter(t => t.is_synced === true);
        console.warn(`⚠️ [FILTER] Found ${syncedInManual.length} synced trades in MANUAL mode - filtering them out`);
      }
      return manualTrades;
    } else {
      // AUTO mode: Only show trades that are EXPLICITLY synced
      // Must be true AND have broker_connection_id
      const autoTrades = trades.filter(trade => 
        trade.is_synced === true && 
        trade.broker_connection_id !== undefined &&
        trade.broker_connection_id !== null &&
        trade.broker_connection_id !== ''
      );
      console.log(`🔍 [FILTER] AUTO mode: ${trades.length} total trades → ${autoTrades.length} auto trades`);
      if (autoTrades.length < trades.length) {
        const manualInAuto = trades.filter(t => !t.is_synced || t.is_synced === false);
        console.warn(`⚠️ [FILTER] Found ${manualInAuto.length} manual trades in AUTO mode - filtering them out`);
      }
      return autoTrades;
    }
  }, [trades, journalMode]);
  
  // Right Sidebar View Toggle (Desktop only)
  const [rightSidebarView, setRightSidebarView] = useState<'TRADER_DNA' | 'LOG_ENTRY' | 'TRADE_LOG' | 'TRADER_INSIGHTS'>('TRADER_DNA');
  
  // History Interaction States
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  
  // Calendar state (lifted from MacroCalendar)
  const [calendarTimeFilter, setCalendarTimeFilter] = useState<'D'|'W'|'M'|'Y'>('M');
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  
  // Performance Curve state (same as calendar)
  const [perfCurveTimeFilter, setPerfCurveTimeFilter] = useState<'D'|'W'|'M'|'Y'>('M');
  const [perfCurveViewDate, setPerfCurveViewDate] = useState(new Date());
  
  // Performance Curve navigation handler
  const handlePerfCurveNavigation = (offset: number) => {
    const newDate = new Date(perfCurveViewDate);
    if (perfCurveTimeFilter === 'Y') newDate.setFullYear(newDate.getFullYear() + offset);
    else if (perfCurveTimeFilter === 'M') newDate.setMonth(newDate.getMonth() + offset);
    else if (perfCurveTimeFilter === 'W') newDate.setDate(newDate.getDate() + (offset * 7));
    else newDate.setDate(newDate.getDate() + offset);
    setPerfCurveViewDate(newDate);
  };
  
  // Performance Curve header date text
  const perfCurveHeaderDateText = useMemo(() => {
    const date = perfCurveViewDate;
    if (perfCurveTimeFilter === 'D') {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (perfCurveTimeFilter === 'W') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else if (perfCurveTimeFilter === 'M') {
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else {
      return date.getFullYear().toString();
    }
  }, [perfCurveViewDate, perfCurveTimeFilter]);

  // ... [Swipe Logic] ...
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null); 
  const wheelCooldown = useRef(false);
  const minSwipeDistance = 25; 

  const handleSwipeEnd = (startY: number, startX: number, endY: number, endX: number, target: HTMLElement) => {
    const dy = startY - endY; 
    const dx = startX - endX;

    // If horizontal swipe is dominant, ignore (let native scrolling handle it)
    if (Math.abs(dx) > Math.abs(dy) * 1.5) { return; }

    // Only allow vertical swiping in JOURNAL tab
    if (activeTab !== 'JOURNAL') return;

    const isScrollableElement = target.closest('.custom-scrollbar, .overflow-y-auto');
    let allowSwipe = true;

    if (isScrollableElement) {
        const el = isScrollableElement as HTMLElement;
        if (dy > 0) { 
           if (Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) > 2) allowSwipe = false;
        } else {
           if (el.scrollTop > 0) allowSwipe = false;
        }
    }

    if (allowSwipe) {
        if (dy > minSwipeDistance) {
             // Max slides: 
             // MANUAL mode: 5 (Calendar, Performance, Log Entry, Trade Log, Trader DNA, Insights)
             // AUTO mode when connected: 3 (Trade Sync, Calendar, Performance, DNA+Insights toggle)
             // AUTO mode when not connected: 0 (full screen broker connection, no swiping)
             const maxSlides = journalMode === 'MANUAL' ? 5 : (brokerConnected ? 3 : 0);
             if (activeMobileSlide < maxSlides) setActiveMobileSlide(s => s + 1);
        } else if (dy < -minSwipeDistance) {
             if (activeMobileSlide > 0) setActiveMobileSlide(s => s - 1);
        }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {};
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    handleSwipeEnd(touchStartY.current, touchStartX.current, endY, endX, e.target as HTMLElement);
    touchStartY.current = null;
    touchStartX.current = null;
  };
  const onMouseDown = (e: React.MouseEvent) => {
    touchStartY.current = e.clientY;
    touchStartX.current = e.clientX;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const endY = e.clientY;
    const endX = e.clientX;
    handleSwipeEnd(touchStartY.current, touchStartX.current, endY, endX, e.target as HTMLElement);
    touchStartY.current = null;
    touchStartX.current = null;
  };
  const onMouseLeave = () => {
      touchStartY.current = null;
      touchStartX.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
      if (wheelCooldown.current) return;
      if (activeTab !== 'JOURNAL') return; // Only work in JOURNAL tab
      
      const dy = e.deltaY;
      if (Math.abs(e.deltaX) > Math.abs(dy)) return;
      const target = e.target as HTMLElement;
      const isScrollableElement = target.closest('.custom-scrollbar, .overflow-y-auto');
      let allowSlideChange = true;
      
      if (isScrollableElement) {
          const el = isScrollableElement as HTMLElement;
          if (dy > 0) { 
              if (Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) > 2) allowSlideChange = false;
          } else { 
              if (el.scrollTop > 0) allowSlideChange = false;
          }
      }
      
      if (allowSlideChange) {
          if (Math.abs(dy) > 20) {
              // Max slides: 3 in MANUAL mode (Calendar, Log Entry, Trade Log, Trader DNA), 1 in AUTO mode (Calendar, Trader DNA)
              const maxSlides = journalMode === 'MANUAL' ? 5 : 1;
              if (dy > 0 && activeMobileSlide < maxSlides) { setActiveMobileSlide(s => s + 1); activateCooldown(); } 
              else if (dy < 0 && activeMobileSlide > 0) { setActiveMobileSlide(s => s - 1); activateCooldown(); }
          }
      }
  };
  const activateCooldown = () => {
      wheelCooldown.current = true;
      setTimeout(() => { wheelCooldown.current = false; }, 800);
  };
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('');
  const [pnl, setPnl] = useState('');
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long');
  const [outcome, setOutcome] = useState<'Win' | 'Loss' | 'Break Even'>('Win');
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [session, setSession] = useState(SESSIONS[0]);
  const [emotion, setEmotion] = useState(EMOTIONS[0]);
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(null);
  const [isRevengeTrade, setIsRevengeTrade] = useState(false);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefDesktop = useRef<HTMLInputElement>(null);

  // Analysis State
  const [isAnalysisReady, setIsAnalysisReady] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  // Gamification & Visuals
  const [xp, setXp] = useState(2450);
  const currentLevel = 12;
  const progress = 65;
  const coins = 420;

  const isMobileAnalysisMode = viewState === 'ANALYZING' || viewState === 'REVIEW';
  
  // Calculate Trader DNA using real data-driven calculations
  // IMPORTANT: Use filteredTrades so DNA is calculated separately for manual vs auto
  const traderDNA = useMemo(() => {
    // Debug: Log trades data for troubleshooting
    if (filteredTrades.length > 0) {
      console.log(`🔍 [TRADER DNA] Calculating Trader DNA from ${filteredTrades.length} ${journalMode} trades`);
      
      // Log critical fields for Execution and Risk Management
      const tradesWithExtractedData = filteredTrades.filter(t => 
        t.entry_price || t.exit_price || t.position_size || t.planned_target_price || t.planned_stop_loss
      );
      
      if (tradesWithExtractedData.length > 0) {
        console.log('✅ [TRADER DNA] Found', tradesWithExtractedData.length, 'trades with extracted data');
        tradesWithExtractedData.forEach((t, idx) => {
          console.log(`  [TRADER DNA] Trade ${idx + 1}:`, {
            entry_price: t.entry_price || 'MISSING',
            exit_price: t.exit_price || 'MISSING',
            position_size: t.position_size || 'MISSING',
            planned_target_price: t.planned_target_price || 'MISSING',
            planned_stop_loss: t.planned_stop_loss || 'MISSING',
            target_hit_by_market: t.target_hit_by_market !== undefined ? t.target_hit_by_market : 'MISSING'
          });
        });
      } else {
        console.warn('⚠️ [TRADER DNA] No trades have extracted data - Execution & Risk Management will use defaults');
      }
    }
    
    const result = calculateTraderDNA(filteredTrades);
    
    // Debug: Log calculated Trader DNA
    console.log('✅ [TRADER DNA] Calculated scores:', {
      mode: journalMode,
      tradesCount: filteredTrades.length,
      imperialScore: result.imperialScore,
      execution: result.metrics.execution,
      riskManagement: result.metrics.riskManagement,
      discipline: result.metrics.discipline
    });
    
    return result;
  }, [filteredTrades, journalMode]);

  const radarData = useMemo(() => [
    { subject: 'Discipline', A: traderDNA.metrics.discipline, max: 100, fullMark: 100 },
    { subject: 'Execution', A: traderDNA.metrics.execution, max: 100, fullMark: 100 },
    { subject: 'Risk Mgmt', A: traderDNA.metrics.riskManagement, max: 100, fullMark: 100 },
    { subject: 'Patience', A: traderDNA.metrics.patience, max: 100, fullMark: 100 },
    { subject: 'Focus', A: traderDNA.metrics.focus, max: 100, fullMark: 100 },
    { subject: 'Win Rate', A: traderDNA.metrics.winRate, max: 100, fullMark: 100 },
  ], [traderDNA.metrics]);

  // Check if any trades are still being processed (screenshot analysis in progress)
  const hasProcessingTrades = useMemo(() => {
    return trades.some(t => 
      (t as unknown as { processing_status?: string }).processing_status === 'analyzing' || 
      (t as unknown as { processing_status?: string }).processing_status === 'pending'
    );
  }, [trades]);
  
  const sortedTrades = useMemo(() => {
      // Deduplicate trades by ID before sorting
      // Use filteredTrades to separate manual vs auto trades
      const seenIds = new Set<string>();
      const uniqueTrades = filteredTrades.filter(t => {
          if (seenIds.has(t.id)) {
              console.warn(`⚠️ Duplicate trade in sortedTrades: ${t.id} - ${t.asset}`);
              return false;
          }
          seenIds.add(t.id);
          return true;
      });
      
      return uniqueTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTrades]);

  // Animate Imperial Score with conditional direction based on score
  // Trigger animation when: score changes OR when switching to TRADER_DNA view
  useEffect(() => {
    // Only animate if we're viewing TRADER_DNA (desktop) or on the Trader DNA slide (mobile)
    // Trader DNA is on slide 4 in MANUAL mode, slide 1 in AUTO mode
    const traderDNASlide = journalMode === 'MANUAL' ? 4 : 1;
    const isViewingTraderDNA = rightSidebarView === 'TRADER_DNA' || activeMobileSlide === traderDNASlide;
    if (!isViewingTraderDNA) {
      // If not viewing Trader DNA, just set the score without animation
      setAnimatedImperialScore(traderDNA.imperialScore);
      return;
    }

    const currentScore = traderDNA.imperialScore;
    const fastDuration = 500; // 0.5s to slide away
    const slowDuration = 1000; // 1s to slide back to current score
    const totalDuration = fastDuration + slowDuration;
    let startTime: number;
    let animationFrameId: number;

    // Determine animation direction based on score
    const isHighScore = currentScore > 50;
    const awayPosition = isHighScore ? 0 : 100; // Slide to 0 if > 50, to 100 if < 50

    // Set initial position to current score
    setAnimatedImperialScore(currentScore);

    const animate = () => {
      if (!startTime) startTime = Date.now();
      const elapsed = Date.now() - startTime;
      
      if (elapsed < fastDuration) {
        // Phase 1: Fast animation from current score to away position (0 or 100) in 0.5s
        const progress = elapsed / fastDuration;
        // Ease in for smooth acceleration
        const easeIn = Math.pow(progress, 2);
        const newPosition = currentScore + (awayPosition - currentScore) * easeIn;
        setAnimatedImperialScore(newPosition);
        animationFrameId = requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        // Phase 2: Slow animation from away position back to current score in 1s
        // Easing slows down as it approaches the current score
        const phase2Elapsed = elapsed - fastDuration;
        const progress = phase2Elapsed / slowDuration;
        // Ease out cubic - slows down significantly near the end
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newPosition = awayPosition + (currentScore - awayPosition) * easeOut;
        setAnimatedImperialScore(newPosition);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at current score
        setAnimatedImperialScore(currentScore);
      }
    };

    // Start animation immediately
    const timeout = setTimeout(() => {
      startTime = Date.now();
      animationFrameId = requestAnimationFrame(animate);
    }, 100); // Small delay to ensure component is mounted

    return () => {
      clearTimeout(timeout);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [traderDNA.imperialScore, rightSidebarView, activeMobileSlide]);

  // Check broker connection status on mount and when journalMode changes to AUTO
  useEffect(() => {
    const checkBrokerConnection = async () => {
      if (!user || journalMode !== 'AUTO') return;
      
      try {
        const { data, error } = await supabase
          .from('broker_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking broker connection:', error);
          return;
        }
        
        if (data) {
          setBrokerConnected(true);
          setBrokerConnectionStep('CONNECTED');
          setActiveMobileSlide(0); // Start at Trade Sync slide when connected
        } else {
          setBrokerConnected(false);
          setBrokerConnectionStep('SELECT');
        }
      } catch (err) {
        console.error('Error checking broker connection:', err);
      }
    };
    
    checkBrokerConnection();
  }, [user, journalMode]);

  // Set default server when broker is selected
  useEffect(() => {
    if (selectedBroker && !brokerServer) {
      const broker = BROKERS.find(b => b.id === selectedBroker);
      if (broker?.defaultServer) {
        setBrokerServer(broker.defaultServer);
      }
    }
  }, [selectedBroker, brokerServer]);

  useEffect(() => {
    const val = parseFloat(pnl);
    if (!isNaN(val)) {
        if (val > 0) setOutcome('Win');
        else if (val < 0) setOutcome('Loss');
        else setOutcome('Break Even');
    }
  }, [pnl]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📸 File input changed - files:', e.target.files?.length || 0);
    
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          console.warn('⚠️ Skipping non-image file:', file.name, file.type);
        }
        return isImage;
      });
      
      const remainingSlots = 3 - images.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);
      
      if (filesToAdd.length > 0) {
        const newImages = [...images, ...filesToAdd];
        const newPreviewUrls = [...previewUrls, ...filesToAdd.map(file => URL.createObjectURL(file))];
        setImages(newImages);
        setPreviewUrls(newPreviewUrls);
        console.log('✅ Images added via file picker:', filesToAdd.length, 'Total:', newImages.length);
      } else {
        console.warn('⚠️ No space for more images. Current:', images.length, 'Max: 3');
      }
      
      // Reset input so same file can be selected again
      if (e.target) {
        e.target.value = '';
      }
    } else {
      console.warn('⚠️ No files selected');
    }
  }, [images, previewUrls]);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviewUrls(newPreviewUrls);
    console.log('🗑️ Image removed, remaining:', newImages.length);
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on remove button
    const target = e.target as HTMLElement;
    if (target.closest('button[type="button"]')) {
      return;
    }
    
    // Don't trigger if currently dragging
    if (isDragging) {
      return;
    }
    
    // Simple approach - just like TradeEntryForm
    // Find the file input in the clicked container
    const container = e.currentTarget as HTMLElement;
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (fileInput) {
      fileInput.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    } else if (fileInputRefDesktop.current) {
      fileInputRefDesktop.current.click();
    }
  }, [isDragging]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    console.log('🎯 Drag enter');
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Only set to false if mouse is truly outside
    if (x < rect.left - 5 || x > rect.right + 5 || y < rect.top - 5 || y > rect.bottom + 5) {
      setIsDragging(false);
    }
  }, []);

  // Define addFiles BEFORE handleDrop to avoid initialization order issues
  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) {
      console.warn('⚠️ No files to add');
      return;
    }
    
    setImages(prevImages => {
      const remainingSlots = 3 - prevImages.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);
      
      if (filesToAdd.length > 0) {
        const newImages = [...prevImages, ...filesToAdd];
        setPreviewUrls(prevUrls => [...prevUrls, ...filesToAdd.map(file => URL.createObjectURL(file))]);
        console.log('✅ Files added:', filesToAdd.length, 'Total:', newImages.length);
        return newImages;
      } else {
        console.warn('⚠️ Maximum 3 images allowed. Current:', prevImages.length);
        return prevImages;
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    console.log('🎯 Drop event');
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files: File[] = [];
    
    // Get files from dataTransfer.files (most reliable)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      files.push(...Array.from(e.dataTransfer.files));
      console.log('📁 Got', files.length, 'files from dataTransfer.files');
    }
    
    // Fallback: get from items if files array is empty
    if (files.length === 0 && e.dataTransfer.items) {
      console.log('📁 Trying dataTransfer.items');
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      console.log('📁 Got', files.length, 'files from items');
    }

    // Filter for images only and add them
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    console.log('🖼️ Filtered to', imageFiles.length, 'image files');
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    } else {
      console.warn('⚠️ No image files found');
    }
  }, [addFiles]);

  const handleAnalyze = useCallback(async () => {
      if (!user) {
          console.error('❌ No user - cannot save trade');
          return;
      }

      setViewState('ANALYZING');
      setIsAnalysisReady(false);
      
      // Upload images to Supabase Storage and get URLs
      let imageUrls: string[] = [];
      let firstImageUrl: string | undefined = undefined;
      
      if (images.length > 0) {
          try {
              console.log('📤 Uploading', images.length, 'images to Supabase Storage...');
              
              const uploadPromises = images.map(async (file, index) => {
                  try {
                      // Compress image before upload
                      const compressedFile = await compressImage(file, {
                          maxWidth: 1920,
                          maxHeight: 1080,
                          quality: 0.8
                      });
                      
                      const timestamp = Date.now();
                      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                      const filePath = `${user.id}/${date}/${timestamp}-${index}-${sanitizedFilename}`;
                      
                      const { data, error } = await supabase.storage
                          .from('journal-charts')
                          .upload(filePath, compressedFile, {
                              cacheControl: '3600',
                              upsert: false
                          });
                      
                      if (error) {
                          console.error(`❌ Upload failed for ${file.name}:`, error);
                          // Fallback to base64 if upload fails
                          const base64 = await fileToBase64(file);
                          return base64;
                      }
                      
                      // Get public URL
                      const { data: urlData } = supabase.storage
                          .from('journal-charts')
                          .getPublicUrl(filePath);
                      
                      console.log(`✅ Image ${index + 1} uploaded:`, urlData.publicUrl);
                      return urlData.publicUrl;
                  } catch (error) {
                      console.error(`❌ Error uploading image ${index + 1}:`, error);
                      // Fallback to base64
                      return await fileToBase64(file);
                  }
              });
              
              imageUrls = await Promise.all(uploadPromises);
              firstImageUrl = imageUrls[0];
              console.log('✅ All images uploaded:', imageUrls.length);
          } catch(e) {
              console.error('❌ Failed to upload images:', e);
              // Fallback: convert to base64
              try {
                  const base64Promises = images.map(img => fileToBase64(img));
                  imageUrls = await Promise.all(base64Promises);
                  firstImageUrl = imageUrls[0];
                  console.log('📸 Fallback: Converted to base64');
              } catch(base64Error) {
                  console.error('❌ Failed to convert to base64:', base64Error);
              }
          }
      }

      // CRITICAL: Save or UPDATE trade to Supabase FIRST before AI analysis
      // This ensures the trade exists even if user switches views before clicking DONE
      try {
          const [year, month, day] = date.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);

          // Check if we're editing an existing trade
          if (editingId) {
              console.log('💾 JournalPro: Updating existing trade:', editingId);
              
              // Update existing trade
              const updateData: any = {
                  asset_ticker: asset,
                  pnl: Number(pnl),
                  notes: notes,
                  trade_date: dateObj.toISOString().split('T')[0],
                  screenshot_url: firstImageUrl, // First image URL for backward compatibility
                  screenshot_urls: imageUrls.length > 0 ? imageUrls : undefined,
                  trade_type: direction === 'Long' ? 'Long' : direction === 'Short' ? 'Short' : undefined,
                  strategy: strategy,
                  session: session,
                  emotion: emotion,
                  followed_plan: followedPlan !== null ? followedPlan : undefined,
              };
              
              // Update via TJEntry first
              await TJEntry.update(editingId, updateData);
              
              // Then update revenge_trade separately if needed (not in TJEntry type)
              if (isRevengeTrade !== undefined) {
                  try {
                      await supabase
                          .from('trade_journal_entries')
                          .update({ revenge_trade: isRevengeTrade } as any)
                          .eq('id', editingId);
                      console.log('✅ Updated trade with revenge_trade:', isRevengeTrade);
                  } catch (error) {
                      console.error('❌ Failed to save revenge_trade:', error);
                  }
              }
              savedTradeIdRef.current = editingId;
              console.log('✅ JournalPro: Trade updated in Supabase:', editingId);
          } else {
              console.log('💾 JournalPro: Creating new trade in Supabase...');
              
              // Create new trade
              const newEntry = await TJEntry.create({
                  asset_ticker: asset,
                  pnl: Number(pnl),
                  notes: notes,
                  trade_date: dateObj.toISOString().split('T')[0],
                  screenshot_url: firstImageUrl, // First image URL for backward compatibility
                  screenshot_urls: imageUrls.length > 0 ? imageUrls : undefined,
                  trade_type: direction === 'Long' ? 'Long' : direction === 'Short' ? 'Short' : undefined,
                  strategy: strategy,
                  session: session,
                  emotion: emotion,
                  followed_plan: followedPlan !== null ? followedPlan : undefined,
              }, user.id);

              savedTradeIdRef.current = newEntry.id;
              console.log('✅ JournalPro: Trade saved to Supabase:', newEntry.id);
              
              // CRITICAL: Mark as MANUAL trade (not synced) - ensures complete separation from auto journaling
              // Also update revenge_trade if set
              const manualTradeUpdate: any = {
                  is_synced: false,
                  sync_source: 'manual'
              };
              
              if (isRevengeTrade !== undefined) {
                  manualTradeUpdate.revenge_trade = isRevengeTrade;
              }
              
                  try {
                      await supabase
                          .from('trade_journal_entries')
                      .update(manualTradeUpdate)
                          .eq('id', newEntry.id);
                  console.log('✅ Marked trade as MANUAL (is_synced=false, sync_source=manual)');
                  } catch (error) {
                  console.error('❌ Failed to mark trade as manual:', error);
              }
          }
          
          // CRITICAL: Don't call onSubmit - trade is already saved/updated above
          // onSubmit would trigger handleTradeSubmit which creates ANOTHER trade entry
          // Only refresh the entries list to show the newly saved/updated trade
          if (refreshEntries) {
              setTimeout(() => {
                  refreshEntries().then(() => {
                      console.log('✅ JournalPro: Trade list refreshed after', editingId ? 'updating' : 'saving');
                  }).catch((err) => {
                      console.warn('⚠️ JournalPro: Failed to refresh trade list:', err);
                  });
              }, 300);
          }
      } catch (error) {
          console.error('❌ JournalPro: Failed to', editingId ? 'update' : 'save', 'trade:', error);
          // Continue with AI analysis even if save fails
      }

      // CRITICAL: Set processing_status to 'analyzing' and call edge function for background extraction
      // This allows the UI to show a "processing" indicator while extraction happens in the background
      if (imageUrls.length > 0 && savedTradeIdRef.current) {
          try {
              // Set processing status to 'analyzing' immediately
              await supabase
                  .from('trade_journal_entries')
                  .update({ processing_status: 'analyzing' } as Record<string, unknown>)
                  .eq('id', savedTradeIdRef.current);
              
              console.log('🔄 [TRADER DNA] Set processing_status to "analyzing" for trade:', savedTradeIdRef.current);
              
              // Call edge function for background extraction (fire and forget)
              // Don't await - let it run in background while AI feedback is generated
              const tradeId = savedTradeIdRef.current;
              const firstImageUrl = imageUrls[0];
              
              supabase.functions.invoke('extract-trade-data', {
                  body: {
                      trade_id: tradeId,
                      image_url: firstImageUrl,
                      asset: asset,
                      direction: direction,
                      pnl: Number(pnl)
                  }
              }).then(({ data, error }) => {
                  if (error) {
                      console.error('❌ [TRADER DNA] Edge function error:', error);
                      console.log('🔄 [TRADER DNA] Attempting fallback extraction...');
                      
                      // Fallback to frontend extraction if edge function fails
                      if (images.length > 0 && images[0]) {
                          fileToBase64(images[0]).then(imageBase64 => {
                              extractTradeDataFromScreenshot(
                                  imageBase64,
                                  asset,
                                  direction === 'Long' ? 'Long' : direction === 'Short' ? 'Short' : 'Long',
                                  Number(pnl)
                              ).then(extractedData => {
                                  console.log('✅ [TRADER DNA FALLBACK] Extracted:', extractedData);
                                  
                                  if (extractedData.confidence === 'medium' || extractedData.confidence === 'high') {
                                      const updateData: Record<string, unknown> = { processing_status: 'complete' };
                                      if (extractedData.entry_price != null) updateData.entry_price = extractedData.entry_price;
                                      if (extractedData.exit_price != null) updateData.exit_price = extractedData.exit_price;
                                      if (extractedData.position_size != null) updateData.position_size = extractedData.position_size;
                                      if (extractedData.planned_target_price != null) updateData.planned_target_price = extractedData.planned_target_price;
                                      if (extractedData.planned_stop_loss != null) updateData.planned_stop_loss = extractedData.planned_stop_loss;
                                      if (extractedData.target_hit_by_market != null) updateData.target_hit_by_market = extractedData.target_hit_by_market;
                                      
                                      supabase
                                          .from('trade_journal_entries')
                                          .update(updateData)
                                          .eq('id', tradeId)
                                          .then(() => {
                                              console.log('✅ [TRADER DNA FALLBACK] Trade updated');
                                              if (refreshEntries) setTimeout(() => refreshEntries(), 500);
                                          });
                                  } else {
                                      supabase
                                          .from('trade_journal_entries')
                                          .update({ processing_status: 'complete' } as Record<string, unknown>)
                                          .eq('id', tradeId);
                                  }
                              }).catch(err => {
                                  console.error('❌ [TRADER DNA FALLBACK] Extraction failed:', err);
                                  supabase
                                      .from('trade_journal_entries')
                                      .update({ processing_status: 'failed' } as Record<string, unknown>)
                                      .eq('id', tradeId);
                              });
                          }).catch(err => {
                              console.error('❌ [TRADER DNA FALLBACK] Image conversion failed:', err);
                          });
                      }
                  } else {
                      console.log('✅ [TRADER DNA] Edge function completed:', data);
                      // Refresh entries to get updated data
                      if (refreshEntries) {
                          setTimeout(() => {
                              refreshEntries().then(() => {
                                  console.log('✅ [TRADER DNA] Trade list refreshed with extracted data');
                              }).catch((err) => {
                                  console.warn('⚠️ [TRADER DNA] Failed to refresh:', err);
                              });
                          }, 500);
                      }
                  }
              }).catch(err => {
                  console.error('❌ [TRADER DNA] Edge function call failed:', err);
                  // Mark as failed
                  supabase
                      .from('trade_journal_entries')
                      .update({ processing_status: 'failed' } as Record<string, unknown>)
                      .eq('id', tradeId);
              });
              
          } catch (error) {
              console.error('❌ [TRADER DNA] Failed to initiate background extraction:', error);
          }
      } else {
          console.log('⚠️ [TRADER DNA] No image uploaded, skipping screenshot extraction');
      }
      
      // Use edge function for AI feedback (handles images better via URLs)
      // CRITICAL: Call immediately, don't wait for data extraction
      const feedbackPromise = (async () => {
          try {
              console.log('🔄 Calling ai-trade-analysis edge function for feedback (instant call)...');
              
              // Build prompt for edge function (aligned with coach-agent prompt structure)
              const tradeOutcome = Number(pnl) > 0 ? "winning trade" : "losing trade";
              const pnlAmount = Math.abs(Number(pnl));
              const tradeNotes = notes || "No notes provided";
              
              const prompt = `The user submitted a ${tradeOutcome} with ${pnlAmount} USD ${
                Number(pnl) > 0 ? "profit" : "loss"
              }. 
              Asset: ${asset}
              Trade Type: ${direction || "Not specified"}
              ${strategy ? `Strategy: ${strategy}` : ''}
              ${session ? `Session: ${session}` : ''}
              ${emotion ? `Emotional State: ${emotion}` : ''}
              Their notes: "${tradeNotes}"
              ${imageUrls.length > 0 ? "They also uploaded a screenshot for analysis." : ""}
              
              Analyze their notes for specific trading concepts and provide encouraging feedback that acknowledges the sophisticated analysis they demonstrate.`;
              
              // Filter imageUrls to only include actual URLs (not base64 data URLs)
              const imageUrlsForEdge = imageUrls.filter(url => !url.startsWith('data:'));
              
              // Prepare image for direct API fallback (if edge function fails)
              let imageForDirectAPI: string | undefined = undefined;
              if (images.length > 0 && images[0]) {
                  try {
                      imageForDirectAPI = await fileToBase64(images[0]);
                  } catch (error) {
                      console.warn('⚠️ Failed to prepare image for fallback:', error);
                  }
              }
              
              // Try edge function first with timeout
              let feedback: string | null = null;
              let edgeFunctionWorked = false;
              
              try {
                  // Create timeout promise (20 seconds)
                  const timeoutPromise = new Promise<never>((_, reject) =>
                      setTimeout(() => {
                          reject(new Error('Edge function timeout after 20 seconds'));
                      }, 20000)
                  );
                  
                  // Race between edge function and timeout
                  const result = await Promise.race([
                      supabase.functions.invoke('ai-trade-analysis', {
                          body: {
                              prompt,
                              file_urls: imageUrlsForEdge.length > 0 ? imageUrlsForEdge : [],
                              user_id: user.id
                          }
                      }),
                      timeoutPromise
                  ]) as { data: any; error: any };
                  
                  const { data: edgeFeedback, error: edgeError } = result;
                  
                  if (edgeError) {
                      console.warn('⚠️ Edge function error:', edgeError);
                      throw new Error(`Edge function error: ${edgeError.message || 'Unknown error'}`);
                  }
                  
                  if (edgeFeedback && typeof edgeFeedback === 'string') {
                      feedback = edgeFeedback;
                      edgeFunctionWorked = true;
                      console.log('✅ JournalPro: Received AI feedback from edge function');
                  } else {
                      throw new Error('Invalid response from edge function');
                  }
              } catch (edgeError: any) {
                  console.warn('⚠️ Edge function failed, falling back to direct Gemini API:', edgeError.message);
                  
                  // FALLBACK: Use direct Gemini API call
                  console.log('🔄 Falling back to direct Gemini API call...');
                  try {
                      const directFeedback = await analyzeTradeWithGemini(
                          asset, 
                          Number(pnl), 
                          tradeNotes, 
                          imageForDirectAPI, 
                          direction, 
                          outcome, 
                          strategy, 
                          emotion, 
                          session, 
                          true // isPro = true
                      );
                      
                      if (directFeedback && typeof directFeedback === 'string') {
                          feedback = directFeedback;
                          console.log('✅ JournalPro: Received AI feedback from direct API (fallback)');
                      } else {
                          throw new Error('Direct API also failed');
                      }
                  } catch (directError) {
                      console.error('❌ Both edge function and direct API failed:', directError);
                      throw new Error(`AI analysis failed. Edge function error: ${edgeError?.message || 'Unknown'}. Direct API error: ${directError instanceof Error ? directError.message : 'Unknown'}`);
                  }
              }
              
              if (!feedback || feedback.trim().length === 0) {
                  throw new Error('Empty feedback received from AI');
              }
              
              console.log('✅ JournalPro: AI feedback received, length:', feedback.length);
              console.log('✅ JournalPro: First 200 chars:', feedback.substring(0, 200));
              setAiFeedback(feedback);
              setIsAnalysisReady(true);
              
              // Update the saved trade with AI feedback
              if (savedTradeIdRef.current) {
                  try {
                      await supabase
                          .from('trade_journal_entries')
                          .update({ ai_positive_feedback: feedback })
                          .eq('id', savedTradeIdRef.current);
                      console.log('✅ JournalPro: AI feedback saved to trade:', savedTradeIdRef.current);
                      
                      // Refresh trade list after AI feedback is saved
                      if (refreshEntries) {
                          setTimeout(() => {
                              refreshEntries().then(() => {
                                  console.log('✅ JournalPro: Trade list refreshed after AI feedback - Trader DNA/Insights updated');
                              }).catch((err) => {
                                  console.warn('⚠️ JournalPro: Failed to refresh (non-critical):', err);
                              });
                          }, 500);
                      }
                  } catch (error) {
                      console.error('❌ JournalPro: Failed to save AI feedback:', error);
                  }
              }
          } catch (error) {
              console.error('❌ JournalPro: AI analysis failed completely:', error);
              
              // Extract and show actual error message
              let errorMessage = 'AI analysis failed. ';
              if (error instanceof Error) {
                  const errorMsg = error.message;
                  // Clean up common error messages
                  if (errorMsg.includes('Failed to send a request to the Edge Function') || 
                      errorMsg.includes('Failed to send')) {
                      errorMessage = 'The AI service is temporarily unavailable. Please try again in a moment. If the problem persists, check your internet connection.';
                  } else if (errorMsg.includes('timeout')) {
                      errorMessage = 'AI analysis is taking longer than expected. Please try again.';
                  } else {
                      errorMessage += errorMsg;
                  }
              } else if (typeof error === 'string') {
                  errorMessage += error;
              } else {
                  errorMessage += 'Please try again or contact support.';
              }
              
              // Provide helpful error message
              if (errorMessage.includes('timeout') || errorMessage.includes('Failed to send')) {
                  // Show a more user-friendly message
                  errorMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
              }
              
              setAiFeedback(errorMessage);
              setIsAnalysisReady(true); // Mark as ready to show error message
          }
      })();
      
      // Wait for AI feedback to complete
      // Note: Screenshot data extraction now runs in background via edge function
      // and will update the trade when complete (no need to await it)
      await feedbackPromise;
  }, [user, date, asset, pnl, notes, images, direction, outcome, strategy, emotion, session, editingId, followedPlan, isRevengeTrade, refreshEntries]);

  const handleLoaderComplete = useCallback(() => { setViewState('REVIEW'); }, []);

  const handleConfirmLog = () => {
      // Don't call onSubmit - trade is already saved/updated in handleAnalyze
      // Just refresh the entries list and reset the form
      if (refreshEntries) {
          refreshEntries().then(() => {
              console.log('✅ JournalPro: Trade list refreshed after confirming', editingId ? 'update' : 'log');
          }).catch((err) => {
              console.warn('⚠️ JournalPro: Failed to refresh trade list:', err);
          });
      }
      
      // CRITICAL: Clear editingId to prevent duplicate creation on next save
      const wasEditing = !!editingId;
      setViewState('FORM');
      setEditingId(null);
      setAsset(''); setPnl(''); setNotes(''); setImages([]); setPreviewUrls([]); setAiFeedback(''); setFollowedPlan(null); setIsRevengeTrade(false); setIsDragging(false);
      
      // Clean up preview URLs to prevent memory leaks
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      if (wasEditing) {
          console.log('✅ JournalPro: Edit mode cleared - next save will create new trade');
      }
  };

  const handleDojoOutcome = (win: boolean) => { if (win) setXp(p => p + 50); };

  // Calculate Net PnL based on calendar timeFilter and viewDate
  const calculateFilteredPnL = useMemo(() => {
    // CRITICAL: Use filteredTrades (already filtered by journalMode) instead of raw trades
    // This ensures PnL is calculated separately for manual vs auto journaling
    let dateFilteredTrades: TradeEntry[] = [];
    const currentYear = calendarViewDate.getFullYear();
    const currentMonth = calendarViewDate.getMonth();
    const currentDate = calendarViewDate.getDate();
    
    // Filter by date/time using filteredTrades (which is already filtered by journalMode)
    if (calendarTimeFilter === 'D') {
      // Daily: Get trades for the specific day
      dateFilteredTrades = filteredTrades.filter(t => {
        const { year, month, day } = parseDateString(t.date);
        return year === currentYear &&
               month === currentMonth &&
               day === currentDate;
      });
    } else if (calendarTimeFilter === 'W') {
      // Weekly: Get trades for the week containing viewDate
      const startOfWeek = new Date(calendarViewDate);
      startOfWeek.setDate(calendarViewDate.getDate() - calendarViewDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      dateFilteredTrades = filteredTrades.filter(t => {
        const tradeDate = parseLocalDate(t.date);
        return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
      });
    } else if (calendarTimeFilter === 'M') {
      // Monthly: Get trades for the month
      dateFilteredTrades = filteredTrades.filter(t => {
        const { year, month } = parseDateString(t.date);
        return year === currentYear && 
               month === currentMonth;
      });
    } else if (calendarTimeFilter === 'Y') {
      // Yearly: Get trades for the year
      dateFilteredTrades = filteredTrades.filter(t => {
        const { year } = parseDateString(t.date);
        return year === currentYear;
      });
    } else {
      // Default: Use all filteredTrades (already filtered by journalMode)
      dateFilteredTrades = filteredTrades;
    }
    
    const totalPnL = dateFilteredTrades.reduce((acc, curr) => acc + curr.pnl, 0);
    return {
      totalPnL,
      formattedPnL: (totalPnL >= 0 ? '+' : '-') + '$' + Math.abs(totalPnL).toFixed(2)
    };
  }, [filteredTrades, calendarTimeFilter, calendarViewDate]);

  const handleTabChange = (id: string) => {
      setActiveTab(id);
      // Reset to first slide when switching to JOURNAL tab
      if (id === 'JOURNAL') setActiveMobileSlide(0);
  };

  // History Actions
  const handleHistoryClick = (id: string) => {
     if (activeHistoryId === id) setActiveHistoryId(null);
     else { setActiveHistoryId(id); setDeleteConfirmationId(null); }
  };
  const handleEditHistoryItem = (trade: TradeEntry) => {
      setEditingId(trade.id);
      setDate(trade.date.split('T')[0]);
      setAsset(trade.asset);
      setPnl(trade.pnl.toString());
      setNotes(trade.notes);
      
      // Handle image URLs - prefer array, fallback to single
      if (trade.imageUrls && trade.imageUrls.length > 0) {
          setPreviewUrls(trade.imageUrls);
          // Note: We can't recreate File objects from URLs, so images array stays empty
          // The preview URLs will be used for display, but new uploads will replace them
          setImages([]);
      } else if (trade.imageUrl) {
          setPreviewUrls([trade.imageUrl]);
          setImages([]);
      } else {
          setPreviewUrls([]);
          setImages([]);
      }
      
      if(trade.direction) setDirection(trade.direction);
      if(trade.outcome) setOutcome(trade.outcome);
      if(trade.strategy) setStrategy(trade.strategy);
      if(trade.session) setSession(trade.session);
      if(trade.emotion) setEmotion(trade.emotion);
      if(trade.followedPlan !== undefined) setFollowedPlan(trade.followedPlan);
      if((trade as any).revenge_trade !== undefined) setIsRevengeTrade((trade as any).revenge_trade);
      setLogMode('ENTRY'); // Switch back to form
      setActiveHistoryId(null);
  };
  const confirmDelete = (id: string) => { onDelete(id); setDeleteConfirmationId(null); setActiveHistoryId(null); };
  const toggleInsight = (id: string) => { setExpandedInsights(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
  
  const proTextGradient = isDarkMode 
    ? "bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600"
    : "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600";

  // --- LOG ENTRY CONTENT ---
  const LogEntryContent = (
      <div className={`flex flex-col relative z-20 ${isMobileAnalysisMode ? 'h-full overflow-hidden' : 'overflow-visible'} transition-all duration-500 ${tiltMode ? 'pointer-events-none opacity-50' : ''} h-full`}>
             
            {/* --- HEADER --- */}
             <div className="px-5 pt-2 pb-4 shrink-0">
               <div className="flex justify-between items-center">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                        <span className="w-0.5 h-0.5 bg-yellow-500 dark:bg-bronze-500 rotate-45 rounded-[1px]"></span>
                        {editingId ? 'Edit Entry' : 'Log Entry'}
                    </h3>
                    {/* Simple/Advanced Toggle - Only show in ENTRY mode - Slim pill toggle */}
                    {logMode === 'ENTRY' && (
                        <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-5 overflow-hidden">
                        <button 
                                onClick={() => setEntryMode('SIMPLE')}
                                className={`px-2 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                    entryMode === 'SIMPLE'
                                        ? 'bg-stone-700 text-bronze-500'
                                        : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                Simple
                        </button>
                        <button 
                                onClick={() => setEntryMode('ADVANCED')}
                                className={`px-2 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                    entryMode === 'ADVANCED'
                                        ? 'bg-stone-700 text-bronze-500'
                                        : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                Advanced
                        </button>
                    </div>
                    )}
                </div>
             </div>

             {/* --- FORM VIEW --- */}
             {logMode === 'ENTRY' && viewState === 'FORM' && (
                 <div className="flex flex-col animate-in fade-in duration-300 h-full min-h-0">
                     {/* SIMPLE MODE - Basic fields only */}
                     {entryMode === 'SIMPLE' ? (
                         <div className="px-5 pb-2 space-y-3 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                             {/* Date */}
                             <div className="relative group shrink-0">
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Date</label>
                                 <div className="absolute left-3 top-[28px] text-stone-500 dark:text-slate-500 pointer-events-none">
                                     <CalendarIcon className="w-3.5 h-3.5" />
                                 </div>
                                 <input
                                     type="date"
                                     value={date}
                                     onChange={(e) => setDate(e.target.value)}
                                     className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-9 pr-2 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                 />
                             </div>

                             {/* Asset & PnL */}
                             <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                 <div>
                                     <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Asset</label>
                                     <input 
                                         type="text" 
                                         value={asset} 
                                         onChange={(e) => setAsset(e.target.value)} 
                                         placeholder="BTCUSD" 
                                         className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600" 
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Profit / Loss ($)</label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 font-bold text-xs">$</span>
                                         <input 
                                             type="number" 
                                             value={pnl} 
                                             onChange={(e) => setPnl(e.target.value)} 
                                             placeholder="0.00" 
                                             className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600 ${Number(pnl) > 0 ? 'text-emerald-500' : Number(pnl) < 0 ? 'text-rose-500' : 'text-stone-900 dark:text-white'}`} 
                                         />
                                     </div>
                                 </div>
                             </div>

                             {/* Notes */}
                             <div className="flex-col flex-1 min-h-[100px] flex shrink-0">
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Strategy & Psychology Notes</label>
                                 <textarea 
                                     value={notes} 
                                     onChange={(e) => setNotes(e.target.value)} 
                                     placeholder="Why did you take this trade? How did you feel?" 
                                     className="w-full flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none resize-none placeholder-stone-400 dark:placeholder-slate-600 leading-relaxed" 
                                 />
                             </div>

                             {/* Image Upload */}
                             <div className="shrink-0">
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Chart Snapshot</label>
                                 <div 
                                     onClick={handleClick}
                                     onDragEnter={handleDragEnter}
                                     onDragOver={handleDragOver}
                                     onDragLeave={handleDragLeave}
                                     onDrop={handleDrop}
                                     className={`relative w-full h-12 bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-yellow-500 dark:border-bronze-500 bg-yellow-50/50 dark:bg-bronze-950/30 border-dashed scale-[1.02] shadow-lg shadow-yellow-500/20 dark:shadow-bronze-500/20' : 'border-dashed border-stone-300 dark:border-slate-600 hover:border-yellow-400 dark:hover:border-bronze-400 hover:bg-stone-50 dark:hover:bg-slate-800/50'} rounded-xl flex items-center ${previewUrls.length > 0 ? 'justify-between px-4' : 'justify-center gap-3'} cursor-pointer transition-all duration-200 group overflow-hidden ${previewUrls.length > 0 ? 'border-solid border-yellow-500/50 dark:border-bronze-500/50 bg-yellow-50/30 dark:bg-bronze-950/10' : ''}`}
                                 >
                                     {isDragging && (
                                         <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-yellow-500/20 to-yellow-400/10 animate-pulse pointer-events-none" />
                                     )}
                                     
                                     <input 
                                         type="file" 
                                         ref={fileInputRef} 
                                         onChange={handleImageChange} 
                                         className="hidden" 
                                         accept="image/*" 
                                         multiple 
                                     />
                                     
                                     {previewUrls.length === 0 ? (
                                         <>
                                             <UploadIcon 
                                                 className={`relative z-10 w-5 h-5 ${isDragging ? 'text-yellow-600 dark:text-bronze-400 scale-110' : 'text-stone-400 dark:text-bronze-500'} transition-all duration-200 ${isDragging ? 'animate-pulse' : 'group-hover:scale-110'}`}
                                             />
                                             <span className={`relative z-10 text-[10px] font-bold ${isDragging ? 'text-yellow-700 dark:text-bronze-300' : 'text-stone-500 dark:text-bronze-500'} uppercase tracking-wide transition-colors`}>
                                                 {isDragging ? '✨ Drop to upload (max 3)' : 'Click to upload chart'}
                                             </span>
                                         </>
                                     ) : (
                                         <div className="flex items-center gap-2 w-full relative z-10">
                                             <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
                                                 {previewUrls.map((url, index) => (
                                                     <div key={index} className="relative shrink-0 group/image">
                                                         <div className="h-8 w-12 rounded-lg bg-stone-100 dark:bg-black/50 overflow-hidden border-2 border-stone-200 dark:border-slate-700 group-hover/image:border-yellow-400 dark:group-hover/image:border-bronze-400 transition-colors shadow-sm">
                                                             <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                                         </div>
                                                         <button
                                                             type="button"
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 e.preventDefault();
                                                                 removeImage(index);
                                                             }}
                                                             className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md hover:scale-110 active:scale-95 z-20"
                                                             title="Remove image"
                                                         >
                                                             ×
                                                         </button>
                                                     </div>
                                                 ))}
                                             </div>
                                             {previewUrls.length < 3 && (
                                                 <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isDragging ? 'text-yellow-700 dark:text-bronze-300 bg-yellow-100 dark:bg-bronze-900/30' : 'text-stone-500 dark:text-bronze-500 bg-stone-100 dark:bg-slate-800'} whitespace-nowrap transition-colors`}>
                                                     {previewUrls.length}/3
                                                 </span>
                                             )}
                                             {previewUrls.length >= 3 && (
                                                 <span className={`text-[8px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded whitespace-nowrap`}>
                                                     MAX 3
                                                 </span>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ) : (
                         /* ADVANCED MODE - All fields */
                     <div className="px-5 pb-2 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                        
                        {/* Row 1: Date & Direction Mixed */}
                        <div className="grid grid-cols-12 gap-2.5 shrink-0">
                            <div className="col-span-7 relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 pointer-events-none">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                </div>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-9 pr-2 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                            <div className="col-span-5 flex bg-stone-100 dark:bg-white/5 p-1 rounded-xl">
                                <button 
                                    onClick={() => setDirection('Long')}
                                    className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${direction === 'Long' ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Long
                                </button>
                                <button 
                                    onClick={() => setDirection('Short')}
                                    className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${direction === 'Short' ? 'bg-rose-500 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    Short
                                </button>
                            </div>
                        </div>

                         {/* Row 2: Asset & PnL */}
                         <div className="grid grid-cols-2 gap-2.5 shrink-0">
                             <div>
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Asset</label>
                                 <input type="text" value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="BTCUSD" className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600" />
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">PnL</label>
                                 <div className="relative">
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 font-bold text-xs">$</span>
                                     <input type="number" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="0.00" className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600 ${Number(pnl) > 0 ? 'text-emerald-500' : Number(pnl) < 0 ? 'text-rose-500' : 'text-stone-900 dark:text-white'}`} />
                                 </div>
                             </div>
                         </div>

                         {/* Row 3: Strategy & Session */}
                         <div className="grid grid-cols-2 gap-2.5 shrink-0">
                             <div>
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Strategy</label>
                                     <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm ${strategy === STRATEGIES[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Session</label>
                                     <select value={session} onChange={(e) => setSession(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm ${session === SESSIONS[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                    {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                         </div>
                         
                         {/* Row 4: Emotion */}
                         <div className="shrink-0">
                             <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Emotion</label>
                                 <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-2 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none shadow-sm ${emotion === EMOTIONS[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                             </select>
                         </div>

                         {/* Row 5: Did I follow my plan? */}
                         <div className="shrink-0">
                             <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">
                                 Did I follow my plan?
                             </label>
                                 <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-6 overflow-hidden">
                                 <button 
                                     onClick={() => setFollowedPlan(true)}
                                         className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                         followedPlan === true 
                                                 ? 'bg-emerald-500 text-white' 
                                                 : 'text-slate-600 hover:text-slate-400'
                                     }`}
                                 >
                                     Yes
                                 </button>
                                 <button 
                                     onClick={() => setFollowedPlan(false)}
                                         className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                         followedPlan === false 
                                                 ? 'bg-rose-500 text-white' 
                                                 : 'text-slate-600 hover:text-slate-400'
                                     }`}
                                 >
                                     No
                                 </button>
                             </div>
                         </div>

                         {/* Row 6: Revenge Trade? (for testing Patience) */}
                         <div className="shrink-0">
                             <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">
                                 Revenge Trade? (Test Patience)
                             </label>
                                 <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-6 overflow-hidden">
                                 <button 
                                     onClick={() => setIsRevengeTrade(true)}
                                         className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                         isRevengeTrade === true 
                                                 ? 'bg-orange-500 text-white' 
                                                 : 'text-slate-600 hover:text-slate-400'
                                     }`}
                                 >
                                     Yes
                                 </button>
                                 <button 
                                     onClick={() => setIsRevengeTrade(false)}
                                         className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                         isRevengeTrade === false 
                                                 ? 'bg-stone-600 text-white' 
                                                 : 'text-slate-600 hover:text-slate-400'
                                     }`}
                                 >
                                     No
                                 </button>
                             </div>
                         </div>

                        {/* Row 7: Notes (Swapped) */}
                        <div className="flex-col flex-1 min-h-[60px] flex mb-1">
                           <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Notes</label>
                           <textarea 
                               value={notes} 
                               onChange={(e) => setNotes(e.target.value)} 
                               placeholder="Trade logic..." 
                               className="w-full flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none resize-none placeholder-stone-400 dark:placeholder-slate-600 leading-relaxed" 
                           />
                        </div>

                         {/* Row 8: Image (Enhanced Drag & Drop like Cursor) */}
                         <div className="shrink-0">
                            <div 
                                onClick={handleClick}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative w-full h-12 bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-yellow-500 dark:border-bronze-500 bg-yellow-50/50 dark:bg-bronze-950/30 border-dashed scale-[1.02] shadow-lg shadow-yellow-500/20 dark:shadow-bronze-500/20' : 'border-dashed border-stone-300 dark:border-slate-600 hover:border-yellow-400 dark:hover:border-bronze-400 hover:bg-stone-50 dark:hover:bg-slate-800/50'} rounded-xl flex items-center ${previewUrls.length > 0 ? 'justify-between px-4' : 'justify-center gap-3'} cursor-pointer transition-all duration-200 group overflow-hidden ${previewUrls.length > 0 ? 'border-solid border-yellow-500/50 dark:border-bronze-500/50 bg-yellow-50/30 dark:bg-bronze-950/10' : ''}`}
                            >
                                {/* Animated background gradient on drag */}
                                {isDragging && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-yellow-500/20 to-yellow-400/10 animate-pulse pointer-events-none" />
                                )}
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageChange} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple 
                                />
                                
                                {previewUrls.length === 0 ? (
                                    <>
                                        <UploadIcon 
                                            className={`relative z-10 w-5 h-5 ${isDragging ? 'text-yellow-600 dark:text-bronze-400 scale-110' : 'text-stone-400 dark:text-bronze-500'} transition-all duration-200 ${isDragging ? 'animate-pulse' : 'group-hover:scale-110'}`}
                                        />
                                        <span className={`relative z-10 text-[10px] font-bold ${isDragging ? 'text-yellow-700 dark:text-bronze-300' : 'text-stone-500 dark:text-bronze-500'} uppercase tracking-wide transition-colors`}>
                                            {isDragging ? '✨ Drop to upload (max 3)' : '📸 Drag & drop or click to upload (max 3)'}
                                        </span>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 w-full relative z-10">
                                        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
                                            {previewUrls.map((url, index) => (
                                                <div key={index} className="relative shrink-0 group/image">
                                                    <div className="h-8 w-12 rounded-lg bg-stone-100 dark:bg-black/50 overflow-hidden border-2 border-stone-200 dark:border-slate-700 group-hover/image:border-yellow-400 dark:group-hover/image:border-bronze-400 transition-colors shadow-sm">
                                                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            removeImage(index);
                                                        }}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md hover:scale-110 active:scale-95 z-20"
                                                        title="Remove image"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {previewUrls.length < 3 && (
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isDragging ? 'text-yellow-700 dark:text-bronze-300 bg-yellow-100 dark:bg-bronze-900/30' : 'text-stone-500 dark:text-bronze-500 bg-stone-100 dark:bg-slate-800'} whitespace-nowrap transition-colors`}>
                                                {previewUrls.length}/3
                                            </span>
                                        )}
                                        {previewUrls.length >= 3 && (
                                            <span className={`text-[8px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded whitespace-nowrap`}>
                                                MAX 3
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                         </div>

                     </div>
                     )}
                 </div>
             )}

            {/* --- HISTORY VIEW --- */}
            {logMode === 'HISTORY' && (
                <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 h-full overflow-hidden">
                    {/* Header with Trade Log title and count badge */}
                    <div className={`shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                        <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>TRADE LOG</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border ${isDarkMode ? 'bg-bronze-500/10 text-dirty-white border-bronze-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{sortedTrades.length}</span>
                    </div>
                    
                    {sortedTrades.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
                            <NotebookIcon className="w-12 h-12 mb-3" />
                            <h4 className="font-bold text-sm uppercase tracking-widest">No Trade Logs</h4>
                            <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">Start journaling your trades to see your history here.</p>
                        </div>
                    ) : (
                       <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-4 space-y-3" style={{ touchAction: 'pan-y' }}>
                             {sortedTrades.map(trade => (
                                 <div 
                                    key={trade.id}
                                    onClick={() => handleHistoryClick(trade.id)}
                                    className={`group relative bg-white dark:bg-slate-950 hover:bg-stone-50 dark:hover:bg-slate-900 rounded-xl p-4 transition-all border border-stone-200 dark:border-slate-800 hover:border-yellow-500/50 dark:hover:border-bronze-500/50 cursor-pointer shadow-sm dark:shadow-none overflow-hidden select-none ${editingId === trade.id ? 'ring-2 ring-yellow-500 dark:ring-bronze-500' : ''}`}
                                 >
                                    {/* Edit/Delete Overlay */}
                                    {activeHistoryId === trade.id && !deleteConfirmationId && (
                                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 animate-in fade-in duration-200">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditHistoryItem(trade); }}
                                                className="px-4 py-2 bg-yellow-500 dark:bg-bronze-500 text-black text-xs font-bold rounded-lg shadow-lg hover:bg-yellow-400 dark:hover:bg-bronze-400 transition-colors uppercase tracking-wider"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(trade.id); }}
                                                className="px-4 py-2 bg-white dark:bg-slate-800 text-rose-500 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors uppercase tracking-wider"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}

                                    {/* Delete Confirmation Overlay */}
                                    {deleteConfirmationId === trade.id && (
                                        <div className="absolute inset-0 z-20 bg-rose-50/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in zoom-in duration-200">
                                            <p className="text-stone-900 dark:text-white font-bold text-xs mb-3">Confirm Delete?</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); confirmDelete(trade.id); }}
                                                    className="px-3 py-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg uppercase"
                                                >
                                                    Yes
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(null); }}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-50 transition-colors uppercase"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-stone-900'}`}>{trade.asset}</span>
                                            <div className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>{formatDateForDisplay(trade.date)}</div>
                                        </div>
                                        <div className={`font-bold font-mono ${trade.pnl >= 0 ? (isDarkMode ? 'text-emerald-500' : 'text-emerald-600') : (isDarkMode ? 'text-rose-500' : 'text-rose-600')}`}>
                                            {(trade.pnl >= 0 ? '+' : '-') + '$' + Math.abs(trade.pnl).toFixed(2)}
                                        </div>
                                    </div>
                                    <p className={`text-xs line-clamp-2 mb-3 leading-relaxed opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>{trade.notes}</p>
                                    
                                    {trade.aiFeedback && (
                                        <div className="mt-3" onClick={(e) => { e.stopPropagation(); toggleInsight(trade.id); }}>
                                            <div className={`relative rounded-xl p-3 border shadow-inner group/insight overflow-hidden cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-stone-100 border-stone-200 hover:border-stone-300'}`}>
                                                <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent opacity-50 ${isDarkMode ? 'via-bronze-500/50' : 'via-yellow-500/50'}`}></div>
                                                
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-stone-200 border-stone-300'}`}>
                                                            <SparklesIcon className={`w-2.5 h-2.5 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
                                                 </div>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>AI Mentor Insight</span>
                                                    </div>
                                                    <div className={`text-[10px] font-mono opacity-0 group-hover/insight:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-600' : 'text-stone-400'}`}>
                                                        {expandedInsights.has(trade.id) ? 'COLLAPSE' : 'EXPAND'}
                                                    </div>
                                                </div>
                                                <p className={`text-[11px] leading-relaxed font-mono opacity-90 ${expandedInsights.has(trade.id) ? '' : 'line-clamp-2'} ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                                                    {trade.aiFeedback.replace(/[#*]/g, '')}
                                                 </p>
                                            </div>
                                        </div>
                                    )}
                                 </div>
                             ))}
                        </div>
                     )}
                 </div>
             )}

             {/* --- ANALYZING STATE --- */}
             {viewState === 'ANALYZING' && logMode === 'ENTRY' && (
                 <div className="h-full flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-300">
                     <div className="scale-125">
                        <PhaseLoader isReady={isAnalysisReady} onComplete={handleLoaderComplete} />
                     </div>
                 </div>
             )}

             {/* --- REVIEW STATE --- */}
             {viewState === 'REVIEW' && logMode === 'ENTRY' && (
                 <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-2 animate-in slide-in-from-bottom-8 duration-500">
                     <div className="shrink-0 flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-yellow-500/10 dark:bg-bronze-500/10 border border-yellow-500/20 dark:border-bronze-500/20">
                            <SparklesIcon className="w-5 h-5 text-yellow-600 dark:text-bronze-500" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300">Analysis Complete</h3>
                     </div>
                     <div className="flex-1 min-h-0 relative group rounded-3xl p-[2px] bg-gradient-to-r from-yellow-400 via-emerald-500 to-yellow-400 dark:from-bronze-500 dark:via-emerald-500 dark:to-bronze-500">
                        <div className="relative bg-slate-900 rounded-[22px] p-6 shadow-2xl overflow-hidden flex flex-col h-full border border-slate-800/50">
                            <div className="flex-1 overflow-y-auto custom-scrollbar text-slate-300 font-mono text-sm leading-relaxed pr-2 whitespace-pre-wrap" style={{ touchAction: 'pan-y' }}>
                                <Typewriter text={aiFeedback.replace(/(\d+\.)/g, '$1 ')} speed={10} />
                            </div>
                        </div>
                     </div>
                 </div>
             )}

             {/* Footer Actions */}
             {logMode === 'ENTRY' && (
                <div className="mt-auto shrink-0 px-5 pb-5 pt-2 border-t border-transparent">
                    {viewState === 'FORM' && (
                        <button
                            onClick={handleAnalyze}
                            disabled={!pnl || !asset || tiltMode}
                            className="w-full py-3.5 rounded-xl font-black text-sm shadow-lg hover:shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-emerald-400 hover:from-yellow-300 hover:to-emerald-300 border border-emerald-500/50 text-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <SparklesIcon className="w-4 h-4 text-black" />
                            <span>{editingId ? 'UPDATE' : 'ANALYZE'}</span>
                        </button>
                    )}
                    {viewState === 'ANALYZING' && (
                        <div className="w-full py-4 rounded-xl opacity-0 cursor-default">
                            Placeholder
                        </div>
                    )}
                    {viewState === 'REVIEW' && (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setViewState('FORM')}
                                className="flex-1 py-2 rounded-xl font-bold text-sm tracking-wide uppercase border border-stone-300 dark:border-slate-700 text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                EDIT
                            </button>
                            <button 
                                onClick={handleConfirmLog}
                                className="flex-[2] py-2 rounded-xl font-bold text-sm tracking-wide uppercase bg-bronze-500 text-black shadow-lg hover:bg-bronze-400 transition-colors"
                            >
                                DONE
                            </button>
                        </div>
                    )}
                </div>
             )}
        </div>
  );

  // Main component return
  return (
    <div 
      className={`w-full ${isDarkMode ? 'bg-[#050505]' : 'bg-[#F0F0F0]'}`}
      style={{
        // Full screen including safe areas - background covers everything
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div 
        className={`w-full h-full ${isDarkMode ? 'text-slate-200' : 'text-stone-800'} font-sans flex flex-col relative overflow-hidden`}
        style={{
          // Content area respects safe areas
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Header - MeccaHeader when MECCA tab; otherwise Journal/Calcu/Games header */}
        {activeTab === 'MECCA' ? (
          <div className="shrink-0 z-50 w-full">
            <MeccaHeader isConnected={meccaConnected} />
          </div>
        ) : (
          <header 
            className={`shrink-0 flex justify-between items-center z-50 py-4 px-6 border-b transition-all duration-300 ${isDarkMode ? 'bg-[#050505] border-white/5' : 'bg-white border-black/5'}`}
          >
            <div className="flex items-center gap-3">
              {/* Animated Logo - Click to toggle between Manual and Auto (only on JOURNAL tab) */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTab === 'JOURNAL') {
                    const newMode = journalMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
                    setJournalMode(newMode);
                  }
                }}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  activeTab === 'JOURNAL' 
                    ? `hover:scale-110 hover:rotate-3 cursor-pointer ${
                        journalMode === 'AUTO' 
                          ? 'bg-gradient-to-br from-emerald-500/20 to-yellow-500/20 border-emerald-500/30 ring-2 ring-emerald-500/30' 
                          : isDarkMode ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-black/10 shadow-sm hover:shadow-md'
                      }`
                    : isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-black/10 shadow-sm'
                }`}
                title={activeTab === 'JOURNAL' ? (journalMode === 'MANUAL' ? 'Switch to Auto Journaling (Pro)' : 'Switch to Manual Journaling') : ''}
              >
                {activeTab === 'JOURNAL' && <TreeIcon className="w-6 h-6 md:w-8 md:h-8" />}
                {activeTab === 'CALCU' && <CalculatorIcon className="w-6 h-6 md:w-8 md:h-8" />}
                {activeTab === 'GAMES' && <GamepadIcon className="w-6 h-6 md:w-8 md:h-8" />}
              </div>
              <div className="flex flex-col">
                <h1 className="font-light text-xl md:text-2xl tracking-[0.2em] uppercase flex items-center leading-none">
                  <span className={isDarkMode ? 'text-white' : 'text-stone-900'}>
                    {activeTab === 'JOURNAL' ? 'JOURNAL' : activeTab === 'CALCU' ? 'CALCU' : 'GAMES'}
                  </span>
                  <span className="ml-2 font-bold bg-gradient-to-br from-emerald-400 via-yellow-400 to-emerald-500 bg-clip-text text-transparent">XX</span>
                  {activeTab === 'JOURNAL' && journalMode === 'AUTO' && (
                    <span className="ml-1 font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">PRO</span>
                  )}
                </h1>
                {activeTab === 'JOURNAL' && (
                  <span className={`text-[8px] md:text-[9px] font-medium tracking-wider mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                    {journalMode === 'AUTO' ? 'AUTO SYNC' : 'MANUAL'}
                  </span>
                )}
                {activeTab === 'CALCU' && (
                  <span className={`text-[8px] md:text-[9px] font-medium tracking-wider mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                    RISK CALCULATOR
                  </span>
                )}
                {activeTab === 'GAMES' && (
                  <span className={`text-[8px] md:text-[9px] font-medium tracking-wider mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                    TRAINING
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'JOURNAL' && (() => {
                const totalPnL = filteredTrades.reduce((acc, curr) => acc + curr.pnl, 0);
                const formattedPnL = (totalPnL >= 0 ? '+' : '-') + '$' + Math.abs(totalPnL).toFixed(2);
                const pnlLength = formattedPnL.length;
                const pnlSizeClass = pnlLength > 12 ? 'text-xs md:text-sm' : 'text-sm md:text-base';
                return (
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${isDarkMode ? 'bg-slate-900/50 border-white/5 shadow-black/20' : 'bg-[#F5F5F0]/80 border-stone-200 shadow-stone-200/50'}`}>
                    <div className={`h-6 w-1 rounded-full ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
                    <div className="flex flex-col justify-center">
                      <span className={`text-[8px] font-bold uppercase tracking-widest leading-tight ${isDarkMode ? 'text-dirty-white/60' : 'text-stone-500'}`}>Net PnL</span>
                      <div className={`${pnlSizeClass} font-bold font-sans tracking-wide leading-none mt-0.5 ${
                        totalPnL >= 0 ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-500') : (isDarkMode ? 'text-rose-400' : 'text-rose-500')
                      }`}>
                        {formattedPnL}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </header>
        )}

             {/* === MOBILE SWIPEABLE VIEW (Visible on Mobile) === */}
             <div className="lg:hidden flex-1 relative overflow-hidden" 
                  onTouchStart={onTouchStart} 
                  onTouchMove={onTouchMove} 
                  onTouchEnd={onTouchEnd} 
                  onMouseDown={onMouseDown}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onWheel={onWheel}
                  style={{ touchAction: 'none' }}
             >
                {/* The vertical slider track for JOURNAL tab content */}
                {activeTab === 'JOURNAL' && journalMode === 'MANUAL' && (
                    <>
                        <div 
                           className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                           style={{ transform: `translateY(-${activeMobileSlide * 100}%)` }}
                        >
                            {/* Slide 0: Calendar */}
                             <div className="w-full h-full p-4 pb-24 flex flex-col">
                                {/* Price Ticker above Calendar */}
                                <div className="shrink-0 mb-2">
                                    <NewsTicker />
                                </div>
                                <SpotlightCard className="flex-1 w-full" isDarkMode={isDarkMode} tilt={false}>
                                    <MacroCalendar 
                                        isDarkMode={isDarkMode} 
                                        trades={filteredTrades}
                                        timeFilter={calendarTimeFilter}
                                        setTimeFilter={setCalendarTimeFilter}
                                        viewDate={calendarViewDate}
                                        setViewDate={setCalendarViewDate}
                                    />
                                </SpotlightCard>
                             </div>

                             {/* Slide 1: Performance Curve */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto">
                                        {/* Header - Same as Calendar */}
                                        <div className="flex justify-between items-center pt-5 pb-4 px-1 shrink-0">
                                            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">
                                                {(() => {
                                                    if (perfCurveTimeFilter === 'Y') return perfCurveViewDate.getFullYear().toString();
                                                    if (perfCurveTimeFilter === 'W') {
                                                        const startOfWeek = new Date(perfCurveViewDate);
                                                        startOfWeek.setDate(perfCurveViewDate.getDate() - perfCurveViewDate.getDay());
                                                        const endOfWeek = new Date(startOfWeek);
                                                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                                                        return `${startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${endOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} ${endOfWeek.getFullYear()}`;
                                                    }
                                                    if (perfCurveTimeFilter === 'D') return perfCurveViewDate.toLocaleDateString(undefined, { weekday:'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                                                    return perfCurveViewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
                                                })()}
                                            </h3>
                                            <div className="flex gap-1">
                                                <div className="flex gap-1">
                                                    <button onClick={() => {
                                                        const newDate = new Date(perfCurveViewDate);
                                                        if (perfCurveTimeFilter === 'Y') newDate.setFullYear(newDate.getFullYear() - 1);
                                                        else if (perfCurveTimeFilter === 'M') newDate.setMonth(newDate.getMonth() - 1);
                                                        else if (perfCurveTimeFilter === 'W') newDate.setDate(newDate.getDate() - 7);
                                                        else newDate.setDate(newDate.getDate() - 1);
                                                        setPerfCurveViewDate(newDate);
                                                    }} className="p-1 hover:bg-white/10 rounded"><ArrowRightIcon className="w-3 h-3 rotate-180" /></button>
                                                    <button onClick={() => {
                                                        const newDate = new Date(perfCurveViewDate);
                                                        if (perfCurveTimeFilter === 'Y') newDate.setFullYear(newDate.getFullYear() + 1);
                                                        else if (perfCurveTimeFilter === 'M') newDate.setMonth(newDate.getMonth() + 1);
                                                        else if (perfCurveTimeFilter === 'W') newDate.setDate(newDate.getDate() + 7);
                                                        else newDate.setDate(newDate.getDate() + 1);
                                                        setPerfCurveViewDate(newDate);
                                                    }} className="p-1 hover:bg-white/10 rounded"><ArrowRightIcon className="w-3 h-3" /></button>
                                                </div>
                                                <div className="w-[1px] bg-white/10 mx-1"></div>
                                                <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                                                    {['D','W','M','Y'].map(t => (
                                                        <button key={t} onClick={() => setPerfCurveTimeFilter(t as any)} className={`px-2 py-0.5 text-[8px] font-bold rounded ${perfCurveTimeFilter === t ? 'bg-white dark:bg-stone-700 shadow-sm' : 'opacity-50'}`}>{t}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Performance Chart */}
                                        {(() => {
                                            // Filter trades based on perfCurveTimeFilter and perfCurveViewDate
                                            const perfFilteredTrades = filteredTrades.filter(trade => {
                                                const tradeDate = new Date(trade.date);
                                                const viewYear = perfCurveViewDate.getFullYear();
                                                const viewMonth = perfCurveViewDate.getMonth();
                                                const viewDay = perfCurveViewDate.getDate();
                                                
                                                if (perfCurveTimeFilter === 'Y') {
                                                    return tradeDate.getFullYear() === viewYear;
                                                } else if (perfCurveTimeFilter === 'M') {
                                                    return tradeDate.getFullYear() === viewYear && tradeDate.getMonth() === viewMonth;
                                                } else if (perfCurveTimeFilter === 'W') {
                                                    const startOfWeek = new Date(perfCurveViewDate);
                                                    startOfWeek.setDate(perfCurveViewDate.getDate() - perfCurveViewDate.getDay());
                                                    startOfWeek.setHours(0, 0, 0, 0);
                                                    const endOfWeek = new Date(startOfWeek);
                                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                                    endOfWeek.setHours(23, 59, 59, 999);
                                                    return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
                                                } else { // 'D'
                                                    return tradeDate.getFullYear() === viewYear && 
                                                           tradeDate.getMonth() === viewMonth && 
                                                           tradeDate.getDate() === viewDay;
                                                }
                                            });
                                            
                                            const totalPnL = perfFilteredTrades.reduce((sum, t) => sum + t.pnl, 0);
                                            
                                            return (
                                                <div className="flex-1 min-h-0">
                                                    {perfFilteredTrades.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                                            <TrendingUpIcon className="w-12 h-12 mb-3" />
                                                            <h4 className="font-bold text-sm uppercase tracking-widest">No Performance Data</h4>
                                                            <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">No trades for this period.</p>
                                                        </div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart
                                                                data={(() => {
                                                                    const sortedTrades = [...perfFilteredTrades].sort((a, b) => 
                                                                        new Date(a.date).getTime() - new Date(b.date).getTime()
                                                                    );
                                                                    let cumulative = 0;
                                                                    const tradeData = sortedTrades.map((trade, index) => {
                                                                        cumulative += trade.pnl;
                                                                        return {
                                                                            index: index + 1,
                                                                            pnl: cumulative,
                                                                            tradePnl: trade.pnl,
                                                                            asset: trade.asset,
                                                                            date: trade.date
                                                                        };
                                                                    });
                                                                    // Start from zero
                                                                    return [{ index: 0, pnl: 0, tradePnl: 0, asset: 'Start', date: '' }, ...tradeData];
                                                                })()}
                                                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                                            >
                                                                <defs>
                                                                    <linearGradient id="performanceGradientMobile" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                                                                        <stop offset="95%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                                                                <XAxis 
                                                                    dataKey="index" 
                                                                    tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                                                                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                                                    tickLine={false}
                                                                />
                                                                <YAxis 
                                                                    tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                                                                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                                                    tickLine={false}
                                                                    tickFormatter={(value) => `$${value}`}
                                                                />
                                                                <ReferenceLine y={0} stroke={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} strokeDasharray="3 3" />
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                                                                        borderRadius: '12px',
                                                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                                        padding: '8px 12px'
                                                                    }}
                                                                    labelStyle={{ color: isDarkMode ? '#e4e4e7' : '#18181b', fontSize: '11px', fontWeight: 'bold' }}
                                                                    formatter={(value: number, name: string, props: any) => {
                                                                        if (name === 'pnl') {
                                                                            return [`$${value.toFixed(2)}`, 'Cumulative P&L'];
                                                                        }
                                                                        return [value, name];
                                                                    }}
                                                                    labelFormatter={(label, payload) => {
                                                                        if (payload && payload[0]) {
                                                                            const data = payload[0].payload;
                                                                            return `Trade #${label} • ${data.asset}`;
                                                                        }
                                                                        return `Trade #${label}`;
                                                                    }}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="pnl"
                                                                    stroke={totalPnL >= 0 ? "#10b981" : "#ef4444"}
                                                                    strokeWidth={2}
                                                                    fill="url(#performanceGradientMobile)"
                                                                    dot={{ r: 3, fill: isDarkMode ? '#18181b' : '#ffffff', strokeWidth: 2 }}
                                                                    activeDot={{ r: 5, strokeWidth: 2 }}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* Stats Row */}
                                        {(() => {
                                            // Filter trades based on perfCurveTimeFilter and perfCurveViewDate for stats
                                            const perfFilteredTrades = filteredTrades.filter(trade => {
                                                const tradeDate = new Date(trade.date);
                                                const viewYear = perfCurveViewDate.getFullYear();
                                                const viewMonth = perfCurveViewDate.getMonth();
                                                const viewDay = perfCurveViewDate.getDate();
                                                
                                                if (perfCurveTimeFilter === 'Y') {
                                                    return tradeDate.getFullYear() === viewYear;
                                                } else if (perfCurveTimeFilter === 'M') {
                                                    return tradeDate.getFullYear() === viewYear && tradeDate.getMonth() === viewMonth;
                                                } else if (perfCurveTimeFilter === 'W') {
                                                    const startOfWeek = new Date(perfCurveViewDate);
                                                    startOfWeek.setDate(perfCurveViewDate.getDate() - perfCurveViewDate.getDay());
                                                    startOfWeek.setHours(0, 0, 0, 0);
                                                    const endOfWeek = new Date(startOfWeek);
                                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                                    endOfWeek.setHours(23, 59, 59, 999);
                                                    return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
                                                } else { // 'D'
                                                    return tradeDate.getFullYear() === viewYear && 
                                                           tradeDate.getMonth() === viewMonth && 
                                                           tradeDate.getDate() === viewDay;
                                                }
                                            });
                                            
                                            if (perfFilteredTrades.length === 0) return null;
                                            
                                            return (
                                                <div className={`grid grid-cols-4 gap-2 pt-4 mt-auto shrink-0 border-t ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                                    <div className="text-center">
                                                        <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Trades</p>
                                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{perfFilteredTrades.length}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Win Rate</p>
                                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                            {((perfFilteredTrades.filter(t => t.pnl > 0).length / perfFilteredTrades.length) * 100).toFixed(0)}%
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Best</p>
                                                        <p className="text-sm font-bold text-emerald-500">
                                                            +${Math.max(...perfFilteredTrades.map(t => t.pnl), 0).toFixed(0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Worst</p>
                                                        <p className="text-sm font-bold text-rose-500">
                                                            ${Math.min(...perfFilteredTrades.map(t => t.pnl), 0).toFixed(0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </SpotlightCard>
                             </div>

                             {/* Slide 2: Log Entry - Only show in MANUAL mode */}
                             {journalMode === 'MANUAL' ? (
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    {LogEntryContent}
                                </SpotlightCard>
                             </div>
                             ) : (
                                 <div className="w-full h-full p-4 pb-24">
                                    <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                            <p className="text-lg font-semibold mb-2 text-foreground">Auto Journaling Active</p>
                                            <p className="text-sm text-foreground/70">Trades are synced automatically from your broker</p>
                                        </div>
                                    </SpotlightCard>
                                 </div>
                             )}

                             {/* Slide 3: Trade Log - Only show in MANUAL mode */}
                             {journalMode === 'MANUAL' ? (
                                 <div className="w-full h-full p-4 pb-24">
                                    <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                        <div className="flex flex-col h-full overflow-hidden">
                                            {/* Header with Trade Log title and count badge */}
                                            <div className={`shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>TRADE LOG</h3>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border ${isDarkMode ? 'bg-bronze-500/10 text-dirty-white border-bronze-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{sortedTrades.length}</span>
                                            </div>
                                            
                                            {sortedTrades.length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
                                                    <NotebookIcon className="w-12 h-12 mb-3" />
                                                    <h4 className="font-bold text-sm uppercase tracking-widest">No Trade Logs</h4>
                                                    <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">Start journaling your trades to see your history here.</p>
                                                </div>
                                            ) : (
                                               <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-4 space-y-3" style={{ touchAction: 'pan-y' }}>
                                                    {sortedTrades.map(trade => (
                                                        <div 
                                                           key={trade.id}
                                                           onClick={() => handleHistoryClick(trade.id)}
                                                           className={`group relative bg-white dark:bg-slate-950 hover:bg-stone-50 dark:hover:bg-slate-900 rounded-xl p-4 transition-all border border-stone-200 dark:border-slate-800 hover:border-yellow-500/50 dark:hover:border-bronze-500/50 cursor-pointer shadow-sm dark:shadow-none overflow-hidden select-none ${editingId === trade.id ? 'ring-2 ring-yellow-500 dark:ring-bronze-500' : ''}`}
                                                        >
                                                            {/* Edit/Delete Overlay */}
                                                            {activeHistoryId === trade.id && !deleteConfirmationId && (
                                                                <div className="absolute inset-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 animate-in fade-in duration-200">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleEditHistoryItem(trade); }}
                                                                        className="px-4 py-2 bg-yellow-500 dark:bg-bronze-500 text-black text-xs font-bold rounded-lg shadow-lg hover:bg-yellow-400 dark:hover:bg-bronze-400 transition-colors uppercase tracking-wider"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(trade.id); }}
                                                                        className="px-4 py-2 bg-white dark:bg-slate-800 text-rose-500 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors uppercase tracking-wider"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {/* Trade Card Content */}
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-stone-600'}`}>{trade.asset}</span>
                                                                            <span className={`text-sm font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] text-stone-400 dark:text-slate-600">
                                                                            {new Date(trade.date).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {trade.notes && (
                                                                    <p className="text-[11px] text-stone-500 dark:text-slate-500 line-clamp-2 leading-relaxed">{trade.notes}</p>
                                                                )}
                                                                
                                                                {/* AI Mentor Insight - Mobile Trade Log */}
                                                                {trade.aiFeedback && (
                                                                    <div className="mt-2" onClick={(e) => { e.stopPropagation(); toggleInsight(trade.id); }}>
                                                                        <div className={`relative rounded-xl p-3 border shadow-inner group/insight overflow-hidden cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-stone-100 border-stone-200 hover:border-stone-300'}`}>
                                                                            <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent opacity-50 ${isDarkMode ? 'via-bronze-500/50' : 'via-yellow-500/50'}`}></div>
                                                                            
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <div className={`p-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-stone-200 border-stone-300'}`}>
                                                                                    <SparklesIcon className={`w-2.5 h-2.5 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>AI Mentor Insight</span>
                                                                            </div>
                                                                            <p className={`text-[11px] leading-relaxed font-mono opacity-90 ${expandedInsights.has(trade.id) ? '' : 'line-clamp-2'} ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                                                                                {trade.aiFeedback.replace(/[#*]/g, '')}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Delete Confirmation */}
                                                            {deleteConfirmationId === trade.id && (
                                                                <div className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center gap-3 rounded-xl">
                                                                    <p className="text-xs font-bold text-white mb-2 absolute top-4">Delete this trade?</p>
                                                                    <div className="flex gap-3">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); confirmDelete(trade.id); }}
                                                                            className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-rose-600 transition-colors"
                                                                        >
                                                                            Yes
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(null); }}
                                                                            className="px-4 py-2 bg-stone-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-stone-600 transition-colors"
                                                                        >
                                                                            No
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </SpotlightCard>
                                 </div>
                             ) : (
                                 <div className="w-full h-full p-4 pb-24">
                                    <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                            <p className="text-lg font-semibold mb-2 text-foreground">Auto Journaling Active</p>
                                            <p className="text-sm text-foreground/70">Trades are synced automatically from your broker</p>
                                        </div>
                                    </SpotlightCard>
                                 </div>
                             )}

                             {/* Slide 4: Trader DNA with Imperial Score */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto overflow-x-hidden">
                                        {/* Processing Indicator - Mobile */}
                                        {hasProcessingTrades && (
                                            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 animate-pulse shrink-0">
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                <span className="text-xs font-medium">New trade is processing...</span>
                                            </div>
                                        )}
                                        {/* Imperial Score Display - NO CARD, just content */}
                                        <div className="mb-6 shrink-0 w-full">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">
                                                    IMPERIAL SCORE
                                                </h3>
                                                {traderDNA.imperialScore > 80 && (
                                                    <span className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">
                                                        PRO
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Horizontal Progress Bar with Gradient - Thicker by 1/2 */}
                                            <div className="relative w-full h-4 rounded-full mb-3 overflow-visible px-[30px]"
                                                style={{
                                                    background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)'
                                                }}
                                            >
                                                {/* Gradient line - adjusted to account for oval width */}
                                                <div 
                                                    className="absolute inset-y-0 left-[30px] right-[30px] rounded-full"
                                                    style={{
                                                        background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)'
                                                    }}
                                                />
                                                
                                                {/* Oval Slider Indicator - Larger */}
                                                {(() => {
                                                    // Use animated score for color so it changes during animation
                                                    const scoreForColor = Math.max(0, Math.min(100, animatedImperialScore));
                                                    
                                                    // Calculate position accounting for padding (30px on each side)
                                                    // Position: 0% = 30px (left padding), 100% = calc(100% - 30px) (right padding)
                                                    let constrainedPosition: number;
                                                    if (animatedImperialScore <= 0) {
                                                        constrainedPosition = 0;
                                                    } else if (animatedImperialScore >= 100) {
                                                        constrainedPosition = 100;
                                                    } else {
                                                        constrainedPosition = animatedImperialScore;
                                                    }
                                                    
                                                    // Position calculation: padding (30px) + percentage of gradient width
                                                    // Gradient width = 100% - 60px (30px padding on each side)
                                                    const padding = 30;
                                                    // Convert percentage to decimal for calc()
                                                    const positionDecimal = constrainedPosition / 100;
                                                    // Corrected calculation: position within the gradient area (0% to 100%)
                                                    // Formula: padding + (percentage * available width)
                                                    const actualLeft = `calc(${padding}px + (100% - ${padding * 2}px) * ${positionDecimal})`;
                                                    
                                                    // Calculate the color from the gradient based on animated score position
                                                    // Match the exact gradient: rgb(239, 68, 68) 0% -> rgb(251, 191, 36) 50% -> rgb(16, 185, 129) 100%
                                                    let borderGradientColor: string;
                                                    if (scoreForColor <= 50) {
                                                        // Interpolate between red (0%) and yellow (50%)
                                                        const ratio = scoreForColor / 50;
                                                        const r = Math.round(239 + (251 - 239) * ratio);
                                                        const g = Math.round(68 + (191 - 68) * ratio);
                                                        const b = Math.round(68 + (36 - 68) * ratio);
                                                        borderGradientColor = `rgb(${r}, ${g}, ${b})`;
                                                    } else {
                                                        // Interpolate between yellow (50%) and green (100%)
                                                        const ratio = (scoreForColor - 50) / 50;
                                                        const r = Math.round(251 + (16 - 251) * ratio);
                                                        const g = Math.round(191 + (185 - 191) * ratio);
                                                        const b = Math.round(36 + (129 - 36) * ratio);
                                                        borderGradientColor = `rgb(${r}, ${g}, ${b})`;
                                                    }
                                                    
                                                    // Text color matches border (changes during animation)
                                                    const textColor = borderGradientColor;
                                                    
                                                    return (
                                                        <div 
                                                            className="absolute top-1/2 -translate-y-1/2 z-20"
                                                            style={{ 
                                                                left: actualLeft,
                                                                transform: 'translateX(-50%) translateY(-50%)',
                                                            }}
                                                        >
                                                            {/* Border wrapper with solid color matching score position - Thicker glow */}
                                                            <div
                                                                className="rounded-full p-[5px]"
                                                                style={{
                                                                    background: borderGradientColor,
                                                                    boxShadow: `0 0 25px ${borderGradientColor}90, 0 0 15px ${borderGradientColor}70, 0 0 8px ${borderGradientColor}50`,
                                                                    transition: 'background 0ms linear, box-shadow 0ms linear'
                                                                }}
                                                            >
                                                                {/* Black inner card - Smaller */}
                                                                <div 
                                                                    className="h-5 rounded-full bg-black dark:bg-black flex items-center justify-center px-2 min-w-[50px]"
                                                                    style={{ 
                                                                        transition: 'all 75ms ease-out',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    {/* Score Number Inside Indicator - Centered */}
                                                                    <span 
                                                                        className="text-[10px] font-black whitespace-nowrap"
                                                                        style={{ 
                                                                            color: textColor,
                                                                            transition: 'color 0ms linear',
                                                                            textAlign: 'center',
                                                                            lineHeight: '1'
                                                                        }}
                                                                    >
                                                                        {animatedImperialScore.toFixed(1)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            
                                            {/* Labels */}
                                            <div className="flex justify-between text-[8px] opacity-60">
                                                <span>Low</span>
                                                <span>High</span>
                                            </div>
                                        </div>

                                        {/* Trader DNA Hexagram - WITH SEPARATE COMPONENT CARD */}
                                        <div className="flex-1 min-h-0 rounded-xl bg-slate-800/30 border border-slate-700/30 p-4 flex flex-col">
                                            <div className="flex justify-between items-center mb-4 shrink-0">
                                                <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                                                <ActivityIcon className="w-4 h-4 opacity-50" />
                                            </div>
                                            <div className="flex-1 min-h-0 -ml-4 flex items-center justify-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                   <RadarChart 
                                                     key={`radar-mobile-${activeMobileSlide}`}
                                                     cx="50%" 
                                                     cy="50%" 
                                                     outerRadius="75%" 
                                                     data={radarData}
                                                   >
                                                       <PolarGrid 
                                                           stroke="rgba(96, 165, 250, 0.2)" 
                                                           strokeWidth={1}
                                                       />
                                                       <PolarAngleAxis 
                                                           dataKey="subject" 
                                                           tick={{ 
                                                               fill: '#a1a1aa', 
                                                               fontSize: 9, 
                                                               fontWeight: 'bold' 
                                                           }} 
                                                       />
                                                       <PolarRadiusAxis 
                                                           angle={30} 
                                                           domain={[0, 100]} 
                                                           tick={false} 
                                                           axisLine={false} 
                                                       />
                                                       
                                                       {/* Outer Hexagon - Light Blue Glow (Max Possible) */}
                                                       <Radar 
                                                           name="Max" 
                                                           dataKey="max" 
                                                           stroke="#60a5fa" 
                                                           strokeWidth={2}
                                                           fill="none"
                                                           fillOpacity={0}
                                                           dot={false}
                                                           style={{
                                                               filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))'
                                                           }}
                                                       />
                                                       
                                                       {/* Inner Hexagon - Orange-to-Red Gradient (Actual Scores) */}
                                                       <Radar 
                                                           name="Performance" 
                                                           dataKey="A" 
                                                           stroke="url(#dnaGradientMobile)" 
                                                           strokeWidth={2.5}
                                                           fill="url(#dnaGradientMobile)" 
                                                           fillOpacity={0.6}
                                                           isAnimationActive={true}
                                                           animationDuration={1500}
                                                           animationEasing="ease-out"
                                                       />
                                                       
                                                       <defs>
                                                           <linearGradient id="dnaGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                                                               <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                                                               <stop offset="50%" stopColor="#ea580c" stopOpacity={0.7} />
                                                               <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                                                           </linearGradient>
                                                       </defs>
                                                       
                                                       <Tooltip 
                                                           contentStyle={{ 
                                                               backgroundColor: '#18181b', 
                                                               borderRadius: '8px', 
                                                               border: '1px solid rgba(96, 165, 250, 0.3)', 
                                                               boxShadow: '0 4px 12px rgba(96, 165, 250, 0.2)' 
                                                           }} 
                                                           itemStyle={{ 
                                                               color: '#e4e4e7', 
                                                               fontSize: '11px', 
                                                               fontWeight: 'bold' 
                                                           }} 
                                                           formatter={(value: number) => [`${value}%`, 'Score']} 
                                                       />
                                                   </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </SpotlightCard>
                             </div>

                             {/* Slide 5: Trader Insights */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    <TraderInsights 
                                      key={`trader-insights-mobile-${activeMobileSlide}`}
                                                             trades={filteredTrades}
                                      traderDNA={traderDNA} 
                                      isDarkMode={isDarkMode}
                                      hasProcessingTrades={hasProcessingTrades}
                                    />
                                </SpotlightCard>
                             </div>
                         </div>

                        {/* Vertical Indicators - Right side (MANUAL mode: 6 slides) */}
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 pointer-events-none">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
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
                    </>
                )}

                {/* AUTO MODE: Mobile slides for broker sync */}
                {activeTab === 'JOURNAL' && journalMode === 'AUTO' && (
                    <>
                        {/* If NOT connected: Full screen broker connection UI (no swiping) */}
                        {!brokerConnected && (
                            <div className="w-full h-full p-4 pb-24 overflow-y-auto">
                                <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    <div className="flex flex-col h-full p-6">
                                        {/* Header */}
                                        <div className="text-center mb-8">
                                            <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                Connect Your Broker
                                            </h2>
                                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                Sync your trades automatically from your MT5 broker account
                                            </p>
                                        </div>

                                        {/* Broker Selection Step */}
                                        {brokerConnectionStep === 'SELECT' && (
                                            <div className="flex-1 flex flex-col">
                                                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                    Select Your Broker
                                                </h3>
                                                <div className="space-y-3 flex-1">
                                                    {BROKERS.map((broker) => (
                                                        <button
                                                            key={broker.id}
                                                            onClick={() => {
                                                                setSelectedBroker(broker.id);
                                                                setBrokerServer(broker.defaultServer);
                                                                setBrokerConnectionStep('LOGIN');
                                                            }}
                                                            className={`w-full p-4 rounded-xl border text-left transition-all ${
                                                                isDarkMode 
                                                                    ? 'bg-slate-900/50 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50' 
                                                                    : 'bg-white border-stone-200 hover:border-emerald-500/50 hover:bg-stone-50'
                                                            }`}
                                                        >
                                                            <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                                {broker.name}
                                                            </div>
                                                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                                                                {broker.description}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Login Form Step */}
                                        {brokerConnectionStep === 'LOGIN' && selectedBroker && (
                                            <div className="flex-1 flex flex-col">
                                                <button
                                                    onClick={() => {
                                                        setBrokerConnectionStep('SELECT');
                                                        setSelectedBroker(null);
                                                        setBrokerLoginId('');
                                                        setBrokerPassword('');
                                                        setBrokerConnectError(null);
                                                    }}
                                                    className={`text-xs mb-4 flex items-center gap-1 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'}`}
                                                >
                                                    <ChevronLeftIcon className="w-4 h-4" />
                                                    Back to broker selection
                                                </button>

                                                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                    {BROKERS.find(b => b.id === selectedBroker)?.name} Login
                                                </h3>

                                                {brokerConnectError && (
                                                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                                                        {brokerConnectError}
                                                    </div>
                                                )}

                                                <div className="space-y-4 flex-1">
                                                    <div>
                                                        <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                            Login ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={brokerLoginId}
                                                            onChange={(e) => setBrokerLoginId(e.target.value)}
                                                            placeholder="Enter your MT5 login ID"
                                                            className={`w-full px-4 py-3 rounded-xl border ${
                                                                isDarkMode 
                                                                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                                                                    : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                            Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={brokerPassword}
                                                            onChange={(e) => setBrokerPassword(e.target.value)}
                                                            placeholder="Enter your MT5 password"
                                                            className={`w-full px-4 py-3 rounded-xl border ${
                                                                isDarkMode 
                                                                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                                                                    : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                                                            Server
                                                        </label>
                                                        <select
                                                            value={brokerServer}
                                                            onChange={(e) => setBrokerServer(e.target.value)}
                                                            className={`w-full px-4 py-3 rounded-xl border ${
                                                                isDarkMode 
                                                                    ? 'bg-slate-900 border-slate-700 text-white' 
                                                                    : 'bg-white border-stone-200 text-stone-900'
                                                            }`}
                                                        >
                                                            {BROKERS.find(b => b.id === selectedBroker)?.servers.map((s) => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        if (!user || !selectedBroker || !brokerLoginId || !brokerPassword || !brokerServer) return;
                                                        
                                                        setIsConnectingBroker(true);
                                                        setBrokerConnectError(null);
                                                        
                                                        try {
                                                            // Call the connect-broker edge function
                                                            const { data: { session } } = await supabase.auth.getSession();
                                                            if (!session) throw new Error('Session expired');
                                                            
                                                            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-broker`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${session.access_token}`,
                                                                },
                                                                body: JSON.stringify({
                                                                    broker_type: selectedBroker,
                                                                    login_id: brokerLoginId,
                                                                    password: brokerPassword,
                                                                    server: brokerServer,
                                                                }),
                                                            });
                                                            
                                                            const result = await response.json();
                                                            
                                                            if (!response.ok) {
                                                                throw new Error(result.error || 'Failed to connect broker');
                                                            }
                                                            
                                                            // Success - update state
                                                            setBrokerConnected(true);
                                                            setBrokerConnectionStep('CONNECTED');
                                                            setActiveMobileSlide(0);
                                                        } catch (err: any) {
                                                            setBrokerConnectError(err.message || 'Failed to connect broker');
                                                        } finally {
                                                            setIsConnectingBroker(false);
                                                        }
                                                    }}
                                                    disabled={isConnectingBroker || !brokerLoginId || !brokerPassword}
                                                    className={`w-full mt-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                                                        isConnectingBroker || !brokerLoginId || !brokerPassword
                                                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-emerald-500 to-yellow-500 text-black hover:from-emerald-400 hover:to-yellow-400'
                                                    }`}
                                                >
                                                    {isConnectingBroker ? 'Connecting...' : 'Connect Broker'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </SpotlightCard>
                            </div>
                        )}

                        {/* If connected: Swipeable slides */}
                        {brokerConnected && (
                            <>
                                <div 
                                   className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                                   style={{ transform: `translateY(-${activeMobileSlide * 100}%)` }}
                                >
                                    {/* AUTO Slide 0: Trade Sync (synced trades list) */}
                                    <div className="w-full h-full p-4 pb-24">
                                        <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                            <div className="flex flex-col h-full overflow-hidden">
                                                <div className={`shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>SYNCED TRADES</h3>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{filteredTrades.length}</span>
                                                </div>
                                                
                                                {filteredTrades.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
                                                        <NotebookIcon className="w-12 h-12 mb-3" />
                                                        <h4 className="font-bold text-sm uppercase tracking-widest">No Synced Trades</h4>
                                                        <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">Trades will appear here once synced from your broker.</p>
                                                    </div>
                                                ) : (
                                                   <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-4 space-y-3" style={{ touchAction: 'pan-y' }}>
                                                        {filteredTrades.slice().reverse().map(trade => (
                                                            <div 
                                                               key={trade.id}
                                                               className={`group relative bg-white dark:bg-slate-950 rounded-xl p-4 transition-all border border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden select-none`}
                                                            >
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-stone-600'}`}>{trade.asset}</span>
                                                                                <span className={`text-sm font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[10px] text-stone-400 dark:text-slate-600">
                                                                                {new Date(trade.date).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                            SYNCED
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </SpotlightCard>
                                    </div>

                                    {/* AUTO Slide 1: Calendar */}
                                    <div className="w-full h-full p-4 pb-24 flex flex-col">
                                       {/* Price Ticker above Calendar */}
                                       <div className="shrink-0 mb-2">
                                           <NewsTicker />
                                       </div>
                                       <SpotlightCard className="flex-1 w-full" isDarkMode={isDarkMode} tilt={false}>
                                           <MacroCalendar 
                                               isDarkMode={isDarkMode} 
                                               trades={filteredTrades}
                                               timeFilter={calendarTimeFilter}
                                               setTimeFilter={setCalendarTimeFilter}
                                               viewDate={calendarViewDate}
                                               setViewDate={setCalendarViewDate}
                                           />
                                       </SpotlightCard>
                                    </div>

                                    {/* AUTO Slide 2: Performance Curve */}
                                    <div className="w-full h-full p-4 pb-24">
                                       <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                           <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto">
                                               <div className="flex justify-between items-center pt-5 pb-4 px-1 shrink-0">
                                                   <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">
                                                       {perfCurveTimeFilter === 'M' 
                                                           ? perfCurveViewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()
                                                           : perfCurveViewDate.getFullYear().toString()
                                                       }
                                                   </h3>
                                                   <div className="flex gap-1">
                                                       {(['D','W','M','Y'] as const).map(f => (
                                                           <button 
                                                               key={f} 
                                                               onClick={() => setPerfCurveTimeFilter(f)}
                                                               className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${perfCurveTimeFilter === f ? (isDarkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-black') : 'opacity-50 hover:opacity-80'}`}
                                                           >
                                                               {f}
                                                           </button>
                                                       ))}
                                                   </div>
                                               </div>
                                               
                                               {/* Performance Chart Area */}
                                               <div className="flex-1 min-h-[200px] -mx-2">
                                                   <ResponsiveContainer width="100%" height="100%">
                                                       <AreaChart data={(() => {
                                                           const perfFilteredTrades = filteredTrades.filter(trade => {
                                                               const tradeDate = new Date(trade.date);
                                                               const viewYear = perfCurveViewDate.getFullYear();
                                                               const viewMonth = perfCurveViewDate.getMonth();
                                                               if (perfCurveTimeFilter === 'Y') return tradeDate.getFullYear() === viewYear;
                                                               if (perfCurveTimeFilter === 'M') return tradeDate.getFullYear() === viewYear && tradeDate.getMonth() === viewMonth;
                                                               return true;
                                                           });
                                                           const sorted = [...perfFilteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                                           let cumulative = 0;
                                                           const tradeData = sorted.map((trade, i) => {
                                                               cumulative += trade.pnl;
                                                               return { name: i + 1, pnl: cumulative, date: trade.date };
                                                           });
                                                           // Start from zero
                                                           return [{ name: 0, pnl: 0, date: '' }, ...tradeData];
                                                       })()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                           <defs>
                                                               <linearGradient id="perfGradientAutoMobile" x1="0" y1="0" x2="0" y2="1">
                                                                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                                   <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                               </linearGradient>
                                                           </defs>
                                                           <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                                           <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#78716c' }} axisLine={false} tickLine={false} />
                                                           <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#78716c' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                                                           <ReferenceLine y={0} stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} strokeDasharray="3 3" />
                                                           <Tooltip 
                                                               contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#fff', borderRadius: '8px', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                                                               formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
                                                           />
                                                           <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} fill="url(#perfGradientAutoMobile)" />
                                                       </AreaChart>
                                                   </ResponsiveContainer>
                                               </div>
                                           </div>
                                       </SpotlightCard>
                                    </div>

                                    {/* AUTO Slide 3: Trader DNA + Insights Toggle */}
                                    <div className="w-full h-full p-4 pb-24">
                                       <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                           <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto overflow-x-hidden">
                                               {/* Toggle Tabs - DNA vs Insights */}
                                               <div className={`shrink-0 flex rounded-xl p-1 mb-4 mt-4 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                                   <button 
                                                       onClick={() => setMobileDnaView('DNA')}
                                                       className={`flex-1 py-2.5 flex items-center justify-center rounded-lg transition-all ${
                                                           mobileDnaView === 'DNA' 
                                                               ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-stone-900 shadow-sm') 
                                                               : (isDarkMode ? 'text-slate-400' : 'text-stone-500')
                                                       }`}
                                                   >
                                                       <TreeIcon className="w-5 h-5" />
                                                   </button>
                                                   <button 
                                                       onClick={() => setMobileDnaView('INSIGHTS')}
                                                       className={`flex-1 py-2.5 flex items-center justify-center rounded-lg transition-all ${
                                                           mobileDnaView === 'INSIGHTS' 
                                                               ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-stone-900 shadow-sm') 
                                                               : (isDarkMode ? 'text-slate-400' : 'text-stone-500')
                                                       }`}
                                                   >
                                                       <BarChartIcon className="w-5 h-5" />
                                                   </button>
                                               </div>
                                               
                                               {mobileDnaView === 'DNA' ? (
                                               <>
                                               {/* TRADER DNA Label */}
                                               <div className="flex items-center justify-between mb-2 shrink-0">
                                                   <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                                                   <ActivityIcon className="w-4 h-4 opacity-50" />
                                               </div>
                                               
                                               {/* Imperial Score Display */}
                                               <div className="mb-4 shrink-0 w-full">
                                                   <div className="flex items-center justify-between mb-2">
                                                       <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">IMPERIAL SCORE</h3>
                                                       {traderDNA.imperialScore > 80 && (
                                                           <span className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">PRO</span>
                                                       )}
                                                   </div>
                                                   
                                                   {/* Progress Bar */}
                                                   <div className="relative w-full h-4 rounded-full mb-2 overflow-visible px-[30px]"
                                                       style={{ background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)' }}
                                                   >
                                                       {(() => {
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
                                                               <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: actualLeft, transform: 'translateX(-50%) translateY(-50%)' }}>
                                                                   <div className="rounded-full p-[5px]" style={{ background: borderGradientColor, boxShadow: `0 0 25px ${borderGradientColor}90, 0 0 15px ${borderGradientColor}70` }}>
                                                                       <div className="h-5 rounded-full bg-black flex items-center justify-center px-2 min-w-[50px]">
                                                                           <span className="text-[10px] font-black whitespace-nowrap" style={{ color: borderGradientColor }}>{animatedImperialScore.toFixed(1)}</span>
                                                                       </div>
                                                                   </div>
                                                               </div>
                                                           );
                                                       })()}
                                                   </div>
                                                   <div className="flex justify-between text-[8px] opacity-60">
                                                       <span>Low</span>
                                                       <span>High</span>
                                                   </div>
                                               </div>

                                               {/* Trader DNA Hexagram */}
                                               <div className="flex-1 min-h-0 rounded-xl bg-slate-800/30 border border-slate-700/30 p-4 flex flex-col">
                                                   <div className="flex justify-between items-center mb-2 shrink-0">
                                                       <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                                                       <ActivityIcon className="w-4 h-4 opacity-50" />
                                                   </div>
                                                   <div className="flex-1 min-h-0 -ml-4 flex items-center justify-center">
                                                       <ResponsiveContainer width="100%" height="100%">
                                                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                                              <PolarGrid stroke="rgba(96, 165, 250, 0.2)" strokeWidth={1} />
                                                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 'bold' }} />
                                                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                              <Radar name="Performance" dataKey="A" stroke="url(#dnaGradientMobileAuto)" strokeWidth={2.5} fill="url(#dnaGradientMobileAuto)" fillOpacity={0.6} />
                                                              <defs>
                                                                  <linearGradient id="dnaGradientMobileAuto" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                                                                      <stop offset="50%" stopColor="#ea580c" stopOpacity={0.7} />
                                                                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                                                                  </linearGradient>
                                                              </defs>
                                                              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }} formatter={(value: number) => [`${value}%`, 'Score']} />
                                                          </RadarChart>
                                                       </ResponsiveContainer>
                                                   </div>
                                               </div>
                                               </>
                                               ) : (
                                               /* Insights View */
                                               <div className="flex-1 min-h-0 overflow-y-auto">
                                                   <TraderInsights 
                                                     trades={filteredTrades}
                                                     traderDNA={traderDNA} 
                                                     isDarkMode={isDarkMode}
                                                     hasProcessingTrades={hasProcessingTrades}
                                                   />
                                               </div>
                                               )}
                                           </div>
                                       </SpotlightCard>
                                    </div>
                                </div>

                                {/* Vertical Indicators - Right side (AUTO mode: 4 slides when connected) */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 pointer-events-none">
                                   {[0, 1, 2, 3].map((i) => (
                                       <div 
                                           key={i} 
                                           className={`w-1.5 rounded-full transition-all duration-300 ${
                                               activeMobileSlide === i 
                                               ? `h-8 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500'}` 
                                               : `h-1.5 ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`
                                           }`}
                                       />
                                   ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                 {/* MECCA TAB - Full Screen Trading Dashboard */}
                 {activeTab === 'MECCA' && (
                     <div className="w-full h-full overflow-hidden">
                         <GeminiSetupAnalyzer isDarkMode={isDarkMode} />
                     </div>
                 )}

                {/* CALCU TAB - Risk Calculator */}
                {activeTab === 'CALCU' && (
                     <div className="w-full h-full p-4 pb-24 overflow-y-auto custom-scrollbar">
                         <RiskCalculator />
                     </div>
                 )}

                 {/* GAMES TAB - Static view */}
                 {activeTab === 'GAMES' && (
                     <div className="w-full h-full overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4 p-4 pb-24">
                             {/* XX COINS - Only visible in GAMES tab */}
                             <div className={`px-2 py-1 rounded-full border flex items-center gap-1.5 self-end ${isDarkMode ? 'border-bronze-500/30 bg-bronze-500/10 text-bronze-500' : 'border-yellow-600/30 bg-yellow-100 text-yellow-700'}`}>
                                 <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">XX COINS</span>
                                 <span className="text-[8px] font-mono whitespace-nowrap">| {coins} 💎</span>
                             </div>
                             <SpotlightCard className="h-[calc(50vh-4rem)] min-h-[300px] w-full" isDarkMode={isDarkMode} tilt={false}>
                                 <TradeReplayWidget isDarkMode={isDarkMode} trades={filteredTrades} />
                             </SpotlightCard>
                             <SpotlightCard className="h-[calc(50vh-4rem)] min-h-[300px] w-full" isDarkMode={isDarkMode} tilt={false}>
                                 <PatternDojo isDarkMode={isDarkMode} onOutcome={handleDojoOutcome} />
                             </SpotlightCard>
                        </div>
                     </div>
                 )}
             </div>


             {/* === DESKTOP GRID VIEW (Hidden on Mobile) === */}
             <div className="hidden lg:block flex-1 overflow-y-auto custom-scrollbar p-6">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                     
                     {/* Main Content Area (Center) */}
                     <div className={`col-span-12 ${activeTab === 'JOURNAL' ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col gap-6`}>
                         <div className="flex gap-6 h-full"> 
                             <div className="hidden lg:flex flex-col gap-3 w-12 shrink-0"> 
                                 {NAV_ITEMS.map((item) => (
                                     <button
                                        key={item.id} 
                                        onClick={() => handleTabChange(item.id)}
                                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                            activeTab === item.id 
                                            ? `border ${isDarkMode ? 'border-emerald-400/50 bg-gradient-to-br from-yellow-400/10 to-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 'border-emerald-500/50 bg-gradient-to-br from-yellow-400/10 to-emerald-400/10'}`
                                            : 'opacity-60 hover:opacity-100 hover:bg-white/5 border border-transparent'
                                        }`}
                                     >
                                        <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-400' : (isDarkMode ? 'text-slate-400' : 'text-stone-500')}`} />
                                     </button>
                                 ))}
                             </div>
                             
                             <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                                 {/* JOURNAL TAB: Manual vs Auto Mode Content */}
                                 {activeTab === 'JOURNAL' && (
                                     <>
                                        {/* Manual Journal Mode */}
                                         {journalMode === 'MANUAL' && (
                                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
                                        {/* Left side: Calendar / Performance Curve with swipe */}
                                        <div className="flex-1 min-w-0 h-full flex flex-row gap-3">
                                            {/* Slide Content - with wheel/swipe handler */}
                                            <div 
                                                className="flex-1 min-h-0 relative overflow-hidden flex flex-col gap-2"
                                                onWheel={(e) => {
                                                    if (Math.abs(e.deltaY) > 30) {
                                                        if (e.deltaY > 0 && activeDesktopSlide === 0) {
                                                            setActiveDesktopSlide(1);
                                                        } else if (e.deltaY < 0 && activeDesktopSlide === 1) {
                                                            setActiveDesktopSlide(0);
                                                        }
                                                    }
                                                }}
                                            >
                                                {/* Price Ticker above Calendar - Desktop (same width as calendar) */}
                                                <div className="shrink-0">
                                                    <NewsTicker />
                                                </div>
                                                
                                                {/* Slides Container */}
                                                <div className="flex-1 relative">
                                                {/* Calendar Slide */}
                                                <div 
                                                    className={`absolute inset-0 transition-all duration-300 ease-out ${
                                                        activeDesktopSlide === 0 
                                                            ? 'opacity-100 translate-y-0' 
                                                            : 'opacity-0 -translate-y-full pointer-events-none'
                                                    }`}
                                                >
                                                    <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={tiltMode}>
                                                        <MacroCalendar 
                                                            isDarkMode={isDarkMode} 
                                                            trades={filteredTrades}
                                                            timeFilter={calendarTimeFilter}
                                                            setTimeFilter={setCalendarTimeFilter}
                                                            viewDate={calendarViewDate}
                                                            setViewDate={setCalendarViewDate}
                                                        />
                                                    </SpotlightCard>
                                                </div>
                                                 
                                                 {/* Performance Curve Slide */}
                                                 <div 
                                                     className={`absolute inset-0 transition-all duration-300 ease-out ${
                                                         activeDesktopSlide === 1 
                                                             ? 'opacity-100 translate-y-0' 
                                                             : 'opacity-0 translate-y-full pointer-events-none'
                                                     }`}
                                                 >
                                                     <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={tiltMode} noPadding={true}>
                                                         <div className="flex flex-col h-full px-5 pb-5 overflow-hidden">
                                                             {/* Performance Curve Header - Same as Mobile */}
                                                             <div className="flex justify-between items-center pt-5 pb-4 px-1 shrink-0">
                                                                 <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">
                                                                     {perfCurveHeaderDateText}
                                                                 </h3>
                                                                 <div className="flex gap-1">
                                                                     <div className="flex gap-1">
                                                                         <button 
                                                                             onClick={() => handlePerfCurveNavigation(-1)} 
                                                                             className="p-1 hover:bg-white/10 rounded"
                                                                         >
                                                                             <ArrowRightIcon className="w-3 h-3 rotate-180" />
                                                                         </button>
                                                                         <button 
                                                                             onClick={() => handlePerfCurveNavigation(1)} 
                                                                             className="p-1 hover:bg-white/10 rounded"
                                                                         >
                                                                             <ArrowRightIcon className="w-3 h-3" />
                                                                         </button>
                                                                     </div>
                                                                     <div className="w-[1px] bg-white/10 mx-1"></div>
                                                                     <div className={`flex rounded-lg p-0.5 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                                                         {(['D', 'W', 'M', 'Y'] as const).map((filter) => (
                                                                             <button
                                                                                 key={filter}
                                                                                 onClick={() => setPerfCurveTimeFilter(filter)}
                                                                                 className={`px-2 py-0.5 text-[8px] font-bold rounded ${
                                                                                     perfCurveTimeFilter === filter 
                                                                                         ? isDarkMode ? 'bg-stone-700 shadow-sm' : 'bg-white shadow-sm'
                                                                                         : 'opacity-50'
                                                                                 }`}
                                                                             >
                                                                                 {filter}
                                                                             </button>
                                                                         ))}
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                             
                                                             {/* Performance Chart */}
                                                             <div className="flex-1 min-h-0">
                                                                 {(() => {
                                                                     // Filter trades based on perfCurveTimeFilter and perfCurveViewDate
                                                                     const perfFilteredTrades = filteredTrades.filter(trade => {
                                                                         const tradeDate = new Date(trade.date);
                                                                         const viewDate = perfCurveViewDate;
                                                                         
                                                                         if (perfCurveTimeFilter === 'D') {
                                                                             return tradeDate.toDateString() === viewDate.toDateString();
                                                                         } else if (perfCurveTimeFilter === 'W') {
                                                                             const weekStart = new Date(viewDate);
                                                                             weekStart.setDate(viewDate.getDate() - viewDate.getDay());
                                                                             const weekEnd = new Date(weekStart);
                                                                             weekEnd.setDate(weekStart.getDate() + 6);
                                                                             return tradeDate >= weekStart && tradeDate <= weekEnd;
                                                                         } else if (perfCurveTimeFilter === 'M') {
                                                                             return tradeDate.getMonth() === viewDate.getMonth() && tradeDate.getFullYear() === viewDate.getFullYear();
                                                                         } else {
                                                                             return tradeDate.getFullYear() === viewDate.getFullYear();
                                                                         }
                                                                     });
                                                                     
                                                                     const totalPnL = perfFilteredTrades.reduce((sum, t) => sum + t.pnl, 0);
                                                                     
                                                                     // Build chart data - start from zero
                                                                     let cumulativePnL = 0;
                                                                     const tradeData = perfFilteredTrades
                                                                         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                                         .map((trade, idx) => {
                                                                             cumulativePnL += trade.pnl;
                                                                             return {
                                                                                 index: idx + 1,
                                                                                 pnl: cumulativePnL,
                                                                                 asset: trade.asset,
                                                                             };
                                                                         });
                                                                     // Add starting point at zero
                                                                     const chartData = [{ index: 0, pnl: 0, asset: 'Start' }, ...tradeData];
                                                                     
                                                                     return (
                                                                         <>
                                                                             {perfFilteredTrades.length === 0 ? (
                                                                                 <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                                                                     <TrendingUpIcon className="w-12 h-12 mb-3" />
                                                                                     <h4 className="font-bold text-sm uppercase tracking-widest">No Trades</h4>
                                                                                     <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">No trades found for this period.</p>
                                                                                 </div>
                                                                             ) : (
                                                                                 <ResponsiveContainer width="100%" height="100%">
                                                                                     <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                                         <defs>
                                                                                             <linearGradient id="performanceGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                                                                                                 <stop offset="5%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                                                                                                 <stop offset="95%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                                                                             </linearGradient>
                                                                                         </defs>
                                                                                         <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                                                                                         <XAxis 
                                                                                             dataKey="index" 
                                                                                             tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                                                                                             axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                                                                             tickLine={false}
                                                                                         />
                                                                                         <YAxis 
                                                                                             tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                                                                                             axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                                                                             tickLine={false}
                                                                                             tickFormatter={(value) => `$${value}`}
                                                                                         />
                                                                                         <ReferenceLine y={0} stroke={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} strokeDasharray="3 3" />
                                                                                         <Tooltip
                                                                                             contentStyle={{
                                                                                                 backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                                                                                                 borderRadius: '12px',
                                                                                                 border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                                                                                 boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                                                                 padding: '8px 12px'
                                                                                             }}
                                                                                             labelStyle={{ color: isDarkMode ? '#e4e4e7' : '#18181b', fontSize: '11px', fontWeight: 'bold' }}
                                                                                             formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
                                                                                             labelFormatter={(label, payload) => {
                                                                                                 if (payload && payload[0]) {
                                                                                                     const data = payload[0].payload;
                                                                                                     return `Trade #${label} • ${data.asset}`;
                                                                                                 }
                                                                                                 return `Trade #${label}`;
                                                                                             }}
                                                                                         />
                                                                                         <Area
                                                                                             type="monotone"
                                                                                             dataKey="pnl"
                                                                                             stroke={totalPnL >= 0 ? "#10b981" : "#ef4444"}
                                                                                             strokeWidth={2}
                                                                                             fill="url(#performanceGradientDesktop)"
                                                                                             dot={{ r: 3, fill: isDarkMode ? '#18181b' : '#ffffff', strokeWidth: 2 }}
                                                                                             activeDot={{ r: 5, strokeWidth: 2 }}
                                                                                         />
                                                                                     </AreaChart>
                                                                                 </ResponsiveContainer>
                                                                             )}
                                                                         </>
                                                                     );
                                                                 })()}
                                                             </div>
                                                             
                                                             {/* Stats Footer - Same as Mobile */}
                                                             {(() => {
                                                                 const perfFilteredTrades = filteredTrades.filter(trade => {
                                                                     const tradeDate = new Date(trade.date);
                                                                     const viewDate = perfCurveViewDate;
                                                                     
                                                                     if (perfCurveTimeFilter === 'D') {
                                                                         return tradeDate.toDateString() === viewDate.toDateString();
                                                                     } else if (perfCurveTimeFilter === 'W') {
                                                                         const weekStart = new Date(viewDate);
                                                                         weekStart.setDate(viewDate.getDate() - viewDate.getDay());
                                                                         const weekEnd = new Date(weekStart);
                                                                         weekEnd.setDate(weekStart.getDate() + 6);
                                                                         return tradeDate >= weekStart && tradeDate <= weekEnd;
                                                                     } else if (perfCurveTimeFilter === 'M') {
                                                                         return tradeDate.getMonth() === viewDate.getMonth() && tradeDate.getFullYear() === viewDate.getFullYear();
                                                                     } else {
                                                                         return tradeDate.getFullYear() === viewDate.getFullYear();
                                                                     }
                                                                 });
                                                                 
                                                                 if (perfFilteredTrades.length === 0) return null;
                                                                 
                                                                 return (
                                                                     <div className={`grid grid-cols-4 gap-2 pt-4 mt-auto shrink-0 border-t ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                                                         <div className="text-center">
                                                                             <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Trades</p>
                                                                             <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{perfFilteredTrades.length}</p>
                                                                         </div>
                                                                         <div className="text-center">
                                                                             <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Win Rate</p>
                                                                             <p className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                                                 {((perfFilteredTrades.filter(t => t.pnl > 0).length / perfFilteredTrades.length) * 100).toFixed(0)}%
                                                                             </p>
                                                                         </div>
                                                                         <div className="text-center">
                                                                             <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Best</p>
                                                                             <p className="text-sm font-bold text-emerald-500">
                                                                                 +${Math.max(...perfFilteredTrades.map(t => t.pnl), 0).toFixed(0)}
                                                                             </p>
                                                                         </div>
                                                                         <div className="text-center">
                                                                             <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Worst</p>
                                                                             <p className="text-sm font-bold text-rose-500">
                                                                                 ${Math.min(...perfFilteredTrades.map(t => t.pnl), 0).toFixed(0)}
                                                                             </p>
                                                                         </div>
                                                                     </div>
                                                                 );
                                                             })()}
                                                        </div>
                                                    </SpotlightCard>
                                                </div>
                                                </div>
                                            </div>
                                            
                                            {/* Orange Slide Indicators - Vertical on right side */}
                                            <div className="flex flex-col justify-center items-center gap-2 px-1">
                                                 <button
                                                     onClick={() => setActiveDesktopSlide(0)}
                                                     className={`w-2 rounded-full transition-all duration-300 ${
                                                         activeDesktopSlide === 0
                                                             ? 'h-6 bg-gradient-to-b from-yellow-400 to-amber-500'
                                                             : 'h-2 ' + (isDarkMode ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40')
                                                     }`}
                                                     title="Calendar"
                                                 />
                                                 <button
                                                     onClick={() => setActiveDesktopSlide(1)}
                                                     className={`w-2 rounded-full transition-all duration-300 ${
                                                         activeDesktopSlide === 1
                                                             ? 'h-6 bg-gradient-to-b from-yellow-400 to-amber-500'
                                                             : 'h-2 ' + (isDarkMode ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40')
                                                     }`}
                                                     title="Performance Curve"
                                                 />
                                            </div>
                                        </div>
                                    </div>
                                        )}

                                        {/* Auto Journal Mode (Broker Sync) */}
                                         {journalMode === 'AUTO' && (
                                             <AutoJournalView isDarkMode={isDarkMode} />
                                         )}
                                     </>
                                 )}

                                 {/* GAMES TAB: Replay & Dojo */}
                                 {activeTab === 'GAMES' && (
                                     <div className="flex flex-col gap-6 h-[calc(100vh-10rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                                         {/* XX COINS - Only visible in GAMES tab */}
                                         <div className={`px-2 py-1 rounded-full border flex items-center gap-1.5 self-end ${isDarkMode ? 'border-bronze-500/30 bg-bronze-500/10 text-bronze-500' : 'border-yellow-600/30 bg-yellow-100 text-yellow-700'}`}>
                                             <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">XX COINS</span>
                                             <span className="text-[8px] font-mono whitespace-nowrap">| {coins} 💎</span>
                                         </div>
                                         <div className="flex flex-col lg:flex-row gap-6 flex-1">
                                             <div className="flex-[3] min-w-0 h-full">
                                                <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-stone-200 dark:border-white/10 rounded-3xl">
                                                    <span className="text-sm font-bold uppercase tracking-widest opacity-30">Trade Replay Coming Soon</span>
                                                </div>
                                             </div>
                                             <div className="flex-1 min-w-[200px] h-full">
                                                <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-stone-200 dark:border-white/10 rounded-3xl">
                                                    <span className="text-sm font-bold uppercase tracking-widest opacity-30">Pattern Dojo Coming Soon</span>
                                                </div>
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* MECCA - Full Screen Trading Dashboard */}
                                 {activeTab === 'MECCA' && (
                                     <div className="h-full w-full overflow-hidden animate-in fade-in duration-300">
                                         <GeminiSetupAnalyzer isDarkMode={isDarkMode} />
                                     </div>
                                 )}
                                 
                                 {/* CALCU TAB - Risk Calculator */}
                                 {activeTab === 'CALCU' && (
                                     <div className="h-full w-full overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
                                         <RiskCalculator />
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>

                     {/* Right Sidebar (Trader DNA / Log Entry / Trade Log) - Only show on JOURNAL tab */}
                     {activeTab === 'JOURNAL' && (
                       <div className={`col-span-12 lg:col-span-3 flex flex-col h-[calc(100vh-10rem)] ${isDarkMode ? '' : 'bg-[#F0F0F0]'}`}>
                          <SpotlightCard className={`w-full h-full flex flex-col`} isDarkMode={isDarkMode} noPadding={true}>
                              {/* Right Sidebar Header with 4-way Toggle */}
                              <div className="px-5 pt-5 pb-2 shrink-0">
                                  <div className={`flex items-center gap-2 p-1 rounded-xl border bg-[#1C1C1E] border-white/10 mb-2 ${
                                      // In AUTO mode, only show 2 buttons (TRADER_DNA and TRADER_INSIGHTS)
                                      // In MANUAL mode, show all 4 buttons
                                      journalMode === 'AUTO' ? 'justify-center' : ''
                                  }`}>
                                      <button
                                          onClick={() => setRightSidebarView('TRADER_DNA')}
                                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                                              rightSidebarView === 'TRADER_DNA'
                                                  ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500'
                                                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
                                          }`}
                                      >
                                          <ActivityIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                          onClick={() => setRightSidebarView('TRADER_INSIGHTS')}
                                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                                              rightSidebarView === 'TRADER_INSIGHTS'
                                                  ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500'
                                                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
                                          }`}
                                      >
                                          <BarChart3Icon className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Hide LOG_ENTRY and TRADE_LOG buttons in AUTO mode - trades are synced automatically */}
                                      {journalMode === 'MANUAL' && (
                                          <>
                                      <button
                                          onClick={() => { setRightSidebarView('LOG_ENTRY'); setLogMode('ENTRY'); }}
                                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                                              rightSidebarView === 'LOG_ENTRY'
                                                  ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500'
                                                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
                                          }`}
                                      >
                                          <NotebookIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                          onClick={() => { setRightSidebarView('TRADE_LOG'); setLogMode('HISTORY'); }}
                                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                                              rightSidebarView === 'TRADE_LOG'
                                                  ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500'
                                                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
                                          }`}
                                      >
                                          <BookIcon className="w-3.5 h-3.5" />
                                      </button>
                                          </>
                                      )}
                                  </div>
                                  {/* Simple/Advanced Toggle - Only show when LOG_ENTRY is active */}
                                  {rightSidebarView === 'LOG_ENTRY' && journalMode === 'MANUAL' && logMode === 'ENTRY' && (
                                      <div className="flex justify-between items-center mb-0.5">
                                          <h3 className="text-[9px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                                              <span className="w-0.5 h-0.5 bg-yellow-500 dark:bg-bronze-500 rotate-45 rounded-[1px]"></span>
                                              {editingId ? 'Edit Entry' : 'Log Entry'}
                                          </h3>
                                          {/* Simple/Advanced Toggle - Slim pill toggle */}
                                          <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-5 overflow-hidden">
                                              <button
                                                  onClick={() => setEntryMode('SIMPLE')}
                                                  className={`px-2 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                      entryMode === 'SIMPLE'
                                                          ? 'bg-stone-700 text-bronze-500'
                                                          : 'text-slate-600 hover:text-slate-400'
                                                  }`}
                                              >
                                                  Simple
                                              </button>
                                              <button
                                                  onClick={() => setEntryMode('ADVANCED')}
                                                  className={`px-2 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                      entryMode === 'ADVANCED'
                                                          ? 'bg-stone-700 text-bronze-500'
                                                          : 'text-slate-600 hover:text-slate-400'
                                                  }`}
                                              >
                                                  Advanced
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {/* Conditional Content Based on rightSidebarView */}
                              {rightSidebarView === 'TRADER_DNA' && (
                                  <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto overflow-x-hidden">
                                      <div className="flex justify-between items-center mb-6 shrink-0">
                                          <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                                          <ActivityIcon className="w-4 h-4 opacity-50" />
                                      </div>

                                      {/* Processing Indicator */}
                                      {hasProcessingTrades && (
                                          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 animate-pulse shrink-0">
                                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                              </svg>
                                              <span className="text-xs font-medium">New trade is processing - Scores will update shortly...</span>
                                          </div>
                                      )}

                                      {/* Imperial Score Display */}
                                      <div className="mb-6 shrink-0 w-full">
                                          <div className="flex items-center justify-between mb-3">
                                              <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">
                                                  IMPERIAL SCORE
                                              </h3>
                                              {traderDNA.imperialScore > 80 && (
                                                  <span className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">
                                                      PRO
                                                  </span>
                                              )}
                                          </div>
                                          
                                          {/* Horizontal Progress Bar with Gradient - Thicker by 1/2 */}
                                          <div className="relative w-full h-4 rounded-full mb-3 overflow-visible px-[30px]"
                                              style={{
                                                  background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)'
                                              }}
                                          >
                                              {/* Gradient line - adjusted to account for oval width */}
                                              <div 
                                                  className="absolute inset-y-0 left-[30px] right-[30px] rounded-full"
                                                  style={{
                                                      background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #10b981 100%)'
                                                  }}
                                              />
                                              
                                              {/* Oval Slider Indicator - Larger */}
                                              {(() => {
                                                  // Use animated score for color so it changes during animation
                                                  const scoreForColor = Math.max(0, Math.min(100, animatedImperialScore));
                                                  
                                                  // Calculate position accounting for padding (30px on each side)
                                                  // Position: 0% = 30px (left padding), 100% = calc(100% - 30px) (right padding)
                                                  let constrainedPosition: number;
                                                  if (animatedImperialScore <= 0) {
                                                      constrainedPosition = 0;
                                                  } else if (animatedImperialScore >= 100) {
                                                      constrainedPosition = 100;
                                                  } else {
                                                      constrainedPosition = animatedImperialScore;
                                                  }
                                                  
                                                  // Position calculation: padding (30px) + percentage of gradient width
                                                  // Gradient width = 100% - 60px (30px padding on each side)
                                                  const padding = 30;
                                                  // Convert percentage to decimal for calc()
                                                  const positionDecimal = constrainedPosition / 100;
                                                  // Corrected calculation: position within the gradient area (0% to 100%)
                                                  // Formula: padding + (percentage * available width)
                                                  const actualLeft = `calc(${padding}px + (100% - ${padding * 2}px) * ${positionDecimal})`;
                                                  
                                                  // Calculate the color from the gradient based on animated score position
                                                  // Match the exact gradient: rgb(239, 68, 68) 0% -> rgb(251, 191, 36) 50% -> rgb(16, 185, 129) 100%
                                                  let borderGradientColor: string;
                                                  if (scoreForColor <= 50) {
                                                      // Interpolate between red (0%) and yellow (50%)
                                                      const ratio = scoreForColor / 50;
                                                      const r = Math.round(239 + (251 - 239) * ratio);
                                                      const g = Math.round(68 + (191 - 68) * ratio);
                                                      const b = Math.round(68 + (36 - 68) * ratio);
                                                      borderGradientColor = `rgb(${r}, ${g}, ${b})`;
                                                  } else {
                                                      // Interpolate between yellow (50%) and green (100%)
                                                      const ratio = (scoreForColor - 50) / 50;
                                                      const r = Math.round(251 + (16 - 251) * ratio);
                                                      const g = Math.round(191 + (185 - 191) * ratio);
                                                      const b = Math.round(36 + (129 - 36) * ratio);
                                                      borderGradientColor = `rgb(${r}, ${g}, ${b})`;
                                                  }
                                                  
                                                  // Text color matches border (changes during animation)
                                                  const textColor = borderGradientColor;
                                                  
                                                  return (
                                                      <div 
                                                          className="absolute top-1/2 -translate-y-1/2 z-20"
                                                          style={{ 
                                                              left: actualLeft,
                                                              transform: 'translateX(-50%) translateY(-50%)',
                                                          }}
                                                      >
                                                          {/* Border wrapper with solid color matching score position - Thicker glow */}
                                                          <div
                                                              className="rounded-full p-[5px]"
                                                              style={{
                                                                  background: borderGradientColor,
                                                                  boxShadow: `0 0 25px ${borderGradientColor}90, 0 0 15px ${borderGradientColor}70, 0 0 8px ${borderGradientColor}50`,
                                                                  transition: 'background 0ms linear, box-shadow 0ms linear'
                                                              }}
                                                          >
                                                              {/* Black inner card - Smaller */}
                                                              <div 
                                                                  className="h-5 rounded-full bg-black dark:bg-black flex items-center justify-center px-2 min-w-[50px]"
                                                                  style={{ 
                                                                      transition: 'all 75ms ease-out',
                                                                      display: 'flex',
                                                                      alignItems: 'center',
                                                                      justifyContent: 'center'
                                                                  }}
                                                              >
                                                                  {/* Score Number Inside Indicator - Centered */}
                                                                  <span 
                                                                      className="text-[10px] font-black whitespace-nowrap"
                                                                      style={{ 
                                                                          color: textColor,
                                                                          transition: 'color 0ms linear',
                                                                          textAlign: 'center',
                                                                          lineHeight: '1'
                                                                      }}
                                                                  >
                                                                      {animatedImperialScore.toFixed(1)}
                                                                  </span>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              })()}
                                          </div>
                                          
                                          {/* Labels */}
                                          <div className="flex justify-between text-[8px] opacity-60">
                                              <span>Low</span>
                                              <span>High</span>
                                          </div>
                                      </div>

                                      {/* Trader DNA Hexagram - WITH SEPARATE COMPONENT CARD */}
                                      <div className="flex-1 min-h-0 rounded-xl bg-slate-800/30 border border-slate-700/30 p-4 flex flex-col">
                                          <div className="flex justify-between items-center mb-4 shrink-0">
                                              <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">TRADER DNA</h3>
                                              <ActivityIcon className="w-4 h-4 opacity-50" />
                                          </div>
                                          <div className="flex-1 min-h-0 -ml-4 flex items-center justify-center">
                                              <ResponsiveContainer width="100%" height="100%">
                                                 <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                                 <PolarGrid 
                                                     stroke="rgba(96, 165, 250, 0.2)" 
                                                     strokeWidth={1}
                                                 />
                                                 <PolarAngleAxis 
                                                     dataKey="subject" 
                                                     tick={{ 
                                                         fill: '#a1a1aa', 
                                                         fontSize: 9, 
                                                         fontWeight: 'bold' 
                                                     }} 
                                                 />
                                                 <PolarRadiusAxis 
                                                     angle={30} 
                                                     domain={[0, 100]} 
                                                     tick={false} 
                                                     axisLine={false} 
                                                 />
                                                 
                                                 {/* Outer Hexagon - Light Blue Glow (Max Possible) */}
                                                 <Radar 
                                                     name="Max" 
                                                     dataKey="max" 
                                                     stroke="#60a5fa" 
                                                     strokeWidth={2}
                                                     fill="none"
                                                     fillOpacity={0}
                                                     dot={false}
                                                     style={{
                                                         filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))'
                                                     }}
                                                 />
                                                 
                                                 {/* Inner Hexagon - Orange-to-Red Gradient (Actual Scores) */}
                                                 <Radar 
                                                     name="Performance" 
                                                     dataKey="A" 
                                                     stroke="url(#dnaGradient)" 
                                                     strokeWidth={2.5}
                                                     fill="url(#dnaGradient)" 
                                                     fillOpacity={0.6}
                                                     isAnimationActive={true}
                                                     animationDuration={1500}
                                                     animationEasing="ease-out"
                                                 />
                                                 
                                                 <defs>
                                                     <linearGradient id="dnaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                         <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                                                         <stop offset="50%" stopColor="#ea580c" stopOpacity={0.7} />
                                                         <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                                                     </linearGradient>
                                                 </defs>
                                                 
                                                 <Tooltip 
                                                     contentStyle={{ 
                                                         backgroundColor: '#18181b', 
                                                         borderRadius: '8px', 
                                                         border: '1px solid rgba(96, 165, 250, 0.3)', 
                                                         boxShadow: '0 4px 12px rgba(96, 165, 250, 0.2)' 
                                                     }} 
                                                     itemStyle={{ 
                                                         color: '#e4e4e7', 
                                                         fontSize: '11px', 
                                                         fontWeight: 'bold' 
                                                     }} 
                                                     formatter={(value: number) => [`${value}%`, 'Score']} 
                                                 />
                                                 </RadarChart>
                                              </ResponsiveContainer>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {rightSidebarView === 'TRADER_INSIGHTS' && (
                                  <TraderInsights trades={filteredTrades} traderDNA={traderDNA} isDarkMode={isDarkMode} hasProcessingTrades={hasProcessingTrades} />
                              )}

                              {/* LOG_ENTRY view - Only show in MANUAL mode */}
                              {rightSidebarView === 'LOG_ENTRY' && journalMode === 'MANUAL' && (
                                  <div className={`flex flex-col relative z-20 ${isMobileAnalysisMode ? 'h-full overflow-hidden' : 'overflow-visible'} transition-all duration-500 ${tiltMode ? 'pointer-events-none opacity-50' : ''} h-full`}>
                                      
                                      {/* --- FORM VIEW --- */}
                                      {logMode === 'ENTRY' && viewState === 'FORM' && (
                                          <div className="flex flex-col animate-in fade-in duration-300 h-full min-h-0">
                                              {/* SIMPLE MODE - Basic fields only */}
                                              {entryMode === 'SIMPLE' ? (
                                                  <div className="px-5 pb-2 space-y-3 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                                                      {/* Date */}
                                                      <div className="relative group shrink-0">
                                                          <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Date</label>
                                                          <div className="absolute left-3 top-[28px] text-stone-500 dark:text-slate-500 pointer-events-none">
                                                              <CalendarIcon className="w-3.5 h-3.5" />
                                                          </div>
                                                          <input
                                                              type="date"
                                                              value={date}
                                                              onChange={(e) => setDate(e.target.value)}
                                                              className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-9 pr-2 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                                          />
                                                      </div>

                                                      {/* Asset & PnL */}
                                                      <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                                          <div>
                                                              <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Asset</label>
                                                              <input 
                                                                  type="text" 
                                                                  value={asset} 
                                                                  onChange={(e) => setAsset(e.target.value)} 
                                                                  placeholder="BTCUSD" 
                                                                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600" 
                                                              />
                                                          </div>
                                                          <div>
                                                              <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Profit / Loss ($)</label>
                                                              <div className="relative">
                                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 font-bold text-xs">$</span>
                                                                  <input 
                                                                      type="number" 
                                                                      value={pnl} 
                                                                      onChange={(e) => setPnl(e.target.value)} 
                                                                      placeholder="0.00" 
                                                                      className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600 ${Number(pnl) > 0 ? 'text-emerald-500' : Number(pnl) < 0 ? 'text-rose-500' : 'text-stone-900 dark:text-white'}`} 
                                                                  />
                                                              </div>
                                                          </div>
                                                      </div>

                                                      {/* Notes */}
                                                      <div className="flex-col flex-1 min-h-[100px] flex shrink-0">
                                                          <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Strategy & Psychology Notes</label>
                                                          <textarea 
                                                              value={notes} 
                                                              onChange={(e) => setNotes(e.target.value)} 
                                                              placeholder="Why did you take this trade? How did you feel?" 
                                                              className="w-full flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none resize-none placeholder-stone-400 dark:placeholder-slate-600 leading-relaxed" 
                                                          />
                                                      </div>

                                                      {/* Image Upload */}
                                                      <div className="shrink-0">
                                                          <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Chart Snapshot</label>
                                                          <div 
                                                              onClick={handleClick}
                                                              onDragEnter={handleDragEnter}
                                                              onDragOver={handleDragOver}
                                                              onDragLeave={handleDragLeave}
                                                              onDrop={handleDrop}
                                                              className={`relative w-full h-12 bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-yellow-500 dark:border-bronze-500 bg-yellow-50/50 dark:bg-bronze-950/30 border-dashed scale-[1.02] shadow-lg shadow-yellow-500/20 dark:shadow-bronze-500/20' : 'border-dashed border-stone-300 dark:border-slate-600 hover:border-yellow-400 dark:hover:border-bronze-400 hover:bg-stone-50 dark:hover:bg-slate-800/50'} rounded-xl flex items-center ${previewUrls.length > 0 ? 'justify-between px-4' : 'justify-center gap-3'} cursor-pointer transition-all duration-200 group overflow-hidden ${previewUrls.length > 0 ? 'border-solid border-yellow-500/50 dark:border-bronze-500/50 bg-yellow-50/30 dark:bg-bronze-950/10' : ''}`}
                                                          >
                                                              {isDragging && (
                                                                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-yellow-500/20 to-yellow-400/10 animate-pulse pointer-events-none" />
                                                              )}
                                                              
                                                              <input 
                                                                  type="file" 
                                                                  ref={fileInputRefDesktop} 
                                                                  onChange={handleImageChange} 
                                                                  className="hidden" 
                                                                  accept="image/*" 
                                                                  multiple 
                                                              />
                                                              
                                                              {previewUrls.length === 0 ? (
                                                                  <>
                                                                      <UploadIcon 
                                                                          className={`relative z-10 w-5 h-5 ${isDragging ? 'text-yellow-600 dark:text-bronze-400 scale-110' : 'text-stone-400 dark:text-bronze-500'} transition-all duration-200 ${isDragging ? 'animate-pulse' : 'group-hover:scale-110'}`}
                                                                      />
                                                                      <span className={`relative z-10 text-[10px] font-bold ${isDragging ? 'text-yellow-700 dark:text-bronze-300' : 'text-stone-500 dark:text-bronze-500'} uppercase tracking-wide transition-colors`}>
                                                                          {isDragging ? '✨ Drop to upload (max 3)' : 'Click to upload chart'}
                                                                      </span>
                                                                  </>
                                                              ) : (
                                                                  <div className="flex items-center gap-2 w-full relative z-10">
                                                                      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
                                                                          {previewUrls.map((url, index) => (
                                                                              <div key={index} className="relative shrink-0 group/image">
                                                                                  <div className="h-8 w-12 rounded-lg bg-stone-100 dark:bg-black/50 overflow-hidden border-2 border-stone-200 dark:border-slate-700 group-hover/image:border-yellow-400 dark:group-hover/image:border-bronze-400 transition-colors shadow-sm">
                                                                                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                                                                  </div>
                                                                                  <button
                                                                                      type="button"
                                                                                      onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          e.preventDefault();
                                                                                          removeImage(index);
                                                                                      }}
                                                                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md hover:scale-110 active:scale-95 z-20"
                                                                                      title="Remove image"
                                                                                  >
                                                                                      ×
                                                                                  </button>
                                                                              </div>
                                                                          ))}
                                                                      </div>
                                                                      {previewUrls.length < 3 && (
                                                                          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isDragging ? 'text-yellow-700 dark:text-bronze-300 bg-yellow-100 dark:bg-bronze-900/30' : 'text-stone-500 dark:text-bronze-500 bg-stone-100 dark:bg-slate-800'} whitespace-nowrap transition-colors`}>
                                                                              {previewUrls.length}/3
                                                                          </span>
                                                                      )}
                                                                      {previewUrls.length >= 3 && (
                                                                          <span className={`text-[8px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded whitespace-nowrap`}>
                                                                              MAX 3
                                                                          </span>
                                                                      )}
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                              ) : (
                                                  /* ADVANCED MODE - All fields */
                                              <div className="px-5 pb-2 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 flex flex-col pt-2">
                                                  
                                                  {/* Row 1: Date & Direction Mixed */}
                                                  <div className="grid grid-cols-12 gap-2.5 shrink-0">
                                                      <div className="col-span-7 relative group">
                                                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 pointer-events-none">
                                                              <CalendarIcon className="w-3.5 h-3.5" />
                                                          </div>
                                                          <input
                                                              type="date"
                                                              value={date}
                                                              onChange={(e) => setDate(e.target.value)}
                                                              className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-9 pr-2 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                                          />
                                                      </div>
                                                      <div className="col-span-5 flex bg-stone-100 dark:bg-white/5 p-1 rounded-xl">
                                                          <button 
                                                              onClick={() => setDirection('Long')}
                                                              className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${direction === 'Long' ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                                          >
                                                              Long
                                                          </button>
                                                          <button 
                                                              onClick={() => setDirection('Short')}
                                                              className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${direction === 'Short' ? 'bg-rose-500 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                                          >
                                                              Short
                                                          </button>
                                                      </div>
                                                  </div>

                                                   {/* Row 2: Asset & PnL */}
                                                   <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                                       <div>
                                                           <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Asset</label>
                                                           <input type="text" value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="BTCUSD" className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600" />
                                                       </div>
                                                       <div>
                                                           <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">PnL</label>
                                                           <div className="relative">
                                                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 font-bold text-xs">$</span>
                                                               <input type="number" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="0.00" className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none shadow-sm placeholder-stone-400 dark:placeholder-slate-600 ${Number(pnl) > 0 ? 'text-emerald-500' : Number(pnl) < 0 ? 'text-rose-500' : 'text-stone-900 dark:text-white'}`} />
                                                           </div>
                                                       </div>
                                                   </div>

                                                   {/* Row 3: Strategy & Session */}
                                                   <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                                       <div>
                                                           <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Strategy</label>
                                                           <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm ${strategy === STRATEGIES[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                                              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                                                           </select>
                                                       </div>
                                                       <div>
                                                           <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Session</label>
                                                           <select value={session} onChange={(e) => setSession(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm ${session === SESSIONS[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                                              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                           </select>
                                                       </div>
                                                   </div>
                                                   
                                                   {/* Row 4: Emotion */}
                                                   <div className="shrink-0">
                                                       <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Emotion</label>
                                                       <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-2 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none shadow-sm ${emotion === EMOTIONS[0] ? 'text-stone-400 dark:text-slate-600' : 'text-stone-900 dark:text-white'}`}>
                                                          {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                                                       </select>
                                                   </div>

                                                   {/* Row 5: Did I follow my plan? */}
                                                   <div className="shrink-0">
                                                       <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">
                                                           Did I follow my plan?
                                                       </label>
                                                       <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-6 overflow-hidden">
                                                           <button 
                                                               onClick={() => setFollowedPlan(true)}
                                                               className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                                   followedPlan === true 
                                                                       ? 'bg-emerald-500 text-white' 
                                                                       : 'text-slate-600 hover:text-slate-400'
                                                               }`}
                                                           >
                                                               Yes
                                                           </button>
                                                           <button 
                                                               onClick={() => setFollowedPlan(false)}
                                                               className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                                   followedPlan === false 
                                                                       ? 'bg-rose-500 text-white' 
                                                                       : 'text-slate-600 hover:text-slate-400'
                                                               }`}
                                                           >
                                                               No
                                                           </button>
                                                       </div>
                                                   </div>

                                                   {/* Row 6: Revenge Trade? (for testing Patience) */}
                                                   <div className="shrink-0">
                                                       <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">
                                                           Revenge Trade? (Test Patience)
                                                       </label>
                                                       <div className="flex items-center rounded-full border bg-[#1C1C1E] border-white/10 h-6 overflow-hidden">
                                                           <button 
                                                               onClick={() => setIsRevengeTrade(true)}
                                                               className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                                   isRevengeTrade === true 
                                                                       ? 'bg-orange-500 text-white' 
                                                                       : 'text-slate-600 hover:text-slate-400'
                                                               }`}
                                                           >
                                                               Yes
                                                           </button>
                                                           <button 
                                                               onClick={() => setIsRevengeTrade(false)}
                                                               className={`flex-1 h-full flex items-center justify-center transition-all text-[8px] font-semibold uppercase tracking-wide ${
                                                                   isRevengeTrade === false 
                                                                       ? 'bg-stone-600 text-white' 
                                                                       : 'text-slate-600 hover:text-slate-400'
                                                               }`}
                                                           >
                                                               No
                                                           </button>
                                                       </div>
                                                   </div>

                                                   {/* Row 7: Notes */}
                                                   <div className="flex-col flex-1 min-h-[60px] flex mb-1">
                                                      <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Notes</label>
                                                      <textarea 
                                                          value={notes} 
                                                          onChange={(e) => setNotes(e.target.value)} 
                                                          placeholder="Trade logic..." 
                                                          className="w-full flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none resize-none placeholder-stone-400 dark:placeholder-slate-600 leading-relaxed" 
                                                      />
                                                   </div>

                                                   {/* Row 8: Image (Enhanced Drag & Drop like Cursor) */}
                                                   <div className="shrink-0">
                                                      <div 
                                                          onClick={handleClick}
                                                          onDragEnter={handleDragEnter}
                                                          onDragOver={handleDragOver}
                                                          onDragLeave={handleDragLeave}
                                                          onDrop={handleDrop}
                                                          className={`relative w-full h-12 bg-white dark:bg-slate-900 border-2 ${isDragging ? 'border-yellow-500 dark:border-bronze-500 bg-yellow-50/50 dark:bg-bronze-950/30 border-dashed scale-[1.02] shadow-lg shadow-yellow-500/20 dark:shadow-bronze-500/20' : 'border-dashed border-stone-300 dark:border-slate-600 hover:border-yellow-400 dark:hover:border-bronze-400 hover:bg-stone-50 dark:hover:bg-slate-800/50'} rounded-xl flex items-center ${previewUrls.length > 0 ? 'justify-between px-4' : 'justify-center gap-3'} cursor-pointer transition-all duration-200 group overflow-hidden ${previewUrls.length > 0 ? 'border-solid border-yellow-500/50 dark:border-bronze-500/50 bg-yellow-50/30 dark:bg-bronze-950/10' : ''}`}
                                                      >
                                                          {/* Animated background gradient on drag */}
                                                          {isDragging && (
                                                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-yellow-500/20 to-yellow-400/10 animate-pulse pointer-events-none" />
                                                          )}
                                                          
                                                          <input 
                                                              type="file" 
                                                              ref={fileInputRefDesktop} 
                                                              onChange={handleImageChange} 
                                                              className="hidden" 
                                                              accept="image/*" 
                                                              multiple 
                                                          />
                                                          
                                                          {previewUrls.length === 0 ? (
                                                              <>
                                                                  <UploadIcon 
                                                                      className={`relative z-10 w-5 h-5 ${isDragging ? 'text-yellow-600 dark:text-bronze-400 scale-110' : 'text-stone-400 dark:text-bronze-500'} transition-all duration-200 ${isDragging ? 'animate-pulse' : 'group-hover:scale-110'}`}
                                                                  />
                                                                  <span className={`relative z-10 text-[10px] font-bold ${isDragging ? 'text-yellow-700 dark:text-bronze-300' : 'text-stone-500 dark:text-bronze-500'} uppercase tracking-wide transition-colors`}>
                                                                      {isDragging ? '✨ Drop to upload (max 3)' : '📸 Drag & drop or click to upload (max 3)'}
                                                                  </span>
                                                              </>
                                                          ) : (
                                                              <div className="flex items-center gap-2 w-full relative z-10">
                                                                  <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
                                                                      {previewUrls.map((url, index) => (
                                                                          <div key={index} className="relative shrink-0 group/image">
                                                                              <div className="h-8 w-12 rounded-lg bg-stone-100 dark:bg-black/50 overflow-hidden border-2 border-stone-200 dark:border-slate-700 group-hover/image:border-yellow-400 dark:group-hover/image:border-bronze-400 transition-colors shadow-sm">
                                                                                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                                                              </div>
                                                                              <button
                                                                                  type="button"
                                                                                  onClick={(e) => {
                                                                                      e.stopPropagation();
                                                                                      e.preventDefault();
                                                                                      removeImage(index);
                                                                                  }}
                                                                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md hover:scale-110 active:scale-95 z-20"
                                                                                  title="Remove image"
                                                                              >
                                                                                  ×
                                                                              </button>
                                                                          </div>
                                                                      ))}
                                                                  </div>
                                                                  {previewUrls.length < 3 && (
                                                                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isDragging ? 'text-yellow-700 dark:text-bronze-300 bg-yellow-100 dark:bg-bronze-900/30' : 'text-stone-500 dark:text-bronze-500 bg-stone-100 dark:bg-slate-800'} whitespace-nowrap transition-colors`}>
                                                                          {previewUrls.length}/3
                                                                      </span>
                                                                  )}
                                                                  {previewUrls.length >= 3 && (
                                                                      <span className={`text-[8px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded whitespace-nowrap`}>
                                                                          MAX 3
                                                                      </span>
                                                                  )}
                                                              </div>
                                                          )}
                                                      </div>
                                                   </div>

                                              </div>
                                          )}
                                              
                                              {/* Footer Actions - Same for both Simple and Advanced */}
                                              {viewState === 'FORM' && (
                                              <div className="mt-auto shrink-0 px-5 pb-5 pt-2 border-t border-transparent">
                                                  <button
                                                      onClick={handleAnalyze}
                                                      disabled={!pnl || !asset || tiltMode}
                                                      className="w-full py-3.5 rounded-xl font-black text-sm shadow-lg hover:shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-emerald-400 hover:from-yellow-300 hover:to-emerald-300 border border-emerald-500/50 text-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                  >
                                                      <SparklesIcon className="w-4 h-4 text-black" />
                                                      <span>{editingId ? 'UPDATE' : 'ANALYZE'}</span>
                                                  </button>
                                              </div>
                                              )}
                                          </div>
                                      )}

                                      {/* --- ANALYZING STATE --- */}
                                      {viewState === 'ANALYZING' && logMode === 'ENTRY' && (
                                          <div className="h-full flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-300">
                                              <div className="scale-125">
                                                 <PhaseLoader isReady={isAnalysisReady} onComplete={handleLoaderComplete} />
                                              </div>
                                          </div>
                                      )}

                                      {/* --- REVIEW STATE --- */}
                                      {viewState === 'REVIEW' && logMode === 'ENTRY' && (
                                          <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-2 animate-in slide-in-from-bottom-8 duration-500">
                                              <div className="shrink-0 flex items-center gap-3 mb-6">
                                                 <div className="p-2 rounded-lg bg-yellow-500/10 dark:bg-bronze-500/10 border border-yellow-500/20 dark:border-bronze-500/20">
                                                     <SparklesIcon className="w-5 h-5 text-yellow-600 dark:text-bronze-500" />
                                                 </div>
                                                 <h3 className="text-sm font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300">Analysis Complete</h3>
                                              </div>
                                              <div className="flex-1 min-h-0 relative group rounded-3xl p-[2px] bg-gradient-to-r from-yellow-400 via-emerald-500 to-yellow-400 dark:from-bronze-500 dark:via-emerald-500 dark:to-bronze-500">
                                                 <div className="relative bg-slate-900 rounded-[22px] p-6 shadow-2xl overflow-hidden flex flex-col h-full border border-slate-800/50">
                                                     <div className="flex-1 overflow-y-auto custom-scrollbar text-slate-300 font-mono text-sm leading-relaxed pr-2 whitespace-pre-wrap" style={{ touchAction: 'pan-y' }}>
                                                         <Typewriter text={aiFeedback.replace(/(\d+\.)/g, '$1 ')} speed={10} />
                                                     </div>
                                                 </div>
                                              </div>
                                              
                                              {/* Footer Actions for Review */}
                                              <div className="mt-auto shrink-0 px-5 pb-5 pt-2">
                                                  <div className="flex gap-3">
                                                      <button 
                                                          onClick={() => setViewState('FORM')}
                                                          className="flex-1 py-2 rounded-xl font-bold text-sm tracking-wide uppercase border border-stone-300 dark:border-slate-700 text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                                                      >
                                                          EDIT
                                                      </button>
                                                      <button 
                                                          onClick={handleConfirmLog}
                                                          className="flex-[2] py-2 rounded-xl font-bold text-sm tracking-wide uppercase bg-bronze-500 text-black shadow-lg hover:bg-bronze-400 transition-colors"
                                                      >
                                                          DONE
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {/* TRADE_LOG view - Only show in MANUAL mode */}
                              {rightSidebarView === 'TRADE_LOG' && journalMode === 'MANUAL' && (
                                  <div className="flex flex-col h-full">
                                      {logMode === 'HISTORY' && (
                                          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 h-full overflow-hidden">
                                              {/* Header with Trade Log title and count badge */}
                                              <div className={`shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>TRADE LOG</h3>
                                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border ${isDarkMode ? 'bg-bronze-500/10 text-dirty-white border-bronze-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{sortedTrades.length}</span>
                                              </div>
                                              
                                              {sortedTrades.length === 0 ? (
                                                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
                                                      <NotebookIcon className="w-12 h-12 mb-3" />
                                                      <h4 className="font-bold text-sm uppercase tracking-widest">No Trade Logs</h4>
                                                      <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">Start journaling your trades to see your history here.</p>
                                                  </div>
                                              ) : (
                                                 <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-4 space-y-3" style={{ touchAction: 'pan-y' }}>
                                                      {sortedTrades.map(trade => (
                                                          <div 
                                                             key={trade.id}
                                                             onClick={() => handleHistoryClick(trade.id)}
                                                             className={`group relative bg-white dark:bg-slate-950 hover:bg-stone-50 dark:hover:bg-slate-900 rounded-xl p-4 transition-all border border-stone-200 dark:border-slate-800 hover:border-yellow-500/50 dark:hover:border-bronze-500/50 cursor-pointer shadow-sm dark:shadow-none overflow-hidden select-none ${editingId === trade.id ? 'ring-2 ring-yellow-500 dark:ring-bronze-500' : ''}`}
                                                          >
                                                              {/* Edit/Delete Overlay */}
                                                              {activeHistoryId === trade.id && !deleteConfirmationId && (
                                                                  <div className="absolute inset-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 animate-in fade-in duration-200">
                                                                      <button 
                                                                          onClick={(e) => { e.stopPropagation(); handleEditHistoryItem(trade); }}
                                                                          className="px-4 py-2 bg-yellow-500 dark:bg-bronze-500 text-black text-xs font-bold rounded-lg shadow-lg hover:bg-yellow-400 dark:hover:bg-bronze-400 transition-colors uppercase tracking-wider"
                                                                      >
                                                                          Edit
                                                                      </button>
                                                                      <button 
                                                                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(trade.id); }}
                                                                          className="px-4 py-2 bg-white dark:bg-slate-800 text-rose-500 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors uppercase tracking-wider"
                                                                      >
                                                                          Delete
                                                                      </button>
                                                                  </div>
                                                              )}

                                                              {/* Delete Confirmation Overlay */}
                                                              {deleteConfirmationId === trade.id && (
                                                                  <div className="absolute inset-0 z-20 bg-rose-50/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in zoom-in duration-200">
                                                                      <p className="text-stone-900 dark:text-white font-bold text-xs mb-3">Confirm Delete?</p>
                                                                      <div className="flex gap-2">
                                                                          <button 
                                                                              onClick={(e) => { e.stopPropagation(); confirmDelete(trade.id); }}
                                                                              className="px-3 py-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg uppercase"
                                                                          >
                                                                              Yes
                                                                          </button>
                                                                          <button 
                                                                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(null); }}
                                                                              className="px-3 py-1.5 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-[10px] font-bold rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors uppercase"
                                                                          >
                                                                              Cancel
                                                                          </button>
                                                                      </div>
                                                                  </div>
                                                              )}

                                                              <div className="flex justify-between items-start mb-2">
                                                                  <div>
                                                                      <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-stone-900'}`}>{trade.asset}</span>
                                                                      <div className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>{formatDateForDisplay(trade.date)}</div>
                                                                  </div>
                                                                  <div className={`font-bold font-mono ${trade.pnl >= 0 ? (isDarkMode ? 'text-emerald-500' : 'text-emerald-600') : (isDarkMode ? 'text-rose-500' : 'text-rose-600')}`}>
                                                                      {(trade.pnl >= 0 ? '+' : '-') + '$' + Math.abs(trade.pnl).toFixed(2)}
                                                                  </div>
                                                              </div>
                                                              <p className={`text-xs line-clamp-2 mb-3 leading-relaxed opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>{trade.notes}</p>
                                                              
                                                              {trade.aiFeedback && (
                                                                  <div className="mt-3">
                                                                      <div 
                                                                          onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              toggleInsight(trade.id);
                                                                          }}
                                                                          className={`relative rounded-xl p-3 border shadow-inner group/insight overflow-hidden cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-stone-100 border-stone-200 hover:border-stone-300'}`}
                                                                      >
                                                                          <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent opacity-50 ${isDarkMode ? 'via-bronze-500/50' : 'via-yellow-500/50'}`}></div>
                                                                          
                                                                          <div className="flex items-center justify-between mb-2">
                                                                              <div className="flex items-center gap-2">
                                                                                  <div className={`p-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-stone-200 border-stone-300'}`}>
                                                                                      <SparklesIcon className={`w-2.5 h-2.5 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
                                                                                  </div>
                                                                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>AI Mentor Insight</span>
                                                                              </div>
                                                                              <div className={`text-[10px] font-mono opacity-0 group-hover/insight:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-600' : 'text-stone-400'}`}>
                                                                                  {expandedInsights.has(trade.id) ? 'COLLAPSE' : 'EXPAND'}
                                                                              </div>
                                                                          </div>
                                                                          <p className={`text-[11px] leading-relaxed font-mono opacity-90 ${expandedInsights.has(trade.id) ? '' : 'line-clamp-2'} ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                                                                              {trade.aiFeedback.replace(/[#*]/g, '')}
                                                                          </p>
                                                                      </div>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </SpotlightCard>
                       </div>
                     )}

                 </div>
             </div>

             {/* Mobile Bottom Nav */}
             <div 
                 className={`absolute bottom-0 left-0 right-0 z-50 lg:hidden px-6 pb-6 pt-2 bg-gradient-to-t ${isDarkMode ? 'from-[#050505] via-[#050505]/90 to-transparent' : 'from-[#F0F0F0] via-[#F0F0F0]/90 to-transparent'}`}
                 onTouchStart={(e) => {
                     e.stopPropagation();
                 }}
                 onTouchEnd={(e) => {
                     e.stopPropagation();
                 }}
                 onClick={(e) => {
                     e.stopPropagation();
                 }}
             >
                <div className={`flex items-center justify-around p-2 rounded-2xl border ${isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-black/5'} shadow-2xl`}>
                    {NAV_ITEMS.map((item) => (
                         <button
                            key={item.id} 
                            onClick={() => handleTabChange(item.id)}
                            className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                activeTab === item.id 
                                ? `border ${isDarkMode ? 'border-emerald-400/50 bg-gradient-to-br from-yellow-400/10 to-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 'border-emerald-500/50 bg-gradient-to-br from-yellow-400/10 to-emerald-400/10'}`
                                : 'opacity-60 hover:opacity-100 border border-transparent'
                            }`}
                         >
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-400' : (isDarkMode ? 'text-slate-400' : 'text-stone-500')}`} />
                         </button>
                     ))}
             </div>
        </div>
      </div>
    </div>
  );
};

export default JournalXX;
