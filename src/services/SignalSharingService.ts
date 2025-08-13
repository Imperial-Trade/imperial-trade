
import { supabase } from '@/integrations/supabase/client';

export interface TradeSignal {
  id: string;
  assetName: string;
  tradeType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  notes?: string;
}

export interface ShareRequest {
  signal: TradeSignal;
  platforms: ('discord' | 'slack' | 'telegram' | 'twitter')[];
  customMessage?: string;
}

export interface ShareResponse {
  success: boolean;
  platforms: {
    platform: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

class SignalSharingService {
  async shareSignal(request: ShareRequest): Promise<ShareResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('share-trade-signal', {
        body: request
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('SignalSharingService error:', error);
      throw new Error(`Failed to share signal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatSignalMessage(signal: TradeSignal, customMessage?: string): string {
    const tpList = signal.takeProfits.map((tp, i) => `TP${i + 1}: ${tp}`).join(' | ');
    
    return customMessage || `
🚨 ${signal.tradeType.toUpperCase()} Signal: ${signal.assetName}
📍 Entry: ${signal.entryPrice}
🛑 Stop Loss: ${signal.stopLoss}
🎯 ${tpList}
${signal.notes ? `📝 Notes: ${signal.notes}` : ''}
    `.trim();
  }
}

export const signalSharingService = new SignalSharingService();
