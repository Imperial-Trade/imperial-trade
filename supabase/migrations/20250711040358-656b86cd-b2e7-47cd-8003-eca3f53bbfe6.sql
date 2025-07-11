
-- Add 'educator' to the account_type enum if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'educator' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'account_type'
        )
    ) THEN
        ALTER TYPE public.account_type ADD VALUE 'educator';
    END IF;
END $$;

-- Verify the enum now contains all expected values
-- This will help us confirm the migration worked
SELECT unnest(enum_range(NULL::public.account_type)) AS account_type_values;
