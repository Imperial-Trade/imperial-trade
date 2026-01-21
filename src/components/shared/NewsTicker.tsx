import React, { useRef } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

export interface NewsTickerProps {
  /** When true, uses tighter padding and smaller text for header/slot use. */
  slim?: boolean;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ slim = false }) => {
  const goldPrice = useOptimizedLivePrice('XAUUSD', { debounceMs: 50 });
  const btcPrice = useOptimizedLivePrice('BTCUSD', { debounceMs: 50 });
  const us30Price = useOptimizedLivePrice('U30USD', { debounceMs: 50 });
  const spxPrice = useOptimizedLivePrice('SPXUSD', { debounceMs: 50 });
  const ndxPrice = useOptimizedLivePrice('NDXUSD', { debounceMs: 50 });

  const prevPricesRef = useRef<Record<string, number>>({});

  const formatTickerItem = (
    priceData: ReturnType<typeof useOptimizedLivePrice>,
    label: string,
    symbol: string
  ) => {
    const price = priceData.price || 0;
    const prevPrice = prevPricesRef.current[symbol] || price;

    if (price > 0 && price !== prevPrice) {
      prevPricesRef.current[symbol] = price;
    }

    const isUp = price > prevPrice;
    const isDown = price < prevPrice;
    const direction = isUp ? 'up' : isDown ? 'down' : (priceData.change >= 0 ? 'up' : 'down');

    if (price === 0) return null;

    let formattedPrice: string;
    if (price >= 1000) {
      formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formattedPrice = price.toFixed(2);
    }

    const isPriceUp = direction === 'up';
    const textClass = slim ? 'text-[9px] md:text-[10px]' : 'text-[10px] md:text-[11px]';

    return (
      <span key={label} className={`${textClass} font-medium transition-colors duration-300 flex items-center gap-1`}>
        <span className="text-slate-400">{label}</span>
        <span className="text-white/90">{formattedPrice}</span>
        <span className={isPriceUp ? 'text-emerald-400' : 'text-red-400'}>{isPriceUp ? '▲' : '▼'}</span>
      </span>
    );
  };

  const tickerItems = [
    formatTickerItem(goldPrice, 'GOLD', 'XAUUSD'),
    formatTickerItem(btcPrice, 'BTC', 'BTCUSD'),
    formatTickerItem(us30Price, 'US30', 'U30USD'),
    formatTickerItem(spxPrice, 'S&P500', 'SPXUSD'),
    formatTickerItem(ndxPrice, 'NAS100', 'NDXUSD'),
  ].filter(Boolean);

  return (
    <div className={`relative w-full overflow-hidden ${slim ? 'py-0.5' : 'py-1'}`}>
      <div className="inline-flex items-center gap-8 md:gap-12 whitespace-nowrap will-change-transform animate-ticker-scroll">
        <div className="inline-flex items-center gap-8 md:gap-12 shrink-0">{tickerItems}</div>
        <div className="inline-flex items-center gap-8 md:gap-12 shrink-0">{tickerItems}</div>
      </div>
      <style>{`
        @keyframes tickerScrollAnim {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-scroll {
          animation: tickerScrollAnim 25s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default NewsTicker;
