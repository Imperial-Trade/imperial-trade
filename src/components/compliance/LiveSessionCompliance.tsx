import React, { useState } from 'react';
import { AlertTriangle, Shield, FileText, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface LiveSessionComplianceProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  sessionType?: 'live' | 'upcoming' | 'archived';
}

export const LiveSessionCompliance: React.FC<LiveSessionComplianceProps> = ({
  isOpen,
  onAccept,
  onDecline,
  sessionType = 'live'
}) => {
  const [educationalAcknowledged, setEducationalAcknowledged] = useState(false);
  const [riskUnderstood, setRiskUnderstood] = useState(false);
  const [disclaimerRead, setDisclaimerRead] = useState(false);

  const canProceed = educationalAcknowledged && riskUnderstood && disclaimerRead;

  const handleAccept = () => {
    if (canProceed) {
      onAccept();
      // Reset state for next time
      setEducationalAcknowledged(false);
      setRiskUnderstood(false);
      setDisclaimerRead(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onDecline}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Educational Trading Session - Risk Disclosure
          </DialogTitle>
          <DialogDescription>
            Please review and acknowledge the following important disclosures before accessing educational trading sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Educational Purpose Banner */}
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <BookOpen className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              <strong>Educational Platform Notice:</strong> All live sessions are conducted for educational purposes only. 
              This platform does not provide investment advice and is not a registered investment adviser.
            </AlertDescription>
          </Alert>

          {/* Risk Warning */}
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              <strong>High Risk Warning:</strong> Trading involves substantial risk of loss. Past performance 
              does not guarantee future results. Only risk capital you can afford to lose.
            </AlertDescription>
          </Alert>

          {/* Detailed Disclaimers */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-foreground mb-3">Important Disclosures:</h3>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <p>
                  <strong>Educational Content:</strong> All trading sessions, analysis, and commentary are provided 
                  for educational and informational purposes only. They do not constitute investment advice.
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <p>
                  <strong>No Investment Advice:</strong> We are not registered as securities brokers, dealers, 
                  or investment advisers. Consult with a qualified professional before making investment decisions.
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <p>
                  <strong>Performance Disclaimer:</strong> Any trading results discussed are hypothetical or 
                  historical and do not guarantee future performance. Individual results may vary significantly.
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <p>
                  <strong>Risk of Loss:</strong> Trading foreign exchange, CFDs, and derivatives carries a high 
                  level of risk and may result in the loss of all invested capital.
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <p>
                  <strong>CFTC Rule 4.41:</strong> Hypothetical or simulated performance results have certain 
                  limitations and do not represent actual trading.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgment Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="educational"
                checked={educationalAcknowledged}
                onCheckedChange={(checked) => setEducationalAcknowledged(checked === true)}
              />
              <label htmlFor="educational" className="text-sm leading-relaxed">
                I understand this is an <strong>educational platform</strong> and all content is for learning purposes only. 
                No investment advice is being provided.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="risk"
                checked={riskUnderstood}
                onCheckedChange={(checked) => setRiskUnderstood(checked === true)}
              />
              <label htmlFor="risk" className="text-sm leading-relaxed">
                I understand the <strong>substantial risks</strong> involved in trading and that I could lose all invested capital. 
                Past performance does not guarantee future results.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="disclaimer"
                checked={disclaimerRead}
                onCheckedChange={(checked) => setDisclaimerRead(checked === true)}
              />
              <label htmlFor="disclaimer" className="text-sm leading-relaxed">
                I have read and understood all disclaimers and acknowledge that this platform is not a registered investment adviser.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={onDecline}>
            <X className="mr-2 h-4 w-4" />
            I Do Not Agree
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={!canProceed}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Shield className="mr-2 h-4 w-4" />
            I Understand & Continue to Educational Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const LiveSessionEducationalBanner: React.FC = () => {
  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <div className="text-sm">
          <Badge variant="outline" className="mr-2 border-orange-300 text-orange-700 bg-orange-100">
            Educational Purpose
          </Badge>
          <span className="text-orange-700 dark:text-orange-400">
            All trading sessions are for educational purposes only. Not investment advice.
          </span>
        </div>
      </div>
    </div>
  );
};

export const SessionTypeEducationalLabel: React.FC<{ type: string }> = ({ type }) => {
  const getLabel = () => {
    switch (type) {
      case 'live':
        return 'Educational Live Session';
      case 'upcoming':
        return 'Educational Trading Session';
      case 'archived':
        return 'Educational Session Recording';
      default:
        return 'Educational Trading Session';
    }
  };

  return (
    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
      {getLabel()}
    </Badge>
  );
};