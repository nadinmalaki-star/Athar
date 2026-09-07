import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  organizationId: string | null; // set only for owners, from `memberships`
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpOwner: (args: {
    email: string;
    password: string;
    fullName: string;
    salonName: string;
  }) => Promise<{ error: string | null }>;
  signUpCustomer: (args: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('fetchProfile failed', error.message);
    return null;
  }
  return data;
}

async function fetchOwnerOrganizationId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('fetchOwnerOrganizationId failed', error.message);
    return null;
  }
  return data?.organization_id ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadForSession(nextSession: Session | null) {
    setSession(nextSession);
    if (!nextSession) {
      setProfile(null);
      setOrganizationId(null);
      return;
    }
    const nextProfile = await fetchProfile(nextSession.user.id);
    setProfile(nextProfile);
    if (nextProfile?.role === 'owner') {
      setOrganizationId(await fetchOwnerOrganizationId(nextSession.user.id));
    } else {
      setOrganizationId(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      loadForSession(data.session).finally(() => setLoading(false));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      loadForSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      organizationId,
      loading,

      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },

      async signUpOwner({ email, password, fullName, salonName }) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error || !data.user) return { error: error?.message ?? 'تعذر إنشاء الحساب' };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, role: 'owner', full_name: fullName });
        if (profileError) return { error: profileError.message };

        const { error: orgError } = await supabase.rpc('create_organization', { org_name: salonName });
        if (orgError) return { error: orgError.message };

        await loadForSession(data.session);
        return { error: null };
      },

      async signUpCustomer({ email, password, fullName }) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error || !data.user) return { error: error?.message ?? 'تعذر إنشاء الحساب' };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, role: 'customer', full_name: fullName });
        if (profileError) return { error: profileError.message };

        await loadForSession(data.session);
        return { error: null };
      },

      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, organizationId, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
