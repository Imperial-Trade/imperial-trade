
import { format, addDays, setHours, setMinutes, setSeconds } from 'date-fns';

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
}

export function getMarketStatus(symbol: string): MarketStatus {
  const sym = symbol.toUpperCase();
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Crypto trades 24/7
  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO') || sym.includes('ADA') || sym.includes('SOL') || sym.includes('MATIC') || sym.includes('DOT')) {
    return { 
      isClosed: false, 
      label: null,
      currentSession: '24/7 Crypto Market'
    };
  }

  // Gold (XAU/USD) - Forex market hours (Sunday 22:00 UTC - Friday 21:00 UTC)
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    // Weekend closure
    if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) { // Saturday or Sunday before 22:00
      const nextSunday = utcDay === 6 ? addDays(now, 1) : now; // Next Sunday
      const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22); // Sunday 22:00 UTC
      
      return {
        isClosed: true,
        label: 'Weekend - Gold Market Closed',
        nextOpenTime: sundayOpen,
        countdown: calculateCountdown(now, sundayOpen)
      };
    }

    // Friday post-close (21:00 UTC Friday to Sunday 22:00 UTC)
    if (utcDay === 5 && utcHour >= 21) {
      const nextSunday = getNextWeekday(now, 0); // Next Sunday
      const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22); // Sunday 22:00 UTC
      
      return {
        isClosed: true,
        label: 'Weekend Break - Gold Market Closed',
        nextOpenTime: sundayOpen,
        countdown: calculateCountdown(now, sundayOpen)
      };
    }

    // Market is open - determine session
    return {
      isClosed: false,
      label: null,
      currentSession: getCurrentForexSession(utcHour)
    };
  }

  // US Stock Indices (USA30, NAS100, SPX500) - Cash session: 14:30-21:00 UTC Monday-Friday
  if (sym.includes('USA30') || sym.includes('NAS100') || sym.includes('SPX') || sym.includes('US30') || sym.includes('NASDAQ') || sym.includes('DOW')) {
    // Weekend closure
    if (utcDay === 0 || utcDay === 6) { // Sunday or Saturday
      const nextMonday = getNextWeekday(now, 1); // Next Monday
      const mondayOpen = setHours(setMinutes(setSeconds(nextMonday, 0), 30), 14); // Monday 14:30 UTC
      
      return {
        isClosed: true,
        label: 'Weekend - US Indices Closed',
        nextOpenTime: mondayOpen,
        countdown: calculateCountdown(now, mondayOpen)
      };
    }

    // Check if within trading hours (14:30-21:00 UTC)
    const currentTimeMinutes = utcHour * 60 + utcMinute;
    const marketOpenMinutes = 14 * 60 + 30; // 14:30 UTC
    const marketCloseMinutes = 21 * 60; // 21:00 UTC

    if (currentTimeMinutes < marketOpenMinutes) {
      // Pre-market - opens at 14:30 UTC today
      const todayOpen = setHours(setMinutes(setSeconds(now, 0), 30), 14);
      
      return {
        isClosed: true,
        label: 'Pre-Market - US Indices',
        nextOpenTime: todayOpen,
        countdown: calculateCountdown(now, todayOpen)
      };
    }

    if (currentTimeMinutes >= marketCloseMinutes) {
      // Market closed for the day - opens next trading day at 14:30 UTC
      const nextOpenDate = utcDay === 5 ? getNextWeekday(now, 1) : addDays(now, 1); // Skip weekend if Friday
      const nextOpen = setHours(setMinutes(setSeconds(nextOpenDate, 0), 30), 14);
      
      return {
        isClosed: true,
        label: 'US Session Closed',
        nextOpenTime: nextOpen,
        countdown: calculateCountdown(now, nextOpen)
      };
    }

    // Market is open
    return {
      isClosed: false,
      label: null,
      currentSession: 'US Trading Session'
    };
  }

  // Forex pairs (EUR/USD, GBP/USD, etc.) - Sunday 22:00 UTC - Friday 21:00 UTC
  if (sym.includes('/') || sym.includes('EUR') || sym.includes('GBP') || sym.includes('USD') || sym.includes('JPY') || sym.includes('AUD') || sym.includes('CAD') || sym.includes('NZD')) {
    // Weekend closure
    if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) { // Saturday or Sunday before 22:00
      const nextSunday = utcDay === 6 ? addDays(now, 1) : now; // Next Sunday
      const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22); // Sunday 22:00 UTC
      
      return {
        isClosed: true,
        label: 'Weekend - Forex Market Closed',
        nextOpenTime: sundayOpen,
        countdown: calculateCountdown(now, sundayOpen)
      };
    }

    // Friday post-close
    if (utcDay === 5 && utcHour >= 21) {
      const nextSunday = getNextWeekday(now, 0); // Next Sunday
      const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22); // Sunday 22:00 UTC
      
      return {
        isClosed: true,
        label: 'Weekend Break - Forex Market Closed',
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

  // US Stocks (TSLA, NVDA, AAPL, etc.) - 14:30-21:00 UTC Monday-Friday
  if (sym.match(/^[A-Z]{1,5}$/) || ['TSLA', 'NVDA', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ'].includes(sym)) {
    // Weekend closure
    if (utcDay === 0 || utcDay === 6) { // Sunday or Saturday
      const nextMonday = getNextWeekday(now, 1); // Next Monday
      const mondayOpen = setHours(setMinutes(setSeconds(nextMonday, 0), 30), 14); // Monday 14:30 UTC
      
      return {
        isClosed: true,
        label: 'Weekend - US Stock Market Closed',
        nextOpenTime: mondayOpen,
        countdown: calculateCountdown(now, mondayOpen)
      };
    }

    // Check if within trading hours (14:30-21:00 UTC)
    const currentTimeMinutes = utcHour * 60 + utcMinute;
    const marketOpenMinutes = 14 * 60 + 30; // 14:30 UTC
    const marketCloseMinutes = 21 * 60; // 21:00 UTC

    if (currentTimeMinutes < marketOpenMinutes) {
      // Pre-market
      const todayOpen = setHours(setMinutes(setSeconds(now, 0), 30), 14);
      
      return {
        isClosed: true,
        label: 'Pre-Market - US Stocks',
        nextOpenTime: todayOpen,
        countdown: calculateCountdown(now, todayOpen)
      };
    }

    if (currentTimeMinutes >= marketCloseMinutes) {
      // Market closed for the day
      const nextOpenDate = utcDay === 5 ? getNextWeekday(now, 1) : addDays(now, 1); // Skip weekend if Friday
      const nextOpen = setHours(setMinutes(setSeconds(nextOpenDate, 0), 30), 14);
      
      return {
        isClosed: true,
        label: 'US Stock Market Closed',
        nextOpenTime: nextOpen,
        countdown: calculateCountdown(now, nextOpen)
      };
    }

    // Market is open
    return {
      isClosed: false,
      label: null,
      currentSession: 'US Stock Market'
    };
  }

  // Commodities (Silver, Oil, etc.) - Forex market hours like Gold
  if (sym.includes('SILVER') || sym.includes('OIL') || sym.includes('GAS') || sym.includes('COPPER') || sym.includes('WHEAT')) {
    // Weekend closure
    if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) {
      const nextSunday = utcDay === 6 ? addDays(now, 1) : now;
      const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22);
      
      return {
        isClosed: true,
        label: 'Weekend - Commodities Market Closed',
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
        label: 'Weekend Break - Commodities Market Closed',
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

  // Default fallback - treat as forex
  return {
    isClosed: false,
    label: null,
    currentSession: getCurrentForexSession(utcHour)
  };
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
