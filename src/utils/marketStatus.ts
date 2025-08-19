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
  const utcSecond = now.getUTCSeconds();

  // Crypto trades 24/7
  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO')) {
    return { 
      isClosed: false, 
      label: null,
      currentSession: '24/7 Crypto Market'
    };
  }

  // Weekend closure for FX/indices/gold
  if (utcDay === 0 || utcDay === 6) { // Sunday or Saturday
    const nextMonday = getNextWeekday(now, 1); // Monday
    const mondayOpen = setHours(setMinutes(setSeconds(nextMonday, 0), 0), 22); // Sunday 22:00 UTC (Monday open)
    
    return {
      isClosed: true,
      label: 'Weekend - Markets Closed',
      nextOpenTime: mondayOpen,
      countdown: calculateCountdown(now, mondayOpen)
    };
  }

  // Friday post-close (21:00 UTC Friday to 22:00 UTC Sunday)
  if (utcDay === 5 && utcHour >= 21) {
    const nextSunday = getNextWeekday(now, 0); // Next Sunday
    const sundayOpen = setHours(setMinutes(setSeconds(nextSunday, 0), 0), 22); // Sunday 22:00 UTC
    
    return {
      isClosed: true,
      label: 'Weekend Break - Friday Close',
      nextOpenTime: sundayOpen,
      countdown: calculateCountdown(now, sundayOpen)
    };
  }

  // Sunday pre-open (before 22:00 UTC)
  if (utcDay === 0 && utcHour < 22) {
    const todayOpen = setHours(setMinutes(setSeconds(now, 0), 0), 22); // Today 22:00 UTC
    
    return {
      isClosed: true,
      label: 'Pre-Market - Opening Soon',
      nextOpenTime: todayOpen,
      countdown: calculateCountdown(now, todayOpen)
    };
  }

  // Indices cash session window (13:30–20:00 UTC for US indices)
  if (sym.includes('USA30') || sym.includes('NAS100') || sym.includes('SPX')) {
    const marketOpen = (utcHour > 13) || (utcHour === 13 && utcMinute >= 30);
    const marketClosed = utcHour >= 20;
    
    if (marketClosed) {
      // Market closed for the day - opens next trading day at 13:30 UTC
      const nextOpenDate = utcDay === 5 ? getNextWeekday(now, 1) : addDays(now, 1); // Skip weekend
      const nextOpen = setHours(setMinutes(setSeconds(nextOpenDate, 0), 30), 13);
      
      return {
        isClosed: true,
        label: 'US Session Closed',
        nextOpenTime: nextOpen,
        countdown: calculateCountdown(now, nextOpen)
      };
    }
    
    if (!marketOpen) {
      // Pre-market - opens at 13:30 UTC today
      const todayOpen = setHours(setMinutes(setSeconds(now, 0), 30), 13);
      
      return {
        isClosed: true,
        label: 'Pre-Market - US Session',
        nextOpenTime: todayOpen,
        countdown: calculateCountdown(now, todayOpen)
      };
    }

    // Market is open
    return {
      isClosed: false,
      label: null,
      currentSession: 'US Trading Session'
    };
  }

  // Forex and Gold - determine session
  const currentSession = getCurrentForexSession(utcHour);
  
  return {
    isClosed: false,
    label: null,
    currentSession
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