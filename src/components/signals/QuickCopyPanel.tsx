
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Alert {
  assetName: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
}

interface QuickCopyPanelProps {
  alert: Alert;
}

export default function QuickCopyPanel({ alert }: QuickCopyPanelProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  
  const copyToClipboard = async (text: string, itemName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const isBuy = alert.tradeType.includes('buy');
  const takeProfits = [
    { label: 'TP1', value: alert.tp1 },
    { label: 'TP2', value: alert.tp2 },
    { label: 'TP3', value: alert.tp3 },
    { label: 'TP4', value: alert.tp4 },
    { label: 'TP5', value: alert.tp5 }
  ].filter(tp => tp.value !== undefined) as { label: string; value: number }[];

  const CopyButton = ({ value, label, variant = "outline" }: { value: number; label: string; variant?: "outline" | "default" | "destructive" | "secondary" | "ghost" }) => (
    <Button
      variant={variant}
      size="sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyToClipboard(value.toString(), label); }}
      className="flex items-center gap-2 h-8 text-xs"
    >
      {copiedItem === label ? (
        <Check className="w-3 h-3 text-green-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {value.toFixed(2)}
      {copiedItem === label && <span className="text-green-400">Copied!</span>}
    </Button>
  );

  return (
    <Card data-prevent-widget-open="true" className="bg-gray-800/30 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Quick Copy Prices - {alert.assetName}
          <Badge className={`ml-2 ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {isBuy ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
            {alert.tradeType.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Entry Price</label>
            <CopyButton value={alert.entryPrice} label="Entry" variant="default" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Stop Loss</label>
            <CopyButton value={alert.stopLoss} label="SL" variant="destructive" />
          </div>
        </div>
        
        {takeProfits.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Take Profits</label>
            <div className="grid grid-cols-3 gap-2">
              {takeProfits.map((tp, index) => (
                <CopyButton key={index} value={tp.value} label={tp.label} variant="secondary" />
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation();
              copyToClipboard(
                `${alert.assetName} ${alert.tradeType.replace('_', ' ').toUpperCase()}\nEntry: ${alert.entryPrice}\nSL: ${alert.stopLoss}${takeProfits.map((tp, i) => `\n${tp.label}: ${tp.value}`).join('')}`,
                'All Prices'
              );
            }}
            className="w-full h-8 text-xs"
          >
            {copiedItem === 'All Prices' ? (
              <>
                <Check className="w-3 h-3 mr-2 text-green-400" />
                All Prices Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-2" />
                Copy Reference Parameters
              </>
            )}
          </Button>
          
          {/* Educational Disclaimer */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Educational reference only. Conduct your own analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
