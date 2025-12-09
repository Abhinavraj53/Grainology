import { useState, useEffect } from 'react';
// @ts-ignore - JS module without types
import { api, Profile } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.getSession().then(async ({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Ensure token is available before loading profile
        // getSession should have saved it, but double-check
        const token = localStorage.getItem('auth_token');
        if (token) {
          api.setToken(token);
        }
        await loadProfile();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = api.auth.onAuthStateChange((_event: any, session: any) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile();
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    try {
      // Prefer server-side current-profile endpoint to avoid mismatched IDs or stale cache
      const current = await api.request('/profiles/me/current');
      const data = current || null;

      if (data) {
        setProfile(data);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      // If it's a 401, clear the token
      if (err?.error === 'Authentication required' || err?.status === 401) {
        api.setToken(null);
        setProfile(null);
      } else {
        // Fallback: use minimal profile from current user to avoid blank dashboard
        if (user) {
          setProfile({
            id: user.id,
            email: user.email,
            name: user.name || user.email || 'User',
            role: user.role || 'customer'
          } as any);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'farmer' | 'trader' | 'fpo' | 'corporate' | 'miller' | 'financer' | 'admin',
    entityType: 'individual' | 'company' = 'individual',
    businessName?: string,
    businessType?: 'private_limited' | 'partnership' | 'proprietorship' | 'llp',
    additionalData?: any
  ) => {
    const { data, error } = await api.auth.signUp({
      email,
      password,
      name,
      role,
      entity_type: entityType,
      business_name: entityType === 'company' ? businessName : undefined,
      business_type: entityType === 'company' ? businessType : undefined,
      ...additionalData
    });

    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await api.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data?.session?.user) {
      await loadProfile();
    }
    return data;
  };

  const signOut = async () => {
    try {
      // Always clear local state first, even if API call fails
      setUser(null);
      setProfile(null);
      setLoading(false);

      // Clear stored token proactively
      localStorage.removeItem('auth_token');
      api.setToken(null);

      // Try to call the API, but don't fail if it errors
      await api.auth.signOut();
    } catch (error) {
      // Ignore errors - we've already cleared local state
      console.warn('Sign out API call failed, but local state cleared:', error);
      api.setToken(null);
    } finally {
      // Ensure token is cleared and force navigation to login
      localStorage.removeItem('auth_token');
      api.setToken(null);
      window.location.href = '/login';
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
