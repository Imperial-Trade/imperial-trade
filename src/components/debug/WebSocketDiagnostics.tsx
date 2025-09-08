import React, { useMemo, useState } from 'react';
import { useHybridWebSocketPrices } from '@/contexts/HybridWebSocketPriceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface WebSocketDiagnosticsProps {
  symbols?: string[];
}

const WS_FUN_BASE = 'https://kmuoqkcxguafxulqlbmi.fun/price-ingestor';
const WS_FUNCTIONS_BASE = 'https://kmuoqkcxguafxulqlbmi.functions.supabase.co/price-ingestor';

export default function WebSocketDiagnostics({ symbols = [] }: WebSocketDiagnosticsProps) {
  const { connectionStatus, dataSource, prices } = useHybridWebSocketPrices();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribedCount = useMemo(() => symbols.length, [symbols]);
  const priceKeys = useMemo(() => Object.keys(prices || {}), [prices]);

  const runReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const fetchJson = async (url: string) => {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    };

    try {
      // Try .fun first, then fallback to .functions.supabase.co
      const [health, performance, report] = await Promise.all([
        fetchJson(`${WS_FUN_BASE}/health`).catch(() => fetchJson(`${WS_FUNCTIONS_BASE}/health`)),
        fetchJson(`${WS_FUN_BASE}/performance`).catch(() => fetchJson(`${WS_FUNCTIONS_BASE}/performance`)),
        fetchJson(`${WS_FUN_BASE}/report`).catch(() => fetchJson(`${WS_FUNCTIONS_BASE}/report`))
      ]);

      setReport({ health, performance, report });
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 md:p-4 bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            WS: {connectionStatus}
          </Badge>
          <Badge variant="secondary">Source: {dataSource}</Badge>
          <Badge variant="outline">Subs: {subscribedCount}</Badge>
          <Badge variant="outline">Prices: {priceKeys.length}</Badge>
        </div>
        <Button size="sm" onClick={runReport} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</> : 'Run Live Price Report'}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-destructive">{error}</div>
      )}

      {report && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3 bg-muted/30">
            <div className="text-sm font-medium mb-2">Health</div>
            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(report.health, null, 2)}</pre>
          </Card>
          <Card className="p-3 bg-muted/30">
            <div className="text-sm font-medium mb-2">Performance</div>
            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(report.performance, null, 2)}</pre>
          </Card>
          <Card className="p-3 bg-muted/30 md:col-span-1">
            <div className="text-sm font-medium mb-2">Report</div>
            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify({
              allowedSymbols: report.report?.allowedSymbols,
              clients: report.report?.clients,
              cachedPrices: report.report?.cachedPrices
            }, null, 2)}</pre>
          </Card>
        </div>
      )}
    </Card>
  );
}
