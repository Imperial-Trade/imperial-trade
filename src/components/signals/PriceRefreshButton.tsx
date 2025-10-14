import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface PriceRefreshButtonProps {
  symbols?: string[];
  className?: string;
}
export const PriceRefreshButton: React.FC<PriceRefreshButtonProps> = ({
  symbols = [],
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const {
    toast
  } = useToast();
  const handleForceRefresh = async () => {
    if (isRefreshing || symbols.length === 0) return;
    setIsRefreshing(true);
    try {
      console.log('🔄 Force refreshing prices for:', symbols);
      const {
        data,
        error
      } = await supabase.from('market_prices').select('symbol, mid, updated_at').in('symbol', symbols).order('updated_at', {
        ascending: false
      });
      if (error) throw error;
      setLastRefresh(new Date());
      toast({
        title: "Prices Refreshed",
        description: `Updated ${data?.length || 0} price${data?.length !== 1 ? 's' : ''}`
      });
      console.log(`✅ Refreshed ${data?.length || 0} prices`);
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not fetch latest prices",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForceRefresh}
      disabled={isRefreshing || symbols.length === 0}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
      {lastRefresh && <span className="ml-2 text-xs text-muted-foreground">{formatLastRefresh()}</span>}
    </Button>
  );
};