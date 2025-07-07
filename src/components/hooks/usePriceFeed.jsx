import { useState, useEffect, useRef } from 'react';
import { getMarketData } from '@/api/functions';

const usePriceFeed = (symbols = []) => {
    const [prices, setPrices] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [priceSource, setPriceSource] = useState(null);
    const intervalRef = useRef(null);
    const isFetchingRef = useRef(false);

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
                console.log('usePriceFeed - Fetching prices for:', symbols);
                const response = await getMarketData({ symbols });
                console.log('usePriceFeed - Response:', response);
                
                if (response?.data?.prices) {
                    console.log('usePriceFeed - Got prices:', response.data.prices);
                    setPrices(response.data.prices);
                    setConnectionStatus('connected');
                    setPriceSource('TwelveData');
                } else {
                    console.error('usePriceFeed - No prices in response data', response);
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