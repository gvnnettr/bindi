import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../state/auth';

export function useTakipPaket() {
  const { token, role } = useAuth();
  const [active, setActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || role !== 'provider') return;
    try {
      const r = await api.get<{ active: boolean }>('/me/subscription/takip', token);
      setActive(r.active);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setActive(false);
    }
  }, [token, role]);

  useEffect(() => { void load(); }, [load]);

  return { active, error, reload: load };
}
