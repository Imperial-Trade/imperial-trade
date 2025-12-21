import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TradeEntry, TradeFormData, AnalysisStatus } from '@/components/journal-xx/types';
import { analyzeTradeWithGemini } from '@/components/journal-xx/services/geminiService';
import { TradeEntryForm } from '@/components/journal-xx/TradeEntryForm';
import { AnalysisDisplay } from '@/components/journal-xx/AnalysisDisplay';
import { PnLChart } from '@/components/journal-xx/PnLChart';
import { PhaseLoader } from '@/components/journal-xx/PhaseLoader';
import { TradeReview } from '@/components/journal-xx/TradeReview';
import { JournalPro } from '@/components/journal-xx/JournalPro';
import { NotebookIcon, SunIcon, MoonIcon, SparklesIcon, NotebookOpenIcon, BarChartIcon, CalculatorIcon, GamepadIcon } from '@/components/journal-xx/ui/Icons';
import { useTheme } from '@/contexts/SafeThemeProvider';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { useAuth } from '@/contexts/AuthContext';
import { TradeJournalEntry as TJEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Format a date string (YYYY-MM-DD) for display without timezone issues
 * Creates a local Date object to avoid UTC conversion shifting dates
 */
const formatDateForDisplay = (dateStr: string): string => {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
};

const NAV_ITEMS = [
  { id: 'JOURNAL', icon: NotebookIcon, label: 'Journal' },
  { id: 'MECCA', icon: BarChartIcon, label: 'Mecca' },
  { id: 'CALCU', icon: CalculatorIcon, label: 'Calcu' },
  { id: 'GAMES', icon: GamepadIcon, label: 'Games' },
];

export default function JournalXX() {
  // Use the app's global theme system for synchronization
  const { theme, toggleTheme: appToggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  
  // Load trades from Supabase
  const { entries: journalEntries, isLoading: isLoadingEntries, refreshEntries } = useTradeJournal();
  
  // Map Supabase entries to TradeEntry format
  const trades = useMemo(() => {
    // Debug: Log raw journal entries from database
    if (journalEntries.length > 0) {
      console.log('🔍 JournalXX: Received', journalEntries.length, 'journal entries from database');
      console.log('🔍 Sample journal entry:', {
        id: journalEntries[0].id,
        strategy: journalEntries[0].strategy,
        session: journalEntries[0].session,
        emotion: journalEntries[0].emotion,
        pnl: journalEntries[0].pnl,
        followed_plan: journalEntries[0].followed_plan,
        revenge_trade: journalEntries[0].revenge_trade,
        target_hit_by_market: journalEntries[0].target_hit_by_market,
        planned_target_price: journalEntries[0].planned_target_price,
        exit_price: journalEntries[0].exit_price,
        entry_price: journalEntries[0].entry_price,
      });
    }
    
    // Deduplicate journal entries by ID before mapping (prevent duplicates from database/real-time subscriptions)
    const seenIds = new Set<string>();
    const uniqueEntries = journalEntries.filter(entry => {
      if (seenIds.has(entry.id)) {
        console.warn(`⚠️ JournalXX: Duplicate journal entry detected: ${entry.id} - ${entry.asset_ticker}. Skipping duplicate.`);
        return false;
      }
      seenIds.add(entry.id);
      return true;
    });
    
    if (uniqueEntries.length !== journalEntries.length) {
      console.warn(`⚠️ JournalXX: Found ${journalEntries.length - uniqueEntries.length} duplicate entry(ies). Original: ${journalEntries.length}, Unique: ${uniqueEntries.length}`);
    }
    
    const mappedTrades = uniqueEntries.map((entry): TradeEntry => ({
      id: entry.id,
      // Use trade_date for display, but preserve created_at for proper sorting of same-day trades
      // Store as YYYY-MM-DD format to avoid timezone issues when displaying
      date: entry.trade_date || new Date().toISOString().split('T')[0],
      asset: entry.asset_ticker,
      pnl: entry.pnl,
      notes: entry.notes || '',
      imageUrl: entry.screenshot_url || (entry.screenshot_urls && entry.screenshot_urls.length > 0 ? entry.screenshot_urls[0] : undefined),
      imageUrls: entry.screenshot_urls && entry.screenshot_urls.length > 0 ? entry.screenshot_urls : (entry.screenshot_url ? [entry.screenshot_url] : []),
      aiFeedback: entry.ai_positive_feedback || undefined,
      direction: entry.trade_type === 'Long' ? 'Long' : entry.trade_type === 'Short' ? 'Short' : undefined,
      outcome: entry.pnl >= 0 ? 'Win' : 'Loss' as 'Win' | 'Loss' | 'Break Even',
      strategy: entry.strategy || undefined,
      emotion: entry.emotion || undefined,
      session: entry.session || undefined,
      // Store created_at for sorting same-day trades
      createdAt: entry.created_at,
      // Trader DNA fields - CRITICAL for calculations
      followedPlan: entry.followed_plan !== null && entry.followed_plan !== undefined ? entry.followed_plan : undefined,
      exit_price: entry.exit_price || undefined,
      entry_price: entry.entry_price || undefined,
      position_size: entry.position_size || undefined,
      target_hit_by_market: entry.target_hit_by_market !== null && entry.target_hit_by_market !== undefined ? entry.target_hit_by_market : undefined,
      planned_target_price: entry.planned_target_price || undefined,
      planned_stop_loss: entry.planned_stop_loss || undefined,
      revenge_trade: entry.revenge_trade !== null && entry.revenge_trade !== undefined ? entry.revenge_trade : undefined,
    }));
    
    // Debug: Log mapped trades
    if (mappedTrades.length > 0) {
      console.log('✅ JournalXX: Mapped', mappedTrades.length, 'trades');
      console.log('✅ Sample mapped trade:', {
        id: mappedTrades[0].id,
        strategy: mappedTrades[0].strategy,
        session: mappedTrades[0].session,
        emotion: mappedTrades[0].emotion,
        pnl: mappedTrades[0].pnl,
        followedPlan: mappedTrades[0].followedPlan,
        revenge_trade: mappedTrades[0].revenge_trade,
        target_hit_by_market: mappedTrades[0].target_hit_by_market,
        planned_target_price: mappedTrades[0].planned_target_price,
        exit_price: mappedTrades[0].exit_price,
        entry_price: mappedTrades[0].entry_price,
      });
    }
    
    return mappedTrades;
  }, [journalEntries]);
  
  const [currentAnalysis, setCurrentAnalysis] = useState<string>('');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [isAnalysisReady, setIsAnalysisReady] = useState(false);
  // Use ref to store feedback immediately (avoids React state timing issues)
  const analysisRef = React.useRef<string>('');
  const analyzingStartTimeRef = React.useRef<number | null>(null);
  const analyzingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Interaction States
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  
  // Review Flow State
  const [showPostAnalysisReview, setShowPostAnalysisReview] = useState(false);
  const [reviewTradeId, setReviewTradeId] = useState<string | null>(null);

  // View Mode: 'journal' or 'pro'
  const [viewMode, setViewMode] = useState<'journal' | 'pro'>('journal');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Nav State
  const [activeTab, setActiveTab] = useState('JOURNAL');

  // Computed state for mobile view
  const isMobileAnalysisMode = analysisStatus === AnalysisStatus.ANALYZING || showPostAnalysisReview;

  // Cleanup timeout on unmount
  React.useEffect(() => {
      return () => {
          if (analyzingTimeoutRef.current) {
              clearTimeout(analyzingTimeoutRef.current);
      }
      };
  }, []);

  // Use the app's global theme toggle for synchronization with sidebar widget
  const toggleTheme = () => {
      appToggleTheme();
  };

  const toggleViewMode = () => {
      setIsTransitioning(true);
      
      // Clean up timeout when switching views
      if (analyzingTimeoutRef.current) {
          clearTimeout(analyzingTimeoutRef.current);
          analyzingTimeoutRef.current = null;
      }
      
      setTimeout(() => {
          setViewMode(prev => {
              const newMode = prev === 'journal' ? 'pro' : 'journal';
              // Reset analysis states when switching back to standard journal
              if (newMode === 'journal') {
                  setAnalysisStatus(AnalysisStatus.IDLE);
                  setCurrentAnalysis('');
                  analysisRef.current = '';
                  setIsAnalysisReady(false);
                  setShowPostAnalysisReview(false);
                  setReviewTradeId(null);
                  setEditingTradeId(null);
                  analyzingStartTimeRef.current = null;
                  
                  // CRITICAL: Refresh trade list when switching back to Journal XX
                  // This ensures any trades saved in JournalPro are visible immediately
                  if (refreshEntries) {
                      refreshEntries().then(() => {
                          console.log('✅ Trade list refreshed after switching from Pro to Journal');
                      }).catch((err) => {
                          console.warn('⚠️ Failed to refresh trade list:', err);
                      });
                  }
              }
              return newMode;
          });
          setIsTransitioning(false);
      }, 500); // Wait for transition
  };

  // Updated to accept optional ID for Pro view overrides
  const handleTradeSubmit = async (data: TradeFormData, id?: string) => {
    const targetId = id || editingTradeId;

    if (targetId) {
        // Handle Update Logic locally here to reuse code
        const originalTrade = trades.find(t => t.id === targetId);
        if (!originalTrade) return;

        let imageBase64 = originalTrade.imageUrl;
        if (data.image) {
            try {
                imageBase64 = await fileToBase64(data.image);
            } catch (e) { console.error(e); }
        }

        const [year, month, day] = data.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        const updatedTrade: TradeEntry = {
            ...originalTrade,
            date: dateObj.toISOString(),
            asset: data.asset,
            pnl: Number(data.pnl),
            notes: data.notes,
            imageUrl: imageBase64,
            // Pro Fields update
            direction: data.direction,
            outcome: data.outcome,
            strategy: data.strategy,
            emotion: data.emotion,
            session: data.session
        };

        // Update trade in Supabase
        if (user) {
            try {
                await TJEntry.update(targetId, {
                    asset_ticker: data.asset,
                    pnl: Number(data.pnl),
                    notes: data.notes,
                    trade_date: dateObj.toISOString().split('T')[0],
                    screenshot_url: imageBase64,
                    trade_type: data.direction === 'Long' ? 'Long' : data.direction === 'Short' ? 'Short' : undefined,
                });
                if (refreshEntries) refreshEntries();
            } catch (error) {
                console.error('Failed to update trade:', error);
            }
        }
        setEditingTradeId(null);
        setAnalysisStatus(AnalysisStatus.IDLE);
        setCurrentAnalysis('');
        setShowPostAnalysisReview(false);
        return;
    }

    setAnalysisStatus(AnalysisStatus.ANALYZING);
    setCurrentAnalysis('');
    setIsAnalysisReady(false); 
    setShowPostAnalysisReview(false);

    let imageBase64 = undefined;
    if (data.image) {
      try {
        imageBase64 = await fileToBase64(data.image);
      } catch (e) {
        console.error("Failed to read image", e);
      }
    }

    // Pass detailed fields if available (Standard mode - isPro = false for simpler analysis)
    analyzeTradeWithGemini(
        data.asset, 
        Number(data.pnl), 
        data.notes, 
        imageBase64, 
        data.direction, 
        data.outcome, 
        data.strategy, 
        data.emotion, 
        data.session,
        false // isPro = false for standard Journal XX
    )
      .then(feedback => {
        console.log('✅ JournalXX: Received AI feedback, length:', feedback?.length || 0);
        console.log('✅ JournalXX: First 200 chars:', feedback?.substring(0, 200) || 'No feedback');
        setCurrentAnalysis(feedback);
        setIsAnalysisReady(true);
      })
      .catch(error => {
        console.error('❌ JournalXX: Error getting AI feedback:', error);
        setCurrentAnalysis('');
        setIsAnalysisReady(true);
      });

    const [year, month, day] = data.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    // Note: Trade creation is now handled in JournalPro's handleAnalyze
    // This function is only called from Journal XX standard mode
    // For now, we'll still create it here for standard mode compatibility
    if (user) {
        try {
            const newEntry = await TJEntry.create({
                asset_ticker: data.asset,
      pnl: Number(data.pnl),
      notes: data.notes,
                trade_date: dateObj.toISOString().split('T')[0],
                screenshot_url: imageBase64,
                trade_type: data.direction === 'Long' ? 'Long' : data.direction === 'Short' ? 'Short' : undefined,
            }, user.id);
            setReviewTradeId(newEntry.id);
            
            // CRITICAL: Force refresh immediately after creating trade
            if (refreshEntries) {
                // Add small delay to ensure DB commit is complete
                setTimeout(() => {
                    refreshEntries().then(() => {
                        console.log('✅ Trade list refreshed after creation');
                    }).catch((err) => {
                        console.warn('⚠️ Failed to refresh trade list:', err);
                    });
                }, 200);
            }
        } catch (error) {
            console.error('Failed to create trade:', error);
        }
    }
  };

  const handleLoaderComplete = () => {
      // Update AI feedback in Supabase
      if (reviewTradeId && currentAnalysis && user) {
          supabase
              .from('trade_journal_entries')
              .update({ ai_positive_feedback: currentAnalysis })
              .eq('id', reviewTradeId)
              .then(() => {
                  if (refreshEntries) refreshEntries();
              });
      }
      setAnalysisStatus(AnalysisStatus.COMPLETE);
      setShowPostAnalysisReview(true);
  };

  // Deprecated direct usage, functionality merged into handleTradeSubmit
  const handleUpdateTrade = async (data: TradeFormData) => {
    // Left for compatibility if needed, but logic moved to handleTradeSubmit
  };

  const handleTradeClick = (id: string) => {
      if (activeOverlayId === id) setActiveOverlayId(null);
      else { setActiveOverlayId(id); setDeleteConfirmationId(null); }
  };

  const handleEditClick = (trade: TradeEntry) => {
      setEditingTradeId(trade.id);
      setActiveOverlayId(null);
      setShowPostAnalysisReview(false); 
      // With new layout, scroll to top of the scroll container
      const scrollContainer = document.querySelector('.custom-scrollbar');
      if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleReviewEdit = () => {
     if (reviewTradeId) {
         setEditingTradeId(reviewTradeId);
         setShowPostAnalysisReview(false); 
     }
  };

  const handleReviewDone = () => {
      setShowPostAnalysisReview(false);
      setReviewTradeId(null);
      setAnalysisStatus(AnalysisStatus.IDLE);
      setCurrentAnalysis('');
  };

  const handleDeleteClick = (id: string) => setDeleteConfirmationId(id);
  const confirmDelete = async (id: string) => {
      try {
          await TJEntry.delete(id);
          if (refreshEntries) refreshEntries();
      } catch (error) {
          console.error('Failed to delete trade:', error);
      }
      setDeleteConfirmationId(null);
      setActiveOverlayId(null);
  };
  const cancelDelete = () => setDeleteConfirmationId(null);
  const handleCancelEdit = () => { setEditingTradeId(null); setAnalysisStatus(AnalysisStatus.IDLE); setCurrentAnalysis(''); setShowPostAnalysisReview(false); };
  const toggleInsight = (id: string) => { setExpandedInsights(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };

  const totalPnL = trades.reduce((acc, curr) => acc + curr.pnl, 0);
  const editingTradeData = trades.find(t => t.id === editingTradeId);
  const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // For Performance Curve: sort chronologically (oldest first) for proper cumulative calculation
  // Sort by date AND created_at timestamp to handle same-day trades correctly, ensuring latest trade is on the right
  const chronologicalTrades = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // If dates are the same (within same day), sort by created_at timestamp (most recent last) to ensure correct order
      if (Math.abs(dateA - dateB) < 86400000) { // Within same day (24 hours)
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdA !== 0 && createdB !== 0) {
          return createdA - createdB; // Older created_at first (so newest is last)
        }
        // Fallback to ID comparison if no created_at (UUIDs sort chronologically)
        return a.id.localeCompare(b.id);
      }
      return dateA - dateB;
    });
    
    // Debug: Log last trade to verify it's the correct one
    if (sorted.length > 0) {
      const lastTrade = sorted[sorted.length - 1];
      console.log('🔍 Last trade in chronological order:', {
        date: lastTrade.date,
        pnl: lastTrade.pnl,
        asset: lastTrade.asset,
        createdAt: lastTrade.createdAt,
        id: lastTrade.id
      });
    }
    
    return sorted;
  }, [trades]);
  // Fix Net PnL formatting: -$12783.56 instead of $-12783.56
  const formattedPnL = (totalPnL >= 0 ? '+' : '-') + '$' + Math.abs(totalPnL).toFixed(2);
  const pnlLength = formattedPnL.length;
  // Adjusted font sizes for the more compact fixed header
  const pnlSizeClass = pnlLength > 12 ? 'text-xs md:text-sm' : 'text-sm md:text-base';

  // --- RENDER GOD MODE (PRO) ---
  if (viewMode === 'pro') {
      return (
        <div className={`w-full h-screen transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${isTransitioning ? 'translate-y-full' : 'translate-y-0'} overflow-y-auto`}>
            <JournalPro 
                isDarkMode={isDarkMode} 
                onExit={toggleViewMode} 
                onToggleTheme={toggleTheme}
                onSubmit={handleTradeSubmit}
                onDelete={async (id) => {
                    try {
                        await TJEntry.delete(id);
                        if (refreshEntries) refreshEntries();
                    } catch (error) {
                        console.error('Failed to delete trade:', error);
                    }
                }}
                trades={trades}
            />
        </div>
      );
  }

  // --- RENDER STANDARD JOURNAL ---
  // Uses local 'dark' class on container + isDarkMode for conditional styling to match source repository exactly
  return (
    <div className={`w-full h-screen ${isDarkMode ? 'dark' : ''} ${isTransitioning ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'} transition-all duration-700`}>
        <div className={`w-full h-full ${isDarkMode ? 'bg-black text-slate-200 selection:bg-bronze-500/30 selection:text-bronze-500' : 'bg-white text-stone-900 selection:bg-yellow-200 selection:text-black'} font-sans flex flex-col relative transition-colors duration-300`}>
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] ${isDarkMode ? 'bg-bronze-600/5' : 'bg-yellow-500/10'}`} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/5 blur-[150px]" />
        </div>

        {/* FIXED HEADER */}
        <header 
          className={`shrink-0 z-50 py-4 border-b transition-all duration-300 ${
            isDarkMode ? 'bg-black border-slate-800' : 'bg-white border-stone-200'
          }`}
          style={{
            // Mobile-only: Position below status bar
            paddingTop: window.innerWidth < 1024 ? `calc(1rem + env(safe-area-inset-top, 0px))` : '1rem',
          }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Left: View Toggle & Title */}
                <div className="flex items-center gap-3 md:gap-4">
                    <button 
                        onClick={toggleViewMode}
                        className={`p-2 rounded-xl shadow-sm border group hover:scale-105 transition-transform ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'}`}
                    >
                        <div className="relative w-5 h-5">
                                <div className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0 group-hover:rotate-180">
                                <NotebookIcon className="text-bronze-500 w-full h-full" />
                                </div>
                                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                                <NotebookOpenIcon className="text-bronze-500 w-full h-full" />
                                </div>
                        </div>
                    </button>
                    <h1 className="text-base md:text-xl font-bold tracking-widest font-sans flex items-center gap-2">
                        <span className={isDarkMode ? 'text-white' : 'text-stone-900'}>JOURNAL</span>
                        <span className="bg-gradient-to-r from-bronze-500 via-emerald-500 to-yellow-400 bg-clip-text text-transparent">XX</span>
                    </h1>
                </div>

                {/* Right: Theme & PnL */}
                <div className="flex items-center gap-3 md:gap-4">
                    <button 
                        onClick={toggleTheme}
                        className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-bronze-500' : 'bg-[#F5F5F0] border-stone-200 text-stone-500 hover:text-yellow-500'}`}
                    >
                        {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    </button>

                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${isDarkMode ? 'bg-slate-900/50 border-white/5 shadow-black/20' : 'bg-[#F5F5F0]/80 border-stone-200 shadow-stone-200/50'}`}>
                        <div className={`h-6 w-1 rounded-full ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
                        <div className="flex flex-col justify-center">
                            <span className={`text-[8px] font-bold uppercase tracking-widest leading-tight ${isDarkMode ? 'text-dirty-white/60' : 'text-stone-500'}`}>Net PnL</span>
                            <div className={`${pnlSizeClass} font-bold font-sans tracking-wide leading-none mt-0.5 ${
                                totalPnL >= 0 
                                ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-500')
                                : (isDarkMode ? 'text-rose-400' : 'text-rose-500')
                            }`}>
                            {formattedPnL}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-28 lg:pb-8 min-h-full">
                
                {/* GAMES TAB - Show on mobile when GAMES is active */}
                {activeTab === 'GAMES' && (
                    <div className="lg:hidden flex flex-col gap-6 pb-24">
                        <div className={`${isDarkMode ? 'backdrop-blur-xl bg-slate-900/40 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'} rounded-3xl border p-6 md:p-8 relative transition-colors duration-300 min-h-[300px]`}>
                            <div className={`absolute top-0 left-0 w-24 h-[1px] ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-stone-500'}`}>Trade Replay</h3>
                            <div className={`flex items-center justify-center h-full text-sm ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                                Trade Replay - Coming Soon
                            </div>
                        </div>
                        <div className={`${isDarkMode ? 'backdrop-blur-xl bg-slate-900/40 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'} rounded-3xl border p-6 md:p-8 relative transition-colors duration-300 min-h-[300px]`}>
                            <div className={`absolute top-0 left-0 w-24 h-[1px] ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-stone-500'}`}>Pattern Dojo</h3>
                            <div className={`flex items-center justify-center h-full text-sm ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                                Pattern Dojo - Coming Soon
                            </div>
                        </div>
                    </div>
                )}

                {/* MECCA TAB - Show placeholder */}
                {activeTab === 'MECCA' && (
                    <div className={`lg:hidden flex items-center justify-center h-[400px] border-2 border-dashed rounded-3xl ${isDarkMode ? 'border-slate-800' : 'border-stone-200'}`}>
                        <span className={`text-sm font-bold uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>MECCA Coming Soon</span>
                    </div>
                )}

                {/* CALCU TAB - Show placeholder */}
                {activeTab === 'CALCU' && (
                    <div className={`lg:hidden flex items-center justify-center h-[400px] border-2 border-dashed rounded-3xl ${isDarkMode ? 'border-slate-800' : 'border-stone-200'}`}>
                        <span className={`text-sm font-bold uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>CALCU Coming Soon</span>
                    </div>
                )}

                {/* JOURNAL TAB (default) - Standard Grid - Hidden on mobile during analysis or when other tabs active */}
                {activeTab === 'JOURNAL' && (
                    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8`}>
                        {/* Left Column: Form & Analysis (8 cols) */}
                        <div className={`lg:col-span-7 xl:col-span-8 space-y-8 ${isMobileAnalysisMode ? 'hidden lg:block' : ''}`}>
                        {/* Main Card */}
                        <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'} rounded-3xl border p-6 md:p-8 relative transition-colors duration-300 min-h-[500px] flex flex-col`}>
                            <div className={`absolute top-0 left-0 w-24 h-[1px] ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}`}></div>
                            
                            {/* CONDITIONAL RENDERING - DESKTOP */}
                            {showPostAnalysisReview ? (
                                 <TradeReview 
                                    analysis={currentAnalysis} 
                                    onEdit={handleReviewEdit} 
                                    onDone={handleReviewDone} 
                                 />
                            ) : (
                                 <TradeEntryForm 
                                    onSubmit={handleTradeSubmit} 
                                    initialData={editingTradeData}
                                    isEditing={!!editingTradeId}
                                    onCancelEdit={handleCancelEdit}
                                    analysisStatus={analysisStatus}
                                    isAnalysisReady={isAnalysisReady}
                                    onAnalysisComplete={handleLoaderComplete}
                                 />
                            )}
                        </div>
                    </div>

                    {/* Right Column: Stats & History (4 cols) */}
                    <div className={`lg:col-span-5 xl:col-span-4 space-y-6 ${isMobileAnalysisMode ? 'hidden lg:block' : ''}`}>
                        <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'} rounded-3xl border p-6 transition-colors duration-300`}>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 pb-2 border-b ${isDarkMode ? 'text-slate-500 border-slate-800/50' : 'text-stone-500 border-stone-200'}`}>Performance Curve</h3>
                            <PnLChart key={chronologicalTrades.length} data={chronologicalTrades} isDarkMode={isDarkMode} />
                        </div>

                        <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'} rounded-3xl border p-6 overflow-hidden min-h-[400px] transition-colors duration-300`}>
                            <div className={`flex items-center justify-between mb-6 pb-2 border-b ${isDarkMode ? 'border-slate-800/50' : 'border-stone-200'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-stone-500'}`}>Trade Log</h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-xl border ${isDarkMode ? 'bg-bronze-500/10 text-dirty-white border-bronze-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{trades.length}</span>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {sortedTrades.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-20 px-4 min-h-[400px]">
                                        <NotebookIcon className={`w-20 h-20 mb-6 ${isDarkMode ? 'text-slate-500 opacity-60' : 'text-stone-400 opacity-50'}`} strokeWidth={1.5} />
                                        <h4 className={`font-bold text-sm uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>NO TRADE LOGS</h4>
                                        <p className={`text-xs max-w-[220px] leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Start journaling your trades to see your history here.</p>
                                    </div>
                                ) : (
                                    sortedTrades.map((trade) => (
                                    <div 
                                        key={trade.id} 
                                        onClick={() => handleTradeClick(trade.id)}
                                        className={`group relative rounded-xl p-4 transition-all border cursor-pointer overflow-hidden select-none ${isDarkMode ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-bronze-500/50 shadow-none' : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-yellow-500/50 shadow-sm'} ${editingTradeId === trade.id ? (isDarkMode ? 'ring-2 ring-bronze-500' : 'ring-2 ring-yellow-500') : ''}`}
                                    >
                                        {activeOverlayId === trade.id && !deleteConfirmationId && (
                                            <div className={`absolute inset-0 z-10 backdrop-blur-md rounded-xl flex items-center justify-center gap-3 animate-[fadeIn_0.2s_ease-out] ${isDarkMode ? 'bg-black/60' : 'bg-white/60'}`}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(trade); }}
                                                    className={`px-4 py-2 text-black text-xs font-bold rounded-lg shadow-lg transition-colors uppercase tracking-wider ${isDarkMode ? 'bg-bronze-500 hover:bg-bronze-400' : 'bg-yellow-500 hover:bg-yellow-400'}`}
                                                >
                                                    Edit Trade
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(trade.id); }}
                                                    className={`px-4 py-2 text-rose-500 text-xs font-bold rounded-lg border transition-colors uppercase tracking-wider ${isDarkMode ? 'bg-slate-800 border-rose-900 hover:bg-rose-950/50' : 'bg-white border-rose-200 hover:bg-rose-50'}`}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}

                                        {deleteConfirmationId === trade.id && (
                                            <div className={`absolute inset-0 z-20 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-4 text-center animate-[zoomIn_0.2s_ease-out] ${isDarkMode ? 'bg-slate-900/95' : 'bg-rose-50/95'}`}>
                                                <p className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Are you sure you want to delete?</p>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); confirmDelete(trade.id); }}
                                                        className="px-4 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg"
                                                    >
                                                        YES
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); cancelDelete(); }}
                                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg border hover:bg-stone-50 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-stone-500 border-stone-200'}`}
                                                    >
                                                        NO
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
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}
                {/* End JOURNAL TAB */}
            </div>
        </div>

        {/* Mobile Focused Analysis/Review View - FIXED OVERLAY */}
        {isMobileAnalysisMode && (
            <div className={`fixed inset-0 z-[60] pt-20 px-4 pb-4 lg:hidden backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-black/95' : 'bg-white/95'}`}>
                    {analysisStatus === AnalysisStatus.ANALYZING ? (
                        <div className={`flex-1 flex items-center justify-center p-6 rounded-3xl border shadow-2xl ${isDarkMode ? 'backdrop-blur-xl bg-slate-900/40 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'}`}>
                            <PhaseLoader isReady={isAnalysisReady} onComplete={handleLoaderComplete} />
                        </div>
                    ) : (
                        // Render Review in full height container so buttons stick to bottom
                        <div className={`flex-1 rounded-3xl border p-6 flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'backdrop-blur-xl bg-slate-900/40 border-slate-800' : 'bg-[#F5F5F0] border-stone-200'}`}>
                                <TradeReview 
                                analysis={currentAnalysis} 
                                onEdit={handleReviewEdit} 
                                onDone={handleReviewDone} 
                                />
                        </div>
                    )}
            </div>
        )}
        
        {/* Mobile Bottom Nav - Hidden in Analysis Mode */}
        <div 
            className={`absolute bottom-0 left-0 right-0 z-50 lg:hidden px-6 pb-6 pt-2 bg-gradient-to-t ${isDarkMode ? 'from-black via-black/90 to-transparent' : 'from-white via-white/90 to-transparent'} ${isMobileAnalysisMode ? 'hidden' : 'block'}`}
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
                        onClick={() => setActiveTab(item.id)}
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

        <style>{`
            ::-webkit-scrollbar {
                display: none;
                width: 0px;
                background: transparent;
            }
            * {
              scrollbar-width: none;
            }
            .custom-scrollbar::-webkit-scrollbar {
                display: none;
                width: 0px;
                background: transparent;
            }
        `}</style>
        </div>
    </div>
  );
};

