
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, Hourglass } from 'lucide-react';

// Enhanced pip calculation function with proper asset-specific logic
const calculatePips = (entry, current, symbol) => {
  const difference = current - entry;
  if (!symbol) return {
    pips: null,
    points: null,
    difference
  };

  const upperSymbol = symbol.toUpperCase();
  
  // Japanese Yen pairs (pips are 0.01)
  if (upperSymbol.includes('JPY')) {
    return {
      pips: difference / 0.01,
      points: null,
      difference
    };
  }
  
  // Gold (XAU) - pips are 0.1
  if (upperSymbol.startsWith('XAU')) {
    return {
      pips: difference / 0.1,
      points: null,
      difference
    };
  }
  
  // Bitcoin and crypto - use points instead of pips
  if (upperSymbol.startsWith('BTC') || upperSymbol.includes('USD')) {
    return {
      pips: null,
      points: difference,
      difference
    };
  }
  
  // Standard forex pairs (pips are 0.0001)
  return {
    pips: difference / 0.0001,
    points: null,
    difference
  };
};

const LivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  livePrice,
  connectionStatus,
  priceSource
}) => {
  const [priceChange, setPriceChange] = useState(null);
  const [lastProcessedPrice, setLastProcessedPrice] = useState(null);
  const isProcessingRef = useRef(false);
  const lastUpdateRef = useRef(0);

  // Get the live price for this specific alert
  const currentPrice = livePrice;

  const processLevelHit = useCallback(async (hitType, data) => {
    if (isProcessingRef.current) {
      console.log(`[PROCESSING SKIP] Already processing ${hitType} for alert ${alert.id}, skipping...`);
      return;
    }
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 3000) { // Reduced from 5000ms to 3000ms for faster response
      console.log(`[RATE LIMITED] ${hitType} check for alert ${alert.id} - Last processed ${now - lastUpdateRef.current}ms ago`);
      return;
    }

    isProcessingRef.current = true;
    lastUpdateRef.current = now;

    try {
      console.log(`[LEVEL HIT] Processing ${hitType} for alert ${alert.id}:`, {
        ...data,
        currentPrice: currentPrice,
        entryPrice: alert.entry_price,
        tradeType: alert.trade_type,
        assetName: alert.asset_name,
        symbol: alert.tradermade_symbol,
        timestamp: new Date().toISOString(),
        alertStatus: alert.status
      });

      if (hitType === 'tp_hit' && onTakeProfitHit) {
        await onTakeProfitHit(alert, data.updatedHits, data.shouldAutoClose, data.autoCloseReason);
      } else if (hitType === 'stop_loss' && onStopLossHit) {
        await onStopLossHit(alert, data.closeReason);
      } else if (hitType === 'activation' && onOrderActivation) {
        await onOrderActivation(alert);
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced timeout
    } catch (error) {
      console.error(`[ERROR] Processing ${hitType} for alert ${alert.id}:`, error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [alert, currentPrice, onTakeProfitHit, onStopLossHit, onOrderActivation]);

  const checkLevels = useCallback(price => {
    if (!price || price === lastProcessedPrice || isProcessingRef.current) {
      return;
    }

    if (price <= 0 || !isFinite(price)) {
      console.warn('[PRICE VALIDATION] Invalid price received:', price);
      return;
    }

    setLastProcessedPrice(price);

    // Calculate pips with enhanced logic
    const { pips, points, difference } = calculatePips(alert.entry_price, price, alert.tradermade_symbol);
    
    setPriceChange({
      pips,
      points,
      absolute: difference,
      isPositive: difference > 0
    });

    // Handle pending orders
    if (alert.status === 'pending') {
      const isBuyLimit = alert.trade_type === 'buy_limit';
      const isSellLimit = alert.trade_type === 'sell_limit';
      
      const shouldActivate = (isBuyLimit && price <= alert.entry_price) || 
                            (isSellLimit && price >= alert.entry_price);
      
      if (shouldActivate) {
        console.log(`🚀 [ORDER ACTIVATION] ${alert.asset_name} activated at ${price}`);
        processLevelHit('activation', {});
      }
      return;
    }

    if (alert.status !== 'active') {
      return;
    }

    const isBuy = alert.trade_type.includes('buy');
    const currentHits = alert.tp_hits || [];
    const hasAlreadyHitTP = currentHits.length > 0;
    
    // Dynamic buffer based on symbol type
    let buffer;
    const upperSymbol = (alert.tradermade_symbol || '').toUpperCase();
    if (upperSymbol.includes('JPY')) {
      buffer = 0.005; // Smaller buffer for JPY pairs
    } else if (upperSymbol.startsWith('XAU')) {
      buffer = 0.05; // Smaller buffer for Gold
    } else if (upperSymbol.startsWith('BTC')) {
      buffer = 10; // Larger buffer for Bitcoin
    } else {
      buffer = 0.00005; // Very small buffer for major forex pairs
    }

    console.log(`[PRICE CHECK] ${alert.asset_name} (${alert.tradermade_symbol}):`, {
      currentPrice: price,
      entryPrice: alert.entry_price,
      tradeType: alert.trade_type,
      stopLoss: alert.stop_loss,
      buffer: buffer,
      currentHits: currentHits,
      isBuy: isBuy
    });

    // Priority 1: Check Stop Loss
    const stopLossHit = isBuy 
      ? price <= (alert.stop_loss + buffer) 
      : price >= (alert.stop_loss - buffer);
    
    if (stopLossHit) {
      const closeReason = hasAlreadyHitTP ? 'reversal_after_tp' : 'stop_loss';
      console.log(`💥 [STOP LOSS] Hit for ${alert.asset_name}, reason: ${closeReason}`, {
        currentPrice: price,
        stopLoss: alert.stop_loss,
        buffer: buffer
      });
      processLevelHit('stop_loss', { closeReason });
      return;
    }

    // Priority 2: Validate trade direction
    const isPriceInProfitDirection = isBuy ? price > alert.entry_price : price < alert.entry_price;
    if (!isPriceInProfitDirection) {
      return;
    }

    // Priority 3: Check Take Profit levels
    const takeProfits = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price && tp.price > 0);

    const validTPs = takeProfits.filter(tp => 
      isBuy ? tp.price > alert.entry_price : tp.price < alert.entry_price
    );

    const newHits = [];
    validTPs.forEach(tp => {
      const hasHit = isBuy 
        ? price >= (tp.price - buffer) 
        : price <= (tp.price + buffer);
      
      if (hasHit && !currentHits.includes(tp.level)) {
        // Sequential TP validation
        if (tp.level > 1 && !currentHits.includes(tp.level - 1)) {
          console.log(`[SEQUENTIAL TP] Skipping TP${tp.level} - TP${tp.level - 1} not hit yet`);
          return;
        }
        
        console.log(`[TP HIT] TP${tp.level} hit for ${alert.asset_name} at ${price}`);
        newHits.push(tp.level);
      }
    });

    if (newHits.length > 0) {
      const updatedHits = [...currentHits, ...newHits].sort((a, b) => a - b);
      const maxAvailableTP = Math.max(...validTPs.map(tp => tp.level));
      const shouldAutoClose = updatedHits.includes(maxAvailableTP);
      const autoCloseReason = shouldAutoClose ? `tp${maxAvailableTP}` : null;

      console.log(`🎯 [TP CONFIRMED] Valid TP hits for ${alert.asset_name}: ${newHits.join(', ')}`);
      processLevelHit('tp_hit', { updatedHits, shouldAutoClose, autoCloseReason });
    }
  }, [alert, lastProcessedPrice, processLevelHit]);

  useEffect(() => {
    if (currentPrice !== null && currentPrice !== undefined && currentPrice > 0) {
      checkLevels(currentPrice);
    }
  }, [currentPrice, checkLevels]);

  // Enhanced P&L display with proper pip calculations
  const profitLossDisplay = useMemo(() => {
    if (!priceChange) return null;

    const isBuy = alert.trade_type.includes('buy');
    const isProfit = isBuy ? priceChange.isPositive : !priceChange.isPositive;

    let valueText;
    if (priceChange.pips !== null) {
      const pipsValue = Math.abs(priceChange.pips);
      if (pipsValue >= 1000) {
        valueText = `${(pipsValue / 1000).toFixed(1)}k pips`;
      } else {
        valueText = `${pipsValue.toFixed(1)} pips`;
      }
    } else if (priceChange.points !== null) {
      const pointsValue = Math.abs(priceChange.points);
      if (pointsValue >= 1000) {
        valueText = `${(pointsValue / 1000).toFixed(1)}k pts`;
      } else {
        valueText = `${pointsValue.toFixed(2)} pts`;
      }
    } else {
      valueText = 'N/A';
    }

    return {
      isProfit,
      color: isProfit ? 'text-emerald-400' : 'text-red-400',
      bgColor: isProfit ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30',
      valueText,
      sign: priceChange.isPositive ? '+' : ''
    };
  }, [priceChange, alert.trade_type]);

  // Loading state
  if (!currentPrice && connectionStatus === 'connected') {
    return (
      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">Price Data</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">--</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-400">
            🔍 Loading {alert.tradermade_symbol} price data...
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (connectionStatus === 'connecting') {
    return (
      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm font-medium text-gray-300">Connecting</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">--</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionStatus === 'error') {
    return (
      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-gray-300">Connection Error</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">--</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-sm text-red-400">⚠️ Price feed unavailable</div>
        </div>
      </div>
    );
  }

  // Pending order state
  if (alert.status === 'pending') {
    const isBuyLimit = alert.trade_type === 'buy_limit';
    const isSellLimit = alert.trade_type === 'sell_limit';

    return (
      <div className="bg-amber-900/20 rounded-md p-3 border border-amber-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400">
            <Hourglass className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isBuyLimit ? 'Buy Limit' : isSellLimit ? 'Sell Limit' : 'Pending Order'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-white">
              ${currentPrice?.toFixed(2) || '--'}
            </div>
            <div className="text-xs text-gray-400">Current Price</div>
          </div>
        </div>
        <div className="text-center text-sm text-gray-300 border-t border-amber-700 pt-2">
          <span className="text-amber-400 font-bold">
            {isBuyLimit ? 'Waiting for price to drop to' : isSellLimit ? 'Waiting for price to rise to' : 'Entry at'}
          </span>
          <br />
          <span className="font-bold text-white">${alert.entry_price.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  // Main live price widget
  return (
    <div className="p-3 border border-gray-700 space-y-3 min-h-[80px] bg-slate-950 rounded-sm">
      <div className="flex items-center justify-between h-6">
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-gray-300">Live Price</span>
          <Badge variant="outline" className="text-emerald-400 border-emerald-700 bg-emerald-900/30 p-1">
            <Zap className="w-3 h-3" />
          </Badge>
        </div>
        <div className="text-right min-w-[80px]">
          <div className="text-lg font-mono font-bold text-white">
            ${currentPrice?.toFixed(2) || '--'}
          </div>
        </div>
      </div>

      {priceChange && profitLossDisplay && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {profitLossDisplay.isProfit ? 
              <TrendingUp className="w-4 h-4 text-emerald-400" /> : 
              <TrendingDown className="w-4 h-4 text-red-400" />
            }
            <span className="text-sm text-gray-300">P/L from Entry</span>
          </div>
          <div className="text-right space-y-1">
            <Badge className={profitLossDisplay.bgColor}>
              <span className={profitLossDisplay.color}>
                {profitLossDisplay.sign}{profitLossDisplay.valueText}
              </span>
            </Badge>
            <div className={`text-xs ${profitLossDisplay.color}`}>
              {priceChange.isPositive ? '+' : ''}${Math.abs(priceChange.absolute).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LivePriceWidget = memo(LivePriceWidgetComponent);
export default LivePriceWidget;
