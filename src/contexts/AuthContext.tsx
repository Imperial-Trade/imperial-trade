
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
  push_subscription_active: boolean | null;
  onesignal_player_id: string | null;
  onesignal_subscription_status: string | null;
  onesignal_last_verified_at: string | null;
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
  const navigate = useNavigate();
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
          updated_at,
          push_subscription_active,
          onesignal_player_id,
          onesignal_subscription_status,
          onesignal_last_verified_at
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
            // Bind user to OneSignal and check subscription status after login
            bindToOneSignalAndCheck(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
          // OneSignal binding and upsert handled in bindToOneSignalAndCheck
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
            // Bind to OneSignal and check subscription status on initial load
            bindToOneSignalAndCheck(session.user.id);
          }, 0);
        }
    });

    return () => subscription.unsubscribe();
}, []);

  // Ensure OneSignal user/email subscription on auth/profile changes (deduplicated)
  useEffect(() => {
    try {
      const uid = user?.id;
      if (!uid) return;
      const email = user?.email || '';
      const role = profile?.role || '';
      const utype = profile?.user_type || '';
      const key = `os_upsert_v1:${uid}:${email}:${role}:${utype}`;
      const done = (() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } })();
      if (done) return;
      const body: { tags?: Record<string, string> } = {};
      const tags: Record<string, string> = {};
      if (role) tags.role = String(role);
      if (utype) tags.user_type = String(utype);
      if (Object.keys(tags).length) body.tags = tags;
      supabase.functions.invoke('onesignal-upsert-user', { body }).then(() => {
        try { localStorage.setItem(key, '1'); } catch {}
      }).catch(() => {});
    } catch {}
  }, [user?.id, user?.email, profile?.role, profile?.user_type]);

  const bindToOneSignalAndCheck = async (userId: string) => {
    try {
      // Check if we've already verified this session
      const sessionKey = `onesignal_verified_${userId}_${Date.now().toString().slice(0, -5)}`;
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      // Wait for OneSignal to be available
      let attempts = 0;
      while (attempts < 20 && (!window.OneSignal || !window.OneSignal.login)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (window.OneSignal?.login) {
        try {
          // Bind this browser to the OneSignal user
          console.log('[Auth] Binding browser to OneSignal user:', userId);
          await window.OneSignal.login(userId);
          console.log('[Auth] Successfully bound to OneSignal user');
        } catch (error) {
          console.warn('[Auth] OneSignal login failed:', error);
        }
      }

      // Verify current OneSignal subscription status (this is the source of truth)
      const { data: verificationResult } = await supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: userId }
      });

      if (verificationResult?.success) {
        const { subscription_status } = verificationResult;
        
        // Update database with OneSignal's current status
        await supabase
          .from('profiles')
          .update({
            onesignal_subscription_status: subscription_status.is_subscribed ? 'subscribed' : 'unsubscribed',
            push_subscription_active: subscription_status.is_subscribed,
            onesignal_last_verified_at: new Date().toISOString(),
            onesignal_player_id: subscription_status.player_id || null
          })
          .eq('id', userId);

        // Mark this session as verified
        sessionStorage.setItem(sessionKey, 'true');
        console.log('[Auth] OneSignal subscription verified:', subscription_status.is_subscribed);
        
        // Store verification result for use by notification setup
        sessionStorage.setItem(`onesignal_status_${userId}`, JSON.stringify(subscription_status));
      }
    } catch (error) {
      console.error('[Auth] Error binding to OneSignal and checking subscription:', error);
    }
  };


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
