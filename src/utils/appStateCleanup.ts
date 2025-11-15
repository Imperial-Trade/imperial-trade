/**
 * Utility functions to clean up app state and localStorage issues
 */

export const cleanupAppState = () => {
  // ⚠️ IMPORTANT: Only remove specific corrupted entries, NOT notification storage!
  const keysToRemove = [
    'sb-kmuoqkcxguafxulqlbmi-auth-token',
    'imperial_auth_state',
    'imperial_session_data',
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage key: ${key}`, error);
    }
  });

  // Clear sessionStorage as well
  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }
  
  console.log('✅ App state cleanup complete (notifications preserved)');
};

export const verifyAuthState = () => {
  try {
    // Check if we have conflicting auth states
    const authToken = localStorage.getItem('sb-kmuoqkcxguafxulqlbmi-auth-token');
    
    if (authToken) {
      try {
        JSON.parse(authToken);
      } catch (error) {
        console.warn('Corrupted auth token detected, clearing...');
        localStorage.removeItem('sb-kmuoqkcxguafxulqlbmi-auth-token');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error verifying auth state:', error);
    return false;
  }
};

export const initializeAppState = () => {
  // ⚠️ PROTECTED KEYS that must NEVER be removed
  const PROTECTED_KEYS = [
    'imperial-trade-notifications', // Recent Activity notifications MUST persist
  ];
  
  // Run on app startup
  if (!verifyAuthState()) {
    cleanupAppState();
  }

  // Clean up any debug flags that might interfere
  const debugKeys = Object.keys(localStorage).filter(key => 
    !PROTECTED_KEYS.includes(key) && // Don't touch protected keys!
    (key.includes('debug') || key.includes('test') || key.includes('dev'))
  );

  debugKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove debug key: ${key}`, error);
    }
  });
  
  console.log('✅ App state initialized (notifications preserved)');
};