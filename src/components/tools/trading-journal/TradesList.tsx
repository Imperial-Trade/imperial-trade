import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Trade } from './types';

interface TradesListProps {
  trades: Trade[];
  onAddTrade: () => void;
}

export const TradesList: React.FC<TradesListProps> = ({ trades, onAddTrade }) => {
  const { theme } = useTheme();

  return (
    <Card className={cn(
      theme === 'dark' 
        ? "bg-slate-900/80 border-slate-700" 
        : "bg-white border-slate-200"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Trades</CardTitle>
          <Button
            onClick={onAddTrade}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trades.slice(0, 5).map(trade => (
            <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-3">
                <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                  {trade.asset}
                </Badge>
                <span className="text-sm font-medium">{trade.direction.toUpperCase()}</span>
                {trade.strategy && (
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                    {trade.strategy}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={cn(
                  "font-bold text-lg",
                  trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  ${trade.pnl.toFixed(2)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {new Date(trade.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};