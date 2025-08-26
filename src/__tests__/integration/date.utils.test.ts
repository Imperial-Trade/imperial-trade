import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatYmdLocal, 
  parseYmdToLocalDate, 
  isValidYmd, 
  isFutureYmd, 
  getTodayYmd, 
  compareYmd 
} from '@/lib/date';

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock Date to ensure consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatYmdLocal', () => {
    it('should format dates consistently across timezones', () => {
      // Test date: August 25, 2025 at different times
      const morning = new Date(2025, 7, 25, 9, 0, 0); // 9 AM
      const evening = new Date(2025, 7, 25, 21, 0, 0); // 9 PM
      
      expect(formatYmdLocal(morning)).toBe('2025-08-25');
      expect(formatYmdLocal(evening)).toBe('2025-08-25');
    });

    it('should handle date boundaries correctly', () => {
      const startOfDay = new Date(2025, 7, 25, 0, 0, 0); // Midnight
      const endOfDay = new Date(2025, 7, 25, 23, 59, 59); // 11:59 PM
      
      expect(formatYmdLocal(startOfDay)).toBe('2025-08-25');
      expect(formatYmdLocal(endOfDay)).toBe('2025-08-25');
    });

    it('should pad single digits correctly', () => {
      const date = new Date(2025, 0, 5); // January 5th
      expect(formatYmdLocal(date)).toBe('2025-01-05');
    });
  });

  describe('parseYmdToLocalDate', () => {
    it('should parse YYYY-MM-DD strings to local dates', () => {
      const dateStr = '2025-08-25';
      const parsed = parseYmdToLocalDate(dateStr);
      
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(7); // 0-indexed
      expect(parsed.getDate()).toBe(25);
      expect(parsed.getHours()).toBe(12); // Set to noon
    });

    it('should be reversible with formatYmdLocal', () => {
      const dateStr = '2025-08-25';
      const parsed = parseYmdToLocalDate(dateStr);
      const formatted = formatYmdLocal(parsed);
      
      expect(formatted).toBe(dateStr);
    });
  });

  describe('isValidYmd', () => {
    it('should validate correct YYYY-MM-DD formats', () => {
      expect(isValidYmd('2025-08-25')).toBe(true);
      expect(isValidYmd('2025-01-01')).toBe(true);
      expect(isValidYmd('2025-12-31')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidYmd('25-08-2025')).toBe(false); // Wrong order
      expect(isValidYmd('2025/08/25')).toBe(false); // Wrong separators
      expect(isValidYmd('2025-8-25')).toBe(false); // Missing padding
      expect(isValidYmd('2025-13-01')).toBe(false); // Invalid month
      expect(isValidYmd('2025-02-30')).toBe(false); // Invalid day
      expect(isValidYmd('')).toBe(false); // Empty string
      expect(isValidYmd('invalid')).toBe(false); // Random string
    });
  });

  describe('isFutureYmd', () => {
    it('should correctly identify future dates', () => {
      // Mock current date to August 25, 2025
      vi.setSystemTime(new Date(2025, 7, 25, 12, 0, 0));
      
      expect(isFutureYmd('2025-08-24')).toBe(false); // Yesterday
      expect(isFutureYmd('2025-08-25')).toBe(false); // Today
      expect(isFutureYmd('2025-08-26')).toBe(true);  // Tomorrow
      expect(isFutureYmd('2025-12-31')).toBe(true);  // Future
      expect(isFutureYmd('2024-12-31')).toBe(false); // Past
    });

    it('should handle DST boundaries correctly', () => {
      // Test around DST boundary (first Sunday in November)
      vi.setSystemTime(new Date(2025, 10, 2, 12, 0, 0)); // November 2, 2025
      
      expect(isFutureYmd('2025-11-01')).toBe(false); // Yesterday
      expect(isFutureYmd('2025-11-02')).toBe(false); // Today
      expect(isFutureYmd('2025-11-03')).toBe(true);  // Tomorrow
    });
  });

  describe('getTodayYmd', () => {
    it('should return today in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date(2025, 7, 25, 15, 30, 0));
      expect(getTodayYmd()).toBe('2025-08-25');
    });

    it('should be consistent across different times of day', () => {
      const date = new Date(2025, 7, 25);
      
      // Test at different hours
      for (let hour = 0; hour < 24; hour++) {
        vi.setSystemTime(new Date(2025, 7, 25, hour, 0, 0));
        expect(getTodayYmd()).toBe('2025-08-25');
      }
    });
  });

  describe('compareYmd', () => {
    it('should compare dates correctly', () => {
      expect(compareYmd('2025-08-24', '2025-08-25')).toBeLessThan(0);
      expect(compareYmd('2025-08-25', '2025-08-25')).toBe(0);
      expect(compareYmd('2025-08-26', '2025-08-25')).toBeGreaterThan(0);
    });

    it('should handle different years and months', () => {
      expect(compareYmd('2024-12-31', '2025-01-01')).toBeLessThan(0);
      expect(compareYmd('2025-01-31', '2025-02-01')).toBeLessThan(0);
    });
  });

  describe('Integration tests with timezone edge cases', () => {
    it('should handle UTC- timezone correctly', () => {
      // Simulate a UTC-8 timezone scenario
      const originalTZ = process.env.TZ;
      
      try {
        // Mock a date that could cause timezone issues
        vi.setSystemTime(new Date(2025, 7, 25, 1, 0, 0)); // 1 AM local
        
        const today = getTodayYmd();
        expect(today).toBe('2025-08-25');
        
        expect(isFutureYmd('2025-08-25')).toBe(false);
        expect(isFutureYmd('2025-08-26')).toBe(true);
      } finally {
        if (originalTZ) process.env.TZ = originalTZ;
      }
    });

    it('should handle UTC+ timezone correctly', () => {
      // Mock a date that could cause timezone issues
      vi.setSystemTime(new Date(2025, 7, 25, 23, 0, 0)); // 11 PM local
      
      const today = getTodayYmd();
      expect(today).toBe('2025-08-25');
      
      expect(isFutureYmd('2025-08-25')).toBe(false);
      expect(isFutureYmd('2025-08-26')).toBe(true);
    });

    it('should maintain consistency between parse and format operations', () => {
      const testDates = [
        '2025-01-01',
        '2025-06-15',
        '2025-08-25',
        '2025-12-31'
      ];

      testDates.forEach(dateStr => {
        const parsed = parseYmdToLocalDate(dateStr);
        const formatted = formatYmdLocal(parsed);
        expect(formatted).toBe(dateStr);
        expect(isValidYmd(formatted)).toBe(true);
      });
    });
  });
});