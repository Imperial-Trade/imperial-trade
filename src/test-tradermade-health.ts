// Enhanced TraderMade Health Test Utility
export const testTradermadeHealth = async () => {
  const baseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming';
  
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

export default testTradermadeHealth;