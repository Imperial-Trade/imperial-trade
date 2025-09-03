import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface FilterActionsProps {
  hasActiveFilters: boolean;
  canCreateSignals?: boolean;
  onClearAll: () => void;
  onCreateSignal?: () => void;
}

export function FilterActions({ hasActiveFilters, canCreateSignals, onClearAll, onCreateSignal }: FilterActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="h-10 px-4 text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200"
        >
          <X className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      )}
      
      {canCreateSignals && (
        <Button 
          type="button"
          onClick={onCreateSignal}
          className="h-10 px-4 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Pattern
        </Button>
      )}
    </div>
  );
}