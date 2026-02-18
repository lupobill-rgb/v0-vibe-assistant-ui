import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authLogin, authRegister, type AuthUser } from '../api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('vibe_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vibe_token'));

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    localStorage.setItem('vibe_token', data.token);
    localStorage.setItem('vibe_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await authRegister(email, password, name);
    localStorage.setItem('vibe_token', data.token);
    localStorage.setItem('vibe_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vibe_token');
    localStorage.removeItem('vibe_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
