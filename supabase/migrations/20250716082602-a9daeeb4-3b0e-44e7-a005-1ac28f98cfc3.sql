
-- Add unique constraint on email field to enforce one request per email
ALTER TABLE public.account_requests ADD CONSTRAINT account_requests_email_unique UNIQUE (email);

-- Add new fields for tracking resubmissions
ALTER TABLE public.account_requests 
ADD COLUMN resubmission_count INTEGER DEFAULT 0,
ADD COLUMN original_rejection_reason TEXT,
ADD COLUMN last_resubmitted_at TIMESTAMP WITH TIME ZONE;

-- Create audit trail table for tracking all account request changes
CREATE TABLE public.account_request_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_request_id UUID NOT NULL REFERENCES public.account_requests(id) ON DELETE CASCADE,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.account_request_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table (admins can view all, users can view their own)
CREATE POLICY "Admins can view all audit logs" 
  ON public.account_request_audit 
  FOR SELECT 
  USING (true);

CREATE POLICY "System can create audit logs" 
  ON public.account_request_audit 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to automatically log changes to account requests
CREATE OR REPLACE FUNCTION log_account_request_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.account_request_audit (
      account_request_id,
      changed_by,
      change_type,
      new_values,
      notes
    ) VALUES (
      NEW.id,
      NEW.email,
      'created',
      to_jsonb(NEW),
      'Account request created'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if status changed or other significant fields changed
    IF OLD.status != NEW.status OR 
       OLD.full_name != NEW.full_name OR 
       OLD.phone_number != NEW.phone_number OR 
       OLD.vt_market_account_number != NEW.vt_market_account_number OR 
       OLD.reason != NEW.reason THEN
      
      INSERT INTO public.account_request_audit (
        account_request_id,
        changed_by,
        change_type,
        old_values,
        new_values,
        notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.approved_by, NEW.email),
        CASE 
          WHEN OLD.status = 'rejected' AND NEW.status = 'pending' THEN 'updated'
          WHEN NEW.status = 'approved' THEN 'approved'
          WHEN NEW.status = 'rejected' THEN 'rejected'
          ELSE 'updated'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        CASE 
          WHEN OLD.status = 'rejected' AND NEW.status = 'pending' THEN 'Request resubmitted after rejection'
          WHEN NEW.status = 'approved' THEN 'Request approved'
          WHEN NEW.status = 'rejected' THEN 'Request rejected'
          ELSE 'Request updated'
        END
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log changes
CREATE TRIGGER account_request_audit_trigger
  AFTER INSERT OR UPDATE ON public.account_requests
  FOR EACH ROW EXECUTE FUNCTION log_account_request_changes();

-- Update existing rejected requests to preserve their rejection reason
UPDATE public.account_requests 
SET original_rejection_reason = rejection_reason 
WHERE status = 'rejected' AND original_rejection_reason IS NULL;
