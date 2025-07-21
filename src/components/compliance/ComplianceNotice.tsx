import React from 'react';
import { AlertTriangle, Info, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ComplianceNoticeProps {
  type?: 'educational' | 'risk' | 'disclaimer' | 'hypothetical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({
  type = 'educational',
  size = 'md',
  className = ''
}) => {
  const getContent = () => {
    switch (type) {
      case 'educational':
        return {
          icon: <BookOpen className="w-4 h-4" />,
          title: "Educational Platform",
          description: "All content is for educational purposes only. Not financial advice.",
          variant: 'default' as const
        };
      case 'risk':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          title: "High Risk Warning",
          description: "Trading involves substantial risk of loss. Never trade with money you cannot afford to lose.",
          variant: 'destructive' as const
        };
      case 'disclaimer':
        return {
          icon: <Info className="w-4 h-4" />,
          title: "Regulatory Disclaimer",
          description: "This platform provides educational content only. We do not provide investment advice or broker services.",
          variant: 'default' as const
        };
      case 'hypothetical':
        return {
          icon: <Info className="w-4 h-4" />,
          title: "Hypothetical Performance",
          description: "Performance data shown is hypothetical and for educational purposes. Past performance does not guarantee future results.",
          variant: 'default' as const
        };
      default:
        return {
          icon: <BookOpen className="w-4 h-4" />,
          title: "Educational Platform",
          description: "All content is for educational purposes only.",
          variant: 'default' as const
        };
    }
  };

  const content = getContent();
  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4'
  };

  return (
    <Alert variant={content.variant} className={`${sizeClasses[size]} ${className}`}>
      <div className="flex items-start gap-2">
        {content.icon}
        <div className="flex-1">
          <div className="font-semibold mb-1">{content.title}</div>
          <AlertDescription className="text-xs opacity-90">
            {content.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

// Educational badge component
export const EducationalBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Badge variant="outline" className={`border-blue-500/30 text-blue-400 ${className}`}>
    <BookOpen className="w-3 h-3 mr-1" />
    Educational Only
  </Badge>
);

// Hypothetical performance badge
export const HypotheticalBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Badge variant="outline" className={`border-yellow-500/30 text-yellow-400 ${className}`}>
    <Info className="w-3 h-3 mr-1" />
    Hypothetical
  </Badge>
);