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
import { Plus, Trash2, Camera, Brain, Sparkles, MessageSquare, BarChart3, TrendingUp, Target, Calendar, DollarSign, ChevronLeft, ChevronRight, Save, X, Award, TrendingDown, Clock, Search } from 'lucide-react';
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
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [assetSuggestions, setAssetSuggestions] = useState([]);
  const [showModalAssetDropdown, setShowModalAssetDropdown] = useState(false);
  const [modalAssetSuggestions, setModalAssetSuggestions] = useState([]);
  const [newTrade, setNewTrade] = useState({
    asset_ticker: '',
    pnl: '',
    notes: ''
  });

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
  const useDebounce = (value, delay) => {
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

  const debouncedAssetSearch = useDebounce(newEntry.asset_ticker, 300);
  const debouncedModalAssetSearch = useDebounce(newTrade.asset_ticker, 300);

  // Get recent asset pairs from localStorage
  const getRecentAssets = () => {
    try {
      const stored = localStorage.getItem('recent-trading-assets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save asset to recent list
  const saveRecentAsset = (asset) => {
    if (!asset.trim()) return;
    
    const recent = getRecentAssets();
    const normalized = asset.toUpperCase().trim();
    
    // Remove if already exists and add to front
    const filtered = recent.filter(item => item !== normalized);
    const updated = [normalized, ...filtered].slice(0, 5); // Keep only 5 most recent
    
    localStorage.setItem('recent-trading-assets', JSON.stringify(updated));
  };

  // Main function to get and combine suggestions
  const getAssetSuggestions = async (query) => {
    const normalizedQuery = query.toUpperCase().trim();
    if (!normalizedQuery) {
      return getRecentAssets();
    }

    // Filter local lists based on the user's query
    const forexSuggestions = FOREX_PAIRS.filter(pair => pair.includes(normalizedQuery));
    const commoditySuggestions = COMMODITIES.filter(c => c.includes(normalizedQuery));
    const indexSuggestions = INDICES.filter(i => i.includes(normalizedQuery));

    // Fetch crypto suggestions from CoinGecko API
    let cryptoSuggestions = [];
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Format the crypto data to match the pair format (e.g., BTC/USDT)
        cryptoSuggestions = (data.coins || []).slice(0, 5).map(coin => `${coin.symbol.toUpperCase()}/USDT`);
      }
    } catch (error) {
      console.warn("Could not fetch crypto suggestions:", error);
    }

    // Combine all sources, ensuring no duplicates
    const combined = [...indexSuggestions, ...forexSuggestions, ...commoditySuggestions, ...cryptoSuggestions];
    const uniqueSuggestions = [...new Set(combined)];

    return uniqueSuggestions.slice(0, 10);
  };

  // Asset suggestions effect for main form
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

  // Asset suggestions effect for modal form
  useEffect(() => {
    const searchAssets = async () => {
      if (debouncedModalAssetSearch) {
        const suggestions = await getAssetSuggestions(debouncedModalAssetSearch);
        setModalAssetSuggestions(suggestions);
      } else {
        setModalAssetSuggestions(getRecentAssets());
      }
    };
    searchAssets();
  }, [debouncedModalAssetSearch]);

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
    console.log('Input change:', name, value);
    setNewEntry(prev => ({ ...prev, [name]: value }));
    
    // Handle asset ticker search
    if (name === 'asset_ticker') {
      console.log('Handling asset search change:', value);
      setShowAssetDropdown(true);
    }
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
      // Save asset to recent list
      saveRecentAsset(newEntry.asset_ticker);
      
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
      setShowAssetDropdown(false);
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
              <div className="relative">
                <div className="relative">
                  <Input 
                    name="asset_ticker" 
                    placeholder="Asset / Ticker (e.g., EURUSD, AAPL)" 
                    value={newEntry.asset_ticker} 
                    onChange={handleInputChange}
                    onFocus={() => setShowAssetDropdown(true)}
                    onBlur={() => {
                      // Delay hiding dropdown to allow clicks
                      setTimeout(() => setShowAssetDropdown(false), 300);
                    }}
                    className="bg-background pr-8" 
                    required 
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  
                  {/* Asset Suggestions Dropdown */}
                  {showAssetDropdown && (
                    <div 
                      className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[100] max-h-48 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking dropdown
                    >
                      {assetSuggestions.length > 0 ? (
                        <div className="p-1">
                          {!newEntry.asset_ticker && getRecentAssets().length > 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/30 mb-1">
                              Recent Assets
                            </div>
                          )}
                          {assetSuggestions.map((asset, index) => (
                            <button
                              key={asset}
                              type="button"
                              onClick={() => {
                                setNewEntry(prev => ({ ...prev, asset_ticker: asset }));
                                setShowAssetDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-sm transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{asset}</span>
                                {FOREX_PAIRS.includes(asset) && (
                                  <Badge variant="outline" className="text-xs h-5 px-2">
                                    FX
                                  </Badge>
                                )}
                                {COMMODITIES.includes(asset) && (
                                  <Badge variant="outline" className="text-xs h-5 px-2">
                                    Gold
                                  </Badge>
                                )}
                                {INDICES.includes(asset) && (
                                  <Badge variant="outline" className="text-xs h-5 px-2">
                                    Index
                                  </Badge>
                                )}
                                {asset.includes('/USDT') && (
                                  <Badge variant="outline" className="text-xs h-5 px-2">
                                    Crypto
                                  </Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : newEntry.asset_ticker ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          No matches found
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          Start typing to see suggestions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="group"
              >
                <Card className="bg-card border-border hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.asset_ticker}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.trade_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg ${entry.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {entry.pnl >= 0 ? '+' : ''}${entry.pnl.toFixed(2)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                    
                    {entry.ai_positive_feedback && (
                      <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-l-primary">
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-foreground leading-relaxed">
                            {entry.ai_positive_feedback}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {entry.screenshot_url && (
                      <div className="mt-3">
                        <img 
                          src={entry.screenshot_url} 
                          alt="Trade screenshot" 
                          className="rounded-lg max-h-32 object-cover cursor-pointer hover:opacity-80 transition"
                          onClick={() => window.open(entry.screenshot_url, '_blank')}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Start Your Trading Journal</h3>
                  <p className="text-muted-foreground">Add your first trade above to begin tracking your performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );

  // Analytics Tab with performance metrics
  const AnalyticsTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {analytics ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Total P&L</p>
                    <p className={`text-2xl font-bold ${analytics.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {analytics.totalPnL >= 0 ? '+' : ''}${analytics.totalPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics.winRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Avg Win</p>
                    <p className="text-2xl font-bold text-purple-600">${analytics.avgWin}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Profit Factor</p>
                    <p className="text-2xl font-bold text-orange-600">{analytics.profitFactor}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analytics Section */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">AI Performance Insights</h3>
                  <p className="text-sm text-muted-foreground">Powered by advanced analytics</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <p className="text-sm text-foreground">
                    Your win rate of {analytics.winRate}% is {parseFloat(analytics.winRate) > 50 ? 'above' : 'below'} the 50% benchmark. 
                    {parseFloat(analytics.winRate) > 60 && " Excellent consistency!"}
                    {parseFloat(analytics.winRate) < 40 && " Focus on risk management and entry timing."}
                  </p>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <p className="text-sm text-foreground">
                    Your profit factor of {analytics.profitFactor} indicates {parseFloat(analytics.profitFactor) > 1.5 ? 'strong' : parseFloat(analytics.profitFactor) > 1 ? 'positive' : 'concerning'} performance.
                    {parseFloat(analytics.profitFactor) > 2 && " You're managing risk exceptionally well!"}
                  </p>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Target className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                  <p className="text-sm text-foreground">
                    Average win of ${analytics.avgWin} vs average loss of ${analytics.avgLoss} shows a {parseFloat(String(analytics.avgWin)) > parseFloat(String(analytics.avgLoss)) ? 'positive' : 'negative'} risk-reward ratio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity Curve Placeholder */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Equity Curve
              </h3>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Interactive equity curve coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground">Add some trades to see your analytics and AI insights</p>
          </div>
        </div>
      )}
    </motion.div>
  );

  // Advanced Journal Tab - Simple placeholder
  const AdvancedJournalTab = () => {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Advanced Journal</h3>
          <p className="text-sm text-muted-foreground">Advanced features coming soon...</p>
        </div>
      </div>
    );
  };

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
            <AdvancedJournalTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}