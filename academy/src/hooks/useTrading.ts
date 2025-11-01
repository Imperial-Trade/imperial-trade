
import { useOptimizedTrading } from './useOptimizedTrading';

// Legacy hook that redirects to the optimized version
export const useTrading = (userId: string) => {
  return useOptimizedTrading(userId);
};
