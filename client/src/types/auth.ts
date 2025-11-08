export type UserRole = 'customer' | 'trainer' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  profilePicture?: string | null;
  tierLevel?: 'starter' | 'professional' | 'enterprise'; // Story 2.14: User tier for recipe access
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  role: 'customer' | 'trainer' | 'admin';
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: Error;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => void;
}