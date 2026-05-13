import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  setSessionId as preloadSetSessionId,
  clearSessionId as preloadClearSessionId,
  whoami,
  logout as ipcLogout,
  getEstadoSetup,
  getConfiguracionClinica,
  getLicencia,
  getUsuarios,
} from '../services/dbService';
import { setClinicConfigCache } from '../utils/formatters';

const UserContext = createContext(null);
const SESSION_KEY = 'odontosoft.sessionId';

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [setupCompletado, setSetupCompletado] = useState(true);
  const [licencia, setLicencia] = useState({ tipo: 'demo' });
  const [hydrating, setHydrating] = useState(true);
  const [totalUsuarios, setTotalUsuarios] = useState(1);

  const refreshLicencia = useCallback(async () => {
    try {
      const lic = await getLicencia();
      if (lic) setLicencia(lic);
    } catch (e) {
      console.error('Error consultando licencia:', e);
    }
  }, []);

  const refreshSetup = useCallback(async () => {
    try {
      const [estado, cfg, lic, usuarios] = await Promise.all([
        getEstadoSetup(),
        getConfiguracionClinica(),
        getLicencia(),
        getUsuarios().catch(() => []),
      ]);
      setSetupCompletado(!!estado?.setupCompletado);
      if (cfg) setClinicConfigCache(cfg);
      if (lic) setLicencia(lic);
      setTotalUsuarios(Array.isArray(usuarios) ? usuarios.length : 1);
    } catch (e) {
      console.error('Error consultando estado de setup:', e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedId = localStorage.getItem(SESSION_KEY);
      if (!savedId) {
        setHydrating(false);
        return;
      }
      preloadSetSessionId(savedId);
      try {
        const res = await whoami();
        if (cancelled) return;
        if (res?.autenticado && res.usuario) {
          setCurrentUser(res.usuario);
          await refreshSetup();
        } else {
          localStorage.removeItem(SESSION_KEY);
          preloadClearSessionId();
        }
      } catch (e) {
        console.error('Error validando sesión:', e);
        localStorage.removeItem(SESSION_KEY);
        preloadClearSessionId();
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshSetup]);

  const onLoginSuccess = useCallback(async (usuario, sessionId) => {
    if (!sessionId) {
      console.warn('Login sin sessionId');
      return;
    }
    localStorage.setItem(SESSION_KEY, sessionId);
    preloadSetSessionId(sessionId);
    setCurrentUser(usuario);
    await refreshSetup();
  }, [refreshSetup]);

  const logout = useCallback(async () => {
    try {
      await ipcLogout();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    localStorage.removeItem(SESSION_KEY);
    preloadClearSessionId();
    setCurrentUser(null);
  }, []);

  const markSetupCompleted = useCallback(() => {
    setSetupCompletado(true);
    refreshSetup();
  }, [refreshSetup]);

  const value = useMemo(
    () => ({
      currentUser,
      setupCompletado,
      licencia,
      hydrating,
      totalUsuarios,
      onLoginSuccess,
      logout,
      refreshSetup,
      refreshLicencia,
      markSetupCompleted,
    }),
    [
      currentUser,
      setupCompletado,
      licencia,
      hydrating,
      totalUsuarios,
      onLoginSuccess,
      logout,
      refreshSetup,
      refreshLicencia,
      markSetupCompleted,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
