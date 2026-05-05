import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, type User } from "../lib/api";
import { getLocalBookmarks, clearLocalBookmarks } from "../lib/localBookmarks";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  savedIds: Set<number>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  saveItem: (itemId: number, note?: string) => Promise<void>;
  unsaveItem: (itemId: number) => Promise<void>;
  isSaved: (itemId: number) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const hydrateSaves = useCallback(async () => {
    try {
      const { savedIds: ids } = await api.getSavedIds();
      setSavedIds(new Set(ids));
    } catch {
      setSavedIds(new Set());
    }
  }, []);

  useEffect(() => {
    api.getMe()
      .then(({ user }) => {
        setUser(user);
        return hydrateSaves();
      })
      .catch(() => { /* not logged in */ })
      .finally(() => setLoading(false));
  }, [hydrateSaves]);

  /** After login/register, silently migrate any locally-saved bookmarks to the server */
  const migrateLocalBookmarks = useCallback(async () => {
    const local = getLocalBookmarks();
    if (local.length === 0) return;
    try {
      // Fire-and-forget each save; ignore duplicates (409/conflict is fine)
      await Promise.allSettled(local.map((b) => api.saveItem(b.id)));
      clearLocalBookmarks();
      await hydrateSaves();
    } catch { /* migration failure is non-fatal */ }
  }, [hydrateSaves]);

  const login = async (email: string, password: string) => {
    const { user } = await api.login(email, password);
    setUser(user);
    await hydrateSaves();
    await migrateLocalBookmarks();
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const { user } = await api.register(email, password, displayName);
    setUser(user);
    setSavedIds(new Set());
    await migrateLocalBookmarks();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setSavedIds(new Set());
  };

  const saveItem = async (itemId: number, note?: string) => {
    setSavedIds((prev) => new Set([...prev, itemId]));
    try {
      await api.saveItem(itemId, note);
    } catch (err) {
      setSavedIds((prev) => { const s = new Set(prev); s.delete(itemId); return s; });
      throw err;
    }
  };

  const unsaveItem = async (itemId: number) => {
    setSavedIds((prev) => { const s = new Set(prev); s.delete(itemId); return s; });
    try {
      await api.unsaveItem(itemId);
    } catch (err) {
      setSavedIds((prev) => new Set([...prev, itemId]));
      throw err;
    }
  };

  const isSaved = (itemId: number) => savedIds.has(itemId);

  return (
    <AuthContext.Provider value={{ user, loading, savedIds, login, register, logout, saveItem, unsaveItem, isSaved }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
