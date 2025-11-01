import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  isHealthy: boolean;
  lastUpdateAge: number; // milliseconds
  stalestSymbol: string | null;
  needsExternalFeedCheck: boolean;
  recommendedAction: string;
  severity: 'normal' | 'warning' | 'critical';
}

export async function checkPriceIngestorHealth(): Promise<HealthCheckResult> {
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('symbol, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error || !data || data.length === 0) {
      return {
        isHealthy: false,
        lastUpdateAge: Infinity,
        stalestSymbol: null,
        needsExternalFeedCheck: true,
        recommendedAction: 'Database query failed or no price data available',
        severity: 'critical'
      };
    }
    
    const now = Date.now();
    const stalestData = data[data.length - 1];
    const stalestAge = now - new Date(stalestData.updated_at).getTime();
    
    // Determine health status based on data age
    let isHealthy = true;
    let severity: 'normal' | 'warning' | 'critical' = 'normal';
    let recommendedAction = 'All systems operational';
    let needsExternalFeedCheck = false;
    
    if (stalestAge > 300000) { // >5 minutes
      isHealthy = false;
      severity = 'critical';
      needsExternalFeedCheck = true;
      recommendedAction = 'CRITICAL: External price feed down >5 minutes. Check DigitalOcean service immediately.';
    } else if (stalestAge > 120000) { // >2 minutes
      isHealthy = false;
      severity = 'warning';
      needsExternalFeedCheck = true;
      recommendedAction = 'WARNING: Price feed degraded >2 minutes. Monitor DigitalOcean service.';
    } else if (stalestAge > 60000) { // >1 minute
      isHealthy = true;
      severity = 'warning';
      recommendedAction = 'Minor delay detected. System recovering.';
    }
    
    return {
      isHealthy,
      lastUpdateAge: stalestAge,
      stalestSymbol: stalestData.symbol,
      needsExternalFeedCheck,
      recommendedAction,
      severity
    };
  } catch (error) {
    console.error('❌ Price ingestor health check failed:', error);
    return {
      isHealthy: false,
      lastUpdateAge: Infinity,
      stalestSymbol: null,
      needsExternalFeedCheck: true,
      recommendedAction: 'Health check failed - unable to query database',
      severity: 'critical'
    };
  }
}
