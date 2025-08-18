
import { useState, useEffect, useRef } from 'react';
import { useMarketData } from '@/hooks/useMarketData';

const usePriceFeed = (symbols = []) => {
    const [prices, setPrices] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [priceSource, setPriceSource] = useState(null);
    // DEPRECATED: This hook causes excessive API calls
    // Use useWebSocketLivePrice or useWebSocketPriceFeed instead
    console.warn('⚠️ usePriceFeed is deprecated and causes API spam. Use useWebSocketLivePrice instead.');
    
    // Disabled to prevent API abuse - returns mock data only
    const marketData = null;
    const isLoading = false;
    const error = 'usePriceFeed deprecated - use useWebSocketLivePrice';
    const refetch = () => console.warn('usePriceFeed.refetch() disabled');

    // Mock data for fallback
    const mockPrices = {
        'EUR/USD': 1.0850 + (Math.random() - 0.5) * 0.01,
        'GBP/USD': 1.2750 + (Math.random() - 0.5) * 0.01,
        'USD/JPY': 148.50 + (Math.random() - 0.5) * 1.0,
        'XAU/USD': 2050.0 + (Math.random() - 0.5) * 20.0,
        'BTC/USD': 43500.0 + (Math.random() - 0.5) * 1000.0,
        'GOLD': 2050.0 + (Math.random() - 0.5) * 20.0,
        'EURUSD': 1.0850 + (Math.random() - 0.5) * 0.01,
        'GBPUSD': 1.2750 + (Math.random() - 0.5) * 0.01,
        'USDJPY': 148.50 + (Math.random() - 0.5) * 1.0,
    };

    useEffect(() => {
        console.log('usePriceFeed - Effect triggered with symbols:', symbols);
        
        if (!symbols || symbols.length === 0) {
            console.log('usePriceFeed - No symbols, disconnecting');
            setConnectionStatus('disconnected');
            return;
        }

        // DEPRECATED: Return mock data only to prevent API abuse
        console.log('usePriceFeed - DEPRECATED: Returning mock data only');
        const mockResponse = {};
        symbols.forEach(symbol => {
            const cleanSymbol = symbol.replace('/', '').replace('-', '');
            mockResponse[symbol] = mockPrices[symbol] || mockPrices[cleanSymbol] || (100 + Math.random() * 100);
        });
        setPrices(mockResponse);
        setConnectionStatus('connected');
        setPriceSource('MockData_DEPRECATED');

        // NO polling - this component is deprecated in favor of WebSocketPriceContext
        // which provides real-time updates without API hammering

        return () => {
            console.log('usePriceFeed - Cleanup (no intervals to clear)');
        };
    }, [symbols, marketData, error, refetch]);

    // Update connection status based on loading state
    useEffect(() => {
        if (isLoading) {
            setConnectionStatus('connecting');
        }
    }, [isLoading]);

    return { prices, connectionStatus, priceSource };
};

export default usePriceFeed;
