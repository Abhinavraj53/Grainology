import { useState, useEffect } from 'react';
import { api, Profile } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = api.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data, error } = await api
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
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
      await loadProfile(data.session.user.id);
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await api.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
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
