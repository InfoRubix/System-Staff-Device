'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType } from '../types/context';
import { authService, AuthUser } from '../lib/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if user is admin based on email
  const isAdmin = (email: string | null): boolean => {
    if (!email) return false;
    return email === 'admin@company.com' || email.startsWith('admin@');
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      setIsInitialized(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      const userData = await authService.signIn(email, password);
      setUser(userData);
      return true;
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, department: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const userData = await authService.signUp(email, password, name, department);
      setUser(userData);
      return true;
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err.message : 'Sign up failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await authService.signOut();
      setUser(null);
    } catch (err: unknown) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: isAdmin(user?.email || null),
      login,
      signUp,
      logout,
      loading: loading || !isInitialized,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}