import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { RiskSimulation } from '@/api/entities';

export default function RiskSimulator() {
  const [tradeParams, setTradeParams] = useState({
    instrument: '',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    position_size: ''
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setTradeParams(prev => ({ ...prev, [field]: value }));
  };

  const simulateRisk = async () => {
    // Validate inputs
    if (!tradeParams.instrument || !tradeParams.entry_price || !tradeParams.stop_loss || !tradeParams.take_profit || !tradeParams.position_size) {
      setError('Please fill in all fields');
      return;
    }

    setIsSimulating(true);
    setError('');

    try {
      const simulationPrompt = `
        You are an expert risk analyst. Analyze the following trade setup and provide a detailed risk assessment:

        Instrument: ${tradeParams.instrument}
        Entry Price: ${tradeParams.entry_price}
        Stop Loss: ${tradeParams.stop_loss}
        Take Profit: ${tradeParams.take_profit}
        Position Size: ${tradeParams.position_size}

        Analyze:
        1. Risk-to-reward ratio
        2. Probability of reaching stop loss vs take profit
        3. Historical volatility impact
        4. Market condition assessment
        5. Position sizing appropriateness
        6. Overall risk assessment and recommendations

        Provide specific percentages and actionable insights.
      `;

      const result = await InvokeLLM({
        prompt: simulationPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            risk_reward_ratio: { type: "number" },
            stop_loss_probability: { type: "number" },
            take_profit_probability: { type: "number" },
            volatility_assessment: { type: "string" },
            position_sizing_feedback: { type: "string" },
            overall_risk_score: { type: "number" },
            recommendations: { type: "array", items: { type: "string" } },
            market_conditions: { type: "string" }
          }
        }
      });

      // Save simulation to database
      await RiskSimulation.create({
        ...tradeParams,
        entry_price: parseFloat(tradeParams.entry_price),
        stop_loss: parseFloat(tradeParams.stop_loss),
        take_profit: parseFloat(tradeParams.take_profit),
        position_size: parseFloat(tradeParams.position_size),
        probability_analysis: JSON.stringify(result),
        risk_reward_ratio: result.risk_reward_ratio
      });

      setSimulationResult(result);
    } catch (error) {
      setError('Simulation failed. Please check your inputs and try again.');
    }

    setIsSimulating(false);
  };

  const getRiskColor = (score) => {
    if (score <= 3) return 'text-accent-green';
    if (score <= 6) return 'text-accent-gold';
    return 'text-accent-red';
  };

  const getRiskLabel = (score) => {
    if (score <= 3) return 'Low Risk';
    if (score <= 6) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-orange-400" />
          AI Risk Simulator
        </CardTitle>
        <p className="text-secondary">
          Simulate your trade setup and get AI-powered risk analysis before entering the market
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Parameters Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Instrument</label>
            <Input
              placeholder="e.g., EUR/USD, GOLD, AAPL"
              value={tradeParams.instrument}
              onChange={(e) => handleInputChange('instrument', e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Position Size</label>
            <Input
              type="number"
              placeholder="e.g., 1000"
              value={tradeParams.position_size}
              onChange={(e) => handleInputChange('position_size', e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Entry Price</label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.1500"
              value={tradeParams.entry_price}
              onChange={(e) => handleInputChange('entry_price', e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Stop Loss</label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.1450"
              value={tradeParams.stop_loss}
              onChange={(e) => handleInputChange('stop_loss', e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">Take Profit</label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.1600"
              value={tradeParams.take_profit}
              onChange={(e) => handleInputChange('take_profit', e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
        </div>

        <Button
          onClick={simulateRisk}
          disabled={isSimulating}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isSimulating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Running Risk Simulation...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5 mr-2" />
              Simulate Risk
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-accent-red rounded-lg">
            {error}
          </div>
        )}

        {/* Simulation Results */}
        {simulationResult && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Risk Analysis Results</h3>
            
            {/* Risk Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 text-accent-blue mx-auto mb-2" />
                  <p className="text-sm text-secondary">Risk:Reward Ratio</p>
                  <p className="text-2xl font-bold text-primary">1:{simulationResult.risk_reward_ratio?.toFixed(2)}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <TrendingDown className="w-8 h-8 text-accent-red mx-auto mb-2" />
                  <p className="text-sm text-secondary">Stop Loss Probability</p>
                  <p className="text-2xl font-bold text-accent-red">{simulationResult.stop_loss_probability}%</p>
                </CardContent>
              </Card>
              
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${getRiskColor(simulationResult.overall_risk_score)}`} />
                  <p className="text-sm text-secondary">Overall Risk</p>
                  <p className={`text-2xl font-bold ${getRiskColor(simulationResult.overall_risk_score)}`}>
                    {getRiskLabel(simulationResult.overall_risk_score)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Market Conditions</h4>
                <p className="text-secondary">{simulationResult.market_conditions}</p>
              </CardContent>
            </Card>

            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Position Sizing Feedback</h4>
                <p className="text-secondary">{simulationResult.position_sizing_feedback}</p>
              </CardContent>
            </Card>

            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {simulationResult.recommendations?.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent-gold mt-1 flex-shrink-0" />
                      <span className="text-secondary">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}