import React, { useEffect, useRef, useCallback } from 'react';

const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'OANDA:XAUUSD',
  BTCUSD: 'COINBASE:BTCUSD',
  U30USD: 'FOREXCOM:DJI',
  SPXUSD: 'FOREXCOM:SPX500',
  NDXUSD: 'FOREXCOM:NAS100',
};

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

interface TradingViewWidgetProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  isDarkMode?: boolean;
  className?: string;
}

declare global {
  interface Window {
    TradingView?: { widget: new (o: Record<string, unknown>) => void };
  }
}

let widgetCounter = 0;

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  timeframe = '1h',
  height = 450,
  isDarkMode = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>(`tradingview_widget_${++widgetCounter}`);
  const scriptLoadedRef = useRef(false);
  const widgetInitializedRef = useRef(false);
  
  const tvSymbol = SYMBOL_MAP[symbol] || 'OANDA:' + symbol;
  const tvInterval = INTERVAL_MAP[timeframe] || '60';

  const initWidget = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      console.warn('TradingView: Container not found');
      return;
    }
    
    if (typeof window.TradingView === 'undefined') {
      console.warn('TradingView: Library not loaded yet');
      return;
    }

    // Clear container before creating new widget
    container.innerHTML = '';
    
    console.log('TradingView: Initializing widget', { 
      containerId: widgetIdRef.current, 
      symbol: tvSymbol, 
      interval: tvInterval 
    });

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: 'Etc/UTC',
        theme: isDarkMode ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: isDarkMode ? '#1e293b' : '#f1f5f9',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        save_image: false,
        container_id: widgetIdRef.current,
        width: '100%',
        height: height,
        allow_symbol_change: true,
        details: false,
        hotlist: false,
        calendar: false,
        withdateranges: true,
        studies: ['Volume@tv-basicstudies'],
      });
      widgetInitializedRef.current = true;
      console.log('TradingView: Widget initialized successfully');
    } catch (e) {
      console.error('TradingView: Widget init error:', e);
    }
  }, [tvSymbol, tvInterval, isDarkMode, height]);

  // Load script and initialize widget
  useEffect(() => {
    const loadScriptAndInit = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="tradingview.com/tv.js"]');
      
      if (typeof window.TradingView !== 'undefined') {
        // TradingView already loaded
        scriptLoadedRef.current = true;
        initWidget();
        return;
      }
      
      if (existingScript) {
        // Script tag exists but not loaded yet - wait for it
        const checkInterval = setInterval(() => {
          if (typeof window.TradingView !== 'undefined') {
            clearInterval(checkInterval);
            scriptLoadedRef.current = true;
            initWidget();
          }
        }, 100);
        
        // Cleanup interval after 15 seconds
        const timeoutId = setTimeout(() => {
          clearInterval(checkInterval);
          console.error('TradingView: Script load timeout');
        }, 15000);
        
        return () => {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
        };
      } else {
        // Need to load script
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.id = 'tradingview-widget-script';
        
        script.onload = () => {
          console.log('TradingView: Script loaded');
          scriptLoadedRef.current = true;
          // Small delay to ensure TradingView object is fully ready
          setTimeout(initWidget, 200);
        };
        
        script.onerror = (e) => {
          console.error('TradingView: Failed to load script', e);
        };
        
        document.head.appendChild(script);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      loadScriptAndInit();
    });

    return () => {
      cancelAnimationFrame(frameId);
      // Clean up widget on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      widgetInitializedRef.current = false;
    };
  }, [initWidget]);

  // Re-initialize when props change (after initial load)
  useEffect(() => {
    if (scriptLoadedRef.current && widgetInitializedRef.current) {
      // Delay slightly to avoid rapid re-initialization
      const timeoutId = setTimeout(() => {
        initWidget();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [symbol, timeframe, isDarkMode, initWidget]);

  return (
    <div
      className={'relative rounded-2xl overflow-hidden ' + className}
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%)',
        border: isDarkMode ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: isDarkMode
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
        minHeight: height + 'px',
      }}
    >
      <div 
        id={widgetIdRef.current}
        ref={containerRef}
        style={{ height: height + 'px', width: '100%' }} 
      />
    </div>
  );
};

export default TradingViewWidget;
