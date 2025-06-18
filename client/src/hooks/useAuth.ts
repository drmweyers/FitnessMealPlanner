import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'admin' | 'trainer' | 'client';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trainer?: {
    id: string;
    businessName?: string;
    certifications: string[];
    specializations: string[];
  };
  client?: {
    id: string;
    fitnessGoals: string[];
    dietaryRestrictions: string[];
    currentWeight?: number;
    targetWeight?: number;
    activityLevel?: string;
  };
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
