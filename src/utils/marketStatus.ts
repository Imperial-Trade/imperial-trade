
import { format, addDays, setHours, setMinutes, setSeconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface MarketStatus {
  isClosed: boolean;
  label: string | null;
  nextOpenTime?: Date;
  countdown?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  currentSession?: string;
  sessionDetails?: {
    type: 'pre-market' | 'regular' | 'after-hours' | 'closed';
    name: string;
    nextSession?: string;
    nextSessionTime?: Date;
  };
}

export function getMarketStatus(symbol: string): MarketStatus {
  const sym = symbol.toUpperCase();
  const now = new Date();

  // Convert current time to ET for US markets
  const etNow = toZonedTime(now, 'America/New_York');
  const etDay = etNow.getDay(); // 0=Sun, 6=Sat
  const etHour = etNow.getHours();
  const etMinute = etNow.getMinutes();
  const etTimeMinutes = etHour * 60 + etMinute;

  // Crypto trades 24/7
  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO') || sym.includes('ADA') || sym.includes('SOL') || sym.includes('MATIC') || sym.includes('DOT')) {
    return { 
      isClosed: false, 
      label: null,
      currentSession: '24/7 Crypto Market'
    };
  }

  // Enhanced US Indices Logic (NAS100, US30/USA30)
  if (sym.includes('USA30') || sym.includes('NAS100') || sym.includes('SPX') || sym.includes('US30') || sym.includes('NASDAQ') || sym.includes('DOW')) {
    return getUSIndicesStatus(etNow, etDay, etHour, etMinute, etTimeMinutes);
  }

  // US Stocks - Same enhanced logic as indices
  if (sym.match(/^[A-Z]{1,5}$/) || ['TSLA', 'NVDA', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ'].includes(sym)) {
    return getUSStockStatus(etNow, etDay, etHour, etMinute, etTimeMinutes);
  }

  // Gold (XAU/USD) - Forex market hours (Sunday 22:00 UTC - Friday 21:00 UTC)
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    return getForexStatus(now, sym, 'Gold');
  }

  // Forex pairs - Sunday 22:00 UTC - Friday 21:00 UTC
  if (sym.includes('/') || sym.includes('EUR') || sym.includes('GBP') || sym.includes('USD') || sym.includes('JPY') || sym.includes('AUD') || sym.includes('CAD') || sym.includes('NZD')) {
    return getForexStatus(now, sym, 'Forex');
  }

  // Commodities - Forex market hours like Gold
  if (sym.includes('SILVER') || sym.includes('OIL') || sym.includes('GAS') || sym.includes('COPPER') || sym.includes('WHEAT')) {
    return getForexStatus(now, sym, 'Commodities');
  }

  // Default fallback - treat as forex
  return getForexStatus(now, sym, 'Market');
}

function getUSIndicesStatus(etNow: Date, etDay: number, etHour: number, etMinute: number, etTimeMinutes: number): MarketStatus {
  // Weekend (Saturday and Sunday)
  if (etDay === 0 || etDay === 6) {
    const nextMonday = getNextWeekdayET(etNow, 1);
    const mondayPreMarket = setHours(setMinutes(setSeconds(nextMonday, 0), 0), 4); // 4:00 AM ET
    const mondayPreMarketUTC = fromZonedTime(mondayPreMarket, 'America/New_York');
    
    return {
      isClosed: true,
      label: 'Weekend - US Indices Closed',
      nextOpenTime: mondayPreMarketUTC,
      countdown: calculateCountdown(new Date(), mondayPreMarketUTC),
      sessionDetails: {
        type: 'closed',
        name: 'Weekend Closure',
        nextSession: 'Pre-Market',
        nextSessionTime: mondayPreMarketUTC
      }
    };
  }

  // Trading Sessions in ET:
  // Pre-Market: 4:00 AM - 9:30 AM
  // Regular: 9:30 AM - 4:00 PM  
  // After-Hours: 4:00 PM - 8:00 PM
  // Closed: 8:00 PM - 4:00 AM

  const preMarketStart = 4 * 60; // 4:00 AM
  const regularStart = 9 * 60 + 30; // 9:30 AM
  const regularEnd = 16 * 60; // 4:00 PM
  const afterHoursEnd = 20 * 60; // 8:00 PM

  if (etTimeMinutes >= preMarketStart && etTimeMinutes < regularStart) {
    // Pre-Market Session
    const regularOpenET = setHours(setMinutes(setSeconds(etNow, 0), 30), 9);
    const regularOpenUTC = fromZonedTime(regularOpenET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'Pre-Market Trading',
      sessionDetails: {
        type: 'pre-market',
        name: 'Pre-Market (4:00 AM - 9:30 AM ET)',
        nextSession: 'Regular Hours',
        nextSessionTime: regularOpenUTC
      },
      countdown: calculateCountdown(new Date(), regularOpenUTC)
    };
  }

  if (etTimeMinutes >= regularStart && etTimeMinutes < regularEnd) {
    // Regular Trading Hours
    const afterHoursStartET = setHours(setMinutes(setSeconds(etNow, 0), 0), 16);
    const afterHoursStartUTC = fromZonedTime(afterHoursStartET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'Regular Trading Hours',
      sessionDetails: {
        type: 'regular',
        name: 'Regular Hours (9:30 AM - 4:00 PM ET)',
        nextSession: 'After-Hours',
        nextSessionTime: afterHoursStartUTC
      },
      countdown: calculateCountdown(new Date(), afterHoursStartUTC)
    };
  }

  if (etTimeMinutes >= regularEnd && etTimeMinutes < afterHoursEnd) {
    // After-Hours Trading
    const nextPreMarketDate = etDay === 5 ? getNextWeekdayET(etNow, 1) : addDays(etNow, 1);
    const nextPreMarketET = setHours(setMinutes(setSeconds(nextPreMarketDate, 0), 0), 4);
    const nextPreMarketUTC = fromZonedTime(nextPreMarketET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'After-Hours Trading',
      sessionDetails: {
        type: 'after-hours',
        name: 'After-Hours (4:00 PM - 8:00 PM ET)',
        nextSession: etDay === 5 ? 'Weekend Break' : 'Pre-Market',
        nextSessionTime: nextPreMarketUTC
      },
      countdown: calculateCountdown(new Date(), nextPreMarketUTC)
    };
  }

  // Market Closed (8:00 PM - 4:00 AM ET)
  const nextPreMarketDate = etTimeMinutes >= afterHoursEnd ? 
    (etDay === 5 ? getNextWeekdayET(etNow, 1) : addDays(etNow, 1)) : etNow;
  const nextPreMarketET = setHours(setMinutes(setSeconds(nextPreMarketDate, 0), 0), 4);
  const nextPreMarketUTC = fromZonedTime(nextPreMarketET, 'America/New_York');
  
  const isWeekendStart = etDay === 5 && etTimeMinutes >= afterHoursEnd;
  
  return {
    isClosed: true,
    label: isWeekendStart ? 'Weekend Break - US Indices Closed' : 'Overnight Closure - US Indices',
    nextOpenTime: nextPreMarketUTC,
    countdown: calculateCountdown(new Date(), nextPreMarketUTC),
    sessionDetails: {
      type: 'closed',
      name: isWeekendStart ? 'Weekend Closure (8:00 PM Fri - 4:00 AM Mon ET)' : 'Overnight Closure (8:00 PM - 4:00 AM ET)',
      nextSession: 'Pre-Market',
      nextSessionTime: nextPreMarketUTC
    }
  };
}

function getUSStockStatus(etNow: Date, etDay: number, etHour: number, etMinute: number, etTimeMinutes: number): MarketStatus {
  // Same logic as US Indices but with different labels
  if (etDay === 0 || etDay === 6) {
    const nextMonday = getNextWeekdayET(etNow, 1);
    const mondayPreMarket = setHours(setMinutes(setSeconds(nextMonday, 0), 0), 4);
    const mondayPreMarketUTC = fromZonedTime(mondayPreMarket, 'America/New_York');
    
    return {
      isClosed: true,
      label: 'Weekend - US Stock Market Closed',
      nextOpenTime: mondayPreMarketUTC,
      countdown: calculateCountdown(new Date(), mondayPreMarketUTC),
      sessionDetails: {
        type: 'closed',
        name: 'Weekend Closure',
        nextSession: 'Pre-Market',
        nextSessionTime: mondayPreMarketUTC
      }
    };
  }

  const preMarketStart = 4 * 60;
  const regularStart = 9 * 60 + 30;
  const regularEnd = 16 * 60;
  const afterHoursEnd = 20 * 60;

  if (etTimeMinutes >= preMarketStart && etTimeMinutes < regularStart) {
    const regularOpenET = setHours(setMinutes(setSeconds(etNow, 0), 30), 9);
    const regularOpenUTC = fromZonedTime(regularOpenET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'Pre-Market Trading',
      sessionDetails: {
        type: 'pre-market',
        name: 'Pre-Market (4:00 AM - 9:30 AM ET)',
        nextSession: 'Regular Hours',
        nextSessionTime: regularOpenUTC
      },
      countdown: calculateCountdown(new Date(), regularOpenUTC)
    };
  }

  if (etTimeMinutes >= regularStart && etTimeMinutes < regularEnd) {
    const afterHoursStartET = setHours(setMinutes(setSeconds(etNow, 0), 0), 16);
    const afterHoursStartUTC = fromZonedTime(afterHoursStartET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'Regular Stock Market',
      sessionDetails: {
        type: 'regular',
        name: 'Regular Hours (9:30 AM - 4:00 PM ET)',
        nextSession: 'After-Hours',
        nextSessionTime: afterHoursStartUTC
      },
      countdown: calculateCountdown(new Date(), afterHoursStartUTC)
    };
  }

  if (etTimeMinutes >= regularEnd && etTimeMinutes < afterHoursEnd) {
    const nextPreMarketDate = etDay === 5 ? getNextWeekdayET(etNow, 1) : addDays(etNow, 1);
    const nextPreMarketET = setHours(setMinutes(setSeconds(nextPreMarketDate, 0), 0), 4);
    const nextPreMarketUTC = fromZonedTime(nextPreMarketET, 'America/New_York');
    
    return {
      isClosed: false,
      label: null,
      currentSession: 'After-Hours Trading',
      sessionDetails: {
        type: 'after-hours',
        name: 'After-Hours (4:00 PM - 8:00 PM ET)',
        nextSession: etDay === 5 ? 'Weekend Break' : 'Pre-Market',
        nextSessionTime: nextPreMarketUTC
      },
      countdown: calculateCountdown(new Date(), nextPreMarketUTC)
    };
  }

  // Market Closed
  const nextPreMarketDate = etTimeMinutes >= afterHoursEnd ? 
    (etDay === 5 ? getNextWeekdayET(etNow, 1) : addDays(etNow, 1)) : etNow;
  const nextPreMarketET = setHours(setMinutes(setSeconds(nextPreMarketDate, 0), 0), 4);
  const nextPreMarketUTC = fromZonedTime(nextPreMarketET, 'America/New_York');
  
  const isWeekendStart = etDay === 5 && etTimeMinutes >= afterHoursEnd;
  
  return {
    isClosed: true,
    label: isWeekendStart ? 'Weekend Break - US Stock Market Closed' : 'Overnight - US Stock Market Closed',
    nextOpenTime: nextPreMarketUTC,
    countdown: calculateCountdown(new Date(), nextPreMarketUTC),
    sessionDetails: {
      type: 'closed',
      name: isWeekendStart ? 'Weekend Closure (8:00 PM Fri - 4:00 AM Mon ET)' : 'Overnight Closure (8:00 PM - 4:00 AM ET)',
      nextSession: 'Pre-Market',
      nextSessionTime: nextPreMarketUTC
    }
  };
}

function getForexStatus(now: Date, symbol: string, marketType: string): MarketStatus {
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();

  // Weekend closure for Forex/Gold/Commodities
  if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) {
    const nextSunday = utcDay === 6 ? addDays(now, 1) : now;
    const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22);
    
    return {
      isClosed: true,
      label: `Weekend - ${marketType} Market Closed`,
      nextOpenTime: sundayOpen,
      countdown: calculateCountdown(now, sundayOpen)
    };
  }

  // Friday post-close
  if (utcDay === 5 && utcHour >= 21) {
    const nextSunday = getNextWeekday(now, 0);
    const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22);
    
    return {
      isClosed: true,
      label: `Weekend Break - ${marketType} Market Closed`,
      nextOpenTime: sundayOpen,
      countdown: calculateCountdown(now, sundayOpen)
    };
  }

  // Market is open
  return {
    isClosed: false,
    label: null,
    currentSession: getCurrentForexSession(utcHour)
  };
}

function getNextWeekdayET(date: Date, targetDay: number): Date {
  const currentDay = date.getDay();
  const daysUntilTarget = targetDay > currentDay 
    ? targetDay - currentDay 
    : 7 - currentDay + targetDay;
  
  return addDays(date, daysUntilTarget);
}

function getNextWeekday(date: Date, targetDay: number): Date {
  const currentDay = date.getUTCDay();
  const daysUntilTarget = targetDay > currentDay 
    ? targetDay - currentDay 
    : 7 - currentDay + targetDay;
  
  return addDays(date, daysUntilTarget);
}

function calculateCountdown(from: Date, to: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const totalMs = to.getTime() - from.getTime();
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds
  };
}

function getCurrentForexSession(utcHour: number): string {
  // Sydney: 22:00 - 07:00 UTC
  if (utcHour >= 22 || utcHour < 7) {
    return 'Sydney Session';
  }
  
  // Tokyo: 00:00 - 09:00 UTC (overlaps with Sydney)
  if (utcHour >= 0 && utcHour < 9) {
    return utcHour < 7 ? 'Sydney/Tokyo Overlap' : 'Tokyo Session';
  }
  
  // London: 08:00 - 17:00 UTC
  if (utcHour >= 8 && utcHour < 17) {
    return utcHour < 9 ? 'Tokyo/London Overlap' : 'London Session';
  }
  
  // New York: 13:00 - 22:00 UTC
  if (utcHour >= 13 && utcHour < 22) {
    return utcHour < 17 ? 'London/NY Overlap' : 'New York Session';
  }
  
  return 'Between Sessions';
}

export function formatCountdown(countdown: MarketStatus['countdown']): string {
  if (!countdown || countdown.totalSeconds <= 0) return '';
  
  const parts = [];
  
  if (countdown.days > 0) {
    parts.push(`${countdown.days}d`);
  }
  
  if (countdown.hours > 0 || countdown.days > 0) {
    parts.push(`${countdown.hours}h`);
  }
  
  if (countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) {
    parts.push(`${countdown.minutes}m`);
  }
  
  if (countdown.days === 0 && countdown.hours === 0) {
    parts.push(`${countdown.seconds}s`);
  }
  
  return parts.join(' ');
}
