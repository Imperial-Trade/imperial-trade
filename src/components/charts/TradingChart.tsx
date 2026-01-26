import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineStyle, ColorType } from 'lightweight-charts';
import { useMetaApiCandles, CandleData } from '@/hooks/useMetaApiCandles';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { Loader2, TrendingUp, TrendingDown, Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface SupportResistance {
  price: number;
  label: string;
  type: 'support' | 'resistance';
}

interface TradingChartProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
  supportResistance?: SupportResistance[];
  className?: string;
  height?: number;
  isDarkMode?: boolean;
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

const SYMBOLS = [
  { label: 'XAUUSD', value: 'XAUUSD', name: 'Gold' },
  { label: 'BTCUSD', value: 'BTCUSD', name: 'Bitcoin' },
  { label: 'U30USD', value: 'U30USD', name: 'US30' },
  { label: 'SPXUSD', value: 'SPXUSD', name: 'S&P 500' },
  { label: 'NDXUSD', value: 'NDXUSD', name: 'Nasdaq' },
];

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol: initialSymbol,
  onSymbolChange,
  supportResistance = [],
  className = '',
  height = 400,
  isDarkMode = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  const [symbol, setSymbol] = useState(initialSymbol || 'XAUUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const lastCandleRef = useRef<CandleData | null>(null);
  const baseOpenPriceRef = useRef<number | null>(null);
  
  const { candles, isLoading, error, source, fetchCandles } = useMetaApiCandles();
  const isDark = isDarkMode;
  
  // Real-time live price from WebSocket
  const { 
    livePrice, 
    isConnected, 
    changePercent,
    arrivalAgeSeconds 
  } = useOptimizedLivePrice(symbol);

  // Chart colors - Dribbble inspired (dark glassmorphism with cyan/purple accents)
  const chartColors = useMemo(() => ({
    background: 'transparent',
    textColor: isDark ? '#94a3b8' : '#64748b',
    gridColor: isDark ? 'rgba(148, 163, 184, 0.06)' : 'rgba(148, 163, 184, 0.1)',
    upColor: '#22c55e',
    downColor: '#ef4444',
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    crosshairColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)',
    supportColor: '#22c55e',
    resistanceColor: '#ef4444',
  }), [isDark]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.textColor,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { color: chartColors.gridColor },
        horzLines: { color: chartColors.gridColor },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: chartColors.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9',
        },
        horzLine: {
          color: chartColors.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9',
        },
      },
      timeScale: {
        borderColor: chartColors.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: chartColors.gridColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      width: containerRef.current.clientWidth,
      height: height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      wickUpColor: chartColors.wickUpColor,
      wickDownColor: chartColors.wickDownColor,
      borderVisible: false,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Responsive resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark, chartColors, height]);

  // Store latest live price in a ref for use in fetch (avoids dependency loop)
  const livePriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (livePrice) {
      livePriceRef.current = livePrice;
    }
  }, [livePrice]);

  // Fetch candles when symbol/timeframe changes, passing live price for anchoring mock data
  useEffect(() => {
    // Wait a brief moment for live price to be available, then fetch
    const timer = setTimeout(() => {
      fetchCandles(symbol, timeframe, 200, livePriceRef.current);
    }, 300); // Small delay to allow live price to arrive
    
    return () => clearTimeout(timer);
  }, [symbol, timeframe, fetchCandles]);

  // Update chart data with historical candles
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const chartData: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();

    // Store reference to last candle for live updates
    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    lastCandleRef.current = lastCandle;
    baseOpenPriceRef.current = firstCandle?.open || null;
    
    if (lastCandle) {
      setDisplayPrice(lastCandle.close);
      if (firstCandle) {
        const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
        setPriceChange(change);
      }
    }
  }, [candles]);

  // Real-time update: Update the last candle with live WebSocket price
  useEffect(() => {
    if (!candleSeriesRef.current || !livePrice || !lastCandleRef.current) return;
    
    const lastCandle = lastCandleRef.current;
    const now = Math.floor(Date.now() / 1000);
    
    // Determine the candle interval in seconds
    const intervalSeconds: Record<string, number> = {
      '1m': 60,
      '5m': 5 * 60,
      '15m': 15 * 60,
      '30m': 30 * 60,
      '1h': 60 * 60,
      '4h': 4 * 60 * 60,
      '1d': 24 * 60 * 60,
    };
    const interval = intervalSeconds[timeframe] || 60 * 60;
    
    // Check if we're still within the last candle's period
    const candleEndTime = lastCandle.time + interval;
    
    if (now < candleEndTime) {
      // Update the current candle with live price
      const updatedCandle: CandlestickData = {
        time: lastCandle.time as any,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, livePrice),
        low: Math.min(lastCandle.low, livePrice),
        close: livePrice,
      };
      
      try {
        candleSeriesRef.current.update(updatedCandle);
      } catch (err) {
        // Ignore update errors (can happen during chart transitions)
      }
    } else {
      // New candle period - create a new candle
      const newCandleTime = Math.floor(now / interval) * interval;
      const newCandle: CandlestickData = {
        time: newCandleTime as any,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };
      
      try {
        candleSeriesRef.current.update(newCandle);
        // Update the ref to point to the new candle
        lastCandleRef.current = {
          time: newCandleTime,
          open: livePrice,
          high: livePrice,
          low: livePrice,
          close: livePrice,
        };
      } catch (err) {
        // Ignore update errors
      }
    }
    
    // Update display price and change percentage
    setDisplayPrice(livePrice);
    if (baseOpenPriceRef.current) {
      const change = ((livePrice - baseOpenPriceRef.current) / baseOpenPriceRef.current) * 100;
      setPriceChange(change);
    }
  }, [livePrice, timeframe]);

  // Draw S/R lines
  useEffect(() => {
    if (!candleSeriesRef.current || supportResistance.length === 0) return;

    supportResistance.forEach(sr => {
      try {
        candleSeriesRef.current?.createPriceLine({
          price: sr.price,
          color: sr.type === 'support' ? chartColors.supportColor : chartColors.resistanceColor,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: sr.label,
        });
      } catch (err) {
        console.warn('Failed to create price line:', err);
      }
    });
  }, [supportResistance, chartColors]);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    onSymbolChange?.(newSymbol);
  }, [onSymbolChange]);

  const handleRefresh = useCallback(() => {
    fetchCandles(symbol, timeframe, 200);
  }, [symbol, timeframe, fetchCandles]);

  const symbolInfo = SYMBOLS.find(s => s.value === symbol);
  const isPositive = priceChange >= 0;

  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden ${className}`}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b"
        style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)' }}
      >
        {/* Left: Symbol selector */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
              }}
            >
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="bg-transparent text-sm md:text-lg font-bold cursor-pointer outline-none"
                  style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                >
                  {SYMBOLS.map(s => (
                    <option key={s.value} value={s.value} className="bg-slate-900">
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium ${
                  isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
              {/* Mobile: Show price below symbol name */}
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] md:text-xs text-slate-500">{symbolInfo?.name || symbol}</p>
                {displayPrice && (
                  <span className="sm:hidden text-[10px] font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                    • {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {isConnected && livePrice && (
                  <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          {/* Current price with live indicator - Desktop */}
          {displayPrice && (
            <div className="hidden sm:block pl-3 md:pl-4 border-l" style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)' }}>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {isConnected && livePrice && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Timeframe selector + Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
          </button>
          
          <div className="flex items-center gap-0.5 md:gap-1 p-1 rounded-xl"
            style={{
              background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
            }}
          >
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-lg transition-all duration-200 ${
                  timeframe === tf.value
                    ? 'text-white shadow-lg'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={timeframe === tf.value ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                } : {}}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative flex-1" style={{ minHeight: height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">Loading chart data...</p>
            </div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center p-4">
              <p className="text-red-400 mb-2">Failed to load chart</p>
              <p className="text-xs text-slate-500 mb-3">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
      </div>

      {/* Footer - data source indicator */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 text-[10px] md:text-xs"
        style={{ 
          borderTop: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)'}`,
          color: isDark ? '#64748b' : '#94a3b8'
        }}
      >
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              Live • {arrivalAgeSeconds}s ago
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff className="w-3 h-3" />
              Connecting...
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span>{source === 'yahoo' ? 'Yahoo Finance' : source === 'metaapi' ? 'MetaApi' : 'Demo Data'}</span>
        </div>
        <span>{candles.length} candles</span>
      </div>
    </div>
  );
};

export default TradingChart;
