/**
 * Auto Recovery Context
 * Manages silent Player ID recovery across the app
 */

import React, { createContext, useContext } from 'react';
import { useAutomaticPlayerIdRecovery } from '@/hooks/useAutomaticPlayerIdRecovery';

interface AutoRecoveryContextValue {
  recoveryStatus: 'idle' | 'running' | 'completed' | 'failed';
  recoveryAttempted: boolean;
}

const AutoRecoveryContext = createContext<AutoRecoveryContextValue | undefined>(undefined);

export const AutoRecoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { recoveryStatus, recoveryAttempted } = useAutomaticPlayerIdRecovery();

  const value = {
    recoveryStatus,
    recoveryAttempted
  };

  return (
    <AutoRecoveryContext.Provider value={value}>
      {children}
    </AutoRecoveryContext.Provider>
  );
};

export const useAutoRecovery = () => {
  const context = useContext(AutoRecoveryContext);
  if (context === undefined) {
    throw new Error('useAutoRecovery must be used within an AutoRecoveryProvider');
  }
  return context;
};