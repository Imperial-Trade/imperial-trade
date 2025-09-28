import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { showDevTools } from '@/utils/featureFlags';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';

export interface PendingOperation {
  id: string;
  operation: 'creating' | 'updating' | 'deleting';
  timestamp: number;
  rollbackData?: TradeAlertWithProfile;
}

export interface SignalState {
  // Core signal data
  signalsMap: Record<string, TradeAlertWithProfile>;
  signalsArray: TradeAlertWithProfile[];
  
  // Connection state
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  error: string | null;
  nextRetryAt: number | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Optimistic updates tracking
  pendingOperations: Record<string, PendingOperation>;
  rollbackData: Record<string, TradeAlertWithProfile>;
}

export interface SignalActions {
  // State setters
  setSignals: (signals: TradeAlertWithProfile[]) => void;
  setSignalsMap: (signalsMap: Record<string, TradeAlertWithProfile>) => void;
  updateSignal: (signal: TradeAlertWithProfile) => void;
  removeSignal: (signalId: string) => void;
  
  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
  setNextRetryAt: (time: number | null) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  
  // Optimistic updates
  markPendingOperation: (id: string, operation: 'creating' | 'updating' | 'deleting', rollbackData?: TradeAlertWithProfile) => void;
  completePendingOperation: (id: string) => void;
  rollbackOperation: (id: string) => void;
  clearAllPendingOperations: () => void;
  
  // Advanced selectors
  getSignalById: (id: string) => TradeAlertWithProfile | undefined;
  getSignalsArray: () => TradeAlertWithProfile[];
  isPending: (id: string) => boolean;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
}

export type SignalStore = SignalState & SignalActions;

const initialState: SignalState = {
  signalsMap: {},
  signalsArray: [],
  connectionStatus: 'disconnected',
  lastUpdated: null,
  error: null,
  nextRetryAt: null,
  isLoading: false,
  isRefreshing: false,
  pendingOperations: {},
  rollbackData: {},
};

export const useSignalStore = create<SignalStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // State setters
      setSignals: (signals) => set((state) => {
        const signalsMap: Record<string, TradeAlertWithProfile> = {};
        signals.forEach(signal => {
          signalsMap[signal.id] = signal;
        });
        state.signalsMap = signalsMap;
        state.signalsArray = signals;
        state.lastUpdated = new Date();
      }),
      
      setSignalsMap: (signalsMap) => set((state) => {
        state.signalsMap = signalsMap;
        state.signalsArray = Object.values(signalsMap);
        state.lastUpdated = new Date();
      }),
      
      updateSignal: (signal) => set((state) => {
        state.signalsMap[signal.id] = signal;
        const index = state.signalsArray.findIndex(s => s.id === signal.id);
        if (index >= 0) {
          state.signalsArray[index] = signal;
        } else {
          state.signalsArray.push(signal);
        }
        state.lastUpdated = new Date();
      }),
      
      removeSignal: (signalId) => set((state) => {
        delete state.signalsMap[signalId];
        state.signalsArray = state.signalsArray.filter(s => s.id !== signalId);
        state.lastUpdated = new Date();
      }),
      
      // Connection management
      setConnectionStatus: (status) => set((state) => {
        state.connectionStatus = status;
      }),
      
      setError: (error) => set((state) => {
        state.error = error;
      }),
      
      setLastUpdated: (date) => set((state) => {
        state.lastUpdated = date;
      }),
      
      setNextRetryAt: (time) => set((state) => {
        state.nextRetryAt = time;
      }),
      
      // Loading states
      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),
      
      setRefreshing: (refreshing) => set((state) => {
        state.isRefreshing = refreshing;
      }),
      
      // Optimistic updates
      markPendingOperation: (id, operation, rollbackData) => set((state) => {
        state.pendingOperations[id] = {
          id,
          operation,
          timestamp: Date.now(),
          rollbackData
        };
        if (rollbackData) {
          state.rollbackData[id] = rollbackData;
        }
      }),
      
      completePendingOperation: (id) => set((state) => {
        delete state.pendingOperations[id];
        delete state.rollbackData[id];
      }),
      
      rollbackOperation: (id) => set((state) => {
        const rollbackData = state.rollbackData[id];
        if (rollbackData) {
          state.signalsMap[id] = rollbackData;
          const index = state.signalsArray.findIndex(s => s.id === id);
          if (index >= 0) {
            state.signalsArray[index] = rollbackData;
          }
        }
        delete state.pendingOperations[id];
        delete state.rollbackData[id];
      }),
      
      clearAllPendingOperations: () => set((state) => {
        state.pendingOperations = {};
        state.rollbackData = {};
      }),
      
      // Advanced selectors
      getSignalById: (id) => get().signalsMap[id],
      
      getSignalsArray: () => Object.values(get().signalsMap)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      
      isPending: (id) => Boolean(get().pendingOperations[id]),
      
      // Utility actions
      clearError: () => set((state) => {
        state.error = null;
      }),
      
      reset: () => set((state) => {
        Object.assign(state, initialState);
      }),
    })),
    {
      enabled: showDevTools,
      name: 'signal-store',
    }
  )
);

// Selectors for common use cases
export const selectSignalsArray = (state: SignalStore) => state.signalsArray;
export const selectSignalsMap = (state: SignalStore) => state.signalsMap;
export const selectConnectionStatus = (state: SignalStore) => state.connectionStatus;
export const selectIsLoading = (state: SignalStore) => state.isLoading;
export const selectError = (state: SignalStore) => state.error;
export const selectLastUpdated = (state: SignalStore) => state.lastUpdated;