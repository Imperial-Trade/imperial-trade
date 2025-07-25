import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, AlertTriangle, Target, BarChart3, Activity } from 'lucide-react';
import { ComplianceNotice, EducationalBadge } from '@/components/compliance/ComplianceNotice';

const RiskSimulator: React.FC = () => {
  return (
    <div className="space-y-6">
      <ComplianceNotice 
        type="educational" 
        className="mb-6"
      />
      
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
            <Calculator className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold">Educational Risk Calculator</h1>
            <EducationalBadge />
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            Coming Soon
          </Badge>
        </div>
        
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Advanced risk simulation and educational analysis tool for trading scenarios. 
          Calculate risk-reward ratios, probability assessments, and receive AI-powered recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-sm">Risk Assessment Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Comprehensive risk scoring and probability calculations for trading setups
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-sm">Probability Calculations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Statistical analysis and win probability estimates based on market conditions
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-sm">Educational Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              AI-powered suggestions and educational insights for risk management
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-sm">Market Condition Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Real-time market sentiment and volatility assessment for better decisions
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-sm">Position Sizing Guidance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Optimal position size calculations based on risk tolerance and account balance
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-sm">Real-time Risk Monitoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Live updates and alerts for risk management during active trades
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Development Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Our team is working on building a comprehensive educational risk simulation platform 
              that will provide advanced analytics and learning tools for trading education.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">In Development</Badge>
              <span className="text-xs text-muted-foreground">Expected Q2 2024</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskSimulator;