import React from "react";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";

export function TradingDashboard() {
  return (
    <div className="bg-background text-foreground p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Trading Dashboard</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-feature-green rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Portfolio value */}
      <div className="bg-card rounded-lg p-4 mb-4 border">
        <div className="text-sm text-muted-foreground mb-1">Portfolio Value</div>
        <div className="text-2xl font-bold text-foreground mb-1">$127,456.89</div>
        <div className="flex items-center text-feature-green text-sm">
          <TrendingUp className="w-3 h-3 mr-1" />
          +2.34% ($2,890.23)
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-lg p-3 border">
          <div className="text-xs text-muted-foreground">Today P&L</div>
          <div className="text-lg font-semibold text-feature-green">+$1,234</div>
        </div>
        <div className="bg-card rounded-lg p-3 border">
          <div className="text-xs text-muted-foreground">Win Rate</div>
          <div className="text-lg font-semibold text-foreground">87%</div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">EURUSD</span>
          <span className="text-sm text-feature-green">+0.45%</span>
        </div>
        <div className="h-24 bg-muted/30 rounded relative overflow-hidden">
          <div className="absolute inset-0 flex items-end justify-center">
            <div className="w-full h-full relative">
              {/* Simulated chart bars */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 bg-feature-blue/50 w-1"
                  style={{
                    left: `${i * 5}%`,
                    height: `${Math.random() * 80 + 20}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileTradingApp() {
  return (
    <div className="bg-background text-foreground p-3 h-full">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold">TradePro</h3>
        <div className="text-xs text-muted-foreground">Mobile Trading</div>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 mb-4">
        <div className="text-xs text-muted-foreground mb-1">Account Balance</div>
        <div className="text-xl font-bold">$45,678.90</div>
        <div className="flex items-center text-feature-green text-xs mt-1">
          <TrendingUp className="w-3 h-3 mr-1" />
          +1.2% today
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button className="bg-primary text-primary-foreground rounded-lg p-3 text-xs font-medium">
          Buy
        </button>
        <button className="bg-card border rounded-lg p-3 text-xs font-medium">
          Sell
        </button>
      </div>

      {/* Watchlist */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">Watchlist</div>
        {[
          { symbol: "EURUSD", price: "1.0856", change: "+0.34%" },
          { symbol: "GBPUSD", price: "1.2634", change: "-0.12%" },
          { symbol: "USDJPY", price: "149.45", change: "+0.89%" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-card rounded-lg p-2 border">
            <div>
              <div className="text-xs font-medium">{item.symbol}</div>
              <div className="text-xs text-muted-foreground">{item.price}</div>
            </div>
            <div className={`text-xs font-medium ${item.change.startsWith('+') ? 'text-feature-green' : 'text-destructive'}`}>
              {item.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsInterface() {
  return (
    <div className="bg-background text-foreground p-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">AI Analytics</h3>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-feature-green">92%</div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-feature-blue">156</div>
          <div className="text-xs text-muted-foreground">Signals</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-feature-orange">3.2</div>
          <div className="text-xs text-muted-foreground">Risk Score</div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-card rounded-lg p-3 border mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-feature-purple" />
          <span className="text-sm font-medium">AI Insight</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Market volatility is decreasing. Consider scaling into positions with reduced risk.
        </p>
      </div>

      {/* Performance chart */}
      <div className="bg-card rounded-lg p-3 border">
        <div className="text-sm font-medium mb-2">30-Day Performance</div>
        <div className="h-16 bg-muted/20 rounded relative">
          <div className="absolute inset-0 flex items-end">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-feature-green/60 mx-px rounded-t"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}