
import { useState, useEffect, useRef } from 'react';
import { useMarketData } from '@/hooks/useMarketData';

const usePriceFeed = (symbols = []) => {
    const [prices, setPrices] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [priceSource, setPriceSource] = useState(null);
    const intervalRef = useRef(null);

    // Use real market data when symbols are provided
    const { 
        data: marketData, 
        isLoading, 
        error, 
        refetch 
    } = useMarketData(symbols, symbols.length > 0);

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
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        // Handle market data updates
        if (marketData && marketData.length > 0) {
            console.log('usePriceFeed - Got real market data:', marketData);
            const pricesMap = {};
            marketData.forEach(item => {
                pricesMap[item.symbol] = item.price;
            });
            setPrices(pricesMap);
            setConnectionStatus('connected');
            setPriceSource('EdgeFunction');
        } else if (error) {
            console.log('usePriceFeed - Market data error, falling back to mock:', error);
            // Fallback to mock data
            const mockResponse = {};
            symbols.forEach(symbol => {
                const cleanSymbol = symbol.replace('/', '').replace('-', '');
                mockResponse[symbol] = mockPrices[symbol] || mockPrices[cleanSymbol] || (100 + Math.random() * 100);
            });
            setPrices(mockResponse);
            setConnectionStatus('connected');
            setPriceSource('MockData');
        }

        // Set up polling interval for real-time updates
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (symbols.length > 0) {
                refetch();
            }
        }, 15000); // Poll every 15 seconds

        return () => {
            console.log('usePriceFeed - Cleanup, clearing interval');
            if (intervalRef.current) clearInterval(intervalRef.current);
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
