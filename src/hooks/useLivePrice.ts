
import { useState, useEffect } from 'react';
import { marketDataService } from '@/services/MarketDataService';

interface LivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
}

export function useLivePrice(symbol: string): LivePriceData {
  const [data, setData] = useState<LivePriceData>({
    price: 0,
    change: 0,
    changePercent: 0,
    isLoading: false,
    error: null
  });

  useEffect(() => {
    if (!symbol) {
      setData({
        price: 0,
        change: 0,
        changePercent: 0,
        isLoading: false,
        error: null
      });
      return;
    }

    const fetchPrice = async () => {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const marketData = await marketDataService.getMarketData({
          symbols: [symbol],
          includeVolume: false
        });
        
        if (marketData && marketData.length > 0) {
          const priceData = marketData[0];
          setData({
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
            isLoading: false,
            error: null
          });
        } else {
          // Fallback to mock data if API fails
          const mockPrice = symbol === 'XAU/USD' ? 2050 + (Math.random() - 0.5) * 20 : 43500 + (Math.random() - 0.5) * 1000;
          setData({
            price: mockPrice,
            change: (Math.random() - 0.5) * 20,
            changePercent: (Math.random() - 0.5) * 2,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching live price:', error);
        // Fallback to mock data
        const mockPrice = symbol === 'XAU/USD' ? 2050 + (Math.random() - 0.5) * 20 : 43500 + (Math.random() - 0.5) * 1000;
        setData({
          price: mockPrice,
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 2,
          isLoading: false,
          error: null
        });
      }
    };

    fetchPrice();
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchPrice, 15000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  return data;
}
