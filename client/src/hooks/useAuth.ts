import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Fallback: if auth check fails, allow guest access
    throwOnError: false,
  });

  // If authentication fails due to server issues, treat as unauthenticated
  // but don't block the UI from loading
  const isAuthError = error && (error as any)?.status >= 500;
  
  return {
    user,
    isLoading: isLoading && !isAuthError,
    isAuthenticated: !!user && !error,
  };
}
