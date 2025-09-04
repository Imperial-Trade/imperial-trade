-- Create notification_delivery_log table for tracking push notification delivery analytics
-- This table is referenced by edge functions for notification monitoring

CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    signal_id UUID,
    notification_type TEXT NOT NULL,
    delivery_channel TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'sent',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notification delivery logs" 
ON public.notification_delivery_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all notification delivery logs" 
ON public.notification_delivery_log 
FOR ALL 
USING (true);

CREATE POLICY "Admins can view all notification delivery logs" 
ON public.notification_delivery_log 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user_id ON public.notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_signal_id ON public.notification_delivery_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_sent_at ON public.notification_delivery_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON public.notification_delivery_log(status);