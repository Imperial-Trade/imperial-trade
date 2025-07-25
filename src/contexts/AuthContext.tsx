
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authUtils';

interface Profile {
  id: string;
  display_name: string | null;
  role: string | null;
  user_type: string | null;
  access_level: string | null;
  account_status: string | null;
  registration_source: string | null;
  phone_number: string | null;
  last_login: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          role,
          user_type,
          access_level,
          account_status,
          registration_source,
          phone_number,
          last_login,
          approved_at,
          approved_by,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profileData as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Load profile in background - don't block main loading state
        setTimeout(() => {
          fetchProfile(session.user.id).then(setProfile);
        }, 0);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        // Set main loading to false as soon as we have auth state
        setLoading(false);

        if (session?.user) {
          // Fetch profile data in background - don't block UI
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          // Skip cleanup if we're manually signing out to prevent race condition
          if (!isSigningOut) {
            cleanupAuthState();
          }
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Set main loading to false immediately after getting initial session
      setLoading(false);
      
      if (session?.user) {
        // Load profile in background
        setTimeout(() => {
          fetchProfile(session.user.id).then(setProfile);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Set signing out flag to prevent auth handler interference
      setIsSigningOut(true);
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Reset state immediately
      setSession(null);
      setUser(null);
      setProfile(null);
      
      // Start the sign out process
      await supabase.auth.signOut({ scope: 'global' });
      
      // Give the main auth listener time to process SIGNED_OUT event
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Now redirect after the main listener has processed
      window.location.href = '/signin';
      
    } catch (error) {
      console.error('Error signing out:', error);
      // Reset flag on error
      setIsSigningOut(false);
      // Force redirect even if signout fails
      window.location.href = '/signin';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      profileLoading,
      signOut, 
      refreshSession, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
