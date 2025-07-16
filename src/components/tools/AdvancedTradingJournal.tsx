import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TradeJournalEntry } from '@/api/entities';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, ChevronRight, Plus, X, Camera, Trash2, 
  ArrowLeft, TrendingUp, TrendingDown, Target, PieChart, Activity, Globe, Search 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Trade {
  id: string;
  asset_ticker: string;
  pnl: number;
  trade_date: string;
  notes?: string;
  screenshot_url?: string;
  ai_positive_feedback?: string;
  trade_type?: 'Long' | 'Short';
  created_at: string;
}

interface AdvancedTradingJournalProps {
  onBackToBasic: () => void;
}

export default function AdvancedTradingJournal({ onBackToBasic }: AdvancedTradingJournalProps) {
  const [entries, setEntries] = useState<Trade[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    return localStorage.getItem('trading-journal-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  
  // Form state
  const [formData, setFormData] = useState({
    asset_ticker: '',
    pnl: '',
    notes: '',
    trade_type: null as 'Long' | 'Short' | null,
    outcome: null as 'Win' | 'Loss' | 'Breakeven' | null
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  // Recent assets for suggestions

  // Currency pairs for auto-detection
  const commonCurrencyPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'GBPCHF',
    'GBPAUD', 'GBPCAD', 'AUDJPY', 'AUDCAD', 'AUDCHF', 'NZDJPY', 'NZDCAD',
    'CADCHF', 'CADJPY', 'CHFJPY', 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOUSD'
  ];

  // Get recent asset pairs from localStorage
  const getRecentAssets = (): string[] => {
    try {
      const stored = localStorage.getItem('recent-trading-assets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save asset to recent list
  const saveRecentAsset = (asset: string) => {
    if (!asset.trim()) return;
    
    const recent = getRecentAssets();
    const normalized = asset.toUpperCase().trim();
    
    // Remove if already exists and add to front
    const filtered = recent.filter(item => item !== normalized);
    const updated = [normalized, ...filtered].slice(0, 5); // Keep only 5 most recent
    
    localStorage.setItem('recent-trading-assets', JSON.stringify(updated));
  };

  // Filter suggestions based on search term
  const getAssetSuggestions = (): string[] => {
    const term = formData.asset_ticker.toUpperCase();
    const recent = getRecentAssets();
    
    if (!term) return recent;
    
    // Currency pairs that match the search term
    const matchingPairs = commonCurrencyPairs.filter(pair => 
      pair.includes(term) || pair.startsWith(term)
    );
    
    // Recent assets that match
    const matchingRecent = recent.filter(asset => 
      asset.includes(term) || asset.startsWith(term)
    );
    
    // Combine and deduplicate, prioritizing exact matches
    const exactMatches = [...matchingPairs, ...matchingRecent].filter(item => item.startsWith(term));
    const partialMatches = [...matchingPairs, ...matchingRecent].filter(item => item.includes(term) && !item.startsWith(term));
    
    return [...new Set([...exactMatches, ...partialMatches])].slice(0, 8);
  };

  // Available timezones for selection
  const availableTimezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Australia/Sydney',
    'UTC'
  ];

  // Helper function to format dates in selected timezone
  const formatDateInTimezone = (date: Date | string, formatStr: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, selectedTimezone, formatStr);
  };

  // Helper function to get current date in selected timezone
  const getCurrentDateInTimezone = () => {
    const now = new Date();
    return formatInTimeZone(now, selectedTimezone, 'yyyy-MM-dd');
  };

  // Save timezone preference
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('trading-journal-timezone', timezone);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchedEntries = await TradeJournalEntry.list(user.id);
        setEntries(fetchedEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error loading journal entries:", error);
    }
    setIsLoading(false);
  };

  const getTradesForDate = (dateStr: string): Trade[] => {
    return entries.filter(entry => {
      const entryDate = entry.trade_date.split('T')[0];
      return entryDate === dateStr;
    });
  };

  const getFilteredTrades = (): Trade[] => {
    const todayInTimezone = getCurrentDateInTimezone();
    
    switch(timeFilter) {
      case 'daily':
        return entries.filter(t => t.trade_date.split('T')[0] === todayInTimezone);
      case 'weekly':
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const weekAgoStr = formatDateInTimezone(weekAgo, 'yyyy-MM-dd');
        return entries.filter(t => t.trade_date.split('T')[0] >= weekAgoStr);
      case 'monthly':
        const currentMonth = todayInTimezone.substring(0, 7);
        return entries.filter(t => t.trade_date.split('T')[0].substring(0, 7) === currentMonth);
      case 'yearly':
        const currentYear = todayInTimezone.substring(0, 4);
        return entries.filter(t => t.trade_date.split('T')[0].substring(0, 4) === currentYear);
      case 'all':
        return entries;
      default:
        return entries.filter(t => t.trade_date.split('T')[0] === todayInTimezone);
    }
  };

  const calculateMetrics = (trades: Trade[]) => {
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = trades.filter(trade => trade.pnl > 0).length;
    const losses = trades.filter(trade => trade.pnl < 0).length;
    const breakevens = trades.filter(trade => trade.pnl === 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length * 100) : 0;
    
    const totalWinsPnl = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLossesPnl = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossesPnl > 0 ? (totalWinsPnl / totalLossesPnl) : (totalWinsPnl > 0 ? Infinity : 0);
    
    const avgWin = wins > 0 ? totalWinsPnl / wins : 0;
    const avgLoss = losses > 0 ? totalLossesPnl / losses : 0;

    return {
      totalPnl,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      wins,
      losses,
      breakevens,
      avgWin,
      avgLoss
    };
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setViewMode('day');
  };

  const handleBackToCalendar = () => {
    setViewMode('calendar');
    setSelectedDate(null);
  };

  const openModal = (trade?: Trade) => {
    if (trade) {
      setEditingTrade(trade);
      setFormData({
        asset_ticker: trade.asset_ticker,
        pnl: Math.abs(trade.pnl).toString(),
        notes: trade.notes || '',
        trade_type: trade.trade_type || null,
        outcome: trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'Breakeven'
      });
      if (trade.screenshot_url) {
        setScreenshotPreview(trade.screenshot_url);
      }
    } else {
      setEditingTrade(null);
      setFormData({
        asset_ticker: '',
        pnl: '',
        notes: '',
        trade_type: null,
        outcome: null
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrade(null);
    setFormData({
      asset_ticker: '',
      pnl: '',
      notes: '',
      trade_type: null,
      outcome: null
    });
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTrade = async () => {
    if (!formData.asset_ticker || !formData.pnl) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        return;
      }

      // Save asset to recent list
      saveRecentAsset(formData.asset_ticker);

      let screenshot_url = screenshotPreview;
      if (screenshotFile) {
        const { file_url } = await UploadFile({ file: screenshotFile });
        screenshot_url = file_url;
      }

      let pnlValue = parseFloat(formData.pnl);
      if (formData.outcome === 'Loss') {
        pnlValue = -Math.abs(pnlValue);
      }

      const tradeDate = selectedDate || getCurrentDateInTimezone();

      const tradeData = {
        asset_ticker: formData.asset_ticker,
        pnl: pnlValue,
        trade_date: tradeDate,
        notes: formData.notes,
        screenshot_url,
        trade_type: formData.trade_type
      };

      if (editingTrade) {
        await TradeJournalEntry.update(editingTrade.id, tradeData);
      } else {
        const aiPrompt = `
          You are a supportive and positive trading coach. Your goal is to find something positive or a valuable learning experience in the user's trade, regardless of whether it was a win or a loss.
          The user has submitted a journal entry for ${pnlValue >= 0 ? 'a winning trade' : 'a losing trade'} of ${pnlValue} USD.
          Their personal notes are: "${formData.notes}"
          
          Analyze their notes and the trade outcome. If a screenshot is provided, analyze it for good practices (like proper stop loss placement, good entry point relative to indicators, etc.).
          
          Provide a short, encouraging comment (1-2 sentences) that highlights a good practice, a smart observation from their notes, or a constructive takeaway. Focus on their process, discipline, or self-awareness, not just the monetary result. Start your response directly with the feedback.
        `;

        const aiResult = await InvokeLLM({
          prompt: aiPrompt,
          file_urls: screenshot_url ? [screenshot_url] : [],
        });

        await TradeJournalEntry.create({
          ...tradeData,
          ai_positive_feedback: aiResult
        }, user.id);
      }

      loadEntries();
      closeModal();
    } catch (error) {
      console.error("Error saving trade:", error);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      try {
        await TradeJournalEntry.delete(tradeId);
        loadEntries();
      } catch (error) {
        console.error("Error deleting trade:", error);
      }
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - (firstDayOfWeek - i));
      return date;
    });

    const allDays = [...paddingDays, ...days];

    return (
      <div className="grid grid-cols-7 gap-px bg-border/30">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="text-center text-[10px] text-muted-foreground font-medium p-2 bg-background">
            {day}
          </div>
        ))}
        {allDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTrades = getTradesForDate(dateStr);
          const totalPnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelectedDay = selectedDate === dateStr;
          
          return (
            <div
              key={index}
              className={`
                relative min-h-[40px] p-1.5 cursor-pointer transition-colors bg-background border-border/20
                ${!isCurrentMonth ? 'opacity-25' : ''}
                ${isSelectedDay ? 'bg-primary text-primary-foreground' : ''}
                ${dayTrades.length > 0 && !isSelectedDay
                  ? totalPnl > 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20' 
                    : totalPnl < 0 
                      ? 'bg-red-50 dark:bg-red-950/20'
                      : 'bg-yellow-50 dark:bg-yellow-950/20'
                  : !isSelectedDay ? 'hover:bg-muted/30' : ''
                }
              `}
              onClick={() => handleDateClick(dateStr)}
            >
              <span className={`text-[10px] font-medium ${isToday(day) && !isSelectedDay ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayTrades.length > 0 && !isSelectedDay && (
                <div className="mt-0.5">
                  <div className={`text-[8px] font-semibold ${totalPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : totalPnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    ${totalPnl.toFixed(0)}
                  </div>
                  <div className="text-[7px] text-muted-foreground">{dayTrades.length}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    if (!selectedDate) return null;
    
    const dayTrades = getTradesForDate(selectedDate);
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCalendar}
              className="h-7 w-7 p-0"
            >
              <ArrowLeft className="w-3 h-3" />
            </Button>
            <h3 className="text-sm font-semibold text-foreground">
              {format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <Button
            onClick={() => openModal()}
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-1.5">
          {dayTrades.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <Activity className="w-6 h-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs">No trades logged</p>
            </div>
          ) : (
            dayTrades.map((trade) => (
              <Card key={trade.id} className="bg-card border border-border/40">
                <CardContent className="p-2.5">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="text-xs font-semibold text-foreground">{trade.asset_ticker}</h4>
                        {trade.trade_type && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                            {trade.trade_type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {formatDateInTimezone(trade.trade_date.split('T')[0] + 'T12:00:00', 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge 
                        variant="outline"
                        className={`text-[8px] h-4 px-1 font-medium ${trade.pnl > 0 
                          ? 'text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-950/20' 
                          : trade.pnl < 0 
                            ? 'text-red-600 border-red-600/30 bg-red-50 dark:text-red-400 dark:border-red-400/30 dark:bg-red-950/20'
                            : 'text-yellow-600 border-yellow-600/30 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400/30 dark:bg-yellow-950/20'
                        }`}
                      >
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(trade)}
                        className="h-5 w-5 p-0 text-[8px]"
                      >
                        ✎
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="mb-1.5">
                      <p className="text-[9px] text-muted-foreground line-clamp-2">{trade.notes}</p>
                    </div>
                  )}

                  {trade.ai_positive_feedback && (
                    <div className="mb-1.5 p-1.5 bg-muted/20 border-l border-primary/30 rounded-sm">
                      <p className="text-[8px] text-muted-foreground line-clamp-2">{trade.ai_positive_feedback}</p>
                    </div>
                  )}

                  {trade.screenshot_url && (
                    <div className="mt-1.5">
                      <img 
                        src={trade.screenshot_url} 
                        alt="Trade screenshot" 
                        className="w-full max-w-[160px] rounded border border-border/30"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  // Chart rendering with minimal design
  const renderEquityChart = () => {
    const filteredTrades = getFilteredTrades();
    
    if (filteredTrades.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No trades to display</p>
        </div>
      );
    }

    const sortedTrades = [...filteredTrades].sort((a, b) => 
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );

    let cumulativePnL = 0;
    const equityData: Array<{ date: string, value: number, index: number, isStarting: boolean }> = [];
    
    if (sortedTrades.length > 0) {
      equityData.push({
        date: sortedTrades[0].trade_date,
        value: 0,
        index: 0,
        isStarting: true
      });
    }
    
    sortedTrades.forEach((trade, index) => {
      cumulativePnL += trade.pnl;
      equityData.push({
        date: trade.trade_date,
        value: cumulativePnL,
        index: index,
        isStarting: false
      });
    });

    const maxValue = Math.max(...equityData.map(d => d.value), 0);
    const minValue = Math.min(...equityData.map(d => d.value), 0);
    const range = Math.max(maxValue - minValue, 100);
    
    const startingPoint = { 
      x: 0, 
      y: ((maxValue - 0) / range) * 100, 
      value: 0, 
      isStarting: true,
      date: sortedTrades[0].trade_date
    };
    const chartPoints = equityData.map((point, index) => ({
      x: (index / (equityData.length - 1 || 1)) * 100,
      y: ((maxValue - point.value) / range) * 100,
      value: point.value,
      date: point.date,
      isStarting: point.isStarting
    }));

    const totalPnl = cumulativePnL;
    
    return (
      <div className="relative">
        <div className="relative h-32 bg-background border border-border/30 rounded p-3 overflow-hidden">
          <svg className="w-full h-full relative" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={totalPnl >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity="0.8" />
                <stop offset="100%" stopColor={totalPnl >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity="1" />
              </linearGradient>
            </defs>

            <path
              d={`M 0,${startingPoint.y} ${chartPoints.map((point, index) => `L ${point.x},${point.y}`).join(' ')}`}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              className="transition-all duration-300"
            />

            {[startingPoint, ...chartPoints].map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill={point.isStarting ? "hsl(var(--muted-foreground))" : point.value >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                stroke="hsl(var(--background))"
                strokeWidth="0.5"
                className="opacity-60"
              >
                <title>
                  {point.isStarting 
                    ? `Starting: $0.00`
                    : `${formatDateInTimezone(point.date.split('T')[0] + 'T12:00:00', 'MMM d')}: ${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`
                  }
                </title>
              </circle>
            ))}

            <line
              x1="0"
              y1={startingPoint.y}
              x2="100"
              y2={startingPoint.y}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredTrades = getFilteredTrades();
  const metrics = calculateMetrics(filteredTrades);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onBackToBasic}
              size="sm"
              className="h-7 w-7 p-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Advanced Trading Journal
              </h1>
              <p className="text-[9px] text-muted-foreground">Professional analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger className="w-32 h-6 text-[9px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTimezones.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-[9px]">
                    {tz.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
          {/* Performance Metrics Cards */}
          <div className="xl:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="border border-border/50">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground font-medium">Total P&L</span>
                </div>
                <div className="space-y-0.5">
                  <p className={`text-sm font-semibold ${metrics.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${metrics.totalPnl.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    {filteredTrades.length} trades
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground font-medium">Win Rate</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-primary">
                    {metrics.winRate.toFixed(1)}%
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    {metrics.wins}W / {metrics.losses}L
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <PieChart className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground font-medium">Profit Factor</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-primary">
                    {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    Risk/Reward
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground font-medium">Avg Trade</span>
                </div>
                <div className="space-y-0.5">
                  <p className={`text-sm font-semibold ${(metrics.totalPnl / Math.max(metrics.totalTrades, 1)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${(metrics.totalPnl / Math.max(metrics.totalTrades, 1)).toFixed(2)}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    Per trade
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Section */}
          <div className="xl:col-span-3">
            <Card className="h-[400px] border border-border/50">
              <CardContent className="p-4 h-full overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-semibold text-foreground">Trading Calendar</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="h-5 w-5 p-0"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </Button>
                    <span className="text-[9px] font-medium text-foreground px-2">
                      {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="h-5 w-5 p-0"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="h-[calc(100%-40px)]">
                  {viewMode === 'calendar' ? renderCalendar() : renderDayView()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Chart Sidebar */}
          <div className="xl:col-span-1">
            <Card className="h-[400px] border border-border/50">
              <CardContent className="p-3 h-full">
                <div className="space-y-3">
                  {/* Time Filter */}
                  <div>
                    <h4 className="text-[9px] font-semibold text-foreground mb-1.5">Time Filter</h4>
                    <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
                      <SelectTrigger className="w-full h-6 text-[9px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily" className="text-[9px]">Today</SelectItem>
                        <SelectItem value="weekly" className="text-[9px]">This Week</SelectItem>
                        <SelectItem value="monthly" className="text-[9px]">This Month</SelectItem>
                        <SelectItem value="yearly" className="text-[9px]">This Year</SelectItem>
                        <SelectItem value="all" className="text-[9px]">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Equity Chart */}
                  <div>
                    <h4 className="text-[9px] font-semibold text-foreground mb-1.5">Equity Curve</h4>
                    {renderEquityChart()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Trade Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg shadow-lg w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
              <Card className="m-0 border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingTrade ? 'Edit Trade' : 'Add New Trade'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeModal}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="block text-[10px] font-medium mb-1 text-foreground">Asset</label>
                        <div className="relative">
                          <Input
                            value={formData.asset_ticker}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, asset_ticker: e.target.value }));
                              setShowAssetDropdown(true);
                            }}
                            onFocus={() => setShowAssetDropdown(true)}
                            onBlur={() => {
                              // Delay hiding dropdown to allow clicks
                              setTimeout(() => setShowAssetDropdown(false), 300);
                            }}
                            placeholder="e.g., EURUSD, AAPL"
                            className="h-7 text-xs pr-8"
                          />
                          <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          
                          {/* Asset Suggestions Dropdown */}
                          {showAssetDropdown && (
                            <div 
                              className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[100] max-h-40 overflow-y-auto"
                              onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking dropdown
                            >
                              {getAssetSuggestions().length > 0 ? (
                                <div className="p-1">
                                  {!formData.asset_ticker && getRecentAssets().length > 0 && (
                                    <div className="px-2 py-1 text-[8px] text-muted-foreground font-medium border-b border-border/30 mb-1">
                                      Recent Assets
                                    </div>
                                  )}
                                  {getAssetSuggestions().map((asset, index) => (
                                    <button
                                      key={asset}
                                      type="button"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, asset_ticker: asset }));
                                        setShowAssetDropdown(false);
                                      }}
                                      className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-muted/50 rounded-sm transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{asset}</span>
                                        {commonCurrencyPairs.includes(asset) && (
                                          <Badge variant="outline" className="text-[7px] h-3 px-1">
                                            FX
                                          </Badge>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : formData.asset_ticker ? (
                                <div className="p-2 text-[9px] text-muted-foreground text-center">
                                  No matches found
                                </div>
                              ) : (
                                <div className="p-2 text-[9px] text-muted-foreground text-center">
                                  Start typing to see suggestions
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1 text-foreground">Amount ($)</label>
                        <Input
                          type="number"
                          value={formData.pnl}
                          onChange={(e) => setFormData(prev => ({ ...prev, pnl: e.target.value }))}
                          placeholder="150.50"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium mb-1 text-foreground">Direction</label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={formData.trade_type === 'Long' ? 'default' : 'outline'}
                            onClick={() => setFormData(prev => ({ ...prev, trade_type: 'Long' }))}
                            className="flex-1 h-6 text-[10px]"
                          >
                            Long
                          </Button>
                          <Button
                            type="button"
                            variant={formData.trade_type === 'Short' ? 'default' : 'outline'}
                            onClick={() => setFormData(prev => ({ ...prev, trade_type: 'Short' }))}
                            className="flex-1 h-6 text-[10px]"
                          >
                            Short
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1 text-foreground">Outcome</label>
                        <div className="flex gap-1">
                          {(['Win', 'Loss', 'Breakeven'] as const).map((outcome) => (
                            <Button
                              key={outcome}
                              type="button"
                              variant={formData.outcome === outcome ? 'default' : 'outline'}
                              onClick={() => setFormData(prev => ({ ...prev, outcome }))}
                              className="flex-1 h-6 text-[9px]"
                            >
                              {outcome === 'Breakeven' ? 'BE' : outcome}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1 text-foreground">Notes</label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        placeholder="Analysis and insights..."
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1 text-foreground">Screenshot</label>
                      <div className="border border-dashed border-border rounded p-3 text-center">
                        {screenshotPreview ? (
                          <div className="space-y-2">
                            <img 
                              src={screenshotPreview} 
                              alt="Preview" 
                              className="max-h-24 mx-auto rounded border"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setScreenshotFile(null);
                                setScreenshotPreview(null);
                              }}
                              className="h-6 text-[9px]"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Camera className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                            <label className="cursor-pointer text-primary hover:text-primary/80">
                              <span className="text-[10px]">Upload screenshot</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={closeModal} className="h-7 px-3 text-[10px]">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveTrade}
                        disabled={!formData.asset_ticker || !formData.pnl}
                        className="h-7 px-3 text-[10px]"
                      >
                        {editingTrade ? 'Update' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}