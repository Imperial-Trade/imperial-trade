
import { useState, useEffect, useRef } from 'react';
// import { getMarketData } from '@/api/functions';

const usePriceFeed = (symbols = []) => {
    const [prices, setPrices] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [priceSource, setPriceSource] = useState(null);
    const intervalRef = useRef(null);
    const isFetchingRef = useRef(false);

    // Mock data for testing
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

        const fetchPricesData = async () => {
            if (isFetchingRef.current) return;
            
            isFetchingRef.current = true;
            setConnectionStatus('connecting');

            try {
                console.log('usePriceFeed - Using mock data for:', symbols);
                
                // Comment out real API call
                // const response = await getMarketData({ symbols });
                
                // Use mock data instead
                const mockResponse = {
                    data: {
                        prices: {}
                    }
                };
                
                symbols.forEach(symbol => {
                    const cleanSymbol = symbol.replace('/', '').replace('-', '');
                    mockResponse.data.prices[symbol] = mockPrices[symbol] || mockPrices[cleanSymbol] || (100 + Math.random() * 100);
                });
                
                console.log('usePriceFeed - Mock response:', mockResponse);
                
                if (mockResponse?.data?.prices) {
                    console.log('usePriceFeed - Got mock prices:', mockResponse.data.prices);
                    setPrices(mockResponse.data.prices);
                    setConnectionStatus('connected');
                    setPriceSource('MockData');
                } else {
                    console.error('usePriceFeed - No prices in mock response data', mockResponse);
                    setConnectionStatus('error');
                }
            } catch (error) {
                console.error('usePriceFeed - Error:', error.message, error);
                setConnectionStatus('error');
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchPricesData();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchPricesData, 15000); // Poll every 15 seconds

        return () => {
            console.log('usePriceFeed - Cleanup, clearing interval');
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [JSON.stringify(symbols)]); // Re-run effect when symbols change

    return { prices, connectionStatus, priceSource };
};

export default usePriceFeed;
