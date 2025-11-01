import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateLiveSessionData, validateCreateSession } from '@/lib/validations/liveSessionSchema';
import { Calendar, Clock, Video, Save, X, Info, Plus, Monitor, Radio } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CreateSessionDialogProps {
  onCreateSession: (sessionData: CreateLiveSessionData) => Promise<boolean>;
  creating: boolean;
}

export function CreateSessionDialog({ onCreateSession, creating }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [streamType, setStreamType] = useState<'zoom' | 'embed'>('zoom');
  const [formData, setFormData] = useState<CreateLiveSessionData>({
    session_title: '',
    description: '',
    host_name: '',
    zoom_meeting_url: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    session_date: '',
    auto_start_enabled: true,
    stream_embed_url: '',
    zoom_sdk_enabled: false,
    zoom_meeting_number: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const result = validateCreateSession(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors?.forEach((err) => {
        const field = err.path[0] as string;
        // Handle specific validation messages based on stream type
        if (field === 'zoom_meeting_url' && streamType === 'embed') {
          fieldErrors['stream_embed_url'] = err.message;
        } else if (field === 'zoom_meeting_id' && err.message.includes('required when using Zoom')) {
          fieldErrors['zoom_meeting_id'] = 'Meeting ID is required when using Zoom URL';
          fieldErrors['zoom_passcode'] = 'Passcode is required when using Zoom URL';
        } else {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await onCreateSession(formData);
    if (success) {
      setOpen(false);
      setStreamType('zoom');
      setFormData({
        session_title: '',
        description: '',
        host_name: '',
        zoom_meeting_url: '',
        zoom_meeting_id: '',
        zoom_passcode: '',
        session_date: '',
        auto_start_enabled: true,
        stream_embed_url: '',
        zoom_sdk_enabled: false,
        zoom_meeting_number: '',
      });
      setErrors({});
    }
  };

  const handleInputChange = (field: keyof CreateLiveSessionData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStreamTypeChange = (value: 'zoom' | 'embed') => {
    setStreamType(value);
    // Clear relevant fields when switching
    if (value === 'zoom') {
      setFormData(prev => ({ ...prev, stream_embed_url: '' }));
      if (errors.stream_embed_url) {
        setErrors(prev => ({ ...prev, stream_embed_url: '' }));
      }
    } else {
      setFormData(prev => ({ 
        ...prev, 
        zoom_meeting_url: '',
        zoom_meeting_id: '',
        zoom_passcode: '',
        zoom_meeting_number: '',
        zoom_sdk_enabled: false
      }));
      // Clear zoom-related errors
      ['zoom_meeting_url', 'zoom_meeting_id', 'zoom_passcode', 'zoom_meeting_number'].forEach(field => {
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent-blue hover:bg-accent-blue/80 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Live Session
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-default max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center">
            <Video className="w-5 h-5 mr-2" />
            Create New Live Trading Session
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Title */}
          <div>
            <Label htmlFor="session_title" className="text-primary">
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
              id="session_title"
              value={formData.session_title}
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
            <Label htmlFor="description" className="text-primary">
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
              id="description"
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
            <Label htmlFor="host_name" className="text-primary">
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
              id="host_name"
              value={formData.host_name}
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
            <Label htmlFor="session_date" className="text-primary">
              Session Date & Time
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  When the session will take place (must be at least 5 minutes in the future)
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="session_date"
                type="datetime-local"
                value={formatDateTimeLocal(formData.session_date)}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`bg-background border-default text-primary pl-10 ${errors.session_date ? 'border-red-500' : ''}`}
                min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              />
            </div>
            {errors.session_date && (
              <p className="text-red-400 text-sm mt-1">{errors.session_date}</p>
            )}
          </div>

          {/* Stream Type Selection */}
          <div>
            <Label className="text-primary mb-3 block">
              Stream Type
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  Choose between Zoom meeting or embedded stream
                </TooltipContent>
              </Tooltip>
            </Label>
            <RadioGroup 
              value={streamType} 
              onValueChange={handleStreamTypeChange}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zoom" id="zoom" />
                <Label htmlFor="zoom" className="text-primary cursor-pointer">
                  <Video className="w-4 h-4 inline mr-2" />
                  Zoom Meeting URL
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="embed" id="embed" />
                <Label htmlFor="embed" className="text-primary cursor-pointer">
                  <Monitor className="w-4 h-4 inline mr-2" />
                  Stream Embed URL
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Zoom Meeting Configuration */}
          {streamType === 'zoom' && (
            <div className="space-y-4">
              {/* Zoom Meeting URL */}
              <div>
                <Label htmlFor="zoom_meeting_url" className="text-primary">
                  Zoom Meeting URL *
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
                  id="zoom_meeting_url"
                  type="url"
                  value={formData.zoom_meeting_url}
                  onChange={(e) => handleInputChange('zoom_meeting_url', e.target.value)}
                  className={`bg-background border-default text-primary ${errors.zoom_meeting_url ? 'border-red-500' : ''}`}
                  placeholder="https://zoom.us/j/1234567890"
                  required
                />
                {errors.zoom_meeting_url && (
                  <p className="text-red-400 text-sm mt-1">{errors.zoom_meeting_url}</p>
                )}
              </div>

              {/* Required Zoom Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zoom_meeting_id" className="text-primary">
                    Meeting ID *
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
                    id="zoom_meeting_id"
                    value={formData.zoom_meeting_id || ''}
                    onChange={(e) => handleInputChange('zoom_meeting_id', e.target.value)}
                    className={`bg-background border-default text-primary ${errors.zoom_meeting_id ? 'border-red-500' : ''}`}
                    placeholder="123-456-7890"
                    required
                  />
                  {errors.zoom_meeting_id && (
                    <p className="text-red-400 text-sm mt-1">{errors.zoom_meeting_id}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zoom_passcode" className="text-primary">
                    Passcode *
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 ml-1 inline" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Meeting passcode for security
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="zoom_passcode"
                    value={formData.zoom_passcode || ''}
                    onChange={(e) => handleInputChange('zoom_passcode', e.target.value)}
                    className={`bg-background border-default text-primary ${errors.zoom_passcode ? 'border-red-500' : ''}`}
                    placeholder="passcode123"
                    required
                  />
                  {errors.zoom_passcode && (
                    <p className="text-red-400 text-sm mt-1">{errors.zoom_passcode}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stream Embed URL */}
          {streamType === 'embed' && (
            <div>
              <Label htmlFor="stream_embed_url" className="text-primary">
                Stream Embed URL *
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
                id="stream_embed_url"
                type="url"
                value={formData.stream_embed_url || ''}
                onChange={(e) => handleInputChange('stream_embed_url', e.target.value)}
                className={`bg-background border-default text-primary ${errors.stream_embed_url ? 'border-red-500' : ''}`}
                placeholder="e.g., https://www.youtube.com/watch?v=..."
                required
              />
              {errors.stream_embed_url && (
                <p className="text-red-400 text-sm mt-1">{errors.stream_embed_url}</p>
              )}
            </div>
          )}

          <Separator />
          
          {/* Zoom SDK Integration - Only show for Zoom meetings */}
          {streamType === 'zoom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="zoom_sdk_enabled" className="text-primary flex items-center">
                    <Monitor className="w-4 h-4 mr-2" />
                    Enable Zoom SDK Integration
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 ml-1 inline" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Use Zoom Web SDK for integrated meeting experience (requires meeting number)
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Provide seamless meeting experience within the app
                  </p>
                </div>
                <Switch
                  id="zoom_sdk_enabled"
                  checked={formData.zoom_sdk_enabled}
                  onCheckedChange={(checked) => handleInputChange('zoom_sdk_enabled', checked)}
                />
              </div>

              {formData.zoom_sdk_enabled && (
                <div>
                  <Label htmlFor="zoom_meeting_number" className="text-primary">
                    Zoom Meeting Number
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 ml-1 inline" />
                      </TooltipTrigger>
                      <TooltipContent>
                        The numerical meeting number for SDK integration
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="zoom_meeting_number"
                    value={formData.zoom_meeting_number || ''}
                    onChange={(e) => handleInputChange('zoom_meeting_number', e.target.value)}
                    className={`bg-background border-default text-primary ${errors.zoom_meeting_number ? 'border-red-500' : ''}`}
                    placeholder="1234567890"
                  />
                  {errors.zoom_meeting_number && (
                    <p className="text-red-400 text-sm mt-1">{errors.zoom_meeting_number}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auto Start Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto_start_enabled" className="text-primary">
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
              id="auto_start_enabled"
              checked={formData.auto_start_enabled}
              onCheckedChange={(checked) => handleInputChange('auto_start_enabled', checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="border-default text-secondary hover:bg-surface"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating} 
              className="bg-accent-green hover:bg-accent-green/80 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}