import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { db, ClientProfile } from '../services/db';
import { buildDemoProfile, buildDemoSession, DEMO_EMAIL, DEMO_SESSION_KEY, DEMO_USER_ID, withDemoProfileDefaults } from '../services/demoData';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ClientProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearSessionCacheByPrefix = (prefixes: string[]) => {
  try {
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Safari private/session edge cases can block storage access.
  }
};

const readDemoSession = () => {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY) === '1' ? buildDemoSession() : null;
  } catch {
    return null;
  }
};

const setDemoAuthState = (
  demoSession: any,
  setSession: React.Dispatch<React.SetStateAction<Session | null>>,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setProfile: React.Dispatch<React.SetStateAction<ClientProfile | null>>,
) => {
  setSession(demoSession as Session);
  setUser(demoSession.user as User);
  setProfile(buildDemoProfile(DEMO_EMAIL, DEMO_USER_ID) as ClientProfile);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadProfilePromiseRef = React.useRef<Promise<any> | null>(null);

  const loadProfile = (userId: string, email?: string) => {
    if (loadProfilePromiseRef.current) return loadProfilePromiseRef.current;

    const promise = (async () => {
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        try {
          let p = await db.profile.getByUserId(userId, email);

          // SaaS: auto-create car_clients record if first login
          if (!p) {
            const ensureRes = await fetch('/api/oauth?action=ensure-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, email }),
            });
            const ensureData = await ensureRes.json().catch(() => null);
            p = await db.profile.getByUserId(userId, email);
            if (ensureData?.created && p?.id) {
              try { sessionStorage.setItem('ag_welcome_profile_id', p.id); } catch { /* ignore */ }
            }
          }

          const normalizedProfile = withDemoProfileDefaults(p, email, userId);
          setProfile(normalizedProfile);
          if (normalizedProfile) {
            db.activity.log(userId, normalizedProfile.id, 'session_start', {
              user_email: email,
              ua: navigator.userAgent,
              screen: `${window.innerWidth}x${window.innerHeight}`,
            });
          }
          return normalizedProfile;
        } catch (err) {
          console.error(`Error loading profile (attempt ${i + 1}/${retries}):`, err);
          if (i === retries - 1) {
            setProfile(null);
            loadProfilePromiseRef.current = null;
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    })();

    loadProfilePromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    const activateDemoSession = () => {
      const demoSession = readDemoSession();
      if (!demoSession) return;
      setDemoAuthState(demoSession, setSession, setUser, setProfile);
      setLoading(false);
    };

    const demoSession = readDemoSession();
    if (demoSession) {
      setDemoAuthState(demoSession, setSession, setUser, setProfile);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeDemoSession = readDemoSession();
      if (activeDemoSession) {
        setDemoAuthState(activeDemoSession, setSession, setUser, setProfile);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      const activeDemoSession = readDemoSession();
      if (activeDemoSession) {
        setDemoAuthState(activeDemoSession, setSession, setUser, setProfile);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        loadProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setProfile(null);
        loadProfilePromiseRef.current = null;
        setLoading(false);
      }
    });

    window.addEventListener('car-demo-login', activateDemoSession);

    return () => {
      window.removeEventListener('car-demo-login', activateDemoSession);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const currentUser = user;
    if (!currentUser) return;
    loadProfilePromiseRef.current = null;
    await loadProfile(currentUser.id, currentUser.email ?? undefined);
  };

  const signOut = async () => {
    clearSessionCacheByPrefix(['dashboard_cache_', 'meta:', 'ec:', 'kl:']);
    localStorage.removeItem('view_as_client_id');
    localStorage.removeItem('current_facebook_access_token');
    localStorage.removeItem('active_fb_page_id');
    localStorage.removeItem(DEMO_SESSION_KEY);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
