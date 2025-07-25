import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Calculator, Clock, Wrench } from 'lucide-react';
import { ComplianceNotice } from '@/components/compliance/ComplianceNotice';

export default function RiskCalculator() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Compliance Notice */}
        <ComplianceNotice type="educational" size="md" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-card/50 border-border/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                    <Calculator className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 p-2 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <Wrench className="w-4 h-4 text-orange-500" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Educational Risk Calculator
              </CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Advanced risk management tools for educational purposes
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-6">
              <div className="flex items-center justify-center gap-2 text-orange-500">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-semibold">Coming Soon</span>
              </div>
              
              <div className="space-y-4 text-muted-foreground">
                <p className="text-base">
                  We're developing advanced educational risk calculation tools to help you learn proper position sizing, 
                  risk-reward analysis, and money management principles.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-2">Upcoming Features:</h4>
                  <ul className="text-sm space-y-1 text-left max-w-md mx-auto">
                    <li>• Position size calculations for educational scenarios</li>
                    <li>• Risk-reward ratio analysis for learning</li>
                    <li>• Educational portfolio risk assessment</li>
                    <li>• Hypothetical drawdown calculations</li>
                    <li>• AI-powered risk management feedback</li>
                  </ul>
                </div>
                
                <p className="text-sm italic">
                  This tool will be designed purely for educational purposes and hypothetical learning scenarios.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}