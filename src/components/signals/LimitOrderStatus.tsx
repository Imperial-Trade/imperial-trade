
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, Target } from "lucide-react";

export interface LimitOrderStatusProps {
  tradeType: 'buy_limit' | 'sell_limit';
  entryPrice: number;
  currentPrice?: number;
  status: 'pending' | 'active' | 'closed';
}

const LimitOrderStatus: React.FC<LimitOrderStatusProps> = ({ 
  tradeType, 
  entryPrice, 
  currentPrice, 
  status 
}) => {
  if (status !== 'pending') return null;

  const isPriceNearEntry = currentPrice && Math.abs(currentPrice - entryPrice) / entryPrice < 0.001; // Within 0.1%

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="text-sm font-medium">
          {tradeType === 'buy_limit' ? 'Buy Limit Order' : 'Sell Limit Order'} Pending
        </div>
        <div className="text-xs text-muted-foreground">
          Waiting for price to reach {entryPrice.toFixed(5)}
        </div>
      </div>
      <Badge variant={isPriceNearEntry ? "default" : "secondary"}>
        <Target className="h-3 w-3 mr-1" />
        {isPriceNearEntry ? 'Near Entry' : 'Waiting'}
      </Badge>
    </div>
  );
};

export default LimitOrderStatus;
