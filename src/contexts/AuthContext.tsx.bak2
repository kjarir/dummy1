import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  user_type: 'farmer' | 'distributor' | 'retailer' | 'helper' | 'admin' | 'driver';
  farm_location?: string;
  wallet_address?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const inFlightProfiles = useRef<Record<string, Promise<Profile | null>>>({});

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set loading to false immediately for auth
        setLoading(false);
        
        // Fetch profile asynchronously (don't block auth)
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Set loading to false immediately
      
      // Fetch profile asynchronously if user exists
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Separate function to fetch profile without blocking auth
  const fetchProfile = useCallback(async (userId: string) => {
    if (profileCache.current.has(userId)) {
      setProfile(profileCache.current.get(userId) ?? null);
      return;
    }

    if (inFlightProfiles.current[userId]) {
      const cached = await inFlightProfiles.current[userId];
      setProfile(cached);
      return;
    }

    const loader = (async (): Promise<Profile | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: profileList, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        if (error) {
          console.warn('Error fetching profile:', error.message);
          return null;
        }

        if (profileList && profileList.length > 0) {
          const foundProfile = profileList[0] as Profile;
          return foundProfile;
        }

        if (!user) {
          return null;
        }

        const rawUserType = (user.user_metadata?.user_type || '').toLowerCase();
        const normalizedUserType = 
          rawUserType === 'distirbutor' || rawUserType === 'distributer' ? 'distributor' :
          ['farmer', 'distributor', 'retailer', 'helper', 'admin'].includes(rawUserType) ? rawUserType :
          'farmer';

        const rawRole = (user.user_metadata?.role || '').toLowerCase();
        const normalizedRole = 
          rawRole === 'distirbutor' || rawRole === 'distributer' ? 'distributor' :
          ['farmer', 'distributor', 'retailer', 'helper', 'admin'].includes(rawRole) ? rawRole :
          normalizedUserType;

        const newProfile = {
          user_id: userId,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          user_type: normalizedUserType,
          farm_location: user.user_metadata?.farm_location || null,
          role: normalizedRole,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile:', createError);
          return null;
        }

        return createdProfile as Profile;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    })();

    inFlightProfiles.current[userId] = loader;
    const resolvedProfile = await loader;
    delete inFlightProfiles.current[userId];

    if (resolvedProfile) {
      profileCache.current.set(userId, resolvedProfile);
    }

    setProfile(resolvedProfile);
  }, []);

  const signOut = async () => {
    try {
      // Try to sign out from Supabase (may fail if offline)
      await supabase.auth.signOut();
    } catch (error) {
      // Even if network request fails, clear local state
      console.warn('⚠️ Sign out request failed, clearing local state anyway:', error);
    } finally {
      // Always clear local state regardless of network status
      setUser(null);
      setSession(null);
      setProfile(null);
      profileCache.current.clear();
      inFlightProfiles.current = {};
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}