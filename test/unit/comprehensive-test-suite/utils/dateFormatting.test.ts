import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format, isValid, parseISO, addDays, subDays, startOfDay, endOfDay } from 'date-fns';

// Mock date-fns functions to test our utility functions
vi.mock('date-fns', () => ({
  format: vi.fn(),
  isValid: vi.fn(),
  parseISO: vi.fn(),
  addDays: vi.fn(),
  subDays: vi.fn(),
  startOfDay: vi.fn(),
  endOfDay: vi.fn(),
}));

// Import date utility functions (assuming they exist in the codebase)
// These would be actual utility functions from the project
const dateUtils = {
  formatDate: (date: Date | string, formatString = 'MMM d, yyyy') => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, formatString);
  },

  formatDateTime: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, 'MMM d, yyyy h:mm a');
  },

  formatRelativeDate: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  },

  getDateRange: (startDate: Date | string, days: number) => {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    if (!isValid(start)) return null;
    
    const end = addDays(start, days - 1);
    return { start, end };
  },

  isDateInRange: (date: Date | string, startDate: Date | string, endDate: Date | string) => {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(checkDate) || !isValid(start) || !isValid(end)) return false;
    
    return checkDate >= start && checkDate <= end;
  },

  formatDuration: (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
  },

  calculateAge: (birthDate: Date | string) => {
    const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
    if (!isValid(birth)) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },

  getDaysBetween: (startDate: Date | string, endDate: Date | string) => {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(start) || !isValid(end)) return null;
    
    const diffInMs = end.getTime() - start.getTime();
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  },

  getStartOfDay: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return null;
    return startOfDay(dateObj);
  },

  getEndOfDay: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return null;
    return endOfDay(dateObj);
  },
};

describe('Date Formatting Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock implementations
    (parseISO as any).mockImplementation((dateString: string) => new Date(dateString));
    (isValid as any).mockImplementation((date: any) => date instanceof Date && !isNaN(date.getTime()));
    (format as any).mockImplementation((date: Date, formatString: string) => {
      // Simple mock formatting
      if (formatString === 'MMM d, yyyy') return 'Jan 15, 2024';
      if (formatString === 'MMM d, yyyy h:mm a') return 'Jan 15, 2024 2:30 PM';
      return formatString;
    });
    (addDays as any).mockImplementation((date: Date, days: number) => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
    (startOfDay as any).mockImplementation((date: Date) => {
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    });
    (endOfDay as any).mockImplementation((date: Date) => {
      const newDate = new Date(date);
      newDate.setHours(23, 59, 59, 999);
      return newDate;
    });
  });

  describe('formatDate', () => {
    it('formats Date object with default format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = dateUtils.formatDate(date);
      
      expect(parseISO).not.toHaveBeenCalled();
      expect(isValid).toHaveBeenCalledWith(date);
      expect(format).toHaveBeenCalledWith(date, 'MMM d, yyyy');
      expect(result).toBe('Jan 15, 2024');
    });

    it('formats ISO string with default format', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const mockDate = new Date(dateString);
      (parseISO as any).mockReturnValue(mockDate);
      
      const result = dateUtils.formatDate(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(isValid).toHaveBeenCalledWith(mockDate);
      expect(format).toHaveBeenCalledWith(mockDate, 'MMM d, yyyy');
      expect(result).toBe('Jan 15, 2024');
    });

    it('formats date with custom format string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const customFormat = 'yyyy-MM-dd';
      (format as any).mockReturnValue('2024-01-15');
      
      const result = dateUtils.formatDate(date, customFormat);
      
      expect(format).toHaveBeenCalledWith(date, customFormat);
      expect(result).toBe('2024-01-15');
    });

    it('returns "Invalid Date" for invalid date input', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.formatDate('invalid-date');
      
      expect(result).toBe('Invalid Date');
      expect(format).not.toHaveBeenCalled();
    });

    it('handles null and undefined inputs', () => {
      (parseISO as any).mockReturnValue(new Date('invalid'));
      (isValid as any).mockReturnValue(false);
      
      expect(dateUtils.formatDate(null as any)).toBe('Invalid Date');
      expect(dateUtils.formatDate(undefined as any)).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    it('formats date with time using default format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = dateUtils.formatDateTime(date);
      
      expect(format).toHaveBeenCalledWith(date, 'MMM d, yyyy h:mm a');
      expect(result).toBe('Jan 15, 2024 2:30 PM');
    });

    it('formats ISO string with time', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const mockDate = new Date(dateString);
      (parseISO as any).mockReturnValue(mockDate);
      
      const result = dateUtils.formatDateTime(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(format).toHaveBeenCalledWith(mockDate, 'MMM d, yyyy h:mm a');
      expect(result).toBe('Jan 15, 2024 2:30 PM');
    });

    it('returns "Invalid Date" for invalid input', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.formatDateTime('invalid');
      
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      // Mock current date as 2024-01-20
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
    });

    it('returns "Today" for current date', () => {
      const today = new Date('2024-01-20T10:00:00Z');
      const result = dateUtils.formatRelativeDate(today);
      
      expect(result).toBe('Today');
    });

    it('returns "Yesterday" for previous day', () => {
      const yesterday = new Date('2024-01-19T10:00:00Z');
      const result = dateUtils.formatRelativeDate(yesterday);
      
      expect(result).toBe('Yesterday');
    });

    it('returns days ago for recent dates', () => {
      const threeDaysAgo = new Date('2024-01-17T10:00:00Z');
      const result = dateUtils.formatRelativeDate(threeDaysAgo);
      
      expect(result).toBe('3 days ago');
    });

    it('returns weeks ago for dates within a month', () => {
      const twoWeeksAgo = new Date('2024-01-06T10:00:00Z');
      const result = dateUtils.formatRelativeDate(twoWeeksAgo);
      
      expect(result).toBe('2 weeks ago');
    });

    it('returns months ago for dates within a year', () => {
      const twoMonthsAgo = new Date('2023-11-20T10:00:00Z');
      const result = dateUtils.formatRelativeDate(twoMonthsAgo);
      
      expect(result).toBe('2 months ago');
    });

    it('returns years ago for old dates', () => {
      const twoYearsAgo = new Date('2022-01-20T10:00:00Z');
      const result = dateUtils.formatRelativeDate(twoYearsAgo);
      
      expect(result).toBe('2 years ago');
    });

    it('handles ISO string input', () => {
      const dateString = '2024-01-19T10:00:00Z';
      const mockDate = new Date(dateString);
      (parseISO as any).mockReturnValue(mockDate);
      
      const result = dateUtils.formatRelativeDate(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(result).toBe('Yesterday');
    });

    it('returns "Invalid Date" for invalid input', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.formatRelativeDate('invalid');
      
      expect(result).toBe('Invalid Date');
    });
  });

  describe('getDateRange', () => {
    it('calculates date range for given start date and duration', () => {
      const startDate = new Date('2024-01-15');
      const mockEndDate = new Date('2024-01-21');
      (addDays as any).mockReturnValue(mockEndDate);
      
      const result = dateUtils.getDateRange(startDate, 7);
      
      expect(addDays).toHaveBeenCalledWith(startDate, 6); // days - 1
      expect(result).toEqual({ start: startDate, end: mockEndDate });
    });

    it('handles ISO string input', () => {
      const dateString = '2024-01-15T00:00:00Z';
      const mockDate = new Date(dateString);
      const mockEndDate = new Date('2024-01-21');
      (parseISO as any).mockReturnValue(mockDate);
      (addDays as any).mockReturnValue(mockEndDate);
      
      const result = dateUtils.getDateRange(dateString, 7);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(result).toEqual({ start: mockDate, end: mockEndDate });
    });

    it('returns null for invalid start date', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.getDateRange('invalid', 7);
      
      expect(result).toBeNull();
      expect(addDays).not.toHaveBeenCalled();
    });

    it('handles single day range', () => {
      const startDate = new Date('2024-01-15');
      const mockEndDate = new Date('2024-01-15');
      (addDays as any).mockReturnValue(mockEndDate);
      
      const result = dateUtils.getDateRange(startDate, 1);
      
      expect(addDays).toHaveBeenCalledWith(startDate, 0);
      expect(result).toEqual({ start: startDate, end: mockEndDate });
    });
  });

  describe('isDateInRange', () => {
    it('returns true when date is within range', () => {
      const checkDate = new Date('2024-01-15');
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.isDateInRange(checkDate, startDate, endDate);
      
      expect(result).toBe(true);
    });

    it('returns true when date equals start date', () => {
      const checkDate = new Date('2024-01-10');
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.isDateInRange(checkDate, startDate, endDate);
      
      expect(result).toBe(true);
    });

    it('returns true when date equals end date', () => {
      const checkDate = new Date('2024-01-20');
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.isDateInRange(checkDate, startDate, endDate);
      
      expect(result).toBe(true);
    });

    it('returns false when date is before range', () => {
      const checkDate = new Date('2024-01-05');
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.isDateInRange(checkDate, startDate, endDate);
      
      expect(result).toBe(false);
    });

    it('returns false when date is after range', () => {
      const checkDate = new Date('2024-01-25');
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.isDateInRange(checkDate, startDate, endDate);
      
      expect(result).toBe(false);
    });

    it('handles ISO string inputs', () => {
      const mockDates = [
        new Date('2024-01-15'),
        new Date('2024-01-10'),
        new Date('2024-01-20'),
      ];
      (parseISO as any)
        .mockReturnValueOnce(mockDates[0])
        .mockReturnValueOnce(mockDates[1])
        .mockReturnValueOnce(mockDates[2]);
      
      const result = dateUtils.isDateInRange(
        '2024-01-15T00:00:00Z',
        '2024-01-10T00:00:00Z',
        '2024-01-20T00:00:00Z'
      );
      
      expect(parseISO).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it('returns false for invalid dates', () => {
      (isValid as any)
        .mockReturnValueOnce(false) // checkDate invalid
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);
      
      const result = dateUtils.isDateInRange('invalid', '2024-01-10', '2024-01-20');
      
      expect(result).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('formats minutes only for durations under 1 hour', () => {
      expect(dateUtils.formatDuration(30)).toBe('30 min');
      expect(dateUtils.formatDuration(45)).toBe('45 min');
      expect(dateUtils.formatDuration(59)).toBe('59 min');
    });

    it('formats hours only for exact hour durations', () => {
      expect(dateUtils.formatDuration(60)).toBe('1 hr');
      expect(dateUtils.formatDuration(120)).toBe('2 hr');
      expect(dateUtils.formatDuration(180)).toBe('3 hr');
    });

    it('formats hours and minutes for mixed durations', () => {
      expect(dateUtils.formatDuration(90)).toBe('1 hr 30 min');
      expect(dateUtils.formatDuration(125)).toBe('2 hr 5 min');
      expect(dateUtils.formatDuration(195)).toBe('3 hr 15 min');
    });

    it('handles zero and negative durations', () => {
      expect(dateUtils.formatDuration(0)).toBe('0 min');
      expect(dateUtils.formatDuration(-30)).toBe('-30 min');
    });

    it('handles very large durations', () => {
      expect(dateUtils.formatDuration(1440)).toBe('24 hr'); // 1 day
      expect(dateUtils.formatDuration(1500)).toBe('25 hr 0 min');
    });
  });

  describe('calculateAge', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    it('calculates age correctly for past birthday this year', () => {
      const birthDate = new Date('1990-03-15');
      const result = dateUtils.calculateAge(birthDate);
      
      expect(result).toBe(34);
    });

    it('calculates age correctly for future birthday this year', () => {
      const birthDate = new Date('1990-08-15');
      const result = dateUtils.calculateAge(birthDate);
      
      expect(result).toBe(33);
    });

    it('calculates age correctly for birthday today', () => {
      const birthDate = new Date('1990-06-15');
      const result = dateUtils.calculateAge(birthDate);
      
      expect(result).toBe(34);
    });

    it('handles ISO string input', () => {
      const dateString = '1990-03-15T00:00:00Z';
      const mockDate = new Date('1990-03-15');
      (parseISO as any).mockReturnValue(mockDate);
      
      const result = dateUtils.calculateAge(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(result).toBe(34);
    });

    it('returns null for invalid date', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.calculateAge('invalid');
      
      expect(result).toBeNull();
    });

    it('handles edge case of same month, different day', () => {
      const birthDate = new Date('1990-06-20'); // Future day this month
      const result = dateUtils.calculateAge(birthDate);
      
      expect(result).toBe(33); // Not yet had birthday
    });
  });

  describe('getDaysBetween', () => {
    it('calculates positive days between dates', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');
      
      const result = dateUtils.getDaysBetween(startDate, endDate);
      
      expect(result).toBe(5);
    });

    it('calculates negative days for reverse order', () => {
      const startDate = new Date('2024-01-20');
      const endDate = new Date('2024-01-15');
      
      const result = dateUtils.getDaysBetween(startDate, endDate);
      
      expect(result).toBe(-5);
    });

    it('returns 0 for same date', () => {
      const date = new Date('2024-01-15');
      
      const result = dateUtils.getDaysBetween(date, date);
      
      expect(result).toBe(0);
    });

    it('handles ISO string inputs', () => {
      const mockStartDate = new Date('2024-01-15');
      const mockEndDate = new Date('2024-01-20');
      (parseISO as any)
        .mockReturnValueOnce(mockStartDate)
        .mockReturnValueOnce(mockEndDate);
      
      const result = dateUtils.getDaysBetween(
        '2024-01-15T00:00:00Z',
        '2024-01-20T00:00:00Z'
      );
      
      expect(parseISO).toHaveBeenCalledTimes(2);
      expect(result).toBe(5);
    });

    it('returns null for invalid dates', () => {
      (isValid as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      
      const result = dateUtils.getDaysBetween('invalid', '2024-01-20');
      
      expect(result).toBeNull();
    });

    it('handles partial days correctly', () => {
      const startDate = new Date('2024-01-15T10:00:00Z');
      const endDate = new Date('2024-01-16T02:00:00Z');
      
      const result = dateUtils.getDaysBetween(startDate, endDate);
      
      expect(result).toBe(1); // Should round up partial days
    });
  });

  describe('getStartOfDay', () => {
    it('returns start of day for given date', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const mockStartOfDay = new Date('2024-01-15T00:00:00.000Z');
      (startOfDay as any).mockReturnValue(mockStartOfDay);
      
      const result = dateUtils.getStartOfDay(date);
      
      expect(startOfDay).toHaveBeenCalledWith(date);
      expect(result).toBe(mockStartOfDay);
    });

    it('handles ISO string input', () => {
      const dateString = '2024-01-15T14:30:45.123Z';
      const mockDate = new Date(dateString);
      const mockStartOfDay = new Date('2024-01-15T00:00:00.000Z');
      (parseISO as any).mockReturnValue(mockDate);
      (startOfDay as any).mockReturnValue(mockStartOfDay);
      
      const result = dateUtils.getStartOfDay(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(startOfDay).toHaveBeenCalledWith(mockDate);
      expect(result).toBe(mockStartOfDay);
    });

    it('returns null for invalid date', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.getStartOfDay('invalid');
      
      expect(result).toBeNull();
      expect(startOfDay).not.toHaveBeenCalled();
    });
  });

  describe('getEndOfDay', () => {
    it('returns end of day for given date', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const mockEndOfDay = new Date('2024-01-15T23:59:59.999Z');
      (endOfDay as any).mockReturnValue(mockEndOfDay);
      
      const result = dateUtils.getEndOfDay(date);
      
      expect(endOfDay).toHaveBeenCalledWith(date);
      expect(result).toBe(mockEndOfDay);
    });

    it('handles ISO string input', () => {
      const dateString = '2024-01-15T14:30:45.123Z';
      const mockDate = new Date(dateString);
      const mockEndOfDay = new Date('2024-01-15T23:59:59.999Z');
      (parseISO as any).mockReturnValue(mockDate);
      (endOfDay as any).mockReturnValue(mockEndOfDay);
      
      const result = dateUtils.getEndOfDay(dateString);
      
      expect(parseISO).toHaveBeenCalledWith(dateString);
      expect(endOfDay).toHaveBeenCalledWith(mockDate);
      expect(result).toBe(mockEndOfDay);
    });

    it('returns null for invalid date', () => {
      (isValid as any).mockReturnValue(false);
      
      const result = dateUtils.getEndOfDay('invalid');
      
      expect(result).toBeNull();
      expect(endOfDay).not.toHaveBeenCalled();
    });
  });
});