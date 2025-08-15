export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  timezone: string;
  sessionName?: string;
}

export interface MarketHours {
  open: number; // Hour in 24h format
  close: number; // Hour in 24h format
  timezone: string;
}

export class MarketHoursService {
  private static holidays = [
    '2024-01-01', '2024-07-04', '2024-12-25', // US holidays
    '2024-01-01', '2024-05-01', '2024-12-25', // European holidays
  ];

  private static marketSchedules = {
    // Forex - 24/5 markets
    forex: {
      open: 0, // Sunday 5 PM EST = Monday 0 UTC (approximately)
      close: 22, // Friday 5 PM EST = Friday 22 UTC (approximately) 
      timezone: 'UTC',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    },
    
    // US Stock Indices
    us_indices: {
      open: 14.5, // 9:30 AM EST = 14:30 UTC
      close: 21, // 4:00 PM EST = 21:00 UTC
      timezone: 'UTC',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    },
    
    // Cryptocurrencies - 24/7
    crypto: {
      open: 0,
      close: 24,
      timezone: 'UTC',
      days: [0, 1, 2, 3, 4, 5, 6] // All days
    },
    
    // Commodities (Gold, Silver, Oil)
    commodities: {
      open: 0, // Sunday 6 PM EST = Monday 1 UTC (approximately)
      close: 22, // Friday 5 PM EST = Friday 22 UTC (approximately)
      timezone: 'UTC',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  };

  private static getAssetType(symbol: string): keyof typeof MarketHoursService.marketSchedules {
    const sym = symbol.toUpperCase();
    
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO')) {
      return 'crypto';
    }
    
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('SILVER') || sym.includes('OIL')) {
      return 'commodities';
    }
    
    if (sym.includes('NAS100') || sym.includes('USA30') || sym.includes('US30') || sym.includes('SPX')) {
      return 'us_indices';
    }
    
    // Default to forex for currency pairs
    return 'forex';
  }

  static getMarketStatus(symbol: string): MarketStatus {
    const assetType = this.getAssetType(symbol);
    const schedule = this.marketSchedules[assetType];
    const now = new Date();
    const utcHour = now.getUTCHours() + (now.getUTCMinutes() / 60);
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

    // Handle weekend closures
    if (!isTradingDay && assetType !== 'forex') {
      const nextMonday = new Date(now);
      nextMonday.setUTCDate(now.getUTCDate() + (1 + 7 - currentDay) % 7);
      nextMonday.setUTCHours(schedule.open, 0, 0, 0);
      
      return {
        isOpen: false,
        nextOpen: nextMonday,
        timezone: schedule.timezone,
        sessionName: 'Weekend - Markets Closed'
      };
    }

    // Handle holiday closures
    if (isHoliday) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(now.getUTCDate() + 1);
      tomorrow.setUTCHours(schedule.open, 0, 0, 0);
      
      return {
        isOpen: false,
        nextOpen: tomorrow,
        timezone: schedule.timezone,
        sessionName: 'Holiday - Markets Closed'
      };
    }

    // Special handling for forex (Sunday evening to Friday evening)
    if (assetType === 'forex') {
      // Forex opens Sunday 5 PM EST (22 UTC Sunday) and closes Friday 5 PM EST (22 UTC Friday)
      if (currentDay === 0 && utcHour < 22) { // Sunday before 22:00 UTC
        const sundayOpen = new Date(now);
        sundayOpen.setUTCHours(22, 0, 0, 0);
        return {
          isOpen: false,
          nextOpen: sundayOpen,
          timezone: 'UTC',
          sessionName: 'Weekend - Forex Closed'
        };
      }
      
      if (currentDay === 5 && utcHour >= 22) { // Friday after 22:00 UTC
        const nextSunday = new Date(now);
        nextSunday.setUTCDate(now.getUTCDate() + (7 - currentDay + 0)); // Next Sunday
        nextSunday.setUTCHours(22, 0, 0, 0);
        return {
          isOpen: false,
          nextOpen: nextSunday,
          timezone: 'UTC',
          sessionName: 'Weekend - Forex Closed'
        };
      }
      
      if (currentDay === 6) { // Saturday
        const nextSunday = new Date(now);
        nextSunday.setUTCDate(now.getUTCDate() + 1);
        nextSunday.setUTCHours(22, 0, 0, 0);
        return {
          isOpen: false,
          nextOpen: nextSunday,
          timezone: 'UTC',
          sessionName: 'Weekend - Forex Closed'
        };
      }
      
      // Forex is open Monday 22:00 UTC to Friday 22:00 UTC
      return {
        isOpen: true,
        nextClose: (() => {
          const friday = new Date(now);
          const daysToFriday = (5 - currentDay + 7) % 7;
          friday.setUTCDate(now.getUTCDate() + daysToFriday);
          friday.setUTCHours(22, 0, 0, 0);
          return friday;
        })(),
        timezone: 'UTC',
        sessionName: 'Forex Session'
      };
    }

    // Regular market hours check
    const isInTradingHours = utcHour >= schedule.open && utcHour < schedule.close;
    
    if (isInTradingHours && isTradingDay) {
      // Market is open
      const todayClose = new Date(now);
      todayClose.setUTCHours(Math.floor(schedule.close), (schedule.close % 1) * 60, 0, 0);
      
      return {
        isOpen: true,
        nextClose: todayClose,
        timezone: schedule.timezone,
        sessionName: this.getSessionName(assetType)
      };
    } else {
      // Market is closed - calculate next open
      let nextOpen = new Date(now);
      
      if (utcHour >= schedule.close) {
        // After hours today, open tomorrow
        nextOpen.setUTCDate(now.getUTCDate() + 1);
      }
      
      nextOpen.setUTCHours(Math.floor(schedule.open), (schedule.open % 1) * 60, 0, 0);
      
      // Skip weekends if not a forex market
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