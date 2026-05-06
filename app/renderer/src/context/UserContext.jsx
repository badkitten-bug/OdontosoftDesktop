import { createContext, useContext, useState, useEffect } from 'react';
import {
  setSessionId as preloadSetSessionId,
  clearSessionId as preloadClearSessionId,
  whoami,
  logout as ipcLogout,
} from '../services/dbService';

const UserContext = createContext(null);
const SESSION_KEY = 'odontosoft.sessionId';

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  // Al montar: si hay sessionId guardado, validarlo en main vía whoami
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
  }, []);

  const onLoginSuccess = (usuario, sessionId) => {
    if (!sessionId) {
      console.warn('Login sin sessionId');
      return;
    }
    localStorage.setItem(SESSION_KEY, sessionId);
    preloadSetSessionId(sessionId);
    setCurrentUser(usuario);
  };

  const logout = async () => {
    try {
      await ipcLogout();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    localStorage.removeItem(SESSION_KEY);
    preloadClearSessionId();
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider value={{ currentUser, onLoginSuccess, logout, hydrating }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
