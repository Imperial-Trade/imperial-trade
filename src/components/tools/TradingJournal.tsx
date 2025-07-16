import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { TradeJournalEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Camera, Brain, Sparkles, MessageSquare, BarChart3, TrendingUp, Target, Calendar, DollarSign, ChevronLeft, ChevronRight, Save, X, Award, TrendingDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

export default function TradingJournal() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    asset_ticker: '',
    pnl: '',
    notes: ''
  });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('log');

  // Initialize component
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

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

  useEffect(() => {
    if (userProfile) {
      loadEntries();
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  };

  const handleDelete = async (entryId) => {
    try {
      await TradeJournalEntry.delete(entryId);
      loadEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEntry.asset_ticker || !newEntry.pnl) {
      alert("Please fill in Asset and P&L.");
      return;
    }
    setIsSubmitting(true);
    try {
      let screenshot_url = '';
      if (screenshotFile) {
        const { file_url } = await UploadFile({ file: screenshotFile });
        screenshot_url = file_url;
      }

      const pnlValue = parseFloat(newEntry.pnl);
      const tradeOutcome = pnlValue >= 0 ? 'a winning trade' : 'a losing trade';
      const aiPrompt = `
        You are a supportive trading coach. Analyze this ${tradeOutcome} of ${pnlValue} USD.
        User notes: "${newEntry.notes}"
        
        Provide encouraging feedback (1-2 sentences) highlighting good practices or learning opportunities.
        Focus on process and discipline, not just results.
      `;

      const aiResult = await InvokeLLM({
        prompt: aiPrompt,
        file_urls: screenshot_url ? [screenshot_url] : []
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await TradeJournalEntry.create({
          ...newEntry,
          pnl: pnlValue,
          trade_date: new Date().toISOString(),
          screenshot_url,
          ai_positive_feedback: aiResult
        }, user.id);
      }

      setNewEntry({ asset_ticker: '', pnl: '', notes: '' });
      setScreenshotFile(null);
      loadEntries();
    } catch (error) {
      console.error("Error submitting journal entry:", error);
      alert("Failed to save entry. Please try again.");
    }
    setIsSubmitting(false);
  };

  // Analytics calculations
  const analytics = React.useMemo(() => {
    if (entries.length === 0) return null;

    const winningTrades = entries.filter(e => e.pnl > 0);
    const losingTrades = entries.filter(e => e.pnl < 0);
    const totalPnL = entries.reduce((sum, e) => sum + e.pnl, 0);
    const winRate = ((winningTrades.length / entries.length) * 100).toFixed(1);
    const avgWin = winningTrades.length > 0 ? (winningTrades.reduce((sum, e) => sum + e.pnl, 0) / winningTrades.length).toFixed(2) : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, e) => sum + e.pnl, 0) / losingTrades.length).toFixed(2) : 0;
    const profitFactor = losingTrades.length > 0 ? Math.abs(totalPnL / (losingTrades.reduce((sum, e) => sum + e.pnl, 0) || 1)).toFixed(2) : "∞";

    return { winRate, avgWin, avgLoss, profitFactor, totalPnL };
  }, [entries]);

  // Basic Log Tab
  const LogTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Add Trade Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Trade
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                name="asset_ticker" 
                placeholder="Asset / Ticker (e.g., EUR/USD)" 
                value={newEntry.asset_ticker} 
                onChange={handleInputChange} 
                className="bg-background" 
                required 
              />
              <Input 
                name="pnl" 
                type="number" 
                placeholder="P&L (e.g., 150.50 or -75.25)" 
                value={newEntry.pnl} 
                onChange={handleInputChange} 
                className="bg-background" 
                required 
              />
            </div>
            
            <Textarea 
              name="notes" 
              placeholder="Your insights: Why did you take this trade? What did you learn?" 
              value={newEntry.notes} 
              onChange={handleInputChange} 
              className="bg-background h-24" 
            />
            
            <div className="flex items-center gap-4">
              <label htmlFor="screenshot-upload" className="cursor-pointer flex-1">
                <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:bg-muted/30 transition">
                  <Camera className="w-5 h-5" />
                  <span>{screenshotFile ? screenshotFile.name : "Upload Screenshot"}</span>
                </div>
                <input id="screenshot-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-accent-green to-primary hover:from-accent-green/90 hover:to-primary/90 text-white">
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Save Trade
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Recent Trades</h3>
        {isLoading ? (
          <p className="text-muted-foreground">Loading journal...</p>
        ) : entries.length > 0 ? (
          <div className="space-y-4">
            {entries.slice(0, 10).map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group"
              >
                <Card className="bg-card hover:bg-card/80 border-border transition-all duration-300">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{entry.asset_ticker}</h4>
                          <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</p>
                        </div>
                        <Badge className={entry.pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {entry.pnl >= 0 ? `+${entry.pnl.toFixed(2)}` : entry.pnl.toFixed(2)} USD
                        </Badge>
                      </div>
                      
                      {entry.notes && (
                        <div className="space-y-1">
                          <h5 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            My Insights
                          </h5>
                          <p className="text-muted-foreground text-sm bg-muted/30 p-2 rounded-lg">{entry.notes}</p>
                        </div>
                      )}

                      {entry.ai_positive_feedback && (
                        <div className="space-y-1">
                          <h5 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            AI Coach Feedback
                          </h5>
                          <p className="text-muted-foreground text-sm bg-yellow-500/10 p-2 rounded-lg border-l-2 border-yellow-400">{entry.ai_positive_feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative">
                      {entry.screenshot_url ? (
                        <img 
                          src={entry.screenshot_url} 
                          alt={`Trade on ${entry.asset_ticker}`} 
                          className="w-full h-full object-cover rounded-lg border border-border" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/30 rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No screenshot uploaded</p>
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(entry.id)} 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Start Your Trading Journal</h3>
            <p className="text-muted-foreground">Add your first trade to begin tracking your performance and get AI insights</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Analytics Tab
  const AnalyticsTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {analytics ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-green-400">{analytics.winRate}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Avg Win</p>
                <p className="text-2xl font-bold text-primary">${analytics.avgWin}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Avg Loss</p>
                <p className="text-2xl font-bold text-red-400">${analytics.avgLoss}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <p className="text-2xl font-bold text-purple-400">{analytics.profitFactor}</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/30">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6 text-secondary" />
                AI Performance Insights
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-green-400">Strong Discipline:</span> Your win rate of {analytics.winRate}% shows consistent execution of your trading plan.
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Risk Management:</span> Your average loss of ${analytics.avgLoss} indicates good position sizing control.
                  </p>
                </div>
                <div className="p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-yellow-400">Growth Opportunity:</span> Consider documenting more details about your entry criteria to replicate successful setups.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity Curve Placeholder */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Equity Curve</h3>
              <div className="h-64 bg-gradient-to-r from-accent-green/20 via-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Account growth visualization</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Total P&L: ${analytics.totalPnL.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Data Available</h3>
          <p className="text-muted-foreground">Add some trades to see your analytics and AI insights</p>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="log" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Journal Log
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              AI Analytics
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent font-semibold">
                Advanced Journal
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-6">
            <LogTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <AdvancedJournalTab entries={entries} userProfile={userProfile} loadEntries={loadEntries} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Available timezones
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
  'Asia/Kolkata',
  'Australia/Sydney'
];

// Advanced Journal Tab Component
const AdvancedJournalTab = ({ entries, userProfile, loadEntries }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentFilterRange, setCurrentFilterRange] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return localStorage.getItem('tradingJournalTimezone') || 'America/New_York';
  });
  const [newTrade, setNewTrade] = useState({
    asset_ticker: '',
    trade_date: formatInTimeZone(new Date(), selectedTimezone, 'yyyy-MM-dd'),
    trade_type: 'Long',
    entry_price: '',
    exit_price: '',
    position_size: '',
    lot_size: 'Standard',
    pnl: '',
    strategy: 'Breakout',
    emotion: 'Disciplined',
    notes: ''
  });

  // Timezone functions
  const formatDateInTimezone = (date, formatStr) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatInTimeZone(dateObj, selectedTimezone, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return format(new Date(date), formatStr);
    }
  };

  const getCurrentDateInTimezone = () => {
    return formatInTimeZone(new Date(), selectedTimezone, 'yyyy-MM-dd');
  };

  const handleTimezoneChange = (timezone) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('tradingJournalTimezone', timezone);
    setNewTrade(prev => ({
      ...prev,
      trade_date: formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
    }));
  };

  // Filter entries based on current filter range and selected date
  const getFilteredEntries = () => {
    const now = toZonedTime(new Date(), selectedTimezone);
    let startDate = new Date(0);
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (currentFilterRange === 'daily' && selectedDate) {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (currentFilterRange) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          startDate = weekStart;
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }
    }

    return entries.filter(entry => {
      const entryDate = new Date(entry.trade_date);
      return entryDate >= startDate && entryDate <= endDate;
    });
  };

  const filteredEntries = getFilteredEntries();

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const totalPnL = filteredEntries.reduce((sum, e) => sum + e.pnl, 0);
    const wins = filteredEntries.filter(e => e.pnl > 0).length;
    const totalTrades = filteredEntries.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalWinPnl = filteredEntries.filter(e => e.pnl > 0).reduce((s, e) => s + e.pnl, 0);
    const totalLossPnl = Math.abs(filteredEntries.filter(e => e.pnl <= 0).reduce((s, e) => s + e.pnl, 0));
    const profitFactor = totalLossPnl > 0 ? (totalWinPnl / totalLossPnl) : '∞';

    return { totalPnL, winRate, profitFactor, totalTrades };
  }, [filteredEntries]);

  // Generate calendar
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = toZonedTime(new Date(), selectedTimezone);
    today.setHours(0, 0, 0, 0);

    const tradesByDate = entries.reduce((acc, entry) => {
      const entryDate = new Date(entry.trade_date);
      const dateStr = entryDate.toDateString();
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(entry);
      return acc;
    }, {});

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-14"></div>);
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isDisabled = date > today;
      const tradesOnDay = tradesByDate[date.toDateString()] || [];

      const handleDayClick = () => {
        if (!isDisabled) {
          setSelectedDate(date);
          setCurrentFilterRange('daily');
        }
      };

      let dotColor = '';
      if (tradesOnDay.length > 0) {
        const hasWin = tradesOnDay.some(t => t.pnl > 0);
        const hasLoss = tradesOnDay.some(t => t.pnl <= 0);
        if (hasWin && hasLoss) dotColor = 'bg-orange-400';
        else if (hasWin) dotColor = 'bg-green-400';
        else dotColor = 'bg-red-400';
      }

      days.push(
        <button
          key={day}
          onClick={handleDayClick}
          disabled={isDisabled}
          className={`
            h-14 border border-transparent rounded-lg flex flex-col items-center justify-center relative transition-all
            ${isToday ? 'bg-primary/20 border-primary' : ''}
            ${isSelected ? 'bg-primary text-primary-foreground font-bold' : ''}
            ${isDisabled ? 'text-muted-foreground cursor-not-allowed' : 'hover:bg-muted/30'}
          `}
        >
          <span>{day}</span>
          {dotColor && (
            <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${dotColor} ${isSelected ? 'bg-primary-foreground' : ''}`}></div>
          )}
        </button>
      );
    }

    return days;
  };

  // Performance chart data
  const performanceData = React.useMemo(() => {
    const sortedEntries = filteredEntries.slice().sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    const startingBalance = 10000;
    let runningTotal = startingBalance;
    
    const data = [startingBalance];
    const labels = ['Start'];
    
    sortedEntries.forEach(entry => {
      runningTotal += entry.pnl;
      data.push(runningTotal);
      labels.push(formatDateInTimezone(entry.trade_date, 'MM/dd'));
    });

    return {
      labels,
      datasets: [{
        label: 'Account Balance',
        data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 2
      }]
    };
  }, [filteredEntries, selectedTimezone]);

  // Most traded instruments data with auto-detection of similar currencies
  const mostTradedData = React.useMemo(() => {
    // Function to normalize instrument names
    const normalizeInstrument = (instrument: string): string => {
      return instrument
        .toUpperCase()
        .replace(/[-_\s]/g, '') // Remove separators
        .replace(/USD$|USDT$/, 'USD') // Normalize USD variants
        .replace(/BTC$|BITCOIN$/, 'BTC') // Normalize BTC variants
        .replace(/ETH$|ETHEREUM$/, 'ETH') // Normalize ETH variants
        .replace(/EUR$|EURO$/, 'EUR'); // Normalize EUR variants
    };

    // Group instruments by normalized name
    const instrumentGroups: Record<string, {
      count: number;
      originalNames: Set<string>;
      totalVolume: number;
      pnl: number;
    }> = filteredEntries.reduce((acc, entry) => {
      const normalized = normalizeInstrument(entry.asset_ticker);
      if (!acc[normalized]) {
        acc[normalized] = {
          count: 0,
          originalNames: new Set(),
          totalVolume: 0,
          pnl: 0
        };
      }
      acc[normalized].count += 1;
      acc[normalized].originalNames.add(entry.asset_ticker);
      acc[normalized].totalVolume += entry.position_size || 1;
      acc[normalized].pnl += entry.pnl;
      return acc;
    }, {} as Record<string, { count: number; originalNames: Set<string>; totalVolume: number; pnl: number; }>);

    // Sort by count and get top 5
    const sortedInstruments = Object.entries(instrumentGroups)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);

    if (sortedInstruments.length === 0) {
      return { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] };
    }

    const labels = sortedInstruments.map(([instrument, data]) => {
      // Use the most common original name
      const mostCommon = Array.from(data.originalNames)[0];
      return mostCommon;
    });
    
    const counts = sortedInstruments.map(([, data]) => data.count);
    
    return {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: [
          '#3b82f6', // Primary blue
          '#1e40af', // Dark blue
          '#60a5fa', // Light blue
          '#93c5fd', // Lighter blue
          '#bfdbfe'  // Lightest blue
        ],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff'
      }]
    };
  }, [filteredEntries]);

  const performanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `Balance: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: { 
          color: 'hsl(var(--muted-foreground))',
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        },
        grid: { 
          color: 'hsl(var(--border))',
          drawBorder: false
        },
        border: { display: false }
      },
      x: {
        ticks: { 
          color: 'hsl(var(--muted-foreground))',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        },
        grid: { display: false },
        border: { display: false }
      }
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'hsl(var(--muted-foreground))',
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} trades (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
    elements: {
      arc: {
        borderWidth: 0
      }
    }
  };

  // Handle form submission
  const handleSubmitTrade = async (e) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      await TradeJournalEntry.create({
        asset_ticker: newTrade.asset_ticker,
        trade_date: newTrade.trade_date,
        trade_type: newTrade.trade_type === 'Long' ? 'Long' : 'Short',
        entry_price: newTrade.entry_price ? parseFloat(newTrade.entry_price) : null,
        exit_price: newTrade.exit_price ? parseFloat(newTrade.exit_price) : null,
        position_size: newTrade.position_size ? parseFloat(newTrade.position_size) : null,
        pnl: parseFloat(newTrade.pnl),
        notes: `${newTrade.strategy} | ${newTrade.emotion} | Lot: ${newTrade.lot_size} | ${newTrade.notes}`.trim(),
      }, userProfile.id);

      // Reset form
      setNewTrade({
        asset_ticker: '',
        trade_date: getCurrentDateInTimezone(),
        trade_type: 'Long',
        entry_price: '',
        exit_price: '',
        position_size: '',
        lot_size: 'Standard',
        pnl: '',
        strategy: 'Breakout',
        emotion: 'Disciplined',
        notes: ''
      });
      
      setIsModalOpen(false);
      loadEntries();
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  };

  const getFilterTitle = () => {
    if (currentFilterRange === 'daily' && selectedDate) {
      return `Trades for ${formatDateInTimezone(selectedDate, 'MMMM dd, yyyy')} (${selectedTimezone.split('/')[1]})`;
    }
    const timezoneName = selectedTimezone.split('/')[1];
    switch (currentFilterRange) {
      case 'daily': return `Today's Trades (${timezoneName})`;
      case 'weekly': return `This Week's Trades (${timezoneName})`;
      case 'monthly': return `This Month's Trades (${timezoneName})`;
      case 'yearly': return `This Year's Trades (${timezoneName})`;
      case 'all': return "All Trades";
      default: return "All Trades";
    }
  };

  const getAIInsights = () => {
    if (filteredEntries.length === 0) return ["No data available for analysis in this period."];
    
    const insights = [];
    const bestTrade = filteredEntries.filter(e => e.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = filteredEntries.filter(e => e.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
    
    if (bestTrade) {
      insights.push(`Your best trade was ${bestTrade.asset_ticker}, netting $${bestTrade.pnl.toFixed(2)}.`);
    }
    if (worstTrade) {
      insights.push(`Your biggest loss was ${worstTrade.asset_ticker} for $${worstTrade.pnl.toFixed(2)}.`);
    }
    insights.push("You performed best with the Trend Following strategy.");
    
    return insights;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Trading Journal</h2>
          <p className="text-muted-foreground">Your unified dashboard for trade analysis and performance tracking.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white mt-4 md:mt-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log a New Trade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitTrade} className="space-y-6">
              {/* Timezone Selector */}
              <Card className="bg-muted/10 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Timezone</span>
                    </div>
                    <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimezones.map(tz => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace('_', ' ').replace('/', ' / ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Current time: {formatDateInTimezone(new Date(), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Asset (e.g., BTC/USD)</label>
                  <Input
                    value={newTrade.asset_ticker}
                    onChange={(e) => setNewTrade(prev => ({...prev, asset_ticker: e.target.value}))}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date ({selectedTimezone})</label>
                  <Input
                    type="date"
                    value={newTrade.trade_date}
                    onChange={(e) => setNewTrade(prev => ({...prev, trade_date: e.target.value}))}
                    max={getCurrentDateInTimezone()}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              
              <Card className="bg-secondary/10 border-secondary/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-secondary mb-3">AI Data Points (Help the AI learn)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Strategy / Setup</label>
                      <Select value={newTrade.strategy} onValueChange={(value) => setNewTrade(prev => ({...prev, strategy: value}))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Breakout">Breakout</SelectItem>
                          <SelectItem value="Reversal">Reversal</SelectItem>
                          <SelectItem value="Trend Following">Trend Following</SelectItem>
                          <SelectItem value="Scalp">Scalp</SelectItem>
                          <SelectItem value="Range">Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Your Emotion</label>
                      <Select value={newTrade.emotion} onValueChange={(value) => setNewTrade(prev => ({...prev, emotion: value}))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Disciplined">Disciplined</SelectItem>
                          <SelectItem value="Confident">Confident</SelectItem>
                          <SelectItem value="Anxious">Anxious</SelectItem>
                          <SelectItem value="FOMO">FOMO (Fear of Missing Out)</SelectItem>
                          <SelectItem value="Greedy">Greedy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Trade Type</label>
                  <Select value={newTrade.trade_type} onValueChange={(value) => setNewTrade(prev => ({...prev, trade_type: value}))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Long">Long</SelectItem>
                      <SelectItem value="Short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lot Size</label>
                  <Select value={newTrade.lot_size} onValueChange={(value) => setNewTrade(prev => ({...prev, lot_size: value}))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Micro">Micro (0.01)</SelectItem>
                      <SelectItem value="Mini">Mini (0.1)</SelectItem>
                      <SelectItem value="Standard">Standard (1.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entry Price</label>
                  <Input
                    type="number"
                    step="any"
                    value={newTrade.entry_price}
                    onChange={(e) => setNewTrade(prev => ({...prev, entry_price: e.target.value}))}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Exit Price</label>
                  <Input
                    type="number"
                    step="any"
                    value={newTrade.exit_price}
                    onChange={(e) => setNewTrade(prev => ({...prev, exit_price: e.target.value}))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position Size</label>
                  <Input
                    type="number"
                    step="any"
                    value={newTrade.position_size}
                    onChange={(e) => setNewTrade(prev => ({...prev, position_size: e.target.value}))}
                    placeholder="Units/Shares"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">P&L ($)</label>
                <Input
                  type="number"
                  step="any"
                  value={newTrade.pnl}
                  onChange={(e) => setNewTrade(prev => ({...prev, pnl: e.target.value}))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes & Rationale</label>
                <Textarea
                  value={newTrade.notes}
                  onChange={(e) => setNewTrade(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Why did you take this trade? What was the outcome?"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Save Trade
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Filters and KPIs */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="flex items-center space-x-2 bg-muted/20 p-1 rounded-lg">
              {['daily', 'weekly', 'monthly', 'yearly', 'all'].map((range) => (
                <Button
                  key={range}
                  variant={currentFilterRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setCurrentFilterRange(range);
                    setSelectedDate(null);
                  }}
                  className={currentFilterRange === range ? 'bg-primary text-primary-foreground' : ''}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Total P/L</h4>
              <p className={`text-2xl font-bold mt-1 ${kpis.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${kpis.totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Win Rate</h4>
              <p className="text-2xl font-bold text-foreground mt-1">{kpis.winRate.toFixed(1)}%</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Profit Factor</h4>
              <p className="text-2xl font-bold text-foreground mt-1">
                {typeof kpis.profitFactor === 'string' ? kpis.profitFactor : kpis.profitFactor.toFixed(2)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Total Trades</h4>
              <p className="text-2xl font-bold text-foreground mt-1">{kpis.totalTrades}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart and Most Traded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-foreground text-lg">Performance</h3>
            </div>
            <div style={{ height: '250px' }}>
              <Line data={performanceData} options={performanceChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Most Traded Instruments */}
        <Card className="bg-card/50 border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Most Traded</h3>
              <div className="flex items-center space-x-1">
                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1">
                  Count
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs px-2 py-1">
                  Volume
                </Button>
              </div>
            </div>
            
            <div style={{ height: '180px' }} className="flex items-center justify-center">
              {mostTradedData.datasets[0].data.length > 0 ? (
                <Doughnut data={mostTradedData} options={doughnutOptions} />
              ) : (
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trading data</p>
                </div>
              )}
            </div>
            
            {/* Trade Statistics */}
            {mostTradedData.datasets[0].data.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="text-xs text-muted-foreground mb-2">Top Instruments</div>
                <div className="space-y-2">
                  {mostTradedData.labels.slice(0, 3).map((label, index) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: mostTradedData.datasets[0].backgroundColor[index] }}
                        ></div>
                        <span className="text-sm font-medium text-foreground">{label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {mostTradedData.datasets[0].data[index]} trades
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar and AI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Trade Calendar */}
        <Card className="lg:col-span-3 bg-card/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Trade Calendar</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold text-foreground w-32 text-center">
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
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground mb-2">
              <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar()}
            </div>
          </CardContent>
        </Card>

        {/* AI Analytics */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">AI Analytics</h3>
            <p className="text-muted-foreground mb-4 text-sm">Insights from the selected period.</p>
            <div className="space-y-4 text-sm">
              {getAIInsights().map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {index === 0 && <TrendingUp className="w-4 h-4 text-green-400 mt-0.5" />}
                  {index === 1 && <TrendingDown className="w-4 h-4 text-red-400 mt-0.5" />}
                  {index === 2 && <Award className="w-4 h-4 text-primary mt-0.5" />}
                  <span className="text-muted-foreground">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trade Log */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">{getFilterTitle()}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/20">
                <tr>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Asset</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Date ({selectedTimezone.split('/')[1]})</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Type</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Entry/Exit</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Size</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">P&L ($)</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length > 0 ? filteredEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/10">
                    <td className="p-4 font-semibold text-foreground">{entry.asset_ticker}</td>
                    <td className="p-4 text-muted-foreground">{formatDateInTimezone(entry.trade_date, 'MMM dd, yyyy')}</td>
                    <td className="p-4">
                      <Badge className={entry.trade_type === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {entry.trade_type}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {entry.entry_price && (
                        <div>Entry: {parseFloat(entry.entry_price).toFixed(4)}</div>
                      )}
                      {entry.exit_price && (
                        <div>Exit: {parseFloat(entry.exit_price).toFixed(4)}</div>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {entry.position_size && `${parseFloat(entry.position_size).toLocaleString()} units`}
                    </td>
                    <td className={`p-4 font-semibold ${entry.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.pnl.toFixed(2)}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm max-w-xs truncate">
                      {entry.notes || 'No notes'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No trades found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};