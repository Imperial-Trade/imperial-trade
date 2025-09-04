// Enhanced TraderMade Health Test Utility
export const testTradermadeHealth = async () => {
  const baseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';
  
  try {
    // Test basic health check
    const response = await fetch(baseUrl);
    const health = await response.json();
    
    return {
      success: true,
      status: response.status,
      version: health.version,
      isLeader: health.health?.leader?.is_leader,
      cacheControl: response.headers.get('Cache-Control'),
      alertingThresholds: health.health?.alerting_thresholds
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Leader Health Probe - calls /health?prefer_leader=true three times
export const runLeaderHealthProbe = async () => {
  const baseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';
  const results = [];
  
  console.log('🔍 Starting Leader Health Probe...');
  
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`📡 Probe ${i}/3 - calling /health?prefer_leader=true...`);
      
      const response = await fetch(`${baseUrl}?prefer_leader=true`);
      const health = await response.json();
      
      // Extract headers
      const headers = {
        'X-Health-Source': response.headers.get('X-Health-Source'),
        'X-Responder-Instance': response.headers.get('X-Responder-Instance')
      };
      
      // Extract key metrics
      const metrics = {
        upstreamConnected: health.health?.upstream_connected,
        ws_updates_total: health.health?.metrics?.ws_updates_total,
        always_on_realtime_subscribed: health.health?.always_on?.realtime_channel_subscribed,
        redis_publisher_connected: health.health?.redis?.publisher_connected,
        redis_subscriber_connected: health.health?.redis?.subscriber_connected,
        leader_is_leader: health.health?.leader?.is_leader,
        leader_instance_id: health.health?.leader?.leader_instance_id,
        responded_by_instance_id: health.health?.responded_by_instance_id,
        leader_snapshot: health.health?.leader_snapshot,
        // Symbol metrics
        xauusd_freshness: health.health?.metrics?.symbols?.XAUUSD?.cache_freshness_ms,
        xauusd_ticks_per_sec: health.health?.metrics?.symbols?.XAUUSD?.ticks_per_sec,
        btcusd_freshness: health.health?.metrics?.symbols?.BTCUSD?.cache_freshness_ms,
        btcusd_ticks_per_sec: health.health?.metrics?.symbols?.BTCUSD?.ticks_per_sec,
        // Broadcast metrics
        realtime_broadcasts_total: health.health?.metrics?.realtime_broadcasts_total,
        snapshot_age_ms: health.health?.snapshot_age_ms
      };
      
      const result = {
        probe: i,
        timestamp: new Date().toISOString(),
        status: response.status,
        headers,
        metrics
      };
      
      results.push(result);
      
      // Log key info
      console.log(`✅ Probe ${i}: upstreamConnected=${metrics.upstreamConnected}, ws_updates=${metrics.ws_updates_total}, broadcasts=${metrics.realtime_broadcasts_total}, XAUUSD_freshness=${metrics.xauusd_freshness}ms, snapshot_age=${metrics.snapshot_age_ms}ms`);
      
      // Wait 12 seconds between probes (except after the last one)
      if (i < 3) {
        console.log('⏳ Waiting 12 seconds...');
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
      
    } catch (error) {
      console.error(`❌ Probe ${i} failed:`, error);
      results.push({
        probe: i,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
  
  console.log('🏁 Leader Health Probe completed');
  return results;
};

export default testTradermadeHealth;