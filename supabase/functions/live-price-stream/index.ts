
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  message: string;
  code: 'API_KEY_MISSING' | 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

// Enhanced symbol mapping to translate between frontend and API formats
const SYMBOL_MAPPING: Record<string, string> = {
  // Frontend -> API mapping
  'XAU/USD': 'GOLD',
  'XAG/USD': 'SILVER',
  'CRUDE_OIL': 'OIL',
  'NATURAL_GAS': 'NATURAL_GAS',
  'BTC/USD': 'BTCUSD',
  'ETH/USD': 'ETHUSD',
  'ADA/USD': 'ADAUSD',
  'SOL/USD': 'SOLUSD',
  'MATIC/USD': 'MATICUSD',
  'DOT/USD': 'DOTUSD',
  // Direct mappings for stocks and other assets
  'TSLA': 'TSLA',
  'NVDA': 'NVDA',
  'SPY': 'SPY',
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'META': 'META',
  'GOOGL': 'GOOGL',
  'AMZN': 'AMZN',
  'JPM': 'JPM',
  'BAC': 'BAC',
  'JNJ': 'JNJ',
  'PFE': 'PFE',
  'XOM': 'XOM',
  'CVX': 'CVX',
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD',
  'NZD/USD': 'NZDUSD',
  'QQQ': 'QQQ',
  'IWM': 'IWM',
  'DIA': 'DIA',
  'VTI': 'VTI',
  'GLD': 'GLD',
  'USO': 'USO',
  'COPPER': 'COPPER',
  'WHEAT': 'WHEAT'
};

// Reverse mapping for API -> Frontend
const REVERSE_SYMBOL_MAPPING: Record<string, string> = {};
Object.entries(SYMBOL_MAPPING).forEach(([frontend, api]) => {
  REVERSE_SYMBOL_MAPPING[api] = frontend;
});

// Enhanced trading universe with all supported instruments
const TRADING_UNIVERSE = {
  stocks: ['TSLA', 'NVDA', 'SPY', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'JPM', 'BAC', 'JNJ', 'PFE', 'XOM', 'CVX'],
  crypto: ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'MATICUSD', 'DOTUSD'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'],
  commodities: ['GOLD', 'SILVER', 'OIL', 'NATURAL_GAS', 'COPPER', 'WHEAT'],
  etfs: ['QQQ', 'IWM', 'DIA', 'VTI', 'GLD', 'USO']
};

const ALL_SUPPORTED_SYMBOLS = Object.values(TRADING_UNIVERSE).flat();

// Simple in-memory cache for price data
const priceCache = new Map<string, { data: PriceUpdate, expires: number }>();
const CACHE_TTL = 8000; // 8 seconds cache

// Rate limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 50; // Increased for WebSocket usage

function isRateLimited(): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get('global');
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set('global', { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  limit.count++;
  return false;
}

function translateSymbol(symbol: string): string {
  return SYMBOL_MAPPING[symbol] || symbol;
}

function reverseTranslateSymbol(symbol: string): string {
  return REVERSE_SYMBOL_MAPPING[symbol] || symbol;
}

function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  priceCache.delete(symbol);
  return null;
}

function setCachedPrice(symbol: string, data: PriceUpdate): void {
  priceCache.set(symbol, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

function getAssetClass(symbol: string): 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs' {
  if (TRADING_UNIVERSE.stocks.includes(symbol)) return 'stocks';
  if (TRADING_UNIVERSE.crypto.includes(symbol)) return 'crypto';
  if (TRADING_UNIVERSE.forex.includes(symbol)) return 'forex';
  if (TRADING_UNIVERSE.commodities.includes(symbol)) return 'commodities';
  if (TRADING_UNIVERSE.etfs.includes(symbol)) return 'etfs';
  return 'stocks'; // default
}

function generateEnhancedMockData(symbols: string[]): PriceUpdate[] {
  const basePrices: Record<string, number> = {
    // Stocks
    'TSLA': 245, 'NVDA': 480, 'SPY': 485, 'AAPL': 190, 'MSFT': 380,
    'META': 350, 'GOOGL': 140, 'AMZN': 155, 'JPM': 165, 'BAC': 32,
    'JNJ': 160, 'PFE': 28, 'XOM': 115, 'CVX': 155,
    // Crypto
    'BTCUSD': 43500, 'ETHUSD': 2800, 'ADAUSD': 0.55, 'SOLUSD': 95,
    'MATICUSD': 0.85, 'DOTUSD': 7.2,
    // Forex
    'EURUSD': 1.085, 'GBPUSD': 1.25, 'USDJPY': 150, 'AUDUSD': 0.66,
    'USDCAD': 1.35, 'NZDUSD': 0.61,
    // Commodities
    'GOLD': 2055, 'SILVER': 24.5, 'OIL': 72, 'NATURAL_GAS': 2.8,
    'COPPER': 3.85, 'WHEAT': 6.2,
    // ETFs
    'QQQ': 385, 'IWM': 195, 'DIA': 355, 'VTI': 245, 'GLD': 185, 'USO': 75
  };
  
  return symbols.map((symbol: string) => {
    const apiSymbol = translateSymbol(symbol);
    const basePrice = basePrices[apiSymbol] || 150;
    const assetClass = getAssetClass(apiSymbol);
    
    // Asset-specific volatility
    const volatilityRange = assetClass === 'crypto' ? 0.08 : 
                           assetClass === 'forex' ? 0.01 : 
                           assetClass === 'commodities' ? 0.04 : 0.03;
    
    const changePercent = (Math.random() - 0.5) * 2 * volatilityRange * 100;
    const price = basePrice * (1 + changePercent / 100);
    
    return {
      symbol: symbol, // Return original symbol format
      price: Math.round(price * 100) / 100,
      change: Math.round((price - basePrice) * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: new Date().toISOString()
    };
  });
}

async function fetchRealPrice(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  
  if (!apiKey) {
    console.error('TWELVE_DATA_API_KEY not configured');
    return null;
  }

  if (isRateLimited()) {
    console.warn('Rate limit exceeded for Twelve Data API');
    return null;
  }

  try {
    const apiSymbol = translateSymbol(symbol);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Format symbol for Twelve Data API
    const formattedSymbol = apiSymbol.replace('/', '').replace('USD', '/USD');
    
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${formattedSymbol}&apikey=${apiKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Twelve Data API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.error(`Twelve Data API error for ${symbol}:`, data.message);
      return null;
    }
    
    const priceUpdate: PriceUpdate = {
      symbol: symbol, // Return original symbol format
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setCachedPrice(symbol, priceUpdate);
    console.log(`Fetched real price for ${symbol}: $${priceUpdate.price}`);
    
    return priceUpdate;
    
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let subscribedSymbols = new Set<string>();
  let priceInterval: number | null = null;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
    
    // Check if API key is available on connection
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Live price data unavailable - API key not configured',
        code: 'API_KEY_MISSING'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        // Validate symbols before subscribing
        const validSymbols = message.symbols.filter(symbol => {
          const apiSymbol = translateSymbol(symbol);
          return ALL_SUPPORTED_SYMBOLS.includes(apiSymbol);
        });
        
        const invalidSymbols = message.symbols.filter(symbol => {
          const apiSymbol = translateSymbol(symbol);
          return !ALL_SUPPORTED_SYMBOLS.includes(apiSymbol);
        });
        
        // Add valid symbols to subscription
        validSymbols.forEach(symbol => subscribedSymbols.add(symbol));
        console.log(`Subscribed to symbols: ${Array.from(subscribedSymbols)}`);
        
        // Send error for invalid symbols
        invalidSymbols.forEach(symbol => {
          const errorMsg: ErrorMessage = {
            type: 'error',
            message: `Symbol ${symbol} is not supported. Supported symbols: ${ALL_SUPPORTED_SYMBOLS.join(', ')}`,
            code: 'SYMBOL_UNSUPPORTED'
          };
          socket.send(JSON.stringify(errorMsg));
        });
        
        // Start price updates if not already running
        if (!priceInterval && subscribedSymbols.size > 0) {
          priceInterval = setInterval(async () => {
            const updates: PriceUpdate[] = [];
            const errors: ErrorMessage[] = [];
            
            for (const symbol of subscribedSymbols) {
              // Check cache first
              let priceData = getCachedPrice(symbol);
              
              // If not cached, fetch real data
              if (!priceData) {
                priceData = await fetchRealPrice(symbol);
              }
              
              if (priceData) {
                updates.push(priceData);
              } else {
                // Fallback to mock data for failed symbols
                const mockData = generateEnhancedMockData([symbol])[0];
                setCachedPrice(symbol, mockData);
                updates.push(mockData);
              }
            }
            
            // Send updates if we have any
            if (updates.length > 0) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: updates,
                source: 'twelve_data_api',
                timestamp: new Date().toISOString()
              }));
            }
            
          }, 8000); // Update every 8 seconds for WebSocket efficiency
        }
      } else if (message.type === 'unsubscribe') {
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        console.log(`Unsubscribed from symbols: ${message.symbols}`);
        
        // Stop updates if no symbols subscribed
        if (subscribedSymbols.size === 0 && priceInterval) {
          clearInterval(priceInterval);
          priceInterval = null;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Invalid message format',
        code: 'API_UNAVAILABLE'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    if (priceInterval) {
      clearInterval(priceInterval);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});
