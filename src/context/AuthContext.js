import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { JWT_KEY, USER_KEY, ROLES_KEY, STATE_KEY, OFFLINE_USER_KEY, ROLES } from "../config";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    // Handle URL-safe base64 (replace - with + and _ with /, add padding)
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "==".slice(0, (4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const decoded = parseJwt(token);
  if (!decoded) return false;
  return decoded.exp * 1000 > Date.now();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev preview bypass — set localStorage key "sam_dev_user" with user JSON to skip JWT
    if (process.env.NODE_ENV === "development") {
      const devUser = localStorage.getItem("sam_dev_user");
      if (devUser) {
        try { setUser(JSON.parse(devUser)); setLoading(false); return; } catch {}
      }
    }
    const token = localStorage.getItem(JWT_KEY);
    if (token && isTokenValid(token)) {
      const roles = JSON.parse(localStorage.getItem(ROLES_KEY) || "[]");
      setUser({
        username: localStorage.getItem(USER_KEY),
        token,
        roles,
        state: localStorage.getItem(STATE_KEY),
        name: localStorage.getItem("iegUserName"),
      });
    } else if (token) {
      // Try offline mode
      const offlineUser = localStorage.getItem(OFFLINE_USER_KEY);
      if (offlineUser) {
        setUser({ ...JSON.parse(offlineUser), offline: true });
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((data) => {
    const { accessToken, username, authorities, state, name } = data;
    localStorage.setItem(JWT_KEY, accessToken);
    localStorage.setItem(USER_KEY, username);
    localStorage.setItem(ROLES_KEY, JSON.stringify(authorities));
    localStorage.setItem(STATE_KEY, state || "");
    localStorage.setItem("iegUserName", name || username);
    const userObj = { username, token: accessToken, roles: authorities, state, name };
    localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(userObj));
    setUser(userObj);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(STATE_KEY);
    setUser(null);
  }, []);

  const hasRole = useCallback((role) => {
    if (!user?.roles) return false;
    return user.roles.some((r) => r === role || r.authority === role);
  }, [user]);

  const isAdmin = useCallback(() => hasRole(ROLES.ADMIN), [hasRole]);
  const isUnicef = useCallback(() => hasRole(ROLES.UNICEF), [hasRole]);
  const isStateAdmin = useCallback(() => hasRole(ROLES.STATE), [hasRole]);
  const isSurveyor = useCallback(() => hasRole(ROLES.SURVEYOR), [hasRole]);
  const isIEG = useCallback(() => hasRole(ROLES.IEG), [hasRole]);
  const canViewAll = useCallback(() => isAdmin() || isUnicef() || isIEG(), [isAdmin, isUnicef, isIEG]);
  const canManage = useCallback(() => isAdmin() || isStateAdmin(), [isAdmin, isStateAdmin]);

  const getPrimaryRole = useCallback(() => {
    if (isAdmin()) return ROLES.ADMIN;
    if (isUnicef()) return ROLES.UNICEF;
    if (isIEG()) return ROLES.IEG;
    if (isStateAdmin()) return ROLES.STATE;
    if (isSurveyor()) return ROLES.SURVEYOR;
    return null;
  }, [isAdmin, isUnicef, isIEG, isStateAdmin, isSurveyor]);

  const isOfflineMode = useCallback(() => !!user?.offline, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      hasRole, isAdmin, isUnicef, isStateAdmin, isSurveyor, isIEG,
      canViewAll, canManage, getPrimaryRole, isOfflineMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
