import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export default function RiskCalculator() {
  const [tradeParams, setTradeParams] = useState({
    instrument: "",
    lots: "",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    account_balance: "",
    leverage: "100",
  });

  const [results, setResults] = useState({
    pip_value: 0,
    risk_amount: 0,
    profit_potential: 0,
    risk_reward_ratio: 0,
    pips_to_sl: 0,
    pips_to_tp: 0,
    actual_risk_percentage: 0,
    trade_direction: null,
    margin_required: 0,
  });

  const instruments = [
    { value: "EURUSD", label: "EUR/USD", pip_position: 4 },
    { value: "GBPUSD", label: "GBP/USD", pip_position: 4 },
    { value: "USDJPY", label: "USD/JPY", pip_position: 2 },
    { value: "USDCHF", label: "USD/CHF", pip_position: 4 },
    { value: "AUDUSD", label: "AUD/USD", pip_position: 4 },
    { value: "NZDUSD", label: "NZD/USD", pip_position: 4 },
    { value: "USDCAD", label: "USD/CAD", pip_position: 4 },
    { value: "EURJPY", label: "EUR/JPY", pip_position: 2 },
    { value: "GBPJPY", label: "GBP/JPY", pip_position: 2 },
    { value: "XAUUSD", label: "Gold/USD", pip_position: 2 },
    { value: "XAGUSD", label: "Silver/USD", pip_position: 3 },
  ];

  const leverageOptions = [
    { value: "1", label: "1:1" },
    { value: "10", label: "1:10" },
    { value: "20", label: "1:20" },
    { value: "30", label: "1:30" },
    { value: "50", label: "1:50" },
    { value: "100", label: "1:100" },
    { value: "200", label: "1:200" },
    { value: "400", label: "1:400" },
    { value: "500", label: "1:500" },
    { value: "1000", label: "1:1000" },
  ];

  useEffect(() => {
    calculateRisk();
  }, [tradeParams]);

  const calculateRisk = () => {
    const {
      instrument,
      lots,
      entry_price,
      stop_loss,
      take_profit,
      account_balance,
      leverage,
    } = tradeParams;

    if (
      !instrument ||
      !lots ||
      !entry_price ||
      !stop_loss ||
      !take_profit ||
      !account_balance ||
      !leverage
    ) {
      setResults((prev) => ({ ...prev, trade_direction: null }));
      return;
    }

    const selectedInstrument = instruments.find((i) => i.value === instrument);
    if (!selectedInstrument) return;

    const lotsNum = parseFloat(lots);
    const entryNum = parseFloat(entry_price);
    const slNum = parseFloat(stop_loss);
    const tpNum = parseFloat(take_profit);
    const balanceNum = parseFloat(account_balance);
    const leverageNum = parseFloat(leverage);

    // Determine trade direction based on entry vs stop loss
    let tradeDirection = null;
    if (entryNum > slNum) {
      tradeDirection = "BUY"; // Entry above stop loss = buy trade
    } else if (entryNum < slNum) {
      tradeDirection = "SELL"; // Entry below stop loss = sell trade
    }

    // Calculate pip difference
    const pipMultiplier = Math.pow(10, selectedInstrument.pip_position);
    const pipsToSL = Math.abs((entryNum - slNum) * pipMultiplier);
    const pipsToTP = Math.abs((tpNum - entryNum) * pipMultiplier);

    // Calculate contract size (standard lot = 100,000 units for forex)
    let contractSize;
    if (instrument.startsWith("XAU")) {
      contractSize = 100; // Gold standard lot
    } else if (instrument.startsWith("XAG")) {
      contractSize = 5000; // Silver standard lot
    } else {
      contractSize = 100000; // Forex standard lot
    }

    // Calculate position value
    const positionValue = lotsNum * contractSize * entryNum;

    // Calculate margin required (with leverage)
    const marginRequired = positionValue / leverageNum;

    // Calculate pip value based on instrument type and leverage
    let pipValue;
    if (instrument.includes("JPY")) {
      // For JPY pairs, pip is 0.01
      pipValue = (lotsNum * contractSize * 0.01) / entryNum;
    } else if (instrument.startsWith("XAU")) {
      // Gold: pip value is $1 per lot per pip (0.1 move)
      pipValue = lotsNum * 1;
    } else if (instrument.startsWith("XAG")) {
      // Silver: pip value is $0.50 per 0.001 move per ounce
      pipValue = lotsNum * 5;
    } else {
      // Major forex pairs: pip is 0.0001
      pipValue = lotsNum * contractSize * 0.0001;
    }

    // Calculate risk and profit amounts
    const riskAmount = pipsToSL * pipValue;
    const profitPotential = pipsToTP * pipValue;
    const riskRewardRatio = profitPotential / riskAmount;

    // Calculate actual risk percentage
    const actualRiskPercentage = (riskAmount / balanceNum) * 100;

    setResults({
      pip_value: pipValue,
      risk_amount: riskAmount,
      profit_potential: profitPotential,
      risk_reward_ratio: riskRewardRatio,
      pips_to_sl: pipsToSL,
      pips_to_tp: pipsToTP,
      actual_risk_percentage: actualRiskPercentage,
      trade_direction: tradeDirection,
      margin_required: marginRequired,
    });
  };

  const handleInputChange = (field, value) => {
    setTradeParams((prev) => ({ ...prev, [field]: value }));
  };

  const getRiskRewardColor = (ratio) => {
    if (ratio >= 2) return "text-accent-green";
    if (ratio >= 1.5) return "text-accent-gold";
    return "text-accent-red";
  };

  const getRiskPercentageColor = (percentage) => {
    if (percentage <= 1) return "text-accent-green";
    if (percentage <= 2) return "text-accent-gold";
    if (percentage <= 5) return "text-orange-400";
    return "text-accent-red";
  };

  const getRiskLabel = (percentage) => {
    if (percentage <= 1) return "Conservative";
    if (percentage <= 2) return "Moderate";
    if (percentage <= 5) return "Aggressive";
    return "Very High Risk";
  };

  const getMarginColor = (margin, balance) => {
    const marginPercentage = (margin / balance) * 100;
    if (marginPercentage <= 10) return "text-accent-green";
    if (marginPercentage <= 25) return "text-accent-gold";
    if (marginPercentage <= 50) return "text-orange-400";
    return "text-accent-red";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getTradeDirectionBadge = () => {
    if (!results.trade_direction) return null;

    return (
      <Badge
        className={`${
          results.trade_direction === "BUY"
            ? "bg-green-500/10 text-accent-green border-green-500/20"
            : "bg-red-500/10 text-accent-red border-red-500/20"
        } text-lg px-4 py-2 font-bold`}
      >
        {results.trade_direction === "BUY" ? (
          <>
            <ArrowUp className="w-5 h-5 mr-2" />
            BUY TRADE
          </>
        ) : (
          <>
            <ArrowDown className="w-5 h-5 mr-2" />
            SELL TRADE
          </>
        )}
      </Badge>
    );
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-green-400" />
          Risk Calculator
        </CardTitle>
        <p className="text-secondary">
          Calculate position size, risk amount, and potential profits for your
          trades
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Direction Indicator */}
        {results.trade_direction && (
          <div className="text-center">{getTradeDirectionBadge()}</div>
        )}

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Instrument
            </label>
            <Select
              value={tradeParams.instrument}
              onValueChange={(value) => handleInputChange("instrument", value)}
            >
              <SelectTrigger className="bg-surface border-default text-primary">
                <SelectValue placeholder="Select instrument" />
              </SelectTrigger>
              <SelectContent>
                {instruments.map((inst) => (
                  <SelectItem key={inst.value} value={inst.value}>
                    {inst.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Lot Size
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g., 1.0"
              value={tradeParams.lots}
              onChange={(e) => handleInputChange("lots", e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Leverage
            </label>
            <Select
              value={tradeParams.leverage}
              onValueChange={(value) => handleInputChange("leverage", value)}
            >
              <SelectTrigger className="bg-surface border-default text-primary">
                <SelectValue placeholder="Select leverage" />
              </SelectTrigger>
              <SelectContent>
                {leverageOptions.map((lev) => (
                  <SelectItem key={lev.value} value={lev.value}>
                    {lev.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Account Balance
            </label>
            <Input
              type="number"
              placeholder="e.g., 10000"
              value={tradeParams.account_balance}
              onChange={(e) =>
                handleInputChange("account_balance", e.target.value)
              }
              className="bg-surface border-default text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Entry Price
            </label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.12345"
              value={tradeParams.entry_price}
              onChange={(e) => handleInputChange("entry_price", e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Stop Loss
            </label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.12000"
              value={tradeParams.stop_loss}
              onChange={(e) => handleInputChange("stop_loss", e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-primary mb-2">
              Take Profit
            </label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g., 1.13000"
              value={tradeParams.take_profit}
              onChange={(e) => handleInputChange("take_profit", e.target.value)}
              className="bg-surface border-default text-primary"
            />
          </div>
        </div>

        {/* Results Section */}
        {results.risk_amount > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">
              Calculation Results
            </h3>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-accent-red mx-auto mb-2" />
                  <p className="text-sm text-secondary">Risk Amount</p>
                  <p className="text-xl font-bold text-accent-red">
                    {formatCurrency(results.risk_amount)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-accent-green mx-auto mb-2" />
                  <p className="text-sm text-secondary">Profit Potential</p>
                  <p className="text-xl font-bold text-accent-green">
                    {formatCurrency(results.profit_potential)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <AlertCircle
                    className={`w-8 h-8 mx-auto mb-2 ${getRiskRewardColor(
                      results.risk_reward_ratio
                    )}`}
                  />
                  <p className="text-sm text-secondary">Risk:Reward</p>
                  <p
                    className={`text-xl font-bold ${getRiskRewardColor(
                      results.risk_reward_ratio
                    )}`}
                  >
                    1:{results.risk_reward_ratio.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <AlertCircle
                    className={`w-8 h-8 mx-auto mb-2 ${getRiskPercentageColor(
                      results.actual_risk_percentage
                    )}`}
                  />
                  <p className="text-sm text-secondary">Account Risk</p>
                  <p
                    className={`text-xl font-bold ${getRiskPercentageColor(
                      results.actual_risk_percentage
                    )}`}
                  >
                    {results.actual_risk_percentage.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <DollarSign
                    className={`w-8 h-8 mx-auto mb-2 ${getMarginColor(
                      results.margin_required,
                      parseFloat(tradeParams.account_balance || "0")
                    )}`}
                  />
                  <p className="text-sm text-secondary">Margin Required</p>
                  <p
                    className={`text-xl font-bold ${getMarginColor(
                      results.margin_required,
                      parseFloat(tradeParams.account_balance || "0")
                    )}`}
                  >
                    {formatCurrency(results.margin_required)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-3">
                    Pip Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-secondary">Pips to Stop Loss:</span>
                      <span className="text-accent-red font-semibold">
                        {results.pips_to_sl.toFixed(1)} pips
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">
                        Pips to Take Profit:
                      </span>
                      <span className="text-accent-green font-semibold">
                        {results.pips_to_tp.toFixed(1)} pips
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Value per Pip:</span>
                      <span className="text-primary font-semibold">
                        {formatCurrency(results.pip_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Leverage Used:</span>
                      <span className="text-primary font-semibold">
                        1:{tradeParams.leverage}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-3">
                    Risk Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-secondary">Trade Direction:</span>
                      <span
                        className={`font-semibold ${
                          results.trade_direction === "BUY"
                            ? "text-accent-green"
                            : "text-accent-red"
                        }`}
                      >
                        {results.trade_direction || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Risk Percentage:</span>
                      <span
                        className={`font-semibold ${getRiskPercentageColor(
                          results.actual_risk_percentage
                        )}`}
                      >
                        {results.actual_risk_percentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Risk Level:</span>
                      <span
                        className={`font-semibold ${getRiskPercentageColor(
                          results.actual_risk_percentage
                        )}`}
                      >
                        {getRiskLabel(results.actual_risk_percentage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Margin Usage:</span>
                      <span
                        className={`font-semibold ${getMarginColor(
                          results.margin_required,
                          parseFloat(tradeParams.account_balance || "1")
                        )}`}
                      >
                        {(
                          (results.margin_required /
                            parseFloat(tradeParams.account_balance || "1")) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Assessment */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-3">
                  Risk Assessment
                </h4>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {results.trade_direction && (
                    <Badge
                      className={`${
                        results.trade_direction === "BUY"
                          ? "bg-green-500/10 text-accent-green border-green-500/20"
                          : "bg-red-500/10 text-accent-red border-red-500/20"
                      }`}
                    >
                      {results.trade_direction} Trade Detected
                    </Badge>
                  )}
                  {results.risk_reward_ratio >= 2 && (
                    <Badge className="bg-green-500/10 text-accent-green border-green-500/20">
                      Excellent Risk:Reward
                    </Badge>
                  )}
                  {results.risk_reward_ratio >= 1.5 &&
                    results.risk_reward_ratio < 2 && (
                      <Badge className="bg-yellow-500/10 text-accent-gold border-yellow-500/20">
                        Good Risk:Reward
                      </Badge>
                    )}
                  {results.risk_reward_ratio < 1.5 && (
                    <Badge className="bg-red-500/10 text-accent-red border-red-500/20">
                      Poor Risk:Reward
                    </Badge>
                  )}
                  {results.actual_risk_percentage <= 1 && (
                    <Badge className="bg-green-500/10 text-accent-green border-green-500/20">
                      Conservative Risk
                    </Badge>
                  )}
                  {results.actual_risk_percentage > 5 && (
                    <Badge className="bg-red-500/10 text-accent-red border-red-500/20">
                      High Risk Warning
                    </Badge>
                  )}
                  {(results.margin_required /
                    parseFloat(tradeParams.account_balance || "1")) *
                    100 >
                    50 && (
                    <Badge className="bg-red-500/10 text-accent-red border-red-500/20">
                      High Margin Usage
                    </Badge>
                  )}
                </div>
                <p className="text-secondary text-sm">
                  {results.actual_risk_percentage > 5
                    ? `⚠️ You're risking ${results.actual_risk_percentage.toFixed(
                        2
                      )}% of your account with ${
                        tradeParams.leverage
                      }:1 leverage. Consider reducing position size for better risk management.`
                    : results.actual_risk_percentage <= 1
                    ? `✅ Excellent risk management! You're only risking ${results.actual_risk_percentage.toFixed(
                        2
                      )}% of your account with ${
                        tradeParams.leverage
                      }:1 leverage.`
                    : `You're risking ${results.actual_risk_percentage.toFixed(
                        2
                      )}% of your account with ${
                        tradeParams.leverage
                      }:1 leverage. Margin required: ${formatCurrency(
                        results.margin_required
                      )}.`}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
