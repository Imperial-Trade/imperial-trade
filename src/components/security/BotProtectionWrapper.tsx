
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface BotProtectionWrapperProps {
  children: React.ReactNode;
  isProtected: boolean;
  confidence: number;
  reasons: string[];
  onBypass?: () => void;
}

export const BotProtectionWrapper: React.FC<BotProtectionWrapperProps> = ({
  children,
  isProtected,
  confidence,
  reasons,
  onBypass,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isProtected) {
    return (
      <div className="relative">
        {children}
        <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Security validation passed</span>
        </div>
      </div>
    );
  }

  const getProtectionLevel = () => {
    if (confidence >= 0.8) return { level: 'HIGH', color: 'destructive', icon: Shield };
    if (confidence >= 0.6) return { level: 'MEDIUM', color: 'warning', icon: AlertTriangle };
    return { level: 'LOW', color: 'default', icon: CheckCircle };
  };

  const protection = getProtectionLevel();
  const Icon = protection.icon;

  return (
    <div className="space-y-4">
      <Alert variant={protection.color as any}>
        <Icon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Security Check Failed</strong> - Suspicious activity detected
            <br />
            <span className="text-sm opacity-80">
              Protection Level: {protection.level} (Confidence: {Math.round(confidence * 100)}%)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </AlertDescription>
      </Alert>

      {showDetails && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <strong>Detected Issues:</strong>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              {onBypass && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    If you believe this is an error, you can request manual review:
                  </p>
                  <Button variant="outline" size="sm" onClick={onBypass}>
                    Request Manual Review
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
