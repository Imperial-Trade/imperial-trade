# Auth Email Configuration Verification

## Supabase Auth Email Settings

### Current Configuration Check

1. **Navigate to Supabase Dashboard:**
   - URL: `https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/auth/templates`

2. **Email Templates to Verify:**

#### Confirm Signup Email
- **Status:** Should be **DISABLED** for account request flow
- **Reason:** Users don't sign up directly; they go through approval process
- **Verification:** Template should be inactive or redirect appropriately

#### Magic Link Email  
- **Status:** Should be **DISABLED** for account request flow
- **Reason:** Not using magic link authentication for this flow
- **Verification:** Template should be inactive

#### Change Email Address
- **Status:** Can remain **ENABLED** 
- **Reason:** Approved users may need to change emails later
- **Verification:** Template should work for existing users only

#### Reset Password
- **Status:** Can remain **ENABLED**
- **Reason:** Approved users may need password reset
- **Verification:** Template should work for existing users only

### Settings Verification Checklist

#### Auth Configuration (Dashboard → Auth → Settings)

```
✅/❌ Confirm Email: DISABLED
   - Path: Auth → Settings → User Management → Confirm Email
   - Should be: Disabled (users confirmed via approval process)

✅/❌ Email Confirmations: 
   - Path: Auth → Settings → User Management → Email Confirmations
   - Should be: Disabled for signup, enabled for email change

✅/❌ Double Confirm Email Changes: ENABLED (optional)
   - Path: Auth → Settings → User Management → Secure Email Change
   - Should be: Enabled for security

✅/❌ Enable Signup: DISABLED
   - Path: Auth → Settings → User Management → Enable Signup  
   - Should be: Disabled (only approved users can sign up)
```

#### Email Provider Settings

```
✅/❌ SMTP Settings Configured
   - Path: Auth → Settings → SMTP Settings
   - Verify: Custom SMTP or Supabase default
   - Note: Record which provider is active

✅/❌ From Email Address
   - Should match: Organization domain
   - Example: noreply@tradeimperial.com
   - Avoid conflicts with: Account request notification emails
```

### Testing Auth Email Flow

#### Test 1: Direct Signup Attempt (Should Fail)
```bash
curl -X POST 'https://kmuoqkcxguafxulqlbmi.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-direct-signup@example.com",
    "password": "testpassword123"
  }'

# Expected Response: Error or disabled signup message
```

#### Test 2: Password Reset for Existing User (Should Work)
```bash
curl -X POST 'https://kmuoqkcxguafxulqlbmi.supabase.co/auth/v1/recover' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing-user@example.com"
  }'

# Expected Response: Success (email sent if user exists)
```

### Configuration Script

```sql
-- Verify auth-related settings in database
SELECT 
  'Auth Configuration Check' as check_type,
  (SELECT raw_app_meta_data->>'email_confirmed' FROM auth.users LIMIT 1) as sample_email_confirmed,
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL) as unconfirmed_users,
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) as confirmed_users;

-- Check for any pending email confirmations
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  'Should be null for account request users' as note
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Email Template Customization

If emails need to be disabled but templates exist:

#### Option 1: Disable in Supabase Dashboard
1. Go to Auth → Templates  
2. Set each template to inactive
3. Save changes

#### Option 2: Custom Template with No-Op
```html
<!-- Confirm Signup Template (if must exist) -->
<html>
<body>
<p>Account access is managed through our approval process.</p>
<p>Please contact support if you have questions.</p>
</body>
</html>
```

### Verification Commands

```bash
# Check current auth settings via API
curl -X GET 'https://kmuoqkcxguafxulqlbmi.supabase.co/auth/v1/settings' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI"

# Response should show disabled signup
```

### Final Checklist

```
Environment: _______________

✅/❌ Direct signup disabled
✅/❌ Email confirmation disabled for signup  
✅/❌ Password reset enabled for existing users
✅/❌ No duplicate emails will be sent
✅/❌ Account request flow emails separate from auth emails
✅/❌ SMTP settings configured correctly
✅/❌ Email templates reviewed and appropriate
✅/❌ Test signup attempt fails as expected
✅/❌ Test password reset works for existing users

Verified by: ________________
Date: ______________________
Environment: ________________
```

### Troubleshooting

**Issue: Users receiving duplicate emails**
- Check if both auth emails AND custom account approval emails are enabled
- Verify email templates are properly disabled
- Check SMTP configuration for conflicts

**Issue: Approved users can't reset passwords**  
- Ensure password reset email template is enabled
- Verify users exist in auth.users table
- Check SMTP configuration

**Issue: Auth emails sent in wrong language/format**
- Review email templates in dashboard
- Check site URL configuration
- Verify custom SMTP settings