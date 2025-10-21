import { vi } from 'vitest';

export const toast = vi.fn();

export const useToast = () => ({
  toast,
  toasts: [],
  dismiss: vi.fn(),
});