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
  isPasswordResetFlow: boolean;
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
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);

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
    
    // Enhanced password reset flow detection
    const checkPasswordResetFlow = () => {
      const isResetRoute = window.location.pathname === '/reset-password';
      const hasRecoveryTokens = window.location.hash.includes('type=recovery') || 
                               window.location.search.includes('type=recovery');
      const hasSessionFlag = sessionStorage.getItem('password-reset-flow') === 'true';
      const resetFlow = isResetRoute || hasRecoveryTokens || hasSessionFlag;
      
      console.log('🔐 Password reset flow check:', {
        isResetRoute,
        hasRecoveryTokens,
        hasSessionFlag,
        resetFlow
      });
      
      setIsPasswordResetFlow(resetFlow);
      return resetFlow;
    };
    
    // Separate public pages from session-sensitive public pages
    const publicPaths = [
      '/', 
      '/signin', 
      '/advanced-tools', 
      '/signals', 
      '/education', 
      '/live-sessions', 
      '/community-forum', 
      '/ib-partnership', 
      '/ib-partnership-new', 
      '/imperial-partnership',
      '/about',
      '/features'
    ];
    
    // Pages that are public but need to preserve auth sessions
    const sessionSensitivePublicPaths = ['/reset-password'];
    
    const isTruePublicPage = () => {
      return publicPaths.includes(window.location.pathname);
    };
    
    const isSessionSensitivePage = () => {
      return sessionSensitivePublicPaths.includes(window.location.pathname);
    };
    
    // Enhanced recovery token detection
    const hasRecoveryTokens = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Check for all possible recovery token formats
      const hasTokenHash = hash.includes('token_hash=') || search.includes('token_hash=');
      const hasRecoveryType = hash.includes('type=recovery') || search.includes('type=recovery');
      const hasAccessToken = hash.includes('access_token=') || search.includes('access_token=');
      const hasRefreshToken = hash.includes('refresh_token=') || search.includes('refresh_token=');
      
      return (hasTokenHash && hasRecoveryType) || (hasAccessToken && hasRefreshToken);
    };
    
    // Initial check - only clear auth for true public pages
    const isResetFlow = checkPasswordResetFlow();
    const shouldSkipAutoAuth = isTruePublicPage() && !isResetFlow;
    
    // Listen for location changes
    const handleLocationChange = () => {
      checkPasswordResetFlow();
    };
    
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate', handleLocationChange);
    window.addEventListener('replacestate', handleLocationChange);
    
    const handleAuthStateChange = (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
      
      // FAILSAFE: Explicit protection for password recovery flow
      if (event === 'PASSWORD_RECOVERY' || (session && hasRecoveryTokens())) {
        console.log('🔐 Password recovery session detected - storing session WITHOUT authenticating user');
        // Store session for password reset but DON'T authenticate user yet
        setSession(session);
        setUser(null); // Keep user null until password is actually reset
        setIsPasswordResetFlow(true);
        
        // Mark the flow in session storage for persistence
        sessionStorage.setItem('password-reset-flow', 'true');
        
        if (mounted && !authInitialized) {
          setLoading(false);
          setAuthInitialized(true);
          console.log('✅ Auth initialization complete (password recovery - user NOT authenticated yet)');
        }
        return;
      }
      
      // If we're in password reset flow, store session but don't authenticate user
      if (isPasswordResetFlow && event === 'INITIAL_SESSION') {
        console.log('🔄 Password reset flow - storing session WITHOUT authenticating user');
        setSession(session);
        setUser(null); // Keep user null until password is reset
        if (mounted && !authInitialized) {
          setLoading(false);
          setAuthInitialized(true);
          console.log('✅ Auth initialization complete (reset flow - user NOT authenticated)');
        }
        return;
      }
      
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
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // THEN check for existing session (only if not on true public page)
    const initializeAuth = async () => {
      try {
        // FAILSAFE: Always check for recovery tokens first
        if (hasRecoveryTokens()) {
          console.log('🔑 Recovery tokens detected - bypassing all auth clearing logic');
          setIsPasswordResetFlow(true);
          sessionStorage.setItem('password-reset-flow', 'true');
          
          // Store recovery session but don't authenticate user yet
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session) {
            handleAuthStateChange('PASSWORD_RECOVERY', session);
          } else {
            if (mounted) {
              setLoading(false);
              setAuthInitialized(true);
            }
          }
          return;
        }

        // Only clear auth for true public pages (not session-sensitive ones)
        if (shouldSkipAutoAuth) {
          console.log('🏠 On true public page - clearing auth and skipping session restoration');
          await supabase.auth.signOut({ scope: 'local' });
          cleanupAuthState();
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            setAuthInitialized(true);
          }
          return;
        }

        // Session-sensitive pages (like /reset-password) preserve existing sessions
        if (isSessionSensitivePage()) {
          console.log('🔐 On session-sensitive page - preserving existing session');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Error getting session on sensitive page:', error);
          }
          
          // Let the auth state handler process the session
          handleAuthStateChange('INITIAL_SESSION', session);
          return;
        }

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
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
      window.removeEventListener('replacestate', handleLocationChange);
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
        refreshProfile,
        isPasswordResetFlow
      }}
    >
      <div data-auth-provider="true">
        {children}
      </div>
    </AuthContext.Provider>
  );
};