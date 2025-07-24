import React, { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, BookOpen, TrendingUp, Info } from 'lucide-react';
import { getEventDescription, getDifficultyColor, getReactionIcon, type EventDescription } from '@/utils/economicEventHelpers';

interface EventExplanationProps {
  eventName: string;
  className?: string;
}

const EventExplanation = memo(({ eventName, className = "" }: EventExplanationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = getEventDescription(eventName);

  return (
    <div className={`border border-border/50 rounded-lg overflow-hidden ${className}`}>
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-muted/20 hover:bg-muted/30 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">What does this mean?</span>
          <Badge className={`${getDifficultyColor(description.difficulty)} text-xs px-2 py-1 border`}>
            {description.difficulty}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-card/50 space-y-4">
          {/* Title and Category */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">{description.title}</h4>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              {description.category}
            </Badge>
          </div>

          {/* Simple Explanation */}
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-400 mb-1">Simple Explanation</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description.explanation}
              </p>
            </div>
          </div>

          {/* Trading Impact */}
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-green-400">Impact on Trading</p>
                <span className="text-lg">{getReactionIcon(description.typicalReaction)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description.traderImpact}
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">💡 Quick Tips</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Compare "Actual" vs "Forecast" to gauge market surprise</li>
              <li>• Higher impact events typically cause more price movement</li>
              <li>• Watch for currency pairs involving this country's currency</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});

EventExplanation.displayName = 'EventExplanation';

export default EventExplanation;