
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { TradeJournalEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import AdvancedTradingJournal from './AdvancedTradingJournal';
import { Plus, Trash2, Camera, Brain, Sparkles, MessageSquare, BookOpen, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';

export default function TradingJournal() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ asset_ticker: '', pnl: '', notes: '' });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockStatus, setUnlockStatus] = useState({ isUnlocked: false, tradingDays: 0, totalEntries: 0, isAdmin: false });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadEntries();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile loaded:', profile);
        if (profile) {
          setUserProfile(profile);
          // Re-check unlock status after profile loads
          if (entries.length > 0) {
            checkUnlockStatus(entries, profile);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchedEntries = await TradeJournalEntry.list(user.id);
        setEntries(fetchedEntries);
        // Check unlock status with current user profile
        checkUnlockStatus(fetchedEntries, userProfile);
      } else {
        setEntries([]);
        checkUnlockStatus([], userProfile);
      }
    } catch (error) {
      console.error("Error loading journal entries:", error);
    }
    setIsLoading(false);
  };

  const checkUnlockStatus = (entries, profile = null) => {
    const currentProfile = profile || userProfile;
    console.log('Checking unlock status with profile:', currentProfile);
    
    // Check if user is admin
    const isAdmin = currentProfile && (
      currentProfile.access_level === 'admin' || 
      currentProfile.role === 'admin' || 
      currentProfile.user_type === 'admin'
    );
    
    console.log('Is admin check:', isAdmin);

    // Group entries by trading date
    const entriesByDate = {};
    entries.forEach(entry => {
      const dateKey = format(new Date(entry.trade_date), 'yyyy-MM-dd');
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = [];
      }
      entriesByDate[dateKey].push(entry);
    });

    const tradingDays = Object.keys(entriesByDate).length;
    const totalEntries = entries.length;
    const isUnlocked = isAdmin || (tradingDays >= 10 && totalEntries >= 10);

    console.log('Unlock status calculated:', { isUnlocked, tradingDays, totalEntries, isAdmin });
    setUnlockStatus({ isUnlocked, tradingDays, totalEntries, isAdmin });
  };

  // Re-check unlock status when user profile changes
  useEffect(() => {
    if (userProfile) {
      // If we have a profile, always check if admin (even without entries)
      checkUnlockStatus(entries, userProfile);
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
        You are a supportive and positive trading coach. Your goal is to find something positive or a valuable learning experience in the user's trade, regardless of whether it was a win or a loss.
        The user has submitted a journal entry for ${tradeOutcome} of ${pnlValue} USD.
        Their personal notes are: "${newEntry.notes}"
        
        Analyze their notes and the trade outcome. If a screenshot is provided, analyze it for good practices (like proper stop loss placement, good entry point relative to indicators, etc.).
        
        Provide a short, encouraging comment (1-2 sentences) that highlights a good practice, a smart observation from their notes, or a constructive takeaway. Focus on their process, discipline, or self-awareness, not just the monetary result. Start your response directly with the feedback.
        
        Examples:
        - For a win: "Great job documenting your thought process! This kind of detailed note-taking is key to replicating success."
        - For a loss: "Recognizing that you entered based on FOMO is a huge step in developing discipline. This self-awareness is what separates pros from amateurs."
        - From a screenshot: "Excellent work placing your stop-loss clearly on the chart. Protecting your capital is the most important rule, and you've nailed it."
      `;

      const aiResult = await InvokeLLM({
        prompt: aiPrompt,
        file_urls: screenshot_url ? [screenshot_url] : [],
      });
      
      // The result from InvokeLLM is a string if no schema is provided
      const ai_positive_feedback = aiResult;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await TradeJournalEntry.create({
          ...newEntry,
          pnl: pnlValue,
          trade_date: new Date().toISOString(),
          screenshot_url,
          ai_positive_feedback,
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

  const EntryCard = ({ entry }) => (
    <Card className="bg-surface/50 border-default overflow-hidden">
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-primary">{entry.asset_ticker}</h3>
              <p className="text-xs text-secondary">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</p>
            </div>
            <Badge className={entry.pnl >= 0 ? 'bg-green-500/20 text-accent-green' : 'bg-red-500/20 text-accent-red'}>
              {entry.pnl >= 0 ? `+${entry.pnl.toFixed(2)}` : entry.pnl.toFixed(2)} USD
            </Badge>
          </div>
          
          {entry.notes && (
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-primary flex items-center gap-2"><MessageSquare className="w-4 h-4"/>My Insights</h4>
              <p className="text-secondary text-sm bg-surface p-2 rounded-md">{entry.notes}</p>
            </div>
          )}

          {entry.ai_positive_feedback && (
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-primary flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-gold"/>AI Coach Feedback</h4>
              <p className="text-secondary text-sm bg-accent-gold/10 p-2 rounded-md border-l-2 border-accent-gold">{entry.ai_positive_feedback}</p>
            </div>
          )}
        </div>
        
        <div className="relative">
          {entry.screenshot_url ? (
            <img src={entry.screenshot_url} alt={`Trade on ${entry.asset_ticker}`} className="w-full h-full object-cover rounded-md border border-default"/>
          ) : (
            <div className="w-full h-full bg-surface rounded-md flex items-center justify-center">
              <p className="text-secondary text-sm">No screenshot uploaded</p>
            </div>
          )}
           <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(entry.id)}
            className="absolute top-2 right-2 bg-red-800/70 hover:bg-red-700/90"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (showAdvanced && unlockStatus.isUnlocked) {
    return <AdvancedTradingJournal onBackToBasic={() => setShowAdvanced(false)} />;
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-accent-green" />
              Trading Journal
            </div>
            <Button 
              className="bg-zinc-900 text-amber-600 hover:bg-zinc-800 border border-amber-600/20 shadow-lg"
              onClick={() => {
                if (unlockStatus.isUnlocked) {
                  setShowAdvanced(true);
                } else {
                  alert(`Progress: ${unlockStatus.tradingDays}/10 trading days, ${unlockStatus.totalEntries}/10 total entries`);
                }
              }}
            >
              {unlockStatus.isUnlocked ? (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  {unlockStatus.isAdmin ? 'Admin Access' : 'Open Advanced'}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {unlockStatus.tradingDays}/10 Days
                </>
              )}
            </Button>
          </CardTitle>
          
          {!unlockStatus.isUnlocked && !unlockStatus.isAdmin && (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                🏆 <strong>Unlock Advanced Features:</strong> Log trades across 10 different trading days (minimum 10 total entries) to unlock advanced analytics and insights.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Progress: {unlockStatus.tradingDays}/10 trading days • {unlockStatus.totalEntries}/10 total entries
              </p>
            </div>
          )}
          {unlockStatus.isAdmin && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-800 dark:text-green-200">
                👑 <strong>Admin Access:</strong> You have administrative privileges and can access all advanced features.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="asset_ticker"
                placeholder="Asset / Ticker (e.g., EUR/USD)"
                value={newEntry.asset_ticker}
                onChange={handleInputChange}
                className="bg-surface border-default"
                required
              />
              <Input
                name="pnl"
                type="number"
                placeholder="Profit / Loss (e.g., 150.50 or -75.25)"
                value={newEntry.pnl}
                onChange={handleInputChange}
                className="bg-surface border-default"
                required
              />
            </div>
            <Textarea
              name="notes"
              placeholder="Your insights: Why did you take this trade? What did you learn?"
              value={newEntry.notes}
              onChange={handleInputChange}
              className="bg-surface border-default h-24"
            />
            <div className="flex items-center gap-4">
               <label htmlFor="screenshot-upload" className="cursor-pointer flex-1">
                <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-default rounded-md text-secondary hover:bg-surface transition">
                  <Camera className="w-5 h-5"/>
                  <span>{screenshotFile ? screenshotFile.name : "Upload Screenshot"}</span>
                </div>
                <input id="screenshot-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <Button type="submit" disabled={isSubmitting} className="bg-accent-green hover:bg-green-500 text-white">
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

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-primary">Past Entries</h3>
        {isLoading ? (
          <p className="text-secondary">Loading journal...</p>
        ) : entries.length > 0 ? (
          entries.map(entry => <EntryCard key={entry.id} entry={entry} />)
        ) : (
          <p className="text-secondary text-center py-8">Your journal is empty. Add your first trade to get started!</p>
        )}
      </div>
    </div>
  );
}
