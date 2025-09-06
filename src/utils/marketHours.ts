/**
 * Market Hours Utility Functions
 * Determines if Forex/Crypto markets are open or closed
 */

export interface MarketStatus {
  isOpen: boolean;
  isClosed: boolean;
  nextOpenTime?: Date;
  nextCloseTime?: Date;
  session: 'sydney' | 'tokyo' | 'london' | 'newyork' | 'closed';
}

export const getMarketStatus = (): MarketStatus => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Forex market is closed Friday 22:00 UTC to Sunday 22:00 UTC
  const isWeekendClosed = 
    utcDay === 6 || // Saturday (all day)
    (utcDay === 0 && utcHour < 22) || // Sunday before 22:00
    (utcDay === 5 && utcHour >= 22); // Friday after 22:00

  if (isWeekendClosed) {
    return {
      isOpen: false,
      isClosed: true,
      session: 'closed'
    };
  }

  // Determine current trading session during weekdays
  let session: MarketStatus['session'] = 'closed';
  let isOpen = true;

  if (utcHour >= 22 || utcHour < 6) {
    // Sydney session (22:00-06:00 UTC) - Low liquidity
    session = 'sydney';
  } else if (utcHour >= 6 && utcHour < 8) {
    // Tokyo session (06:00-08:00 UTC) - Asian markets
    session = 'tokyo';
  } else if (utcHour >= 8 && utcHour < 13) {
    // London session (08:00-13:00 UTC) - European markets
    session = 'london';
  } else if (utcHour >= 13 && utcHour < 17) {
    // New York session (13:00-17:00 UTC) - US markets overlap
    session = 'newyork';
  } else {
    // Low activity period
    session = 'closed';
    isOpen = false;
  }

  return {
    isOpen,
    isClosed: !isOpen,
    session
  };
};

export const isMarketClosed = (): boolean => {
  return getMarketStatus().isClosed;
};

export const isPeakTradingHours = (): boolean => {
  const { session } = getMarketStatus();
  // Peak hours: London and New York sessions
  return session === 'london' || session === 'newyork';
};

export const getNextMarketOpen = (): Date => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();

  // If it's weekend, next open is Sunday 22:00 UTC
  if (utcDay === 6 || (utcDay === 0 && utcHour < 22)) {
    const nextSunday = new Date(now);
    if (utcDay === 6) {
      nextSunday.setDate(now.getDate() + 1); // Next day (Sunday)
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

  // During low activity hours on weekdays, next major session
  if (utcHour >= 22 || utcHour < 6) {
    const nextMorning = new Date(now);
    if (utcHour >= 22) {
      nextMorning.setDate(now.getDate() + 1);
    }
    nextMorning.setUTCHours(8, 0, 0, 0); // London open
    return nextMorning;
  }

  // Market is currently open
  return now;
};