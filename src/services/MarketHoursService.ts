export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  timezone: string;
  sessionName?: string;
}

export interface MarketHours {
  open: number; // Hour in 24h format (can be decimal for minutes)
  close: number; // Hour in 24h format (can be decimal for minutes)
  timezone: string;
  days: number[]; // Trading days (0=Sunday, 1=Monday, etc.)
  openMinutes?: number; // Optional: specific minute for opening (0-59)
  closeMinutes?: number; // Optional: specific minute for closing (0-59)
}

export class MarketHoursService {
  private static holidays = [
    '2024-01-01', '2024-07-04', '2024-12-25', // US holidays
    '2024-01-01', '2024-05-01', '2024-12-25', // European holidays
  ];

  // Specific asset schedules with minute-precision
  private static assetSchedules = {
    // Forex pairs - Opens Sunday 22:00 UTC
    'EURUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'GBPUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'USDJPY': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'USDCHF': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'AUDUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'USDCAD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'NZDUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    
    // Gold - Opens Sunday 22:05 UTC (5 minutes after forex)
    'XAUUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 5, closeMinutes: 0 },
    'GOLD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 5, closeMinutes: 0 },
    
    // Silver - Opens Sunday 22:05 UTC (same as gold)
    'XAGUSD': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 5, closeMinutes: 0 },
    'SILVER': { open: 22, close: 22, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5], openMinutes: 5, closeMinutes: 0 },
    
    // Oil - Different timing for commodities
    'USOIL': { open: 0, close: 22, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'UKOIL': { open: 2, close: 22, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    'WTI': { open: 0, close: 22, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 0, closeMinutes: 0 },
    
    // US Indices
    'NAS100': { open: 14, close: 21, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 30, closeMinutes: 0 },
    'USA30': { open: 14, close: 21, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 30, closeMinutes: 0 },
    'US30': { open: 14, close: 21, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 30, closeMinutes: 0 },
    'SPX500': { open: 14, close: 21, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 30, closeMinutes: 0 },
    'SPX': { open: 14, close: 21, timezone: 'UTC', days: [1, 2, 3, 4, 5], openMinutes: 30, closeMinutes: 0 },
    
    // Crypto - 24/7
    'BTCUSD': { open: 0, close: 24, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5, 6], openMinutes: 0, closeMinutes: 0 },
    'ETHUSD': { open: 0, close: 24, timezone: 'UTC', days: [0, 1, 2, 3, 4, 5, 6], openMinutes: 0, closeMinutes: 0 },
  };

  private static marketSchedules = {
    // Forex - Sunday 22:00 UTC
    forex: {
      open: 22, // Sunday 22:00 UTC
      close: 22, // Friday 22:00 UTC
      timezone: 'UTC',
      days: [0, 1, 2, 3, 4, 5], // Sunday through Friday
      openMinutes: 0,
      closeMinutes: 0
    },
    
    // US Stock Indices
    us_indices: {
      open: 14, // 9:30 AM EST = 14:30 UTC
      close: 21, // 4:00 PM EST = 21:00 UTC
      timezone: 'UTC',
      days: [1, 2, 3, 4, 5], // Monday to Friday
      openMinutes: 30,
      closeMinutes: 0
    },
    
    // Cryptocurrencies - 24/7
    crypto: {
      open: 0,
      close: 24,
      timezone: 'UTC',
      days: [0, 1, 2, 3, 4, 5, 6], // All days
      openMinutes: 0,
      closeMinutes: 0
    },
    
    // Precious metals (Gold/Silver) - Sunday 22:05 UTC
    precious_metals: {
      open: 22, // Sunday 22:05 UTC
      close: 22, // Friday 22:00 UTC
      timezone: 'UTC',
      days: [0, 1, 2, 3, 4, 5], // Sunday through Friday
      openMinutes: 5, // 5 minutes after forex
      closeMinutes: 0
    },
    
    // Other commodities (Oil, etc.)
    commodities: {
      open: 0, // Monday 00:00 UTC
      close: 22, // Friday 22:00 UTC
      timezone: 'UTC',
      days: [1, 2, 3, 4, 5], // Monday to Friday
      openMinutes: 0,
      closeMinutes: 0
    }
  };

  private static getAssetSchedule(symbol: string): MarketHours {
    const sym = symbol.toUpperCase();
    
    // Check for specific asset schedule first
    if (this.assetSchedules[sym]) {
      return this.assetSchedules[sym];
    }
    
    // Fallback to category-based schedule
    const assetType = this.getAssetType(sym);
    return this.marketSchedules[assetType];
  }

  private static getAssetType(symbol: string): keyof typeof MarketHoursService.marketSchedules {
    const sym = symbol.toUpperCase();
    
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO')) {
      return 'crypto';
    }
    
    // Precious metals get their own category
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('XAG') || sym.includes('SILVER')) {
      return 'precious_metals';
    }
    
    // Other commodities (Oil, etc.)
    if (sym.includes('OIL') || sym.includes('WTI') || sym.includes('BRENT')) {
      return 'commodities';
    }
    
    if (sym.includes('NAS100') || sym.includes('USA30') || sym.includes('US30') || sym.includes('SPX')) {
      return 'us_indices';
    }
    
    // Default to forex for currency pairs
    return 'forex';
  }

  static getMarketStatus(symbol: string): MarketStatus {
    const schedule = this.getAssetSchedule(symbol);
    const assetType = this.getAssetType(symbol);
    const now = new Date();
    
    // Calculate current time with minute precision
    const currentTimeMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if today is a trading day
    const isTradingDay = schedule.days.includes(currentDay);
    
    // Check if we're in holiday period
    const todayStr = now.toISOString().split('T')[0];
    const isHoliday = this.holidays.includes(todayStr) && assetType !== 'crypto';

    if (assetType === 'crypto') {
      return {
        isOpen: true,
        timezone: 'UTC',
        sessionName: '24/7 Trading'
      };
    }

    // Calculate opening and closing times in minutes
    const openTimeMinutes = schedule.open * 60 + (schedule.openMinutes || 0);
    const closeTimeMinutes = schedule.close * 60 + (schedule.closeMinutes || 0);

    // Handle weekend closures for non-forex markets
    if (!isTradingDay && (assetType !== 'forex' && assetType !== 'precious_metals')) {
      const nextOpenDay = new Date(now);
      // Find next Monday for most markets
      const daysToAdd = (1 + 7 - currentDay) % 7 || 7;
      nextOpenDay.setUTCDate(now.getUTCDate() + daysToAdd);
      nextOpenDay.setUTCHours(schedule.open, schedule.openMinutes || 0, 0, 0);
      
      return {
        isOpen: false,
        nextOpen: nextOpenDay,
        timezone: schedule.timezone,
        sessionName: 'Weekend - Markets Closed'
      };
    }

    // Handle holiday closures
    if (isHoliday) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(now.getUTCDate() + 1);
      tomorrow.setUTCHours(schedule.open, schedule.openMinutes || 0, 0, 0);
      
      return {
        isOpen: false,
        nextOpen: tomorrow,
        timezone: schedule.timezone,
        sessionName: 'Holiday - Markets Closed'
      };
    }

    // Special handling for forex and precious metals (Sunday 22:00/22:05 to Friday 22:00)
    if (assetType === 'forex' || assetType === 'precious_metals') {
      const openMinutes = assetType === 'precious_metals' ? 5 : 0; // Gold opens 5 minutes after forex
      
      // Sunday before opening time
      if (currentDay === 0 && currentTimeMinutes < (22 * 60 + openMinutes)) {
        const sundayOpen = new Date(now);
        sundayOpen.setUTCHours(22, openMinutes, 0, 0);
        return {
          isOpen: false,
          nextOpen: sundayOpen,
          timezone: 'UTC',
          sessionName: `Weekend - ${assetType === 'forex' ? 'Forex' : 'Precious Metals'} Closed`
        };
      }
      
      // Friday after closing time (22:00)
      if (currentDay === 5 && currentTimeMinutes >= (22 * 60)) {
        const nextSunday = new Date(now);
        nextSunday.setUTCDate(now.getUTCDate() + 2); // Next Sunday
        nextSunday.setUTCHours(22, openMinutes, 0, 0);
        return {
          isOpen: false,
          nextOpen: nextSunday,
          timezone: 'UTC',
          sessionName: `Weekend - ${assetType === 'forex' ? 'Forex' : 'Precious Metals'} Closed`
        };
      }
      
      // Saturday (closed all day)
      if (currentDay === 6) {
        const nextSunday = new Date(now);
        nextSunday.setUTCDate(now.getUTCDate() + 1);
        nextSunday.setUTCHours(22, openMinutes, 0, 0);
        return {
          isOpen: false,
          nextOpen: nextSunday,
          timezone: 'UTC',
          sessionName: `Weekend - ${assetType === 'forex' ? 'Forex' : 'Precious Metals'} Closed`
        };
      }
      
      // Market is open from Sunday 22:00/22:05 to Friday 22:00
      const nextClose = new Date(now);
      const daysToFriday = (5 - currentDay + 7) % 7;
      if (daysToFriday > 0) {
        nextClose.setUTCDate(now.getUTCDate() + daysToFriday);
      }
      nextClose.setUTCHours(22, 0, 0, 0);
      
      return {
        isOpen: true,
        nextClose,
        timezone: 'UTC',
        sessionName: assetType === 'forex' ? 'Forex Session' : 'Precious Metals Session'
      };
    }

    // Regular market hours check with minute precision
    const isInTradingHours = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
    
    if (isInTradingHours && isTradingDay) {
      // Market is open
      const todayClose = new Date(now);
      todayClose.setUTCHours(schedule.close, schedule.closeMinutes || 0, 0, 0);
      
      return {
        isOpen: true,
        nextClose: todayClose,
        timezone: schedule.timezone,
        sessionName: this.getSessionName(assetType)
      };
    } else {
      // Market is closed - calculate next open
      let nextOpen = new Date(now);
      
      // If after hours today, move to next trading day
      if (currentTimeMinutes >= closeTimeMinutes) {
        nextOpen.setUTCDate(now.getUTCDate() + 1);
      }
      
      nextOpen.setUTCHours(schedule.open, schedule.openMinutes || 0, 0, 0);
      
      // Skip non-trading days
      while (!schedule.days.includes(nextOpen.getUTCDay())) {
        nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
      }
      
      return {
        isOpen: false,
        nextOpen,
        timezone: schedule.timezone,
        sessionName: 'After Hours - Market Closed'
      };
    }
  }

  private static getSessionName(assetType: string): string {
    switch (assetType) {
      case 'us_indices':
        return 'US Market Session';
      case 'forex':
        return 'Forex Session';
      case 'precious_metals':
        return 'Precious Metals Session';
      case 'commodities':
        return 'Commodities Session';
      case 'crypto':
        return '24/7 Trading';
      default:
        return 'Trading Session';
    }
  }

  static getTimeUntilNextEvent(marketStatus: MarketStatus): string {
    const now = new Date();
    const targetTime = marketStatus.isOpen ? marketStatus.nextClose : marketStatus.nextOpen;
    
    if (!targetTime) return '';
    
    const diffMs = targetTime.getTime() - now.getTime();
    if (diffMs <= 0) return '';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0 || days > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;
    
    return timeString.trim();
  }
}