import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage } from './storage';

export type Role = 'provider' | 'parent';

export interface AuthState {
  ready: boolean;
  role: Role | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  setSession: (role: Role, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    role: null,
    token: null,
  });

  useEffect(() => {
    (async () => {
      const role = (await storage.get(storage.KEYS.role)) as Role | null;
      if (!role) {
        setState({ ready: true, role: null, token: null });
        return;
      }
      const key =
        role === 'provider' ? storage.KEYS.providerToken : storage.KEYS.parentToken;
      const token = await storage.get(key);
      setState({ ready: true, role, token });
    })();
  }, []);

  const setSession = useCallback(async (role: Role, token: string) => {
    const key =
      role === 'provider' ? storage.KEYS.providerToken : storage.KEYS.parentToken;
    await storage.set(storage.KEYS.role, role);
    await storage.set(key, token);
    setState({ ready: true, role, token });
  }, []);

  const logout = useCallback(async () => {
    await storage.del(storage.KEYS.role);
    await storage.del(storage.KEYS.providerToken);
    await storage.del(storage.KEYS.parentToken);
    setState({ ready: true, role: null, token: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, setSession, logout }),
    [state, setSession, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
