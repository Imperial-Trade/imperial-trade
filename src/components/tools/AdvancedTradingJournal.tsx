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
  ArrowLeft, TrendingUp, TrendingDown, Target, PieChart, Activity, Globe, Search, BarChart3, Eye, EyeOff
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
  strategy?: string;
  emotion?: string;
  session?: string;
  outcome?: 'Win' | 'Loss' | 'Breakeven';
}

interface AdvancedTradingJournalProps {
  onBackToBasic: () => void;
}

export default function AdvancedTradingJournal({ onBackToBasic }: AdvancedTradingJournalProps) {
  const [entries, setEntries] = useState<Trade[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    return localStorage.getItem('trading-journal-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [statsVisible, setStatsVisible] = useState(true);
  const [activeStatsTab, setActiveStatsTab] = useState<'most-traded' | 'ai-analytics'>('most-traded');
  
  // Form state
  const [formData, setFormData] = useState({
    asset_ticker: '',
    pnl: '',
    notes: '',
    trade_type: null as 'Long' | 'Short' | null,
    outcome: null as 'Win' | 'Loss' | 'Breakeven' | null,
    strategy: '',
    emotion: '',
    session: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [assetSuggestions, setAssetSuggestions] = useState([]);

  // Pre-defined lists for stable, offline-first suggestions
  const FOREX_PAIRS = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD',
    'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD',
    'AUD/JPY', 'AUD/CAD', 'AUD/CHF', 'AUD/NZD',
    'CAD/JPY', 'CAD/CHF', 'CHF/JPY', 'NZD/JPY', 'NZD/CHF', 'NZD/CAD'
  ];
  const COMMODITIES = ['XAU/USD', 'XAG/USD', 'WTI/USD', 'BRENT/USD'];
  const INDICES = ['SPX500', 'US30', 'NAS100', 'UK100', 'DAX30', 'JP225'];

  // Debounce hook for search
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };

  const debouncedAssetSearch = useDebounce(formData.asset_ticker, 300);

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

  // Main function to get and combine suggestions
  const getAssetSuggestions = async (query: string) => {
    const normalizedQuery = query.toUpperCase().trim();
    if (!normalizedQuery) {
      return getRecentAssets();
    }

    // Filter local lists based on the user's query
    const forexSuggestions = FOREX_PAIRS.filter(pair => pair.includes(normalizedQuery));
    const commoditySuggestions = COMMODITIES.filter(c => c.includes(normalizedQuery));
    const indexSuggestions = INDICES.filter(i => i.includes(normalizedQuery));

    // Fetch crypto suggestions from CoinGecko API
    let cryptoSuggestions: string[] = [];
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Format the crypto data to match the pair format (e.g., BTC/USDT)
        cryptoSuggestions = (data.coins || []).slice(0, 5).map((coin: any) => `${coin.symbol.toUpperCase()}/USDT`);
      }
    } catch (error) {
      console.warn("Could not fetch crypto suggestions:", error);
    }

    // Combine all sources, ensuring no duplicates
    const combined = [...indexSuggestions, ...forexSuggestions, ...commoditySuggestions, ...cryptoSuggestions];
    const uniqueSuggestions = [...new Set(combined)];

    return uniqueSuggestions.slice(0, 10);
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

  // Asset suggestions effect
  useEffect(() => {
    const searchAssets = async () => {
      if (debouncedAssetSearch) {
        const suggestions = await getAssetSuggestions(debouncedAssetSearch);
        setAssetSuggestions(suggestions);
      } else {
        setAssetSuggestions(getRecentAssets());
      }
    };
    searchAssets();
  }, [debouncedAssetSearch]);

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
        outcome: trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'Breakeven',
        strategy: trade.strategy || '',
        emotion: trade.emotion || '',
        session: trade.session || ''
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
        outcome: null,
        strategy: '',
        emotion: '',
        session: ''
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
      outcome: null,
      strategy: '',
      emotion: '',
      session: ''
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
          Strategy: ${formData.strategy || 'Not specified'}
          Emotion: ${formData.emotion || 'Not specified'}
          Session: ${formData.session || 'Not specified'}
          
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

  const getMostTradedAssets = (trades: Trade[]) => {
    const assetCounts = trades.reduce((acc, trade) => {
      const asset = trade.asset_ticker;
      acc[asset] = (acc[asset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(assetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));
  };

  const getAIInsights = (trades: Trade[]) => {
    if (trades.length === 0) return [];

    const bestTrade = trades.sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = trades.sort((a, b) => a.pnl - b.pnl)[0];
    
    const insights = [];
    
    if (bestTrade?.pnl > 0) {
      insights.push(`Best Trade: ${bestTrade.asset_ticker} with $${bestTrade.pnl.toFixed(2)} profit`);
    }
    
    if (worstTrade?.pnl < 0) {
      insights.push(`Biggest Loss: ${worstTrade.asset_ticker} with $${worstTrade.pnl.toFixed(2)} loss`);
    }

    const strategies = trades.reduce((acc, trade) => {
      if (trade.strategy) {
        acc[trade.strategy] = (acc[trade.strategy] || 0) + trade.pnl;
      }
      return acc;
    }, {} as Record<string, number>);

    const bestStrategy = Object.entries(strategies).sort(([,a], [,b]) => b - a)[0];
    if (bestStrategy) {
      insights.push(`Best Strategy: ${bestStrategy[0]} with $${bestStrategy[1].toFixed(2)} total P&L`);
    }

    return insights;
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
                relative min-h-[60px] p-1.5 cursor-pointer transition-colors bg-background border-border/20
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
              <span className={`text-xs font-medium ${isToday(day) && !isSelectedDay ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayTrades.length > 0 && !isSelectedDay && (
                <div className="mt-1">
                  <div className={`text-xs font-semibold ${totalPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : totalPnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    ${totalPnl.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{dayTrades.length} trades</div>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCalendar}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <Button onClick={() => openModal()} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </div>

        {dayTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trades recorded for this day
          </div>
        ) : (
          <div className="space-y-3">
            {dayTrades.map((trade) => (
              <Card key={trade.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openModal(trade)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{trade.asset_ticker}</h4>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {trade.trade_type && (
                          <Badge variant={trade.trade_type === 'Long' ? 'default' : 'secondary'} className="text-xs">
                            {trade.trade_type}
                          </Badge>
                        )}
                        {trade.strategy && (
                          <Badge variant="outline" className="text-xs">
                            {trade.strategy}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${trade.pnl.toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrade(trade.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {trade.notes && (
                    <p className="text-sm text-muted-foreground mb-2">{trade.notes}</p>
                  )}
                  
                  {trade.ai_positive_feedback && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded text-sm">
                      <div className="font-medium text-emerald-700 dark:text-emerald-300 mb-1">AI Coach:</div>
                      <p className="text-emerald-600 dark:text-emerald-400">{trade.ai_positive_feedback}</p>
                    </div>
                  )}
                  
                  {trade.screenshot_url && (
                    <div className="mt-2">
                      <img 
                        src={trade.screenshot_url} 
                        alt="Trade screenshot" 
                        className="max-w-full h-32 object-cover rounded border cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(trade.screenshot_url, '_blank');
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEquityChart = (trades: Trade[]) => {
    if (trades.length === 0) return <div className="h-40 flex items-center justify-center text-muted-foreground">No data to display</div>;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    let cumulativePnl = 0;
    const equityData = [{ pnl: 0, date: null }];
    
    sortedTrades.forEach(trade => {
      cumulativePnl += trade.pnl;
      equityData.push({ pnl: cumulativePnl, date: trade.trade_date });
    });

    const maxPnl = Math.max(...equityData.map(d => d.pnl));
    const minPnl = Math.min(...equityData.map(d => d.pnl));
    const range = maxPnl - minPnl || 1;

    return (
      <div className="h-40 w-full relative">
        <svg viewBox="0 0 500 160" className="w-full h-full">
          {equityData.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = equityData[index - 1];
            const x1 = ((index - 1) / (equityData.length - 1)) * 480 + 10;
            const x2 = (index / (equityData.length - 1)) * 480 + 10;
            const y1 = 150 - ((prevPoint.pnl - minPnl) / range) * 130;
            const y2 = 150 - ((point.pnl - minPnl) / range) * 130;
            
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={point.pnl >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth="2"
              />
            );
          })}
          <line x1="10" y1="10" x2="10" y2="150" stroke="#6b7280" strokeWidth="1" />
          <line x1="10" y1="150" x2="490" y2="150" stroke="#6b7280" strokeWidth="1" />
          {maxPnl !== minPnl && (
            <line x1="10" y1="80" x2="490" y2="80" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,2" />
          )}
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading journal...</p>
        </div>
      </div>
    );
  }

  const filteredTrades = getFilteredTrades();
  const metrics = calculateMetrics(filteredTrades);
  const mostTradedAssets = getMostTradedAssets(filteredTrades);
  const aiInsights = getAIInsights(filteredTrades);

  return (
    <div className="h-full bg-background text-foreground relative overflow-hidden">
      {viewMode === 'calendar' ? (
        <div className="flex flex-col h-full p-4">
          <div className="w-full max-w-7xl mx-auto bg-card p-4 md:p-6 rounded-lg shadow-lg flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Trading Journal</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsVisible(!statsVisible)}
                  className="h-8 w-8 p-0"
                >
                  {statsVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={onBackToBasic}>
                Back to Basic
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total P/L</div>
                  <div className={`text-2xl font-bold ${metrics.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${metrics.totalPnl.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Profit Factor</div>
                  <div className="text-2xl font-bold">
                    {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                  <div className="text-2xl font-bold">{metrics.totalTrades}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Stats Row */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Equity Curve */}
              <Card className="flex-grow">
                <CardContent className="p-4">
                  <h4 className="font-bold mb-2 text-center text-sm text-muted-foreground">Equity Curve</h4>
                  {renderEquityChart(filteredTrades)}
                </CardContent>
              </Card>

              {/* Stats Panel */}
              {statsVisible && (
                <Card className="w-full md:w-72">
                  <CardContent className="p-4">
                    <div className="flex bg-muted rounded-lg p-1 space-x-1 mb-4">
                      <Button
                        variant={activeStatsTab === 'most-traded' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveStatsTab('most-traded')}
                        className="flex-1 text-xs h-8"
                      >
                        Most Traded
                      </Button>
                      <Button
                        variant={activeStatsTab === 'ai-analytics' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveStatsTab('ai-analytics')}
                        className="flex-1 text-xs h-8"
                      >
                        AI Analytics
                      </Button>
                    </div>

                    {activeStatsTab === 'most-traded' ? (
                      <div>
                        <h4 className="font-bold mb-2 text-center text-muted-foreground text-sm">Most Traded Assets</h4>
                        {mostTradedAssets.length > 0 ? (
                          <div className="space-y-2">
                            {mostTradedAssets.map(({ asset, count }) => (
                              <div key={asset} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">{asset}</span>
                                <span className="font-semibold text-muted-foreground">{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-sm text-muted-foreground">No trades to analyze</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-bold mb-2 text-center text-muted-foreground text-sm">AI Coach Insights</h4>
                        {aiInsights.length > 0 ? (
                          <ul className="space-y-3 text-sm text-foreground">
                            {aiInsights.map((insight, index) => (
                              <li key={index} className="flex items-start">
                                <TrendingUp className="w-4 h-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-center text-sm text-muted-foreground">No trades to analyze</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Calendar Container */}
            <Card className="flex-1 min-h-0">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                  {/* Time Filter */}
                  <div className="flex bg-muted rounded-lg p-1 space-x-1">
                    {['daily', 'weekly', 'monthly', 'yearly', 'all'].map((filter) => (
                      <Button
                        key={filter}
                        variant={timeFilter === filter ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFilter(filter as any)}
                        className="text-xs capitalize h-8"
                      >
                        {filter === 'daily' ? 'Today' : filter === 'all' ? 'All' : filter}
                      </Button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentDate(newDate);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-lg font-semibold h-8"
                    >
                      {format(currentDate, 'MMMM yyyy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentDate(newDate);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Calendar */}
                <div className="flex-1 min-h-0">
                  {timeFilter === 'monthly' ? renderCalendar() : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p className="mb-4">
                          {timeFilter === 'daily' && 'Showing today\'s trades below. Select another filter to see calendar view.'}
                          {timeFilter === 'all' && 'Showing all trades below. Select a different filter to see calendar view.'}
                          {timeFilter === 'weekly' && 'Weekly view coming soon. Use monthly for now.'}
                          {timeFilter === 'yearly' && 'Yearly view coming soon. Use monthly for now.'}
                        </p>
                        {filteredTrades.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredTrades.map(trade => (
                              <div key={trade.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm cursor-pointer hover:bg-muted/70" onClick={() => openModal(trade)}>
                                <span className="font-medium">{trade.asset_ticker}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(trade.trade_date), 'MMM d')}</span>
                                <span className={`font-semibold ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  ${trade.pnl.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {renderDayView()}
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-bold">{editingTrade ? 'Edit Trade' : 'Log New Trade'}</h3>
              <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Ticker */}
              <div>
                <label className="block text-sm font-medium mb-2">Asset / Pair</label>
                <div className="relative">
                  <Input
                    value={formData.asset_ticker}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, asset_ticker: e.target.value }));
                      setShowAssetDropdown(true);
                    }}
                    onFocus={() => setShowAssetDropdown(true)}
                    onBlur={(e) => {
                      // Delay hiding to allow clicks on dropdown items
                      setTimeout(() => setShowAssetDropdown(false), 300);
                    }}
                    placeholder="e.g., SPX500, XAU/USD, BTC/USDT"
                    className="w-full"
                  />
                  {showAssetDropdown && assetSuggestions.length > 0 && (
                    <div className="absolute z-[100] w-full bg-popover border rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                      {assetSuggestions.map((suggestion, index) => {
                        const getAssetType = (asset: string) => {
                          if (FOREX_PAIRS.includes(asset)) return { type: 'Forex', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
                          if (COMMODITIES.includes(asset)) return { type: 'Commodity', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
                          if (INDICES.includes(asset)) return { type: 'Index', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
                          if (asset.includes('/USDT')) return { type: 'Crypto', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
                          return { type: 'Recent', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
                        };

                        const assetInfo = getAssetType(suggestion);

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, asset_ticker: suggestion }));
                              setShowAssetDropdown(false);
                            }}
                          >
                            <span className="font-medium">{suggestion}</span>
                            <Badge variant="secondary" className={`text-xs ${assetInfo.color}`}>
                              {assetInfo.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* P&L */}
              <div>
                <label className="block text-sm font-medium mb-2">Profit / Loss ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pnl}
                  onChange={(e) => setFormData(prev => ({ ...prev, pnl: e.target.value }))}
                  placeholder="e.g., 150.50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direction */}
              <div>
                <label className="block text-sm font-medium mb-2">Direction</label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={formData.trade_type === 'Long' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, trade_type: 'Long' }))}
                    className="flex-1"
                  >
                    Long
                  </Button>
                  <Button
                    type="button"
                    variant={formData.trade_type === 'Short' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, trade_type: 'Short' }))}
                    className="flex-1"
                  >
                    Short
                  </Button>
                </div>
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium mb-2">Outcome</label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={formData.outcome === 'Win' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, outcome: 'Win' }))}
                    className="flex-1"
                  >
                    Win
                  </Button>
                  <Button
                    type="button"
                    variant={formData.outcome === 'Loss' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, outcome: 'Loss' }))}
                    className="flex-1"
                  >
                    Loss
                  </Button>
                  <Button
                    type="button"
                    variant={formData.outcome === 'Breakeven' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, outcome: 'Breakeven' }))}
                    className="flex-1"
                  >
                    BE
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Coach Data Points */}
            <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-3">AI Coach Data Points</h3>
                <p className="text-sm text-muted-foreground mb-4">Help the AI learn your habits by providing more context.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Strategy / Setup</label>
                    <Select value={formData.strategy} onValueChange={(value) => setFormData(prev => ({ ...prev, strategy: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Breakout">Breakout</SelectItem>
                        <SelectItem value="Reversal">Reversal</SelectItem>
                        <SelectItem value="Trend Following">Trend Following</SelectItem>
                        <SelectItem value="Scalp">Scalp</SelectItem>
                        <SelectItem value="Range">Range</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mindset / Emotion</label>
                    <Select value={formData.emotion} onValueChange={(value) => setFormData(prev => ({ ...prev, emotion: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select emotion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disciplined">Disciplined</SelectItem>
                        <SelectItem value="Confident">Confident</SelectItem>
                        <SelectItem value="Anxious">Anxious</SelectItem>
                        <SelectItem value="Greedy">Greedy</SelectItem>
                        <SelectItem value="FOMO">FOMO</SelectItem>
                        <SelectItem value="Hesitant">Hesitant</SelectItem>
                        <SelectItem value="Fatigued">Fatigued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Trading Session</label>
                    <Select value={formData.session} onValueChange={(value) => setFormData(prev => ({ ...prev, session: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asian">Asian</SelectItem>
                        <SelectItem value="London">London</SelectItem>
                        <SelectItem value="New York">New York</SelectItem>
                        <SelectItem value="Overlap">Overlap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Trade Notes & Analysis</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={6}
                placeholder="Describe your trade setup, analysis, and any observations..."
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Trade Chart Screenshot</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md">
                {screenshotPreview ? (
                  <div className="space-y-1 text-center">
                    <img src={screenshotPreview} alt="Screenshot preview" className="max-h-64 mx-auto rounded-md" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                      }}
                      className="mt-2"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTrade}
                disabled={!formData.asset_ticker || !formData.pnl}
              >
                {editingTrade ? 'Update Trade' : 'Save Trade'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}