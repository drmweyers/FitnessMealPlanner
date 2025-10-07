/**
 * jsPDF Mock for Testing
 * 
 * Provides mock implementation of jsPDF for client-side tests
 */

export const mockJsPDF = {
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297)
    }
  },
  setFontSize: vi.fn().mockReturnThis(),
  setFont: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  addPage: vi.fn().mockReturnThis(),
  setDrawColor: vi.fn().mockReturnThis(),
  setLineWidth: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  setFillColor: vi.fn().mockReturnThis(),
  setTextColor: vi.fn().mockReturnThis(),
  save: vi.fn().mockReturnThis()
};

const jsPDF = vi.fn().mockImplementation(() => mockJsPDF);

export default jsPDF;