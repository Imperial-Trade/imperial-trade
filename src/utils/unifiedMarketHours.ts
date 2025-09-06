/**
 * ULTRA-SMART UNIFIED MARKET HOURS
 * Single source of truth for all market timing logic
 * Enables 24/7 crypto while optimizing costs for other assets
 */

export interface UnifiedMarketStatus {
  isOpen: boolean;
  isClosed: boolean;
  canStream: boolean; // New: Whether live streaming is allowed
  marketType: '24/7' | 'forex' | 'us_market' | 'commodities';
  session?: string;
  nextOpenTime?: Date;
  reason?: string;
}

export interface StreamingPolicy {
  allowStreaming: boolean;
  reason: string;
  nextCheck?: Date;
}

/**
 * Ultra-Smart Symbol Classification
 * Determines streaming policy based on asset type
 */
export function getSymbolStreamingPolicy(symbol: string): StreamingPolicy {
  if (!symbol) {
    return { allowStreaming: false, reason: 'Invalid symbol' };
  }

  const sym = symbol.toUpperCase();
  
  // 🚀 CRYPTO: 24/7 STREAMING ENABLED
  if (isCryptoSymbol(sym)) {
    return {
      allowStreaming: true,
      reason: '24/7 Crypto Market - Always Available'
    };
  }

  // 🕒 FOREX/GOLD: Market Hours Based
  if (isForexSymbol(sym) || isGoldSymbol(sym)) {
    const forexStatus = getForexMarketStatus();
    return {
      allowStreaming: forexStatus.isOpen,
      reason: forexStatus.isOpen ? 'Forex Market Open' : 'Forex Market Closed - Cost Optimization',
      nextCheck: forexStatus.nextOpenTime
    };
  }

  // 📈 US MARKETS: Market Hours Based  
  if (isUSMarketSymbol(sym)) {
    const usStatus = getUSMarketStatus();
    return {
      allowStreaming: usStatus.isOpen,
      reason: usStatus.isOpen ? 'US Market Open' : 'US Market Closed - Cost Optimization',
      nextCheck: usStatus.nextOpenTime
    };
  }

  // Default: Allow streaming (unknown assets default to available)
  return {
    allowStreaming: true,
    reason: 'Unknown asset type - Default streaming enabled'
  };
}

/**
 * Multi-Symbol Streaming Policy Check
 * Determines if ANY of the requested symbols can stream
 */
export function canStreamAnySymbol(symbols: string[]): { canStream: boolean; allowedSymbols: string[]; reason: string } {
  if (!symbols.length) {
    return { canStream: false, allowedSymbols: [], reason: 'No symbols provided' };
  }

  const allowedSymbols: string[] = [];
  const reasons: string[] = [];

  for (const symbol of symbols) {
    const policy = getSymbolStreamingPolicy(symbol);
    if (policy.allowStreaming) {
      allowedSymbols.push(symbol);
      reasons.push(`${symbol}: ${policy.reason}`);
    } else {
      reasons.push(`${symbol}: ${policy.reason}`);
    }
  }

  return {
    canStream: allowedSymbols.length > 0,
    allowedSymbols,
    reason: reasons.join('; ')
  };
}

/**
 * Get unified market status for a symbol
 */
export function getUnifiedMarketStatus(symbol: string): UnifiedMarketStatus {
  const sym = symbol.toUpperCase();
  
  if (isCryptoSymbol(sym)) {
    return {
      isOpen: true,
      isClosed: false,
      canStream: true,
      marketType: '24/7',
      session: '24/7 Crypto Trading'
    };
  }

  if (isForexSymbol(sym) || isGoldSymbol(sym)) {
    const status = getForexMarketStatus();
    return {
      isOpen: status.isOpen,
      isClosed: status.isClosed,
      canStream: status.isOpen,
      marketType: isGoldSymbol(sym) ? 'commodities' : 'forex',
      session: status.session,
      nextOpenTime: status.nextOpenTime
    };
  }

  if (isUSMarketSymbol(sym)) {
    const status = getUSMarketStatus();
    return {
      isOpen: status.isOpen,
      isClosed: status.isClosed,
      canStream: status.isOpen,
      marketType: 'us_market',
      session: status.session,
      nextOpenTime: status.nextOpenTime
    };
  }

  // Default: assume 24/7 for unknown symbols
  return {
    isOpen: true,
    isClosed: false,
    canStream: true,
    marketType: '24/7',
    session: 'Unknown Market Type'
  };
}

// ===== SYMBOL CLASSIFICATION =====

function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes('BTC') || 
         symbol.includes('ETH') || 
         symbol.includes('CRYPTO') || 
         symbol.includes('ADA') || 
         symbol.includes('SOL') || 
         symbol.includes('MATIC') || 
         symbol.includes('DOT') ||
         symbol.includes('USDT') ||
         symbol.includes('USDC');
}

function isForexSymbol(symbol: string): boolean {
  return (symbol.includes('/') || 
          symbol.includes('EUR') || 
          symbol.includes('GBP') || 
          symbol.includes('USD') || 
          symbol.includes('JPY') || 
          symbol.includes('AUD') || 
          symbol.includes('CAD') || 
          symbol.includes('NZD') ||
          symbol.includes('CHF')) && 
         !isCryptoSymbol(symbol) && 
         !isGoldSymbol(symbol);
}

function isGoldSymbol(symbol: string): boolean {
  return symbol.includes('XAU') || symbol.includes('GOLD');
}

function isUSMarketSymbol(symbol: string): boolean {
  return symbol.includes('USA30') || 
         symbol.includes('NAS100') || 
         symbol.includes('SPX') || 
         symbol.includes('US30') || 
         symbol.includes('NASDAQ') || 
         symbol.includes('DOW') ||
         /^[A-Z]{1,5}$/.test(symbol) || 
         ['TSLA', 'NVDA', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ'].includes(symbol);
}

// ===== MARKET STATUS FUNCTIONS =====

function getForexMarketStatus() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();

  // Forex closed: Friday 22:00 UTC to Sunday 22:00 UTC
  const isWeekendClosed = 
    utcDay === 6 || // Saturday
    (utcDay === 0 && utcHour < 22) || // Sunday before 22:00
    (utcDay === 5 && utcHour >= 22); // Friday after 22:00

  if (isWeekendClosed) {
    const nextOpen = getNextForexOpen(now);
    return {
      isOpen: false,
      isClosed: true,
      session: 'Weekend Closure',
      nextOpenTime: nextOpen
    };
  }

  return {
    isOpen: true,
    isClosed: false,
    session: getCurrentForexSession(utcHour)
  };
}

function getUSMarketStatus() {
  const now = new Date();
  // Convert to ET for US markets
  const etOffset = isDSTActive() ? -4 : -5; // EDT vs EST
  const etTime = new Date(now.getTime() + etOffset * 60 * 60 * 1000);
  const etDay = etTime.getUTCDay();
  const etHour = etTime.getUTCHours();

  // Weekend
  if (etDay === 0 || etDay === 6) {
    return {
      isOpen: false,
      isClosed: true,
      session: 'Weekend Closure',
      nextOpenTime: getNextUSMarketOpen(now)
    };
  }

  // Pre-market: 4:00-9:30 ET, Regular: 9:30-16:00 ET, After-hours: 16:00-20:00 ET
  if ((etHour >= 4 && etHour < 9) || (etHour === 9 && etTime.getUTCMinutes() < 30)) {
    return { isOpen: true, isClosed: false, session: 'Pre-Market' };
  }
  
  if ((etHour >= 9 && etHour < 16) && !(etHour === 9 && etTime.getUTCMinutes() < 30)) {
    return { isOpen: true, isClosed: false, session: 'Regular Hours' };
  }
  
  if (etHour >= 16 && etHour < 20) {
    return { isOpen: true, isClosed: false, session: 'After-Hours' };
  }

  return {
    isOpen: false,
    isClosed: true,
    session: 'Market Closed',
    nextOpenTime: getNextUSMarketOpen(now)
  };
}

function getCurrentForexSession(utcHour: number): string {
  if (utcHour >= 22 || utcHour < 6) return 'Sydney Session';
  if (utcHour >= 6 && utcHour < 8) return 'Tokyo Session';  
  if (utcHour >= 8 && utcHour < 13) return 'London Session';
  if (utcHour >= 13 && utcHour < 17) return 'New York Session';
  return 'Low Activity';
}

function getNextForexOpen(now: Date): Date {
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();
  
  // If it's weekend, next open is Sunday 22:00 UTC
  if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) {
    const nextSunday = new Date(now);
    if (utcDay === 6) {
      nextSunday.setDate(now.getDate() + 1); // Next Sunday
    }
    nextSunday.setUTCHours(22, 0, 0, 0);
    return nextSunday;
  }
  
  // If it's Friday after 22:00, next open is next Sunday 22:00
  if (utcDay === 5 && utcHour >= 22) {
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + 2); // Next Sunday
    nextSunday.setUTCHours(22, 0, 0, 0);
    return nextSunday;
  }
  
  return now; // Market should be open
}

function getNextUSMarketOpen(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setUTCHours(8, 0, 0, 0); // 4 AM ET = 8 AM UTC (EST)
  return tomorrow;
}

function isDSTActive(): boolean {
  const now = new Date();
  const year = now.getFullYear();
  
  // DST: Second Sunday in March to First Sunday in November
  const start = new Date(year, 2, 1); // March
  start.setDate(1 + (7 - start.getDay()) % 7 + 7); // Second Sunday
  
  const end = new Date(year, 10, 1); // November  
  end.setDate(1 + (7 - end.getDay()) % 7); // First Sunday
  
  return now >= start && now < end;
}

// ===== LEGACY COMPATIBILITY =====

/** 
 * Legacy compatibility for existing code
 * @deprecated Use getUnifiedMarketStatus instead
 */
export function isMarketClosed(symbol: string = 'GENERIC'): boolean {
  const status = getUnifiedMarketStatus(symbol);
  return status.isClosed;
}

/**
 * Legacy compatibility for existing code  
 * @deprecated Use getUnifiedMarketStatus instead
 */
export function getMarketStatus(symbol: string = 'GENERIC') {
  const status = getUnifiedMarketStatus(symbol);
  return {
    isOpen: status.isOpen,
    isClosed: status.isClosed,
    session: status.session,
    nextOpenTime: status.nextOpenTime
  };
}