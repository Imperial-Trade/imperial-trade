/**
 * ULTRA-SMART PRICE DEMO PAGE
 * Showcases the ultra-fast live price system with 24/7 crypto streaming
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UltraFastPriceDisplay } from '@/components/signals/UltraFastPriceDisplay';
import { UltraSmartConnectionDiagnostics } from '@/components/diagnostics/UltraSmartConnectionDiagnostics';
import { Zap, Activity, TrendingUp } from 'lucide-react';

export default function UltraSmartPriceDemo() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Ultra-Smart Price Demo</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience the ultra-fast live price system with intelligent market detection, 
          24/7 crypto streaming, and cost-optimized connections.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="default" className="gap-2">
            <Activity className="w-4 h-4" />
            Real-Time WebSocket
          </Badge>
          <Badge variant="secondary" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Ultra-Fast Updates
          </Badge>
        </div>
      </div>

      {/* Live Price Displays - BTCUSD & XAUUSD Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <UltraFastPriceDisplay 
          symbol="BTCUSD" 
          showDiagnostics={true}
          className="h-full"
        />
        <UltraFastPriceDisplay 
          symbol="XAUUSD" 
          showDiagnostics={true}
          className="h-full"
        />
      </div>

      {/* Connection Diagnostics */}
      <div className="flex justify-center">
        <UltraSmartConnectionDiagnostics />
      </div>

      {/* Features Overview */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Ultra-Smart Features
          </CardTitle>
          <CardDescription>
            Advanced features of the ultra-smart live price system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">🚀 Performance Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Sub-100ms price updates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Zero-latency message processing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Smart client-side caching
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Intelligent connection management
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">💰 Cost Optimization</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  24/7 crypto streaming
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Market-aware connection blocking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Symbol-specific streaming policies
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  70% cost reduction vs polling
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}