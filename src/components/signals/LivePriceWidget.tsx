import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, Hourglass } from 'lucide-react';
const calculatePips = (entry, current, symbol) => {
  const difference = current - entry;
  if (!symbol) return {
    pips: null,
    points: null,
    difference
  };
  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.includes('JPY')) {
    return {
      pips: difference / 0.01,
      points: null,
      difference
    };
  }
  if (upperSymbol.startsWith('XAU')) {
    // Gold
    return {
      pips: difference / 0.1,
      points: null,
      difference
    };
  }
  if (upperSymbol.startsWith('BTC')) {
    // Bitcoin
    // For crypto, "pip" isn't standard. We'll call them points.
    return {
      pips: null,
      points: difference,
      difference
    };
  }
  // Standard forex pair
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
    if (now - lastUpdateRef.current < 5000) {
      console.log(`[RATE LIMITED] ${hitType} check for alert ${alert.id} - Last processed ${now - lastUpdateRef.current}ms ago`);
      return;
    }
    isProcessingRef.current = true;
    lastUpdateRef.current = now;
    try {
      // Enhanced logging with detailed context
      console.log(`[LEVEL HIT] Processing ${hitType} for alert ${alert.id}:`, {
        ...data,
        currentPrice: currentPrice,
        entryPrice: alert.entry_price,
        tradeType: alert.trade_type,
        assetName: alert.asset_name,
        symbol: alert.finnhub_symbol,
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
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[ERROR] Processing ${hitType} for alert ${alert.id}:`, error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [alert, currentPrice, onTakeProfitHit, onStopLossHit, onOrderActivation]);
  const checkLevels = useCallback(price => {
    // Renamed parameter to 'price' to avoid confusion with outer 'currentPrice'
    if (!price || price === lastProcessedPrice || isProcessingRef.current) {
      return;
    }
    if (price <= 0 || !isFinite(price)) {
      console.warn('Invalid price received:', price);
      return;
    }
    setLastProcessedPrice(price);
    const {
      pips,
      points,
      difference
    } = calculatePips(alert.entry_price, price, alert.finnhub_symbol);
    setPriceChange({
      pips,
      points,
      absolute: difference,
      isPositive: difference > 0
    });
    if (alert.status === 'pending') {
      const isBuyLimit = alert.trade_type === 'buy_limit';
      const isSellLimit = alert.trade_type === 'sell_limit';
      const shouldActivate = isBuyLimit && price <= alert.entry_price || isSellLimit && price >= alert.entry_price;
      if (shouldActivate) {
        console.log(`🚀 Order activation triggered for ${alert.asset_name}`);
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
    const buffer = alert.entry_price * 0.0001;

    // Enhanced logging for debugging
    console.log(`[PRICE CHECK] ${alert.asset_name} (${alert.finnhub_symbol}):`, {
      currentPrice: price,
      entryPrice: alert.entry_price,
      tradeType: alert.trade_type,
      stopLoss: alert.stop_loss,
      buffer: buffer,
      currentHits: currentHits,
      isBuy: isBuy
    });

    // Priority 1: Check Stop Loss first (highest priority)
    const stopLossHit = isBuy ? price <= alert.stop_loss - buffer : price >= alert.stop_loss + buffer;
    if (stopLossHit) {
      const closeReason = hasAlreadyHitTP ? 'reversal_after_tp' : 'stop_loss';
      console.log(`💥 [STOP LOSS] Hit for ${alert.asset_name}, reason: ${closeReason}`, {
        currentPrice: price,
        stopLoss: alert.stop_loss,
        buffer: buffer,
        effectiveStopLoss: isBuy ? alert.stop_loss - buffer : alert.stop_loss + buffer
      });
      processLevelHit('stop_loss', {
        closeReason
      });
      return;
    }

    // Priority 2: Validate trade direction before checking TP levels
    const isPriceInProfitDirection = isBuy ? price > alert.entry_price : price < alert.entry_price;
    if (!isPriceInProfitDirection) {
      console.log(`[DIRECTION CHECK] Price not in profit direction for ${alert.asset_name}:`, {
        currentPrice: price,
        entryPrice: alert.entry_price,
        tradeType: alert.trade_type,
        isPriceInProfitDirection
      });
      // Don't process TP levels if price is not moving in profitable direction
      return;
    }

    // Priority 3: Check Take Profit levels with enhanced validation
    const takeProfits = [{
      level: 1,
      price: alert.tp1
    }, {
      level: 2,
      price: alert.tp2
    }, {
      level: 3,
      price: alert.tp3
    }, {
      level: 4,
      price: alert.tp4
    }, {
      level: 5,
      price: alert.tp5
    }].filter(tp => tp.price && tp.price > 0);

    // Validate TP levels make sense for trade direction
    const invalidTPs = takeProfits.filter(tp => isBuy ? tp.price <= alert.entry_price : tp.price >= alert.entry_price);
    if (invalidTPs.length > 0) {
      console.warn(`[INVALID TP] Invalid TP levels detected for ${alert.asset_name}:`, invalidTPs);
    }
    const validTPs = takeProfits.filter(tp => isBuy ? tp.price > alert.entry_price : tp.price < alert.entry_price);
    const newHits = [];
    validTPs.forEach(tp => {
      const hasHit = isBuy ? price >= tp.price - buffer : price <= tp.price + buffer;
      if (hasHit && !currentHits.includes(tp.level)) {
        // Sequential TP validation: Can't hit TP2 without hitting TP1 first
        if (tp.level > 1 && !currentHits.includes(tp.level - 1)) {
          console.log(`[SEQUENTIAL TP] Skipping TP${tp.level} - TP${tp.level - 1} not hit yet for ${alert.asset_name}`);
          return;
        }
        console.log(`[TP VALIDATION] TP${tp.level} hit for ${alert.asset_name}:`, {
          tpPrice: tp.price,
          currentPrice: price,
          buffer: buffer,
          effectiveTPPrice: isBuy ? tp.price - buffer : tp.price + buffer,
          tradeType: alert.trade_type
        });
        newHits.push(tp.level);
      }
    });
    if (newHits.length > 0) {
      // Final validation: Ensure price movement makes sense
      const largestNewHit = Math.max(...newHits);
      const correspondingTP = validTPs.find(tp => tp.level === largestNewHit);
      if (correspondingTP) {
        const priceMovementValid = isBuy ? price >= correspondingTP.price - buffer : price <= correspondingTP.price + buffer;
        if (!priceMovementValid) {
          console.error(`[VALIDATION FAILED] Price movement validation failed for ${alert.asset_name}:`, {
            currentPrice: price,
            tpLevel: largestNewHit,
            tpPrice: correspondingTP.price,
            expectedCondition: isBuy ? `price >= ${correspondingTP.price - buffer}` : `price <= ${correspondingTP.price + buffer}`
          });
          return;
        }
      }
      const updatedHits = [...currentHits, ...newHits].sort((a, b) => a - b);
      const maxAvailableTP = Math.max(...validTPs.map(tp => tp.level));
      const shouldAutoClose = updatedHits.includes(maxAvailableTP);
      const autoCloseReason = shouldAutoClose ? `tp${maxAvailableTP}` : null;
      console.log(`🎯 [TP CONFIRMED] Valid TP hits for ${alert.asset_name}: ${newHits.join(', ')}`, {
        newHits,
        updatedHits,
        shouldAutoClose,
        autoCloseReason,
        currentPrice: price,
        entryPrice: alert.entry_price
      });
      processLevelHit('tp_hit', {
        updatedHits,
        shouldAutoClose,
        autoCloseReason
      });
    }
  }, [alert, lastProcessedPrice, processLevelHit]);
  useEffect(() => {
    if (currentPrice !== null && currentPrice !== undefined) {
      checkLevels(currentPrice);
    }
  }, [currentPrice, checkLevels]);

  // Debug logging
  useEffect(() => {
    console.log(`LivePriceWidget Debug for ${alert.asset_name}:`, {
      alertSymbol: alert.finnhub_symbol,
      currentPrice: currentPrice,
      connectionStatus,
      priceSource,
      entryPrice: alert.entry_price,
      stopLoss: alert.stop_loss
    });
  }, [currentPrice, connectionStatus, priceSource, alert]);
  const profitLossDisplay = useMemo(() => {
    if (!priceChange) return null;
    const isBuy = alert.trade_type.includes('buy');
    const isProfit = isBuy ? priceChange.isPositive : !priceChange.isPositive;
    let valueText;
    if (priceChange.pips !== null) {
      valueText = `${priceChange.pips.toFixed(1)} pips`;
    } else if (priceChange.points !== null) {
      valueText = `${priceChange.points.toFixed(2)} pts`;
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
  if (!currentPrice && connectionStatus === 'connected') {
    return <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">Price Data</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">
              --
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-400">
            🔍 No data for {alert.finnhub_symbol}
          </div>
        </div>
      </div>;
  }
  if (connectionStatus === 'connecting') {
    return <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm font-medium text-gray-300">Connecting</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">
              --
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{
            animationDelay: '0.1s'
          }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{
            animationDelay: '0.2s'
          }}></div>
          </div>
        </div>
      </div>;
  }
  if (connectionStatus === 'error') {
    return <div className="bg-gray-900/50 rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px]">
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-gray-300">Error</span>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-lg font-mono font-bold text-gray-400">
              --
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-sm text-red-400">
            ⚠️ Feed unavailable
          </div>
        </div>
      </div>;
  }
  if (alert.status === 'pending') {
    const isBuyLimit = alert.trade_type === 'buy_limit';
    const isSellLimit = alert.trade_type === 'sell_limit';
    return <div className="bg-amber-900/20 rounded-md p-3 border border-amber-700 space-y-3">
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
      </div>;
  }
  return <div className="rounded-md p-3 border border-gray-700 space-y-3 min-h-[80px] bg-green-950">
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

      {priceChange && profitLossDisplay && <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {profitLossDisplay.isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
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
        </div>}
    </div>;
};
export const LivePriceWidget = memo(LivePriceWidgetComponent);
export default LivePriceWidget;