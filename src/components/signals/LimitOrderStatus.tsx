import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface LimitOrderStatusProps {
  alert: TradeAlertWithProfile;
  onCancel?: (id: string) => Promise<void>;
  onModify?: (id: string, newPrice: number) => Promise<void>;
}

export const LimitOrderStatus = ({ alert, onCancel, onModify }: LimitOrderStatusProps) => {
  const { toast } = useToast();
  const { prices } = useOptimizedWebSocketPrices();
  const { cancelOrder, modifyOrderPrice } = useOrderManagement();
  const { userId } = useCurrentUser();
  const [isModifying, setIsModifying] = useState(false);
  const [newPrice, setNewPrice] = useState(alert.entryPrice);

  const isOwner = !!userId && alert.userId === userId;

  const symbol = alert.tradermadeSymbol || alert.assetName;
  const currentPrice = prices[symbol]?.price || 0;
  const entryPrice = alert.entryPrice;
  const isLimitOrder = alert.tradeType.includes('limit');
  const isPending = alert.status === 'pending';
  const isBuyLimit = alert.tradeType === 'buy_limit';
  const isSellLimit = alert.tradeType === 'sell_limit';

  // Calculate distance to activation
  const distanceToActivation = Math.abs(currentPrice - entryPrice);
  const distancePercentage = currentPrice > 0 ? (distanceToActivation / currentPrice) * 100 : 0;
  
  // Calculate proximity for color coding
  const getProximityColor = () => {
    if (distancePercentage < 0.1) return 'text-green-600 dark:text-green-400'; // Very close
    if (distancePercentage < 0.5) return 'text-yellow-600 dark:text-yellow-400'; // Close
    return 'text-red-600 dark:text-red-400'; // Far
  };

  // Check if order should trigger (client-side validation)
  const shouldTrigger = () => {
    if (!isPending || currentPrice === 0) return false;
    
    if (isBuyLimit) {
      return currentPrice <= entryPrice;
    }
    if (isSellLimit) {
      return currentPrice >= entryPrice;
    }
    return false;
  };

  // Progress calculation for activation bar
  const getActivationProgress = () => {
    if (!isPending || currentPrice === 0) return 0;
    
    const range = Math.abs(entryPrice - currentPrice);
    const progress = Math.max(0, Math.min(100, ((range - distanceToActivation) / range) * 100));
    
    return progress;
  };

  const handleCancel = async () => {
    try {
      if (!isOwner) {
        toast({
          title: 'Action not allowed',
          description: 'Only the educator who posted this signal can cancel it.',
          variant: 'destructive',
        });
        return;
      }

      if (onCancel) {
        await onCancel(alert.id);
      } else {
        await cancelOrder(alert.id);
      }
      toast({
        title: "Order Cancelled",
        description: `${alert.assetName} limit order has been cancelled`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const handleModify = async () => {
    if (!isOwner) {
      toast({
        title: 'Action not allowed',
        description: 'Only the educator who posted this signal can modify it.',
        variant: 'destructive',
      });
      return;
    }

    if (newPrice === entryPrice) {
      setIsModifying(false);
      return;
    }
    
    try {
      if (onModify) {
        await onModify(alert.id, newPrice);
      } else {
        await modifyOrderPrice(alert.id, newPrice);
      }
      setIsModifying(false);
      toast({
        title: "Order Modified",
        description: `Entry price updated to ${newPrice}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to modify order",
        variant: "destructive",
      });
      setNewPrice(entryPrice);
      setIsModifying(false);
    }
  };

  // Enhanced activation detection with optimistic UI
  useEffect(() => {
    if (shouldTrigger() && isPending) {
      console.log(`🎯 ORDER ACTIVATION CONDITION MET: ${alert.assetName} - Current: ${currentPrice}, Entry: ${entryPrice}`);
      

      // Dispatch optimistic activation event for immediate UI feedback
      window.dispatchEvent(new CustomEvent('order-activation-detected', {
        detail: {
          signalId: alert.id,
          assetName: alert.assetName,
          currentPrice,
          entryPrice,
          tradeType: alert.tradeType,
          timestamp: new Date().toISOString()
        }
      }));

      // ✅ Limit activation notification sent by database trigger
      console.log('✅ [Limit Activated] Database trigger will send notification via Realtime');
    }
  }, [shouldTrigger(), isPending, alert.id, alert.assetName, alert.tradeType, currentPrice, entryPrice]);

  if (!isLimitOrder) return null;

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPending ? (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">Pending</Badge>
            </>
          ) : alert.status === 'active' ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="default">Active</Badge>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{alert.status}</Badge>
            </>
          )}
        </div>

        {isPending && isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModifying(!isModifying)}
            >
              Modify
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>


      {alert.status === 'active' && (alert as any).activatedAt && (
        <div className="text-sm text-muted-foreground">
          <span>Activated: {new Date((alert as any).activatedAt).toLocaleString()}</span>
          {(alert as any).activationPrice && (
            <span className="ml-2">at ${(alert as any).activationPrice.toFixed(4)}</span>
          )}
        </div>
      )}

      {isModifying && isPending && isOwner && (
        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-md">
          <input
            type="number"
            step="0.0001"
            value={newPrice}
            onChange={(e) => setNewPrice(parseFloat(e.target.value))}
            className="flex-1 px-2 py-1 text-sm border border-border rounded"
            placeholder="New entry price"
          />
          <Button size="sm" onClick={handleModify}>
            Update
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setIsModifying(false);
              setNewPrice(entryPrice);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
