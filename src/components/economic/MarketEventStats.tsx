import React, { memo } from 'react';
import { TrendingUp, AlertTriangle, Zap, Activity } from 'lucide-react';

interface MarketEventStatsProps {
  stats: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

const MarketEventStats = memo(({ stats }: MarketEventStatsProps) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Zap className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-red-400">{stats.high}</p>
          <p className="text-sm text-muted-foreground">High Impact</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-400">{stats.medium}</p>
          <p className="text-sm text-muted-foreground">Medium Impact</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">{stats.low}</p>
          <p className="text-sm text-muted-foreground">Low Impact</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Events</p>
        </div>
      </div>
    </div>
  );
});

MarketEventStats.displayName = 'MarketEventStats';

export default MarketEventStats;