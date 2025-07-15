import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TradeJournalEntry } from '@/api/entities';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { 
  ChevronLeft, ChevronRight, Plus, X, Camera, Trash2, 
  ArrowLeft, TrendingUp, Target, PieChart, Activity 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

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
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const fetchedEntries = await TradeJournalEntry.list('-created_date');
      setEntries(fetchedEntries);
    } catch (error) {
      console.error("Error loading journal entries:", error);
    }
    setIsLoading(false);
  };

  const getTradesForDate = (dateStr: string): Trade[] => {
    return entries.filter(entry => 
      format(new Date(entry.trade_date), 'yyyy-MM-dd') === dateStr
    );
  };

  const getFilteredTrades = (): Trade[] => {
    const now = new Date();
    
    switch(timeFilter) {
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return entries.filter(t => new Date(t.trade_date) >= startOfWeek);
      case 'monthly':
        return entries.filter(t => 
          new Date(t.trade_date).getMonth() === now.getMonth() && 
          new Date(t.trade_date).getFullYear() === now.getFullYear()
        );
      case 'yearly':
        return entries.filter(t => new Date(t.trade_date).getFullYear() === now.getFullYear());
      case 'all':
        return entries;
      default:
        return entries;
    }
  };

  const calculateMetrics = (trades: Trade[]) => {
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = trades.filter(trade => trade.pnl > 0).length;
    const losses = trades.filter(trade => trade.pnl < 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length * 100) : 0;
    
    const totalWinsPnl = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLossesPnl = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossesPnl > 0 ? (totalWinsPnl / totalLossesPnl) : 0;

    return {
      totalPnl,
      winRate,
      profitFactor,
      totalTrades: trades.length
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
      let screenshot_url = screenshotPreview;
      if (screenshotFile) {
        const { file_url } = await UploadFile({ file: screenshotFile });
        screenshot_url = file_url;
      }

      let pnlValue = parseFloat(formData.pnl);
      if (formData.outcome === 'Loss') {
        pnlValue = -Math.abs(pnlValue);
      }

      const tradeData = {
        asset_ticker: formData.asset_ticker,
        pnl: pnlValue,
        trade_date: selectedDate || new Date().toISOString().split('T')[0],
        notes: formData.notes,
        screenshot_url,
        trade_type: formData.trade_type
      };

      if (editingTrade) {
        await TradeJournalEntry.update(editingTrade.id, tradeData);
      } else {
        // Generate AI feedback
        const pnlValue = parseFloat(formData.pnl);
        const tradeOutcome = pnlValue >= 0 ? 'a winning trade' : 'a losing trade';

        const aiPrompt = `
          You are a supportive and positive trading coach. Your goal is to find something positive or a valuable learning experience in the user's trade, regardless of whether it was a win or a loss.
          The user has submitted a journal entry for ${tradeOutcome} of ${pnlValue} USD.
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
        });
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
    
    // Add padding for first week
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - (firstDayOfWeek - i));
      return date;
    });

    const allDays = [...paddingDays, ...days];

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs text-secondary font-medium p-2">
            {day}
          </div>
        ))}
        {allDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTrades = getTradesForDate(dateStr);
          const totalPnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={index}
              className={`
                relative min-h-[60px] p-2 rounded-lg cursor-pointer transition-all border
                ${!isCurrentMonth ? 'opacity-50' : ''}
                ${isToday(day) ? 'ring-2 ring-primary' : ''}
                ${dayTrades.length > 0 
                  ? totalPnl > 0 
                    ? 'bg-green-500/20 border-green-500/40' 
                    : totalPnl < 0 
                      ? 'bg-red-500/20 border-red-500/40'
                      : 'bg-yellow-500/20 border-yellow-500/40'
                  : 'bg-surface border-default hover:bg-surface/80'
                }
              `}
              onClick={() => handleDateClick(dateStr)}
            >
              <span className={`text-sm ${isToday(day) ? 'font-bold' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayTrades.length > 0 && (
                <div className="mt-1">
                  <div className={`text-xs font-bold ${totalPnl > 0 ? 'text-green-400' : totalPnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                    ${totalPnl.toFixed(0)}
                  </div>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCalendar}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-2xl font-bold">
              {format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <Button
            onClick={() => openModal()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </div>

        <div className="space-y-4">
          {dayTrades.length === 0 ? (
            <div className="text-center text-secondary py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trades logged for this day</p>
            </div>
          ) : (
            dayTrades.map((trade) => (
              <Card key={trade.id} className="bg-surface/50 border-default">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-bold">{trade.asset_ticker}</h4>
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <span>{format(new Date(trade.trade_date), 'MMM d, yyyy')}</span>
                        {trade.trade_type && (
                          <Badge variant={trade.trade_type === 'Long' ? 'default' : 'secondary'} className="text-xs">
                            {trade.trade_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${trade.pnl > 0 
                          ? 'bg-green-500/20 text-green-400' 
                          : trade.pnl < 0 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        ${trade.pnl.toFixed(2)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(trade)}
                        className="text-secondary hover:text-primary"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="mb-3">
                      <p className="text-sm text-secondary">{trade.notes}</p>
                    </div>
                  )}

                  {trade.ai_positive_feedback && (
                    <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="text-sm text-green-400">{trade.ai_positive_feedback}</p>
                    </div>
                  )}

                  {trade.screenshot_url && (
                    <div className="mt-3">
                      <img 
                        src={trade.screenshot_url} 
                        alt="Trade screenshot" 
                        className="max-w-full rounded-md border border-default cursor-pointer"
                        onClick={() => window.open(trade.screenshot_url, '_blank')}
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

  const renderDashboard = () => {
    const filteredTrades = getFilteredTrades();
    const metrics = calculateMetrics(filteredTrades);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-surface/50 border-default">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm text-secondary">Total P&L</div>
            <div className={`text-xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${metrics.totalPnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/50 border-default">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm text-secondary">Win Rate</div>
            <div className="text-xl font-bold">{metrics.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-surface/50 border-default">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm text-secondary">Profit Factor</div>
            <div className="text-xl font-bold">{metrics.profitFactor.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface/50 border-default">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm text-secondary">Total Trades</div>
            <div className="text-xl font-bold">{metrics.totalTrades}</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBackToBasic}
            className="text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Basic
          </Button>
          <h2 className="text-2xl font-bold">Advanced Trading Journal</h2>
        </div>
        
        {/* Time Filter */}
        <div className="flex items-center bg-surface rounded-lg p-1 gap-1">
          {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter(filter)}
              className="text-xs capitalize"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Dashboard Metrics */}
      {renderDashboard()}

      {/* Calendar or Day View */}
      {viewMode === 'calendar' ? (
        <Card className="bg-surface/30 border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {renderCalendar()}
          </CardContent>
        </Card>
      ) : (
        renderDayView()
      )}

      {/* Trade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {editingTrade ? 'Edit Trade' : 'Add New Trade'}
                </h3>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Asset / Pair</label>
                  <Input
                    value={formData.asset_ticker}
                    onChange={(e) => setFormData(prev => ({ ...prev, asset_ticker: e.target.value }))}
                    placeholder="e.g., BTC/USDT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">P&L Amount ($)</label>
                  <Input
                    type="number"
                    value={formData.pnl}
                    onChange={(e) => setFormData(prev => ({ ...prev, pnl: e.target.value }))}
                    placeholder="e.g., 150.50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Direction</label>
                  <div className="flex gap-2">
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
                <div>
                  <label className="block text-sm font-medium mb-2">Outcome</label>
                  <div className="flex gap-2">
                    {(['Win', 'Loss', 'Breakeven'] as const).map((outcome) => (
                      <Button
                        key={outcome}
                        type="button"
                        variant={formData.outcome === outcome ? 'default' : 'outline'}
                        onClick={() => setFormData(prev => ({ ...prev, outcome }))}
                        className="flex-1 text-xs"
                      >
                        {outcome === 'Breakeven' ? 'BE' : outcome}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trade Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  placeholder="Your analysis and insights..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Chart Screenshot</label>
                <div className="border-2 border-dashed border-default rounded-lg p-6 text-center">
                  {screenshotPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={screenshotPreview} 
                        alt="Preview" 
                        className="max-h-32 mx-auto rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScreenshotFile(null);
                          setScreenshotPreview(null);
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-8 h-8 mx-auto mb-2 text-secondary" />
                      <label className="cursor-pointer text-primary hover:text-primary/80">
                        <span>Upload screenshot</span>
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTrade}
                  disabled={!formData.asset_ticker || !formData.pnl}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingTrade ? 'Update Trade' : 'Save Trade'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}