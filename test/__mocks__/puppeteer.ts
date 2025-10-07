/**
 * Puppeteer Mock for Testing
 * 
 * Provides mock implementation of Puppeteer for unit tests
 */

export const mockPage = {
  setViewport: vi.fn().mockResolvedValue(undefined),
  setContent: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(Buffer.from('mock pdf content'))
};

export const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn().mockResolvedValue(undefined)
};

const puppeteer = {
  launch: vi.fn().mockResolvedValue(mockBrowser)
};

export default puppeteer;