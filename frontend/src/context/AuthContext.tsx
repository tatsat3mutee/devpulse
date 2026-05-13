import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, type User, type UserPrefs } from "../lib/api";
import { getLocalBookmarks, clearLocalBookmarks } from "../lib/localBookmarks";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  savedIds: Set<number>;
  followedTopicIds: Set<number>;
  mutedSourceIds: Set<number>;
  role: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  saveItem: (itemId: number, note?: string) => Promise<void>;
  unsaveItem: (itemId: number) => Promise<void>;
  isSaved: (itemId: number) => boolean;
  followTopic: (topicId: number) => Promise<void>;
  unfollowTopic: (topicId: number) => Promise<void>;
  muteSource: (sourceId: number) => Promise<void>;
  unmuteSource: (sourceId: number) => Promise<void>;
  refreshPrefs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [followedTopicIds, setFollowedTopicIds] = useState<Set<number>>(new Set());
  const [mutedSourceIds, setMutedSourceIds] = useState<Set<number>>(new Set());
  const [role, setRole] = useState<string>("developer");

  const hydrateSaves = useCallback(async () => {
    try {
      const { savedIds: ids } = await api.getSavedIds();
      setSavedIds(new Set(ids));
    } catch {
      setSavedIds(new Set());
    }
  }, []);

  const refreshPrefs = useCallback(async () => {
    try {
      const prefs: UserPrefs = await api.getPrefs();
      setFollowedTopicIds(new Set(prefs.followed_topics.map(t => t.topic_id)));
      setMutedSourceIds(new Set(prefs.muted_sources.map(s => s.source_id)));
      setRole(prefs.role ?? "developer");
    } catch {
      /* not logged in or prefs unavailable */
    }
  }, []);

  useEffect(() => {
    api.getMe()
      .then(({ user }) => {
        setUser(user);
        return Promise.all([hydrateSaves(), refreshPrefs()]);
      })
      .catch(() => { /* not logged in */ })
      .finally(() => setLoading(false));
  }, [hydrateSaves, refreshPrefs]);

  const migrateLocalBookmarks = useCallback(async () => {
    const local = getLocalBookmarks();
    if (local.length === 0) return;
    try {
      await Promise.allSettled(local.map((b) => api.saveItem(b.id)));
      clearLocalBookmarks();
      await hydrateSaves();
    } catch { /* migration failure is non-fatal */ }
  }, [hydrateSaves]);

  const login = async (email: string, password: string) => {
    const { user } = await api.login(email, password);
    setUser(user);
    await Promise.all([hydrateSaves(), refreshPrefs()]);
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
    setFollowedTopicIds(new Set());
    setMutedSourceIds(new Set());
    setRole("developer");
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

  const followTopic = async (topicId: number) => {
    setFollowedTopicIds(prev => new Set([...prev, topicId]));
    try {
      await api.followTopic(topicId);
    } catch (err) {
      setFollowedTopicIds(prev => { const s = new Set(prev); s.delete(topicId); return s; });
      throw err;
    }
  };

  const unfollowTopic = async (topicId: number) => {
    setFollowedTopicIds(prev => { const s = new Set(prev); s.delete(topicId); return s; });
    try {
      await api.unfollowTopic(topicId);
    } catch (err) {
      setFollowedTopicIds(prev => new Set([...prev, topicId]));
      throw err;
    }
  };

  const muteSource = async (sourceId: number) => {
    setMutedSourceIds(prev => new Set([...prev, sourceId]));
    try {
      await api.muteSource(sourceId);
    } catch (err) {
      setMutedSourceIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
      throw err;
    }
  };

  const unmuteSource = async (sourceId: number) => {
    setMutedSourceIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
    try {
      await api.unmuteSource(sourceId);
    } catch (err) {
      setMutedSourceIds(prev => new Set([...prev, sourceId]));
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, savedIds, followedTopicIds, mutedSourceIds, role,
      login, register, logout,
      saveItem, unsaveItem, isSaved,
      followTopic, unfollowTopic,
      muteSource, unmuteSource,
      refreshPrefs,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
