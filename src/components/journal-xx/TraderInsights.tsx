import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TradeEntry } from './types';
import { calculateGreedyMeter, calculateMonthlyGoalProgress } from './utils/traderDNACalculator';
import { classifyTradeDuration, TradeStyle } from './utils/tradeDurationClassifier';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TraderInsightsProps {
  trades: TradeEntry[];
  traderDNA: {
    imperialScore: number;
    metrics: {
      discipline: number;
      execution: number;
      riskManagement: number;
      patience: number;
      focus: number;
      winRate: number;
    };
    insights: {
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
    };
  };
  isDarkMode?: boolean;
  hasProcessingTrades?: boolean;
}

export const TraderInsights: React.FC<TraderInsightsProps> = ({ trades, traderDNA, isDarkMode = true, hasProcessingTrades = false }) => {
  // Generate unique gradient ID to avoid conflicts
  const goalGradientId = React.useId();

  // Animation states
  const [animatedGoalProgress, setAnimatedGoalProgress] = useState(0);
  const [animatedGreedyMeter, setAnimatedGreedyMeter] = useState(0);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(5000);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const { user } = useAuth();

  // Calculate Top 3 Strategies - Use time-based classification for AUTO trades
  const topStrategies = React.useMemo(() => {
    const strategyMap = new Map<string, { netPnL: number; wins: number; total: number }>();
    
    // Debug: Log trades to see what data we're receiving
    if (trades.length > 0) {
      console.log('🔍 TraderInsights: Calculating Top Strategies from', trades.length, 'trades');
      console.log('🔍 Sample trade data:', trades.slice(0, 3).map(t => ({ 
        id: t.id, 
        is_synced: t.is_synced, 
        strategy: t.strategy, 
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        pnl: t.pnl 
      })));
    }
    
    trades.forEach(trade => {
      let strategyKey: string;
      
      // For AUTO journal trades (is_synced === true), use time-based classification
      if (trade.is_synced === true && trade.entry_time && trade.exit_time) {
        const durationInfo = classifyTradeDuration(trade.entry_time, trade.exit_time);
        strategyKey = `${durationInfo.style} (${durationInfo.label})`;
        console.log(`✅ Auto trade classified: ${strategyKey}`, {
          entry_time: trade.entry_time,
          exit_time: trade.exit_time,
          duration: durationInfo.durationMinutes + ' mins'
        });
      } else {
        // For MANUAL trades, use the strategy field
        const strategy = trade.strategy?.trim();
        if (!strategy || strategy === '') {
          return; // Skip trades without strategy
        }
        strategyKey = strategy;
      }
      
      const existing = strategyMap.get(strategyKey) || { netPnL: 0, wins: 0, total: 0 };
      existing.netPnL += trade.pnl || 0;
      existing.total += 1;
      if ((trade.pnl || 0) > 0) existing.wins += 1;
      strategyMap.set(strategyKey, existing);
    });

    const strategies = Array.from(strategyMap.entries())
      .map(([name, data]) => ({
        name,
        netPnL: data.netPnL,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        totalTrades: data.total,
      }))
      .sort((a, b) => b.netPnL - a.netPnL)
      .slice(0, 3);

    // Debug: Log calculated strategies
    if (strategies.length > 0) {
      console.log('✅ TraderInsights: Top Strategies calculated:', strategies);
    }

    // Always return 3 items, fill with "Journal new strat" if needed
    while (strategies.length < 3) {
      strategies.push({
        name: 'Journal new strat',
        netPnL: 0,
        winRate: 0,
        totalTrades: 0,
      });
    }

    return strategies;
  }, [trades]);

  const overallWinRate = traderDNA.insights.totalTrades > 0 
    ? (traderDNA.insights.winningTrades / traderDNA.insights.totalTrades) * 100 
    : 0;

  // Calculate Preferred Session
  const sessionData = React.useMemo(() => {
    const sessions = ['Sydney', 'London', 'New York'];
    
    // Debug: Log trades to see session data
    if (trades.length > 0) {
      console.log('🔍 TraderInsights: Calculating Preferred Session from', trades.length, 'trades');
      console.log('🔍 Sample trade sessions:', trades.slice(0, 3).map(t => ({ id: t.id, session: t.session, pnl: t.pnl })));
    }
    
    return sessions.map(session => {
      // Match session names more flexibly - handle various formats
      const sessionTrades = trades.filter(t => {
        if (!t.session) return false;
        const sessionLower = t.session.toLowerCase().trim();
        const sessionNameLower = session.toLowerCase();
        
        // More flexible matching
        if (session === 'London') {
          return sessionLower.includes('london');
        } else if (session === 'Sydney') {
          return sessionLower.includes('sydney');
        } else if (session === 'New York') {
          return sessionLower.includes('new york') || sessionLower.includes('ny') || sessionLower.includes('newyork');
        }
        // Fallback: direct match
        return sessionLower === sessionNameLower || sessionLower.includes(sessionNameLower);
      });
      
      const netProfit = sessionTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const result = {
        session,
        netProfit: Math.round(netProfit * 100) / 100,
        totalTrades: sessionTrades.length,
      };
      
      // Debug: Log session calculation
      if (sessionTrades.length > 0) {
        console.log(`✅ ${session} session:`, result);
      }
      
      return result;
    });
  }, [trades]);

  const bestSession = sessionData.reduce((best, current) => 
    current.netProfit > best.netProfit ? current : best, sessionData[0] || { session: 'N/A', netProfit: 0 }
  ).session;

  const worstSession = sessionData.reduce((worst, current) => 
    current.totalTrades > worst.totalTrades && current.netProfit < worst.netProfit ? current : worst, 
    sessionData[0] || { session: 'N/A', totalTrades: 0, netProfit: 0 }
  ).session;

  // Calculate Greedy Meter using God Mode logic
  // Counts trades where target_hit_by_market === true AND exit_price < planned_target_price
  const greedyMeter = useMemo(() => calculateGreedyMeter(trades), [trades]);

  // Determine Greedy Meter color zones
  const getGreedyColor = (score: number): string => {
    if (score <= 20) return '#2ecc71'; // Green (Safe/Disciplined)
    if (score <= 50) return '#f1c40f'; // Yellow (Caution)
    return '#e74c3c'; // Red (Danger)
  };

  const greedyColor = useMemo(() => getGreedyColor(greedyMeter), [greedyMeter]);

  // Fetch monthly goal from user profile
  const [monthlyGoal, setMonthlyGoal] = useState(5000); // Default
  
  useEffect(() => {
    const fetchMonthlyGoal = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('monthly_goal')
          .eq('id', user.id)
          .single();
        
        if (!error && data && (data as any).monthly_goal) {
          const goal = (data as any).monthly_goal;
          setMonthlyGoal(goal);
          setEditingGoal(goal);
        }
      } catch (error) {
        console.error('Failed to fetch monthly goal:', error);
      }
    };
    
    fetchMonthlyGoal();
  }, [user?.id]);

  // Calculate Monthly Goal Progress (current month only, not all-time)
  const goalStats = useMemo(() => calculateMonthlyGoalProgress(trades, monthlyGoal), [trades, monthlyGoal]);
  const goalCurrent = goalStats.current;
  const goalTarget = goalStats.target;
  const goalProgress = goalStats.percent;

  // Save monthly goal to profile
  const handleSaveMonthlyGoal = async () => {
    if (!user?.id) return;
    
    setIsSavingGoal(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ monthly_goal: editingGoal } as any)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setMonthlyGoal(editingGoal);
      setIsGoalModalOpen(false);
    } catch (error) {
      console.error('Failed to save monthly goal:', error);
      alert('Failed to save monthly goal. Please try again.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Animate Goal Progress: Fill to 100% in 0.5s, then go to correct number in 1s
  useEffect(() => {
    setAnimatedGoalProgress(0);
    const fillDuration = 500; // 0.5s to fill to 100%
    const settleDuration = 1000; // 1s to go to correct number
    const totalDuration = fillDuration + settleDuration;
    let startTime: number;

    const animate = () => {
      if (!startTime) startTime = Date.now();
      const elapsed = Date.now() - startTime;
      
      if (elapsed < fillDuration) {
        // Phase 1: Fill to 100% in 0.5s
        const progress = elapsed / fillDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setAnimatedGoalProgress(0 + (100 - 0) * easeOut);
        requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        // Phase 2: Go from 100% to target in 1s
        const phase2Elapsed = elapsed - fillDuration;
        const progress = phase2Elapsed / settleDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setAnimatedGoalProgress(100 + (goalProgress - 100) * easeOut);
        requestAnimationFrame(animate);
      } else {
        setAnimatedGoalProgress(goalProgress);
      }
    };

    // Delay: 1000ms (after Preferred Session)
    const timeout = setTimeout(() => {
      startTime = Date.now();
      requestAnimationFrame(animate);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [goalProgress]);

  // Animate Greedy Meter: Ramp to 100% in 0.5s, then go to correct percentage in 1.5s
  useEffect(() => {
    setAnimatedGreedyMeter(0);
    const rampDuration = 500; // 0.5s to ramp to 100%
    const settleDuration = 1500; // 1.5s to go to correct percentage
    const totalDuration = rampDuration + settleDuration;
    let startTime: number;

    const animate = () => {
      if (!startTime) startTime = Date.now();
      const elapsed = Date.now() - startTime;
      
      if (elapsed < rampDuration) {
        // Phase 1: Ramp to 100% in 0.5s
        const progress = elapsed / rampDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setAnimatedGreedyMeter(0 + (100 - 0) * easeOut);
        requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        // Phase 2: Go from 100% to target in 1.5s
        const phase2Elapsed = elapsed - rampDuration;
        const progress = phase2Elapsed / settleDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setAnimatedGreedyMeter(100 + (greedyMeter - 100) * easeOut);
        requestAnimationFrame(animate);
      } else {
        setAnimatedGreedyMeter(greedyMeter);
      }
    };

    // Delay: 1400ms (after Goal Progress starts)
    const timeout = setTimeout(() => {
      startTime = Date.now();
      requestAnimationFrame(animate);
    }, 1400);

    return () => clearTimeout(timeout);
  }, [greedyMeter]);

  return (
    <div className="flex flex-col h-full px-5 pb-5 overflow-y-auto">
      {/* Processing Indicator */}
      {hasProcessingTrades && (
        <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg ${
          isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
        } animate-pulse shrink-0`}>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-medium">New trade is processing - Insights will update shortly...</span>
        </div>
      )}
      
      {/* Widget 1: Top 3 Strategies */}
      <div className="mb-6 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3 text-center">
          TOP PERFORMING STRATS
        </h3>
        <div className="space-y-3">
          {topStrategies.map((strategy, index) => {
            const rankColors = [
              { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500/30' }, // Gold - 1st
              { bg: 'bg-slate-400/20', text: 'text-slate-400', border: 'border-slate-400/30' }, // Silver - 2nd
              { bg: 'bg-amber-600/20', text: 'text-amber-600', border: 'border-amber-600/30' }, // Bronze - 3rd
            ];
            const rankColor = rankColors[index];
            const rankNumber = index + 1;
            
            return (
              <motion.div 
                key={`${strategy.name}-${index}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.2, // Staggered: 0ms, 200ms, 400ms
                  ease: 'easeOut'
                }}
                className={`flex flex-col gap-2 p-3 rounded-lg border ${
                  strategy.name === 'Journal new strat' 
                    ? 'bg-slate-800/20 dark:bg-slate-800/20 opacity-50 border-slate-700/30' 
                    : `bg-slate-800/30 dark:bg-slate-800/30 ${rankColor.border}`
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Rank Badge */}
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${rankColor.bg} border ${rankColor.border} ${rankColor.text} font-black text-[10px] flex-shrink-0`}>
                    {rankNumber}
                  </div>
                  <span className="text-xs font-bold">{strategy.name}</span>
                </div>
                {strategy.name !== 'Journal new strat' && (
                  <div className="flex items-center gap-2 ml-8">
                    <span className="text-[10px] opacity-70">Win Rate:</span>
                    <span className="text-xs font-bold">{strategy.winRate.toFixed(0)}%</span>
                    {strategy.winRate > overallWinRate ? (
                      <span className="text-green-500 text-xs">↑</span>
                    ) : (
                      <span className="text-red-500 text-xs">↓</span>
                    )}
                    <span 
                      className={`text-xs font-bold ml-auto ${
                        strategy.netPnL >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {strategy.netPnL >= 0 ? '+' : ''}${strategy.netPnL.toLocaleString()}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Widget 2: Preferred Session */}
      <motion.div 
        className="mb-6 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.8, 
          delay: 0.6, // After Top Strats complete (0ms + 200ms + 400ms + 200ms buffer)
          ease: 'easeOut'
        }}
      >
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3 text-center">
          PREFERRED SESSION
        </h3>
        <div className="w-full flex items-center justify-center overflow-x-auto">
          <ResponsiveContainer width="100%" height={200} minWidth={450}>
            <BarChart data={sessionData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="session" 
                tick={{ fill: isDarkMode ? '#a1a1aa' : '#78716c', fontSize: 10 }}
                interval={0}
                angle={0}
                textAnchor="middle"
              />
              <YAxis 
                yAxisId="profit"
                orientation="left"
                tick={{ fill: '#10b981', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="trades"
                orientation="right"
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#18181b' : '#ffffff', 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }} 
              />
              <Bar 
                yAxisId="profit" 
                dataKey="netProfit" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="trades" 
                dataKey="totalTrades" 
                fill="#6b7280" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] italic opacity-60 mt-2 text-center">
          Focus on {bestSession}. You over-trade {worstSession}.
        </p>
      </motion.div>

      {/* Widget 3 & 4: Goal Progress and Greedy Meter - Side by Side */}
      <div className="mb-6 shrink-0">
        <div className="grid grid-cols-2 gap-4">
          {/* Goal Progress - Left Side */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3 text-center">
              GOAL PROGRESS
            </h3>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity group"
              onClick={() => setIsGoalModalOpen(true)}
              title="Click to set monthly goal"
            >
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <defs>
                    <linearGradient id={goalGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={`url(#${goalGradientId})`}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - animatedGoalProgress / 100)}`}
                    strokeLinecap="round"
                    style={{
                      filter: animatedGoalProgress >= 100 ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' : 'none',
                      transition: 'stroke-dashoffset 0.1s linear'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black">{Math.round(animatedGoalProgress)}%</div>
                  <div className="text-[10px] opacity-70">${goalCurrent.toLocaleString()} / ${goalTarget.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="text-[8px] opacity-50 text-center mt-1 group-hover:opacity-70">
              Click to edit goal
            </div>
          </div>

          {/* Greedy Meter - Right Side (Smaller by 1/4 = 75% of original) */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3 text-center">
              GREEDY METER
            </h3>
            <div className="flex flex-col items-center">
              <div
                className="relative"
                style={{
                  width: '150px',
                  height: '75px',
                  background: `conic-gradient(from 270deg at 50% 100%, #2ecc71 0deg 36deg, #f1c40f 36deg 90deg, #e74c3c 90deg 180deg)`,
                  borderRadius: '150px 150px 0 0',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  paddingBottom: '15px',
                }}
              >
                {/* Inner cutout to create the arc/gauge effect */}
                <div
                  className="absolute"
                  style={{
                    top: '15px',
                    left: '15px',
                    right: '15px',
                    bottom: '0',
                    backgroundColor: isDarkMode ? '#141414' : '#ffffff',
                    borderRadius: '135px 135px 0 0',
                    zIndex: 1,
                  }}
                />
                
                {/* Percentage text in the center */}
                <div
                  className="absolute"
                  style={{
                    bottom: '34px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                    zIndex: 2,
                  }}
                >
                  {Math.round(animatedGreedyMeter)}%
                </div>
                
                {/* Needle */}
                <motion.div
                  className="absolute"
                  style={{
                    bottom: '0',
                    left: '50%',
                    width: '3px',
                    height: '60px',
                    backgroundColor: 'white',
                    transformOrigin: 'bottom center',
                    zIndex: 3,
                    borderRadius: '3px',
                  }}
                  animate={{
                    rotate: -90 + (animatedGreedyMeter / 100 * 180),
                    x: '-50%'
                  }}
                  transition={{
                    duration: 0.1,
                    ease: 'linear'
                  }}
                >
                  {/* Pivot point of the needle */}
                  <div
                    className="absolute"
                    style={{
                      bottom: '-6px',
                      left: '-5px',
                      width: '13px',
                      height: '13px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                    }}
                  />
                </motion.div>
              </div>
              
              {/* Labels container */}
              <div
                className="flex justify-between"
                style={{
                  width: '150px',
                  marginTop: '4px',
                  fontSize: '14px',
                }}
              >
                <span className="text-[9px] font-bold" style={{ color: '#2ecc71' }}>Disciplined</span>
                <span className="text-[9px] font-bold" style={{ color: '#e74c3c' }}>Greedy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal Editor Modal */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Monthly Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Monthly Profit Goal ($)</label>
              <Input
                type="number"
                value={editingGoal}
                onChange={(e) => setEditingGoal(Number(e.target.value))}
                min="0"
                step="100"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current progress: ${goalCurrent.toLocaleString()} / ${goalTarget.toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMonthlyGoal} disabled={isSavingGoal}>
              {isSavingGoal ? 'Saving...' : 'Save Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
