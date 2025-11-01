import React from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesSyncIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  className?: string;
}

export const NotesSyncIndicator: React.FC<NotesSyncIndicatorProps> = ({ 
  status, 
  className 
}) => {
  if (status === 'idle') return null;

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs transition-all duration-200',
      className
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          <span className="text-blue-600">Syncing...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Synced</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-600">Sync failed</span>
        </>
      )}
    </div>
  );
};