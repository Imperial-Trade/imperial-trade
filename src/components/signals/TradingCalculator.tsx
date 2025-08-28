
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign, Percent } from "lucide-react";
import LimitOrderStatus, { LimitOrderStatusProps } from './LimitOrderStatus';

interface TradingCalculatorProps {
  alert: {
    id: string;
    asset_name: string;
    trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    entry_price: number;
    stop_loss: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
    tp4?: number;
    tp5?: number;
    status: 'pending' | 'active' | 'closed' | 'partially_profited';
    tp_hits?: number[];
    notes?: string;
  };
  livePrice?: number;
}

const TradingCalculator: React.FC<TradingCalculatorProps> = ({ alert, livePrice }) => {
  // Convert status for LimitOrderStatus component which expects a narrower type
  const limitOrderStatus: 'pending' | 'active' | 'closed' = 
    alert.status === 'partially_profited' ? 'active' : alert.status;

  return (
    <div className="space-y-4">
      {(alert.trade_type === 'buy_limit' || alert.trade_type === 'sell_limit') && (
        <LimitOrderStatus
          tradeType={alert.trade_type}
          entryPrice={alert.entry_price}
          currentPrice={livePrice}
          status={limitOrderStatus}
        />
      )}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Trading Calculator
            <Badge variant={alert.status === 'active' ? 'default' : 'secondary'}>
              {alert.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {livePrice && (
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Current Price</span>
              <span className="text-lg font-bold">{livePrice.toFixed(5)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Risk (Pips)</div>
              <div className="text-lg font-semibold text-red-600">
                {Math.abs(alert.entry_price - alert.stop_loss).toFixed(1)}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Reward (Pips)</div>
              <div className="text-lg font-semibold text-green-600">
                {alert.tp1 ? Math.abs(alert.tp1 - alert.entry_price).toFixed(1) : '--'}
              </div>
            </div>
          </div>

          {[alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].some(tp => tp) && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Take Profit Levels
              </div>
              <div className="space-y-1">
                {[alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].map((tp, index) => 
                  tp ? (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>TP{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span>{tp.toFixed(5)}</span>
                        {alert.tp_hits?.includes(index + 1) && (
                          <Badge variant="default" className="text-xs">Hit</Badge>
                        )}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingCalculator;
