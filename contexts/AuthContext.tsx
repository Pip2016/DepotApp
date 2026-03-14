'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchProfile(user.id);
      setProfile(profile);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // If Supabase is not configured, skip auth initialization
    if (!supabase) {
      console.log('[Auth] Supabase not configured, skipping auth');
      setIsLoading(false);
      return;
    }

    let didCancel = false;

    // Get initial session with timeout
    const getSession = async () => {
      try {
        // Timeout after 5 seconds to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 5000);
        });

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (didCancel) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!didCancel) setProfile(profile);
        }
      } catch (error) {
        console.error('[Auth] Error getting session:', error);
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (didCancel) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!didCancel) setProfile(profile);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      didCancel = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return {
          error: { message: 'Supabase is not configured' } as AuthError,
        };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    [supabase]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName?: string) => {
      if (!supabase) {
        return {
          error: { message: 'Supabase is not configured' } as AuthError,
        };
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [supabase]);

  // isLoading is true until we're mounted AND auth check is complete
  const effectiveIsLoading = !mounted || isLoading;

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      isLoading: effectiveIsLoading,
      isConfigured: isSupabaseConfigured,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      session,
      effectiveIsLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
