import { useState, useEffect } from 'react';
import { getMarketStatus, getNextMarketOpen, MarketStatus } from '@/utils/marketHours';

interface MarketHoursData extends MarketStatus {
  timeUntilOpen?: number;
  formattedTimeUntilOpen?: string;
}

export const useMarketHours = () => {
  const [marketData, setMarketData] = useState<MarketHoursData>(() => getMarketStatus());

  useEffect(() => {
    const updateMarketData = () => {
      const status = getMarketStatus();
      let timeUntilOpen: number | undefined;
      let formattedTimeUntilOpen: string | undefined;
      
      if (!status.isOpen) {
        const nextOpen = getNextMarketOpen();
        timeUntilOpen = nextOpen.getTime() - Date.now();
        
        if (timeUntilOpen > 0) {
          const hours = Math.floor(timeUntilOpen / (1000 * 60 * 60));
          const minutes = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));
          formattedTimeUntilOpen = `${hours}h ${minutes}m`;
        }
      }
      
      setMarketData({
        ...status,
        timeUntilOpen,
        formattedTimeUntilOpen
      });
    };

    // Update immediately
    updateMarketData();
    
    // Update every minute
    const interval = setInterval(updateMarketData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return marketData;
};