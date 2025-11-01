import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UpdateLiveSessionData, validateUpdateSession } from '@/lib/validations/liveSessionSchema';
import { LiveSession } from '@/hooks/useLiveSessionManager';
import { Calendar, Save, X, Info } from 'lucide-react';

interface EditSessionDialogProps {
  session: LiveSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSession: (sessionId: string, sessionData: UpdateLiveSessionData) => Promise<boolean>;
  updating: string | null;
}

export function EditSessionDialog({ 
  session, 
  open, 
  onOpenChange, 
  onUpdateSession, 
  updating 
}: EditSessionDialogProps) {
  const [formData, setFormData] = useState<UpdateLiveSessionData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when session changes
  useEffect(() => {
    if (session) {
      setFormData({
        session_title: session.session_title,
        description: session.description || '',
        host_name: session.host_name,
        zoom_meeting_url: session.zoom_meeting_url,
        zoom_meeting_id: session.zoom_meeting_id || '',
        zoom_passcode: session.zoom_passcode || '',
        session_date: session.session_date,
        auto_start_enabled: session.auto_start_enabled,
        stream_embed_url: session.stream_embed_url || '',
      });
    }
    setErrors({});
  }, [session]);

  const validateForm = () => {
    const result = validateUpdateSession(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors?.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session || !validateForm()) {
      return;
    }

    const success = await onUpdateSession(session.id, formData);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: keyof UpdateLiveSessionData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Format datetime-local input value
  const formatDateTimeLocal = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const handleDateChange = (value: string) => {
    if (value) {
      const date = new Date(value);
      setFormData(prev => ({ ...prev, session_date: date.toISOString() }));
    } else {
      setFormData(prev => ({ ...prev, session_date: '' }));
    }
    if (errors.session_date) {
      setErrors(prev => ({ ...prev, session_date: '' }));
    }
  };

  if (!session) return null;

  const isUpdating = updating === session.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-default max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            Edit Live Trading Session
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Title */}
          <div>
            <Label htmlFor="edit_session_title" className="text-primary">
              Session Title
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  Enter a descriptive title for your trading session
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="edit_session_title"
              value={formData.session_title || ''}
              onChange={(e) => handleInputChange('session_title', e.target.value)}
              className={`bg-background border-default text-primary ${errors.session_title ? 'border-red-500' : ''}`}
              placeholder="e.g., Morning Market Analysis"
            />
            {errors.session_title && (
              <p className="text-red-400 text-sm mt-1">{errors.session_title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit_description" className="text-primary">
              Description (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  Provide additional details about the session content
                </TooltipContent>
              </Tooltip>
            </Label>
            <Textarea
              id="edit_description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`bg-background border-default text-primary ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Describe what will be covered in this session..."
              rows={3}
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Host Name */}
          <div>
            <Label htmlFor="edit_host_name" className="text-primary">
              Host Name
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  Your name as it will appear to session participants
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="edit_host_name"
              value={formData.host_name || ''}
              onChange={(e) => handleInputChange('host_name', e.target.value)}
              className={`bg-background border-default text-primary ${errors.host_name ? 'border-red-500' : ''}`}
              placeholder="Your display name"
            />
            {errors.host_name && (
              <p className="text-red-400 text-sm mt-1">{errors.host_name}</p>
            )}
          </div>

          {/* Session Date */}
          <div>
            <Label htmlFor="edit_session_date" className="text-primary">
              Session Date & Time
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  When the session will take place
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="edit_session_date"
                type="datetime-local"
                value={formatDateTimeLocal(formData.session_date || '')}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`bg-background border-default text-primary pl-10 ${errors.session_date ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.session_date && (
              <p className="text-red-400 text-sm mt-1">{errors.session_date}</p>
            )}
          </div>

          {/* Zoom Meeting URL */}
          <div>
            <Label htmlFor="edit_zoom_meeting_url" className="text-primary">
              Zoom Meeting URL
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  The full Zoom meeting link (must be a valid zoom.us or zoom.com URL)
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="edit_zoom_meeting_url"
              type="url"
              value={formData.zoom_meeting_url || ''}
              onChange={(e) => handleInputChange('zoom_meeting_url', e.target.value)}
              className={`bg-background border-default text-primary ${errors.zoom_meeting_url ? 'border-red-500' : ''}`}
              placeholder="https://zoom.us/j/1234567890"
            />
            {errors.zoom_meeting_url && (
              <p className="text-red-400 text-sm mt-1">{errors.zoom_meeting_url}</p>
            )}
          </div>

          {/* Optional Zoom Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_zoom_meeting_id" className="text-primary">
                Meeting ID (Optional)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 ml-1 inline" />
                  </TooltipTrigger>
                  <TooltipContent>
                    The numerical meeting ID for easier access
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="edit_zoom_meeting_id"
                value={formData.zoom_meeting_id || ''}
                onChange={(e) => handleInputChange('zoom_meeting_id', e.target.value)}
                className={`bg-background border-default text-primary ${errors.zoom_meeting_id ? 'border-red-500' : ''}`}
                placeholder="123-456-7890"
              />
              {errors.zoom_meeting_id && (
                <p className="text-red-400 text-sm mt-1">{errors.zoom_meeting_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_zoom_passcode" className="text-primary">
                Passcode (Optional)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 ml-1 inline" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Meeting passcode if required
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="edit_zoom_passcode"
                value={formData.zoom_passcode || ''}
                onChange={(e) => handleInputChange('zoom_passcode', e.target.value)}
                className={`bg-background border-default text-primary ${errors.zoom_passcode ? 'border-red-500' : ''}`}
                placeholder="passcode123"
              />
              {errors.zoom_passcode && (
                <p className="text-red-400 text-sm mt-1">{errors.zoom_passcode}</p>
              )}
            </div>
          </div>

          {/* Stream Embed URL */}
          <div>
            <Label htmlFor="edit_stream_embed_url" className="text-primary">
              Stream Embed URL (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  Add a YouTube Live, Facebook Live, or Twitch stream URL for in-app viewing
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="edit_stream_embed_url"
              type="url"
              value={formData.stream_embed_url || ''}
              onChange={(e) => handleInputChange('stream_embed_url', e.target.value)}
              className={`bg-background border-default text-primary ${errors.stream_embed_url ? 'border-red-500' : ''}`}
              placeholder="e.g., https://www.youtube.com/watch?v=..."
            />
            {errors.stream_embed_url && (
              <p className="text-red-400 text-sm mt-1">{errors.stream_embed_url}</p>
            )}
          </div>

          {/* Auto Start Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="edit_auto_start_enabled" className="text-primary">
                Auto-start enabled
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 ml-1 inline" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Automatically change status to "live" at the scheduled time
                  </TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-sm text-muted-foreground">
                Session will automatically go live at the scheduled time
              </p>
            </div>
            <Switch
              id="edit_auto_start_enabled"
              checked={formData.auto_start_enabled || false}
              onCheckedChange={(checked) => handleInputChange('auto_start_enabled', checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="border-default text-secondary hover:bg-surface"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating} 
              className="bg-accent-blue hover:bg-accent-blue/80 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? 'Updating...' : 'Update Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}