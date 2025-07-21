
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlayCircle, StopCircle, Calendar, Trash2, Edit, Clock } from 'lucide-react';
import { LiveSession } from '@/hooks/useLiveSessionManager';

interface SessionStatusControlsProps {
  session: LiveSession;
  onUpdateStatus: (sessionId: string, status: 'scheduled' | 'live' | 'completed') => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onEditSession: (session: LiveSession) => void;
  updating: string | null;
}

export function SessionStatusControls({ 
  session, 
  onUpdateStatus, 
  onDeleteSession, 
  onEditSession,
  updating 
}: SessionStatusControlsProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const isUpdating = updating === session.id;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSession(session.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const canGoLive = session.status === 'scheduled';
  const canComplete = session.status === 'live';
  const canReschedule = session.status === 'completed';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Go Live Button */}
      {canGoLive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={() => onUpdateStatus(session.id, 'live')}
              disabled={isUpdating}
              className="bg-accent-green hover:bg-accent-green/80 text-white"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              {isUpdating ? 'Going Live...' : 'Go Live'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Start the live session now
          </TooltipContent>
        </Tooltip>
      )}

      {/* End Session Button */}
      {canComplete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={() => onUpdateStatus(session.id, 'completed')}
              disabled={isUpdating}
              className="bg-accent-orange hover:bg-accent-orange/80 text-white"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              {isUpdating ? 'Ending...' : 'End Session'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Mark session as completed
          </TooltipContent>
        </Tooltip>
      )}

      {/* Reschedule Button */}
      {canReschedule && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={() => onUpdateStatus(session.id, 'scheduled')}
              disabled={isUpdating}
              variant="outline"
              className="border-default text-secondary hover:bg-surface"
            >
              <Calendar className="w-4 h-4 mr-1" />
              {isUpdating ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Reschedule this session
          </TooltipContent>
        </Tooltip>
      )}

      {/* Edit Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            onClick={() => onEditSession(session)}
            disabled={isUpdating}
            variant="outline"
            className="border-default text-secondary hover:bg-surface"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Edit session details
        </TooltipContent>
      </Tooltip>

      {/* Delete Button with Fixed Structure */}
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={isUpdating}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-surface border-default">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-primary">Delete Session</AlertDialogTitle>
                <AlertDialogDescription className="text-secondary">
                  Are you sure you want to delete "{session.session_title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-default text-secondary hover:bg-surface">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Session'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipTrigger>
        <TooltipContent>
          Delete session permanently
        </TooltipContent>
      </Tooltip>

      {/* Session Time Indicator */}
      <div className="flex items-center text-xs text-muted-foreground ml-2">
        <Clock className="w-3 h-3 mr-1" />
        {new Date(session.session_date).toLocaleString()}
      </div>
    </div>
  );
}
