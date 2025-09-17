import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  xeon_stream_subscription: boolean | null;
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
    // Enhanced error logging for diagnostics
    console.error('🚨 useAuth called outside AuthProvider context!', {
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
      location: window.location.pathname
    });
    
    // Runtime probe - check if AuthProvider exists in DOM
    const authProviders = document.querySelectorAll('[data-auth-provider]');
    console.error('🔍 AuthProvider probe:', {
      providersFound: authProviders.length,
      currentComponent: document.querySelector('[data-current-component]')?.getAttribute('data-current-component') || 'unknown'
    });
    
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    console.log('🔄 Fetching profile for user:', userId);
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
        console.error('❌ Error fetching profile:', error);
        return null;
      }

      // Get xeon subscription status securely
      const { data: xeonStatus, error: xeonError } = await supabase
        .rpc('check_user_xeon_subscription', { user_id_param: userId });

      if (xeonError) {
        console.warn('⚠️ Failed to get xeon subscription status:', xeonError);
      }

      const fullProfile = {
        ...profileData,
        xeon_stream_subscription: xeonStatus || false
      } as Profile;

      console.log('✅ Profile loaded successfully:', fullProfile?.display_name || 'No display name');
      return fullProfile;
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
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
    console.log('🔄 Refreshing session...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('📝 Session found, loading profile...');
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        console.log('❌ No session found');
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const handleAuthStateChange = (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 User authenticated, loading profile...');
        // Defer Supabase calls to avoid deadlocks in the auth callback
        setTimeout(() => {
          fetchProfile(session.user!.id)
            .then((profileData) => {
              if (mounted) {
                setProfile(profileData);
              }
            })
            .catch((error) => {
              console.error('❌ Failed to load profile:', error);
              if (mounted) {
                setProfile(null);
              }
            })
            .finally(() => {
              if (mounted && !authInitialized) {
                setLoading(false);
                setAuthInitialized(true);
                console.log('✅ Auth initialization complete');
              }
            });
        }, 0);
      } else {
        console.log('❌ No user session');
        if (mounted) {
          setProfile(null);
          if (!authInitialized) {
            setLoading(false);
            setAuthInitialized(true);
            console.log('✅ Auth initialization complete (no user)');
          }
        }
      }

      // Handle specific auth events
      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        if (!isSigningOut && mounted) {
          cleanupAuthState();
        }
        if (mounted) {
          setProfile(null);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('🔐 Password recovery session detected - allowing reset flow');
        // Don't interfere with password recovery process
        // The ResetPasswordForm will handle this event
        return;
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (mounted) {
            setLoading(false);
            setAuthInitialized(true);
          }
          return;
        }

        handleAuthStateChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authInitialized, isSigningOut]);

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
      
      // Use React Router navigation instead of page reload
      navigate('/signin', { replace: true });
      
    } catch (error) {
      console.error('Error signing out:', error);
      // Reset flag on error
      setIsSigningOut(false);
      // Navigate to signin even if signout fails
      navigate('/signin', { replace: true });
    } finally {
      // Reset the signing out flag
      setIsSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        profile, 
        loading, 
        profileLoading,
        signOut, 
        refreshSession, 
        refreshProfile 
      }}
    >
      <div data-auth-provider="true">
        {children}
      </div>
    </AuthContext.Provider>
  );
};