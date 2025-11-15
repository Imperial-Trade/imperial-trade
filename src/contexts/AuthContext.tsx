import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authUtils';
import { capacitorNotificationService } from '@/services/CapacitorNotificationService';

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

  // Define which paths are truly public
  const publicPaths = ['/', '/signin', '/signup'];

  /**
   * Checks if the current URL contains password recovery tokens from Supabase.
   * Uses the enhanced TokenValidator for robust validation.
   */
  const hasRecoveryTokens = () => {
    try {
      // Basic check for recovery tokens without require
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      return hashParams.get('type') === 'recovery';
    } catch (error) {
      console.error('❌ Error checking recovery tokens:', error);
      return false;
    }
  };

  useEffect(() => {

    /**
     * Determines if the current page should be treated as a public page,
     * where any existing user session should be cleared.
     */
    const isTruePublicPage = () => {
      const currentPath = window.location.pathname;

      // CRITICAL: The reset-password page is NOT a public page if it contains
      // recovery tokens, as it requires a temporary authenticated session.
      if (currentPath === '/reset-password' && hasRecoveryTokens()) {
        console.log('🔐 Reset password page with tokens detected - preserving auth session.');
        return false;
      }
      
      // Otherwise, check if the path is in our defined list of public paths.
      const isPublic = publicPaths.includes(currentPath);
      console.log(`📄 Path "${currentPath}" is considered public: ${isPublic}`);
      return isPublic;
    };

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // If on a true public page, sign out any local session and stop.
        if (isTruePublicPage()) {
          console.log('🏠 On a true public page - clearing any local auth state.');
          // Use 'local' scope to only clear browser state without invalidating JWTs on the server.
          await supabase.auth.signOut({ scope: 'local' }); 
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        // For protected pages OR the reset-password page with tokens,
        // allow Supabase to establish a session.
        console.log('🔒 On a protected page or recovery page - attempting to establish session.');
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // ✅ AUTH READY INSTANTLY!

        // Fetch profile in BACKGROUND without blocking
        if (session?.user && !hasRecoveryTokens()) {
          fetchProfile(session.user.id).then(setProfile).catch(console.error);
        }

      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (e.g., login, logout, password recovery)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`🔄 Supabase auth event: ${_event}`);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update Capacitor notification service with current user
        if (session?.user) {
          capacitorNotificationService.setCurrentUser(session.user.id);
        } else {
          capacitorNotificationService.setCurrentUser(null);
        }
        
        // Only fetch profile for non-recovery sessions
        if (session?.user && !hasRecoveryTokens()) {
          fetchProfile(session.user.id).then(setProfile);
        } else if (!session?.user) {
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Set signing out flag to prevent auth handler interference
      setIsSigningOut(true);
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Clear Capacitor notification service user
      capacitorNotificationService.setCurrentUser(null);
      
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
      {!loading && children}
    </AuthContext.Provider>
  );
};