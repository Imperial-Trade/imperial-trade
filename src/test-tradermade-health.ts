import { supabase } from '@/integrations/supabase/client';

export async function testTradermadeHealth() {
  try {
    console.log('🔍 Testing tradermade-streaming health...');
    
    // Test health endpoint
    const healthResponse = await fetch('https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI`,
      }
    });
    
    if (!healthResponse.ok) {
      console.error('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
      return;
    }
    
    const healthData = await healthResponse.json();
    console.log('📊 Health Status:', healthData);
    
    // Test price fetch
    const priceResponse = await supabase.functions.invoke('tradermade-streaming', {
      body: { symbols: ['XAUUSD'], forceFetch: true }
    });
    
    console.log('💰 Price Response:', priceResponse);
    
    return { health: healthData, prices: priceResponse.data };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

// Auto-run test
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testTradermadeHealth().then(result => {
      console.log('🎯 Test Complete:', result);
    });
  }, 1000);
}