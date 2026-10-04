import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from '../api/auth.js';
import { apiErrorMessage } from '../api/http.js';
import { AuthContext } from './auth-context.js';
import { useToast } from './useToast.js';

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    meRequest()
      .then((next) => {
        if (active) setUser(next);
      })
      .catch((error) => {
        if (active) setUser(null);
        if (error?.response?.status !== 401) {
          toast.error(apiErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const login = useCallback(
    async (body) => {
      try {
        const next = await loginRequest(body);
        setUser(next);
        return next;
      } catch (error) {
        toast.error(apiErrorMessage(error));
        throw error;
      }
    },
    [toast],
  );

  const register = useCallback(
    async (body) => {
      try {
        const next = await registerRequest(body);
        setUser(next);
        return next;
      } catch (error) {
        toast.error(apiErrorMessage(error));
        throw error;
      }
    },
    [toast],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
      setUser(null);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      throw error;
    }
  }, [toast]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
