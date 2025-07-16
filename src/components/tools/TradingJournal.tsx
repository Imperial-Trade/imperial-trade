import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { TradeJournalEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Camera, Brain, Sparkles, MessageSquare, BarChart3, TrendingUp, Target, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Trading Journal</h1>
          <p className="text-muted-foreground">Track your trades and get AI-powered insights to improve your performance</p>
        </div>

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-gradient-to-r from-secondary/10 via-primary/10 to-accent/10 border border-secondary/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-secondary" />
                    <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
                      Advanced Journal Features
                    </span>
                  </h3>
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-secondary/20 via-primary/20 to-accent/20 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h4 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h4>
                    <p className="text-muted-foreground">Advanced calendar view, performance analytics, and enhanced trading insights</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}