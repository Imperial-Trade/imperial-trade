import { TradeEntry } from '../types';

export interface TraderDNAMetrics {
  discipline: number;
  execution: number;
  riskManagement: number;
  patience: number;
  focus: number;
  winRate: number;
}

/**
 * BRILLIANT TRADER DNA CALCULATOR
 * 
 * This calculator uses SIMPLE but MEANINGFUL metrics based on what traders
 * actually control and input, not complex AI-extracted data.
 * 
 * Philosophy:
 * - Execution = Following YOUR process (plan adherence, documentation, preparation)
 * - Risk Management = Protecting YOUR capital (loss control, win/loss ratio, position consistency)
 */
export const calculateTraderDNA = (trades: TradeEntry[]): {
  imperialScore: number;
  metrics: TraderDNAMetrics;
  insights: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
} => {
  console.log('🔍 calculateTraderDNA: Received', trades.length, 'trades');
  
  if (trades.length === 0) {
    console.log('✅ calculateTraderDNA: No trades, returning perfect starting score (100)');
    return {
      imperialScore: 100,
      metrics: {
        discipline: 100,
        execution: 100,
        riskManagement: 100,
        patience: 100,
        focus: 100,
        winRate: 100,
      },
      insights: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
      },
    };
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = (winningTrades.length / trades.length) * 100;

  // =============================================================================
  // 1. DISCIPLINE: Plan adherence and consistency
  // =============================================================================
  const planAdherenceTrades = trades.filter(t => t.followedPlan !== null && t.followedPlan !== undefined);
  const followedPlanCount = trades.filter(t => t.followedPlan === true).length;
  const discipline = planAdherenceTrades.length > 0
    ? (followedPlanCount / planAdherenceTrades.length) * 100
    : 50; // Default if no plan data

  // =============================================================================
  // 2. EXECUTION: How well you PREPARE and DOCUMENT your trades
  // =============================================================================
  // This is BRILLIANT because it measures PROCESS, not OUTCOME
  // A trader who documents well and follows their plan is executing well,
  // even if individual trades lose (that's just market variance)
  
  let executionScore = 0;
  let executionComponents = 0;
  
  trades.forEach(t => {
    let tradeScore = 0;
    
    // Component 1: Did you follow your plan? (30 points)
    // This is the MOST important - did you stick to your rules?
    if (t.followedPlan === true) {
      tradeScore += 30;
    } else if (t.followedPlan === false) {
      tradeScore += 0; // Penalty for not following plan
    } else {
      tradeScore += 15; // Neutral if not answered
    }
    
    // Component 2: Did you avoid revenge trading? (25 points)
    // Emotional control is key to execution
    const isRevenge = (t as any).revenge_trade === true;
    if (!isRevenge) {
      tradeScore += 25;
    } else {
      tradeScore += 0; // Revenge trades hurt execution
    }
    
    // Component 3: Did you have a strategy? (15 points)
    // Trading with a plan shows preparation
    if (t.strategy && t.strategy.trim() !== '' && t.strategy !== 'None') {
      tradeScore += 15;
    } else {
      tradeScore += 5; // Some credit for logging at all
    }
    
    // Component 4: Did you document your trade? (15 points)
    // Notes show you're reflecting and learning
    if (t.notes && t.notes.trim().length > 10) {
      tradeScore += 15;
    } else if (t.notes && t.notes.trim().length > 0) {
      tradeScore += 8;
    } else {
      tradeScore += 3;
    }
    
    // Component 5: Did you capture a chart screenshot? (15 points)
    // Visual documentation helps review and learning
    const tradeAny = t as any;
    const hasScreenshot = tradeAny.screenshot_url || (tradeAny.screenshot_urls && tradeAny.screenshot_urls.length > 0);
    if (hasScreenshot) {
      tradeScore += 15;
    } else {
      tradeScore += 5;
    }
    
    executionScore += tradeScore;
    executionComponents++;
  });
  
  const execution = executionComponents > 0 ? executionScore / executionComponents : 50;

  // =============================================================================
  // 3. RISK MANAGEMENT: Protecting your capital through smart trading
  // =============================================================================
  // This is BRILLIANT because it uses ACTUAL PnL data to measure risk control
  // No complex extraction needed - just smart math on what matters
  
  let riskManagement = 50; // Default
  
  if (trades.length >= 2) {
    let riskScore = 0;
    
    // Component 1: Profit Factor (40 points)
    // Total wins / Total losses - shows if you're cutting losses and letting winners run
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    if (totalLosses > 0) {
      const profitFactor = totalWins / totalLosses;
      // Profit factor of 2+ is excellent, 1.5+ is good, 1+ is break-even
      if (profitFactor >= 2) {
        riskScore += 40;
      } else if (profitFactor >= 1.5) {
        riskScore += 35;
      } else if (profitFactor >= 1) {
        riskScore += 25;
      } else if (profitFactor >= 0.5) {
        riskScore += 15;
      } else {
        riskScore += 5;
      }
    } else if (totalWins > 0) {
      // No losses yet - perfect but need more data
      riskScore += 40;
    } else {
      riskScore += 20; // Break-even
    }
    
    // Component 2: Average Win vs Average Loss (30 points)
    // Are you risking less than you're gaining?
    const avgWin = winningTrades.length > 0 
      ? totalWins / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? totalLosses / losingTrades.length 
      : 0;
    
    if (avgLoss > 0) {
      const riskRewardRatio = avgWin / avgLoss;
      // RR of 2:1 or better is excellent
      if (riskRewardRatio >= 2) {
        riskScore += 30;
      } else if (riskRewardRatio >= 1.5) {
        riskScore += 25;
      } else if (riskRewardRatio >= 1) {
        riskScore += 20;
      } else if (riskRewardRatio >= 0.5) {
        riskScore += 10;
      } else {
        riskScore += 5;
      }
    } else if (avgWin > 0) {
      riskScore += 30; // No losses
    } else {
      riskScore += 15;
    }
    
    // Component 3: No Catastrophic Losses (30 points)
    // No single loss should be > 30% of total PnL (absolute value)
    const totalPnL = trades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const maxLoss = losingTrades.length > 0 
      ? Math.max(...losingTrades.map(t => Math.abs(t.pnl)))
      : 0;
    
    if (totalPnL > 0) {
      const maxLossPercent = (maxLoss / totalPnL) * 100;
      if (maxLossPercent <= 10) {
        riskScore += 30; // Excellent risk control
      } else if (maxLossPercent <= 20) {
        riskScore += 25;
      } else if (maxLossPercent <= 30) {
        riskScore += 20;
      } else if (maxLossPercent <= 50) {
        riskScore += 10;
      } else {
        riskScore += 5; // One trade is too big a portion
      }
    } else {
      riskScore += 20;
    }
    
    riskManagement = riskScore;
    
    console.log('🔍 [RISK MANAGEMENT] Calculation:', {
      totalWins: totalWins.toFixed(2),
      totalLosses: totalLosses.toFixed(2),
      profitFactor: totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : 'N/A',
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      riskRewardRatio: avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A',
      maxLossPercent: totalPnL > 0 ? ((maxLoss / totalPnL) * 100).toFixed(1) + '%' : 'N/A',
      finalScore: riskScore
    });
  } else if (trades.length === 1) {
    // Single trade - give baseline score
    const trade = trades[0];
    if (trade.pnl >= 0) {
      riskManagement = 70; // Positive first trade
    } else {
      riskManagement = 50; // Negative first trade - neutral
    }
    
    // Bonus if they avoided revenge trade
    if ((trade as any).revenge_trade === false) {
      riskManagement += 10;
    }
  }

  // =============================================================================
  // 4. PATIENCE: Avoiding impulsive/revenge trading
  // =============================================================================
  let patience = 100;
  
  // Count revenge trades
  const revengeTrades = trades.filter(t => (t as any).revenge_trade === true);
  const revengeCount = revengeTrades.length;
  
  // Deduct points for revenge trades
  patience -= (revengeCount * 20); // -20 per revenge trade
  
  // Also check for rapid-fire trading (multiple trades same day with losses)
  const tradesByDate = new Map<string, TradeEntry[]>();
  trades.forEach(t => {
    const dateKey = t.date.split('T')[0];
    const existing = tradesByDate.get(dateKey) || [];
    existing.push(t);
    tradesByDate.set(dateKey, existing);
  });
  
  // If any day has 3+ losing trades, that might indicate impatience
  tradesByDate.forEach((dayTrades) => {
    const dayLosses = dayTrades.filter(t => t.pnl < 0).length;
    if (dayLosses >= 3) {
      patience -= 10; // Penalty for potential overtrading on losing days
    }
  });
  
  patience = Math.max(0, Math.min(100, patience));

  // =============================================================================
  // 5. FOCUS: Consistency in trading sessions
  // =============================================================================
  let focus = 50;
  
  // Calculate win rate per session
  const sessionStats = new Map<string, { wins: number; total: number }>();
  
  trades.forEach(t => {
    if (t.session) {
      const stats = sessionStats.get(t.session) || { wins: 0, total: 0 };
      stats.total += 1;
      if (t.pnl > 0) stats.wins += 1;
      sessionStats.set(t.session, stats);
    }
  });
  
  if (sessionStats.size > 0) {
    // Find best session
    let bestWinRate = 0;
    let currentSessionWinRate = 0;
    
    sessionStats.forEach((stats, session) => {
      const sessionWinRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
      if (sessionWinRate > bestWinRate) {
        bestWinRate = sessionWinRate;
      }
    });
    
    // Get most recent trade's session as "current"
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    if (sortedTrades[0]?.session) {
      const currentStats = sessionStats.get(sortedTrades[0].session);
      if (currentStats && currentStats.total > 0) {
        currentSessionWinRate = (currentStats.wins / currentStats.total) * 100;
      }
    }
    
    // Focus = how close current session is to best session
    if (bestWinRate > 0) {
      focus = Math.min(100, (currentSessionWinRate / bestWinRate) * 100);
    } else {
      focus = 50;
    }
  }
  
  focus = Math.max(0, Math.min(100, focus));

  // =============================================================================
  // IMPERIAL SCORE: Weighted average of all metrics
  // =============================================================================
  const imperialScore = (
    discipline * 0.20 +      // 20% - Following your plan
    execution * 0.25 +       // 25% - Process and documentation
    riskManagement * 0.25 +  // 25% - Capital protection
    patience * 0.15 +        // 15% - Emotional control
    focus * 0.05 +           // 5% - Session consistency
    winRate * 0.10           // 10% - Actual results
  );

  const result = {
    imperialScore: Math.round(imperialScore * 10) / 10,
    metrics: {
      discipline: Math.round(discipline * 10) / 10,
      execution: Math.round(execution * 10) / 10,
      riskManagement: Math.round(riskManagement * 10) / 10,
      patience: Math.round(patience * 10) / 10,
      focus: Math.round(focus * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
    },
    insights: {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
    },
  };
  
  console.log('✅ calculateTraderDNA: Calculated metrics:', {
    discipline: result.metrics.discipline,
    execution: result.metrics.execution,
    riskManagement: result.metrics.riskManagement,
    patience: result.metrics.patience,
    focus: result.metrics.focus,
    winRate: result.metrics.winRate,
    imperialScore: result.imperialScore,
  });
  
  return result;
};

/**
 * Calculates the "Greedy Meter" score (0-100).
 * High Score = Very Greedy (Bad). Low Score = Disciplined (Good).
 * 
 * BRILLIANT SIMPLIFIED VERSION:
 * Measures if you're leaving money on the table by not taking profits
 * OR being too greedy and turning winners into losers.
 */
export const calculateGreedyMeter = (trades: TradeEntry[]): number => {
  if (trades.length < 3) {
    return 0; // Need more data
  }
  
  // Look at winning streaks - if you had wins then suddenly a big loss,
  // that might indicate greed (not taking profit)
  let greedyIndicators = 0;
  let totalOpportunities = 0;
  
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date);
    const dateB = new Date(b.createdAt || b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  for (let i = 2; i < sortedTrades.length; i++) {
    const prev2 = sortedTrades[i - 2];
    const prev1 = sortedTrades[i - 1];
    const current = sortedTrades[i];
    
    // Pattern: Win -> Win -> Big Loss might indicate greed
    if (prev2.pnl > 0 && prev1.pnl > 0 && current.pnl < 0) {
      const avgPrevWin = (prev2.pnl + prev1.pnl) / 2;
      if (Math.abs(current.pnl) > avgPrevWin * 1.5) {
        // Lost more than 1.5x the average recent win - possible greed
        greedyIndicators++;
      }
      totalOpportunities++;
    }
  }
  
  if (totalOpportunities === 0) return 0;
  
  return Math.round((greedyIndicators / totalOpportunities) * 100);
};

/**
 * Calculates Goal Progress for the CURRENT MONTH only.
 * Returns current PnL, target, and percentage.
 */
export const calculateMonthlyGoalProgress = (
  trades: TradeEntry[], 
  monthlyTarget: number = 5000
): { current: number; target: number; percent: number } => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter trades for this month
  const monthlyPnL = trades
    .filter(t => {
      if (!t.date) return false;
      
      try {
        // Parse date correctly to avoid timezone issues
        const datePart = t.date.split('T')[0];
        const [year, month] = datePart.split('-').map(Number);
        return month - 1 === currentMonth && year === currentYear;
      } catch {
        return false;
      }
    })
    .reduce((sum, t) => sum + (t.pnl || 0), 0);

  const progressPercent = monthlyTarget > 0 
    ? Math.min(100, (monthlyPnL / monthlyTarget) * 100) 
    : 0;

  return {
    current: Math.round(monthlyPnL * 100) / 100,
    target: monthlyTarget,
    percent: Math.round(progressPercent * 10) / 10
  };
};
