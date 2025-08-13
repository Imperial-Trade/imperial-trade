import { useState, useEffect, useRef } from "react";
import { useMarketData } from "@/hooks/useMarketData";

const usePriceFeed = (symbols = []) => {
  const [prices, setPrices] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [priceSource, setPriceSource] = useState(null);
  // DEPRECATED: This hook causes excessive API calls
  // Use useWebSocketLivePrice or useWebSocketPriceFeed instead
  logger.warn(
    "⚠️ usePriceFeed is deprecated and causes API spam. Use useWebSocketLivePrice instead."
  );

  // Disabled to prevent API abuse - returns mock data only
  const marketData = null;
  const isLoading = false;
  const error = "usePriceFeed deprecated - use useWebSocketLivePrice";
  const refetch = () => logger.warn("usePriceFeed.refetch() disabled");

  // Mock data for fallback
  const mockPrices = {
    "EUR/USD": 1.085 + (Math.random() - 0.5) * 0.01,
    "GBP/USD": 1.275 + (Math.random() - 0.5) * 0.01,
    "USD/JPY": 148.5 + (Math.random() - 0.5) * 1.0,
    "XAU/USD": 2050.0 + (Math.random() - 0.5) * 20.0,
    "BTC/USD": 43500.0 + (Math.random() - 0.5) * 1000.0,
    GOLD: 2050.0 + (Math.random() - 0.5) * 20.0,
    EURUSD: 1.085 + (Math.random() - 0.5) * 0.01,
    GBPUSD: 1.275 + (Math.random() - 0.5) * 0.01,
    USDJPY: 148.5 + (Math.random() - 0.5) * 1.0,
  };

  useEffect(() => {
    logger.log("usePriceFeed - Effect triggered with symbols:", symbols);

    if (!symbols || symbols.length === 0) {
      logger.log("usePriceFeed - No symbols, disconnecting");
      setConnectionStatus("disconnected");
      return;
    }

    // DEPRECATED: Return mock data only to prevent API abuse
    logger.log("usePriceFeed - DEPRECATED: Returning mock data only");
    const mockResponse = {};
    symbols.forEach((symbol) => {
      const cleanSymbol = symbol.replace("/", "").replace("-", "");
      mockResponse[symbol] =
        mockPrices[symbol] ||
        mockPrices[cleanSymbol] ||
        100 + Math.random() * 100;
    });
    setPrices(mockResponse);
    setConnectionStatus("connected");
    setPriceSource("MockData_DEPRECATED");

    // NO polling - this component is deprecated in favor of WebSocketPriceContext
    // which provides real-time updates without API hammering

    return () => {
      logger.log("usePriceFeed - Cleanup (no intervals to clear)");
    };
  }, [symbols, marketData, error, refetch]);

  // Update connection status based on loading state
  useEffect(() => {
    if (isLoading) {
      setConnectionStatus("connecting");
    }
  }, [isLoading]);

  return { prices, connectionStatus, priceSource };
};

export default usePriceFeed;
