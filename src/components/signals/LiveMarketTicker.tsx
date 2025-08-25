
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
}

interface LiveMarketTickerProps {
  className?: string;
}

export const LiveMarketTicker: React.FC<LiveMarketTickerProps> = ({ className }) => {
  const [marketData, setMarketData] = useState<MarketData[]>([
    { symbol: 'EUR/USD', price: 1.0845, change: 0.0012, changePercent: 0.11, isUp: true },
    { symbol: 'GBP/USD', price: 1.2634, change: -0.0023, changePercent: -0.18, isUp: false },
    { symbol: 'USD/JPY', price: 149.85, change: 0.45, changePercent: 0.30, isUp: true },
    { symbol: 'AUD/USD', price: 0.6512, change: -0.0008, changePercent: -0.12, isUp: false },
    { symbol: 'USD/CAD', price: 1.3756, change: 0.0019, changePercent: 0.14, isUp: true },
    { symbol: 'NZD/USD', price: 0.5943, change: 0.0015, changePercent: 0.25, isUp: true },
    { symbol: 'USD/CHF', price: 0.8892, change: -0.0011, changePercent: -0.12, isUp: false },
    { symbol: 'EUR/GBP', price: 0.8584, change: 0.0007, changePercent: 0.08, isUp: true },
  ]);

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(item => {
        const randomChange = (Math.random() - 0.5) * 0.002;
        const newPrice = item.price + randomChange;
        const change = newPrice - item.price;
        const changePercent = (change / item.price) * 100;
        
        return {
          ...item,
          price: newPrice,
          change,
          changePercent,
          isUp: change > 0
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    const decimals = symbol.includes('JPY') ? 2 : 4;
    return price.toFixed(decimals);
  };

  return (
    <div className={cn("relative overflow-hidden bg-black/20 border-y border-gray-800/50", className)}>
      <motion.div
        animate={{ x: [0, -50] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="flex items-center gap-8 py-3 px-4 whitespace-nowrap"
      >
        {[...marketData, ...marketData].map((item, index) => (
          <motion.div
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-3 min-w-fit"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {item.symbol}
              </span>
              <div className={cn(
                "flex items-center gap-1 text-sm",
                item.isUp ? "text-green-500" : "text-red-400"
              )}>
                {item.isUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="font-mono">
                  {formatPrice(item.price, item.symbol)}
                </span>
              </div>
              <div className={cn(
                "text-xs font-medium",
                item.isUp ? "text-green-500" : "text-red-400"
              )}>
                {item.isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Gradient overlays for smooth edge effect */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};
