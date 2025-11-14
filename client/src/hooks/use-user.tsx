/**
 * useUser Hook
 *
 * Wrapper around useAuth that provides user information
 * This is a convenience hook to match the expected API in tier-related components
 */

import { useAuth } from '@/contexts/AuthContext';

export function useUser() {
  const auth = useAuth();

  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
  };
}
