import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  SettingsIcon, MaximizeIcon, BrainCircuitIcon, MicIcon, 
  HomeIcon, PlusIcon, BarChartIcon, BookIcon, ArrowRightIcon,
  NotebookIcon, CalendarIcon, UploadIcon, ActivityIcon, FolderIcon,
  TrendingUpIcon, TrendingDownIcon, MapIcon, PlayIcon, PauseIcon,
  LayersIcon, TreeIcon, SparklesIcon, SunIcon, MoonIcon, CalculatorIcon, UserIcon, CheckIcon, GamepadIcon
} from './ui/Icons';
import { TradeFormData, TradeEntry } from './types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { analyzeTradeWithGemini } from './services/geminiService';
import { PhaseLoader } from './PhaseLoader';
import { Typewriter } from './Typewriter';

export interface JournalProProps {
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

const NewsTicker: React.FC<{ prices: { btc: number, eth: number, sol: number } }> = React.memo(({ prices }) => {
    const [tickerOffset, setTickerOffset] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTickerOffset(prev => (prev + 0.05) % 100);
        }, 20);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 flex items-center opacity-70 whitespace-nowrap will-change-transform" style={{ transform: `translateX(-${tickerOffset}%)` }}>
            <span className="text-[10px] mono mx-4 font-bold">BTC {prices.btc.toFixed(2)} <span className="text-green-500">▲</span></span>
            <span className="text-[10px] mono mx-4 font-bold">ETH {prices.eth.toFixed(2)} <span className="text-red-500">▼</span></span>
            <span className="text-[10px] mono mx-4 font-bold">SOL {prices.sol.toFixed(2)} <span className="text-green-500">▲</span></span>
        </div>
    );
});

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
    trades: TradeEntry[]
}> = ({ isDarkMode, trades }) => {
    // ... [Content of MacroCalendar same as before] ...
    const [viewDate, setViewDate] = useState(new Date());
    const [timeFilter, setTimeFilter] = useState<'D'|'W'|'M'|'Y'>('M');
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
        trades.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!map[key]) map[key] = { pnl: 0, count: 0, trades: [] };
            map[key].pnl += t.pnl;
            map[key].count += 1;
            map[key].trades.push(t);
        });
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
                        const d = new Date(t.date);
                        if(d.getFullYear() === year && d.getMonth() === m) {
                            monthlyPnL += t.pnl;
                            tradeCount++;
                            const day = d.getDate();
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
                                <div className={`text-xs font-black text-right ${hasMonthData ? (isProfitable ? 'text-emerald-500' : 'text-rose-500') : 'text-emerald-500 opacity-30'}`}>{hasMonthData ? (isProfitable ? '+' : '') + monthlyPnL.toFixed(0) : '+PNL'}</div>
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
            <div className="grid grid-cols-7 grid-rows-6 h-full gap-x-2 gap-y-1 animate-in fade-in duration-300">
                 {['S','M','T','W','T','F','S'].map(d => <div key={d} className="flex items-center justify-center text-[8px] opacity-30 font-bold h-4">{d}</div>)}
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
                         <div key={day} onClick={() => { setViewDate(new Date(year, month, day)); setTimeFilter('D'); }} className={`relative group transition-all duration-300 cursor-pointer flex flex-col p-1 border-t pt-1 min-h-[50px] ${containerClass} ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                             <span className={`text-[10px] font-bold shrink-0 ${hasData ? (isDarkMode ? 'text-white' : 'text-stone-900') : (isDarkMode ? 'text-stone-500' : 'text-stone-400')} group-hover:text-stone-900 dark:group-hover:text-white`}>{day}</span>
                            {hasData && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <div className={`text-xs md:text-sm font-bold font-sans tracking-wide leading-none ${isWin ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-rose-400' : 'text-rose-600')}`}>{isWin ? '+' : ''}{pnl}</div>
                                    <div className="text-[8px] opacity-40 font-mono mt-0.5 whitespace-nowrap">{tradeCount} {tradeCount === 1 ? 'Trade' : 'Trades'}</div>
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
                                            <div key={trade.id} className={`shrink-0 min-w-[50%] max-w-[50%] p-3 border-r ${isDarkMode ? 'border-white/5' : 'border-black/5'} flex flex-col justify-between h-full ${boxClass}`}>
                                                <div className="flex justify-between items-start"><span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{trade.asset}</span><span className={`text-xs font-mono font-bold ${textPnlClass}`}>{trade.pnl >= 0 ? '+' : ''}{trade.pnl}</span></div>
                                                <div className={`text-[9px] line-clamp-2 leading-relaxed opacity-80 font-medium ${isDarkMode?'text-stone-300':'text-stone-700'}`}>{trade.notes}</div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className={`w-20 shrink-0 flex flex-col justify-center items-center px-1 gap-1 bg-transparent border-l ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>{data ? (<div className="text-center"><div className={`text-sm font-black font-mono mb-0.5 ${data.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{data.pnl >= 0 ? '+' : ''}{data.pnl}</div><div className="text-[8px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{data.count} {data.count === 1 ? 'Trade' : 'Trades'}</div></div>) : (<span className="text-xl font-bold text-stone-800 dark:text-stone-800 opacity-20 select-none">—</span>)}</div>
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
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2 px-2"><span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'} Found</span>{data && (<span className={`text-xs font-mono font-bold ${data.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Net: {data.pnl >= 0 ? '+' : ''}{data.pnl}</span>)}</div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2" style={{ touchAction: 'pan-y' }}>
                    {dayTrades.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30"><NotebookIcon className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold uppercase">No Activity</span></div>
                    ) : (
                        dayTrades.map(trade => (
                            <div key={trade.id} className={`p-3 rounded-xl border flex gap-3 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className={`w-1 rounded-full ${trade.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} /><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="font-bold text-xs">{trade.asset}</span><span className={`font-mono font-bold text-xs ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{trade.pnl > 0 ? '+' : ''}{trade.pnl}</span></div><div className="flex gap-2 mb-1"><span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 border border-white/5 uppercase opacity-70">{trade.strategy || 'Setup'}</span><span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 border border-white/5 uppercase opacity-70">{trade.session || 'Session'}</span></div><p className="text-[10px] opacity-60 leading-relaxed line-clamp-2">{trade.notes}</p></div></div>
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
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
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
            <div className="flex-1 min-w-0">
                {renderCurrentView()}
            </div>
        </div>
    );
};

export const JournalPro: React.FC<JournalProProps> = ({ isDarkMode, onExit, onToggleTheme, onSubmit, onDelete, trades }) => {
  // --- STATE & DATA ---
  const [activeTab, setActiveTab] = useState('JOURNAL');
  const [tiltMode, setTiltMode] = useState(false);
  const [viewState, setViewState] = useState<'FORM' | 'ANALYZING' | 'REVIEW'>('FORM');
  const [activeMobileSlide, setActiveMobileSlide] = useState(0); 
  
  // LOG ENTRY vs HISTORY Toggle
  const [logMode, setLogMode] = useState<'ENTRY' | 'HISTORY'>('ENTRY');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // History Interaction States
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

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
             if (activeMobileSlide < 2) setActiveMobileSlide(s => s + 1);
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
              if (dy > 0 && activeMobileSlide < 2) { setActiveMobileSlide(s => s + 1); activateCooldown(); } 
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
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis State
  const [isAnalysisReady, setIsAnalysisReady] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  // Gamification & Visuals
  const [xp, setXp] = useState(2450);
  const currentLevel = 12;
  const progress = 65;
  const coins = 420;

  const isMobileAnalysisMode = viewState === 'ANALYZING' || viewState === 'REVIEW';
  
  const prices = useMemo(() => ({ btc: 65430.20, eth: 3450.15, sol: 145.80 }), []);
  const radarData = [
      { subject: 'Discipline', A: 80, fullMark: 100 },
      { subject: 'Win Rate', A: 65, fullMark: 100 },
      { subject: 'Risk Mgmt', A: 90, fullMark: 100 },
      { subject: 'Patience', A: 50, fullMark: 100 },
      { subject: 'Execution', A: 85, fullMark: 100 },
      { subject: 'Focus', A: 70, fullMark: 100 },
  ];
  
  const sortedTrades = useMemo(() => {
      return [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades]);

  useEffect(() => {
    const val = parseFloat(pnl);
    if (!isNaN(val)) {
        if (val > 0) setOutcome('Win');
        else if (val < 0) setOutcome('Loss');
        else setOutcome('Break Even');
    }
  }, [pnl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = useCallback(async () => {
      setViewState('ANALYZING');
      setIsAnalysisReady(false);
      let imageBase64 = undefined;
      if (image) { try { imageBase64 = await fileToBase64(image); } catch(e) {} }
      analyzeTradeWithGemini(asset, Number(pnl), notes, imageBase64, direction, outcome, strategy, emotion, session)
        .then(res => { setAiFeedback(res); setIsAnalysisReady(true); });
  }, [asset, pnl, notes, image, direction, outcome, strategy, emotion, session]);

  const handleLoaderComplete = useCallback(() => { setViewState('REVIEW'); }, []);

  const handleConfirmLog = () => {
      onSubmit({ date, asset, pnl, notes, image, direction, outcome, strategy, session, emotion }, editingId || undefined);
      setViewState('FORM');
      setEditingId(null);
      setAsset(''); setPnl(''); setNotes(''); setImage(null); setPreviewUrl(null); setAiFeedback('');
  };

  const handleDojoOutcome = (win: boolean) => { if (win) setXp(p => p + 50); };

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
      setPreviewUrl(trade.imageUrl || null);
      if(trade.direction) setDirection(trade.direction);
      if(trade.outcome) setOutcome(trade.outcome);
      if(trade.strategy) setStrategy(trade.strategy);
      if(trade.session) setSession(trade.session);
      if(trade.emotion) setEmotion(trade.emotion);
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
             
             {/* --- HEADER WITH TOGGLE --- */}
             <div className="px-5 pt-5 pb-2 shrink-0">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-yellow-500 dark:bg-bronze-500 rotate-45 rounded-[1px]"></span>
                        {logMode === 'ENTRY' ? (editingId ? 'Edit Entry' : 'Log Entry') : 'Trade Log'}
                    </h3>
                    <div className="flex items-center gap-1 bg-stone-100 dark:bg-white/5 p-1 rounded-lg">
                        <button 
                            onClick={() => setLogMode('ENTRY')}
                            className={`p-1.5 rounded-md transition-all ${logMode === 'ENTRY' ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <NotebookIcon className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setLogMode('HISTORY')}
                            className={`p-1.5 rounded-md transition-all ${logMode === 'HISTORY' ? 'bg-white dark:bg-stone-700 shadow text-yellow-500 dark:text-bronze-500' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <BookIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
             </div>

             {/* --- FORM VIEW --- */}
             {logMode === 'ENTRY' && viewState === 'FORM' && (
                 <div className="flex flex-col animate-in fade-in duration-300 h-full min-h-0">
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
                                 <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm">
                                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Session</label>
                                 <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none truncate shadow-sm">
                                    {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                         </div>
                         
                         {/* Row 4: Emotion */}
                         <div className="shrink-0">
                             <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Emotion</label>
                             <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-2 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none appearance-none shadow-sm">
                                {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                             </select>
                         </div>

                         {/* Row 5: Notes (Swapped) */}
                         <div className="flex-col flex-1 min-h-[60px] flex mb-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 block ml-1">Notes</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Trade logic..." 
                                className="w-full flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 outline-none resize-none placeholder-stone-400 dark:placeholder-slate-600 leading-relaxed" 
                            />
                         </div>

                         {/* Row 6: Image (Slimmed & Swapped) */}
                         <div className="shrink-0">
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className={`w-full h-12 bg-white dark:bg-slate-900 border border-dashed border-stone-200 dark:border-slate-700 hover:border-yellow-500 dark:hover:border-bronze-500 rounded-xl flex items-center ${previewUrl ? 'justify-between px-4' : 'justify-center gap-3'} cursor-pointer transition-all group overflow-hidden relative ${previewUrl ? 'border-solid border-yellow-500/50 dark:border-bronze-500/50' : ''}`}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                                
                                {!previewUrl ? (
                                    <>
                                        <UploadIcon 
                                            className="w-4 h-4 text-stone-400 dark:text-bronze-500 animate-bounce" 
                                            style={{ animationDuration: '3s' }}
                                        />
                                        <span className="text-[10px] font-bold text-stone-500 dark:text-bronze-500 uppercase tracking-wide">
                                            Click to upload chart
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                                                Chart Attached
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-12 rounded bg-stone-100 dark:bg-black/50 overflow-hidden border border-stone-200 dark:border-slate-700">
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-80" />
                                            </div>
                                            <span className="text-[8px] font-bold text-stone-400 uppercase">Change</span>
                                        </div>
                                    </>
                                )}
                            </div>
                         </div>

                     </div>
                 </div>
             )}

            {/* --- HISTORY VIEW --- */}
            {logMode === 'HISTORY' && (
                <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 h-full overflow-hidden">
                    {sortedTrades.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
                            <NotebookIcon className="w-12 h-12 mb-3" />
                            <h4 className="font-bold text-sm uppercase tracking-widest">No Trade Logs</h4>
                            <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">Start journaling your trades to see your history here.</p>
                        </div>
                    ) : (
                       <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-3" style={{ touchAction: 'pan-y' }}>
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
                                            <div className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>{new Date(trade.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className={`font-bold font-mono ${trade.pnl >= 0 ? (isDarkMode ? 'text-emerald-500' : 'text-emerald-600') : (isDarkMode ? 'text-rose-500' : 'text-rose-600')}`}>
                                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
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
                                                <p className={`text-[11px] leading-relaxed font-mono opacity-90 ${expandedInsights.has(trade.id) ? '' : 'line-clamp-4'} ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
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
                            className="w-full py-3.5 rounded-xl font-black text-sm shadow-lg hover:shadow-yellow-500/20 dark:hover:shadow-bronze-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 bg-yellow-500 dark:bg-bronze-500 hover:bg-yellow-400 dark:hover:bg-bronze-400 border border-yellow-600 dark:border-bronze-600 text-black dark:text-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
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

  return (
    <div className="w-full h-screen">
    <div className={`w-full h-full ${isDarkMode ? 'bg-[#050505] text-slate-200' : 'bg-[#F0F0F0] text-stone-800'} font-sans flex flex-col relative overflow-hidden`}>
        {/* Header */}
             <header className={`shrink-0 flex justify-between items-center z-50 py-4 px-6 border-b transition-all duration-300 ${isDarkMode ? 'bg-[#050505] border-white/5' : 'bg-white border-black/5'}`}>
                <div className="flex items-center gap-3 group cursor-pointer" onClick={onExit}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 border ${isDarkMode ? 'bg-[#1C1C1E] text-white border-white/10' : 'bg-white text-stone-900 border-black/10'}`}>
                        <TreeIcon className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="font-bold text-sm md:text-lg tracking-tight flex items-center gap-1 leading-none">
                            Journal
                            <span className="text-bronze-500">XX</span>
                            <span className={`text-base md:text-xl font-black italic ml-0.5 px-1 rounded bg-clip-text text-transparent ${proTextGradient}`}>
                                PRO
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-bold tracking-wider whitespace-nowrap ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>LVL {currentLevel}</span>
                            <div className={`w-12 md:w-16 h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-stone-800' : 'bg-stone-200'}`}>
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className={`text-[8px] font-bold tracking-wider whitespace-nowrap ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>{xp} XP</span>
                       </div>
                    </div>
                </div>

                <div className={`hidden md:flex items-center gap-6 px-6 py-2 rounded-full border backdrop-blur-md overflow-hidden relative w-[400px] ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                     <NewsTicker prices={prices} />
                </div>

                <div className="flex items-center gap-3">
                     <button 
                        onClick={onToggleTheme}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-black/5 text-stone-600 hover:bg-black/10'}`}
                     >
                        {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                     </button>
                     <div className={`px-2 py-1 rounded-full border flex items-center gap-1.5 ${isDarkMode ? 'border-bronze-500/30 bg-bronze-500/10 text-bronze-500' : 'border-yellow-600/30 bg-yellow-100 text-yellow-700'}`}>
                        <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">XX COINS</span>
                        <span className="text-[8px] font-mono whitespace-nowrap">| {coins} 💎</span>
                     </div>
                </div>
             </header>

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
                 {activeTab === 'JOURNAL' && (
                     <>
                         <div 
                            className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                            style={{ transform: `translateY(-${activeMobileSlide * 100}%)` }}
                         >
                             {/* Slide 1: Calendar */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false}>
                                    <MacroCalendar isDarkMode={isDarkMode} trades={trades} />
                                </SpotlightCard>
                             </div>

                             {/* Slide 2: Trader DNA */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={false}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">Trader DNA</h3>
                                        <ActivityIcon className="w-4 h-4 opacity-50" />
                                    </div>
                                    <div className="flex-1 -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                           <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                               <PolarGrid stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                                               <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#a1a1aa' : '#78716c', fontSize: 10, fontWeight: 'bold' }} />
                                               <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                               <Radar name="Performance" dataKey="A" stroke={isDarkMode ? "#cd7f32" : "#ca8a04"} strokeWidth={2} fill={isDarkMode ? "#cd7f32" : "#ca8a04"} fillOpacity={0.3} />
                                               <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: isDarkMode ? '#e4e4e7' : '#27272a', fontSize: '12px', fontWeight: 'bold' }} />
                                           </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </SpotlightCard>
                             </div>

                             {/* Slide 3: Log Entry */}
                             <div className="w-full h-full p-4 pb-24">
                                <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={false} noPadding={true}>
                                    {LogEntryContent}
                                </SpotlightCard>
                             </div>
                         </div>

                         {/* Vertical Indicators - Right side */}
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
                     </>
                 )}

                 {/* MECCA TAB - Static view */}
                 {activeTab === 'MECCA' && (
                     <div className="w-full h-full p-4 pb-24">
                         <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-stone-200 dark:border-white/10 rounded-3xl">
                             <span className="text-sm font-bold uppercase tracking-widest opacity-30">MECCA Coming Soon</span>
                         </div>
                     </div>
                 )}

                 {/* CALCU TAB - Static view */}
                 {activeTab === 'CALCU' && (
                     <div className="w-full h-full p-4 pb-24">
                         <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-stone-200 dark:border-white/10 rounded-3xl">
                             <span className="text-sm font-bold uppercase tracking-widest opacity-30">CALCU Coming Soon</span>
                         </div>
                     </div>
                 )}

                 {/* GAMES TAB - Static view */}
                 {activeTab === 'GAMES' && (
                     <div className="w-full h-full overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4 p-4 pb-24">
                             <SpotlightCard className="h-[calc(50vh-4rem)] min-h-[300px] w-full" isDarkMode={isDarkMode} tilt={false}>
                                 <TradeReplayWidget isDarkMode={isDarkMode} trades={trades} />
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
                                            ? `border ${isDarkMode ? 'border-bronze-500/50 bg-bronze-500/10 shadow-[0_0_15px_rgba(205,127,50,0.15)]' : 'border-yellow-500/50 bg-yellow-500/10'}`
                                            : 'opacity-60 hover:opacity-100 hover:bg-white/5 border border-transparent'
                                        }`}
                                     >
                                        <item.icon className={`w-5 h-5 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-600'}`} />
                                     </button>
                                 ))}
                             </div>
                             
                             <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                                 {/* JOURNAL TAB: Calendar & Radar */}
                                 {activeTab === 'JOURNAL' && (
                                     <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
                                         <div className="flex-[3] min-w-0 h-full">
                                             <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={tiltMode}>
                                                 <MacroCalendar isDarkMode={isDarkMode} trades={trades} />
                                             </SpotlightCard>
                                         </div>
                                         <div className="flex-1 min-w-[200px] h-full">
                                             <SpotlightCard className="h-full w-full flex flex-col" isDarkMode={isDarkMode} tilt={tiltMode}>
                                                 <div className="flex justify-between items-center mb-6">
                                                     <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">Trader DNA</h3>
                                                     <ActivityIcon className="w-4 h-4 opacity-50" />
                                                 </div>
                                                 <div className="flex-1 -ml-4">
                                                     <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                            <PolarGrid stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                                                            <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#a1a1aa' : '#78716c', fontSize: 10, fontWeight: 'bold' }} />
                                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                            <Radar name="Performance" dataKey="A" stroke={isDarkMode ? "#cd7f32" : "#ca8a04"} strokeWidth={2} fill={isDarkMode ? "#cd7f32" : "#ca8a04"} fillOpacity={0.3} />
                                                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: isDarkMode ? '#e4e4e7' : '#27272a', fontSize: '12px', fontWeight: 'bold' }} />
                                                        </RadarChart>
                                                     </ResponsiveContainer>
                                                 </div>
                                             </SpotlightCard>
                                         </div>
                                     </div>
                                 )}

                                 {/* GAMES TAB: Replay & Dojo */}
                                 {activeTab === 'GAMES' && (
                                     <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                                         <div className="flex-[3] min-w-0 h-full">
                                            <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={tiltMode}>
                                                <TradeReplayWidget isDarkMode={isDarkMode} trades={trades} />
                                            </SpotlightCard>
                                         </div>
                                         <div className="flex-1 min-w-[200px] h-full">
                                            <SpotlightCard className="h-full w-full" isDarkMode={isDarkMode} tilt={tiltMode}>
                                                <PatternDojo isDarkMode={isDarkMode} onOutcome={handleDojoOutcome} />
                                            </SpotlightCard>
                                         </div>
                                     </div>
                                 )}

                                 {/* PLACEHOLDERS for other tabs */}
                                 {(activeTab === 'MECCA' || activeTab === 'CALCU') && (
                                     <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-stone-200 dark:border-white/10 rounded-3xl animate-in fade-in duration-300">
                                         <span className="text-sm font-bold uppercase tracking-widest opacity-30">Module Coming Soon</span>
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>

                     {/* Right Sidebar (Log Trade Form) - Only show on JOURNAL tab */}
                     {activeTab === 'JOURNAL' && (
                       <div className={`col-span-12 lg:col-span-3 flex flex-col h-[calc(100vh-10rem)] ${isDarkMode ? '' : 'bg-[#F0F0F0]'}`}>
                          <SpotlightCard className={`w-full h-full flex flex-col`} isDarkMode={isDarkMode} noPadding={true}>
                              {LogEntryContent}
                          </SpotlightCard>
                       </div>
                     )}

                 </div>
             </div>

             {/* Mobile Bottom Nav */}
             <div className={`absolute bottom-0 left-0 right-0 z-50 lg:hidden px-6 pb-6 pt-2 bg-gradient-to-t ${isDarkMode ? 'from-[#050505] via-[#050505]/90 to-transparent' : 'from-[#F0F0F0] via-[#F0F0F0]/90 to-transparent'}`}>
                <div className={`flex items-center justify-around p-2 rounded-2xl border ${isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-black/5'} shadow-2xl`}>
                    {NAV_ITEMS.map((item) => (
                         <button
                            key={item.id} 
                            onClick={() => handleTabChange(item.id)}
                            className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                activeTab === item.id 
                                ? `border ${isDarkMode ? 'border-bronze-500/50 bg-bronze-500/10 shadow-[0_0_15px_rgba(205,127,50,0.15)]' : 'border-yellow-500/50 bg-yellow-500/10'}`
                                : 'opacity-60 hover:opacity-100 border border-transparent'
                            }`}
                         >
                            <item.icon className={`w-5 h-5 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-600'}`} />
                         </button>
                     ))}
                </div>
             </div>
        </div>
    </div>
    );
};