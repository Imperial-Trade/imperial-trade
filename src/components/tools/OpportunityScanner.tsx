import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';

interface Opportunity {
  id: string;
  symbol: string;
  name: string;
  type: 'breakout' | 'reversal' | 'momentum';
  probability: number;
  direction: 'bullish' | 'bearish';
  timeFrame: string;
  keyLevel: number;
  currentPrice: number;
  change: number;
  volume: string;
}

const OpportunityScanner: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('4H');

  const mockOpportunities: Opportunity[] = [
    {
      id: '1',
      symbol: 'EURUSD',
      name: 'Euro / US Dollar',
      type: 'breakout',
      probability: 85,
      direction: 'bullish',
      timeFrame: '4H',
      keyLevel: 1.0850,
      currentPrice: 1.0845,
      change: 0.25,
      volume: 'High'
    },
    {
      id: '2',
      symbol: 'GBPJPY',
      name: 'British Pound / Japanese Yen',
      type: 'reversal',
      probability: 78,
      direction: 'bearish',
      timeFrame: '1H',
      keyLevel: 185.50,
      currentPrice: 185.75,
      change: -0.15,
      volume: 'Medium'
    },
    {
      id: '3',
      symbol: 'BTCUSD',
      name: 'Bitcoin / US Dollar',
      type: 'momentum',
      probability: 92,
      direction: 'bullish',
      timeFrame: '1D',
      keyLevel: 45000,
      currentPrice: 44850,
      change: 2.1,
      volume: 'Very High'
    },
    {
      id: '4',
      symbol: 'XAUUSD',
      name: 'Gold / US Dollar',
      type: 'breakout',
      probability: 73,
      direction: 'bullish',
      timeFrame: '4H',
      keyLevel: 2020,
      currentPrice: 2018,
      change: 0.8,
      volume: 'High'
    }
  ];

  const scanForOpportunities = () => {
    setIsScanning(true);
    setOpportunities([]);
    
    setTimeout(() => {
      setOpportunities(mockOpportunities);
      setIsScanning(false);
    }, 2000);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'breakout': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'reversal': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'momentum': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-500';
    if (probability >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Opportunity Scanner
        </h2>
        <p className="text-muted-foreground">
          Scan markets for high-probability trading opportunities using advanced algorithms.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              {['15M', '1H', '4H', '1D'].map((timeFrame) => (
                <Button
                  key={timeFrame}
                  variant={selectedTimeFrame === timeFrame ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeFrame(timeFrame)}
                >
                  {timeFrame}
                </Button>
              ))}
            </div>
            
            <Button
              onClick={scanForOpportunities}
              disabled={isScanning}
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scanning Markets...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan for Opportunities
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      {opportunities.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            Found {opportunities.length} High-Probability Opportunities
          </h3>
          
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold">{opportunity.symbol}</h4>
                      <Badge className={getTypeColor(opportunity.type)}>
                        {opportunity.type.toUpperCase()}
                      </Badge>
                      <Badge variant={opportunity.direction === 'bullish' ? 'default' : 'destructive'}>
                        {opportunity.direction === 'bullish' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {opportunity.direction.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{opportunity.name}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Price:</span>
                        <p className="font-medium">{opportunity.currentPrice}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Key Level:</span>
                        <p className="font-medium">{opportunity.keyLevel}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time Frame:</span>
                        <p className="font-medium">{opportunity.timeFrame}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volume:</span>
                        <p className="font-medium">{opportunity.volume}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Probability</p>
                      <p className={`text-2xl font-bold ${getProbabilityColor(opportunity.probability)}`}>
                        {opportunity.probability}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className={`text-sm font-medium ${opportunity.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {opportunity.change >= 0 ? '+' : ''}{opportunity.change}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isScanning && opportunities.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scan Results Yet</h3>
            <p className="text-muted-foreground">
              Click "Scan for Opportunities" to analyze current market conditions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notice */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">AI-Powered Analysis</p>
              <p className="text-blue-600 dark:text-blue-400">
                Opportunities are identified using advanced technical analysis, pattern recognition, and market sentiment data.
                Always perform your own analysis before making trading decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpportunityScanner;