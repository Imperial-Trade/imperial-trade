
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeSignal {
  id: string;
  assetName: string;
  tradeType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  notes?: string;
}

interface ShareRequest {
  signal: TradeSignal;
  platforms: ('discord' | 'slack' | 'telegram' | 'twitter')[];
  customMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, platforms, customMessage }: ShareRequest = await req.json();
    
    console.log('Share signal request:', { signal: signal.assetName, platforms });

    // Format the signal message
    const tpList = signal.takeProfits.map((tp, i) => `TP${i + 1}: ${tp}`).join(' | ');
    
    const message = customMessage || `
🚨 ${signal.tradeType.toUpperCase()} Signal: ${signal.assetName}
📍 Entry: ${signal.entryPrice}
🛑 Stop Loss: ${signal.stopLoss}
🎯 ${tpList}
${signal.notes ? `📝 Notes: ${signal.notes}` : ''}
    `.trim();

    const results = [];

    // Simulate sharing to each platform
    for (const platform of platforms) {
      try {
        console.log(`Sharing to ${platform}:`, message);
        
        // In a real implementation, you would integrate with actual APIs:
        // - Discord: Webhook API
        // - Slack: Webhook API or Bot API
        // - Telegram: Bot API
        // - Twitter: Twitter API v2
        
        // For now, we'll simulate successful sharing
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call delay
        
        results.push({
          platform,
          success: true,
          messageId: `${platform}_${Date.now()}`,
        });
        
      } catch (error) {
        console.error(`Failed to share to ${platform}:`, error);
        results.push({
          platform,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const overallSuccess = results.every(r => r.success);
    
    console.log('Share results:', results);

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        platforms: results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Share signal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to share signal',
        details: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
