# 📦 Dependencies - Complete List

## Required npm Packages

Install these exact versions to ensure 100% compatibility:

```bash
npm install \
  framer-motion@^12.23.0 \
  lucide-react@^0.462.0 \
  @tanstack/react-query@^5.56.2 \
  @supabase/supabase-js@^2.50.3 \
  react-router-dom@^6.26.2 \
  date-fns@^3.6.0 \
  date-fns-tz@^3.2.0
```

---

## Core Dependencies

### **Framer Motion** (`framer-motion@^12.23.0`)
**Purpose:** Animations for sidebar, widget cards, and provider cards
**Used in:**
- `WidgetSidebar.tsx` - Sidebar slide-in, widget card hover effects
- All widget tool cards - Scale, rotation, and float animations

### **Lucide React** (`lucide-react@^0.462.0`)
**Purpose:** Icon library for all UI icons
**Used in:**
- Trading tool icons (BookOpen, Calendar, Calculator, etc.)
- UI icons (X, ChevronRight, User, Shield, LogOut, Trophy, Clock, etc.)

### **TanStack React Query** (`@tanstack/react-query@^5.56.2`)
**Purpose:** Data fetching, caching, and real-time updates
**Used in:**
- `useTopSignalProviders.ts` - Fetching top 3 signal providers
- `useAuthorizationAware.ts` - Fetching user roles
- Automatic refetching and cache invalidation

### **Supabase JS** (`@supabase/supabase-js@^2.50.3`)
**Purpose:** Database connection and authentication
**Used in:**
- Fetching trade alerts (signals)
- User profiles and roles
- Real-time subscriptions
- Authentication state

### **React Router DOM** (`react-router-dom@^6.26.2`)
**Purpose:** Navigation between pages
**Used in:**
- `WidgetSidebar.tsx` - Navigation to tool pages
- `useLocation` - Detecting current page for bottom nav spacing

### **Date-fns** (`date-fns@^3.6.0`)
**Purpose:** Date/time utilities
**Used in:**
- `TradingSessionIndicator.tsx` - Formatting current time
- Calculating 7-day date ranges for provider stats

### **Date-fns-tz** (`date-fns-tz@^3.2.0`)
**Purpose:** Timezone conversions
**Used in:**
- Trading session time calculations

---

## Peer Dependencies

These should already be in your React app:

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

---

## DevDependencies (Optional but Recommended)

```bash
npm install -D \
  @types/react@^18.3.3 \
  @types/react-dom@^18.3.0 \
  @types/node@^20.19.6 \
  typescript@^5.5.3 \
  tailwindcss@^3.4.11 \
  autoprefixer@^10.4.20 \
  postcss@^8.4.47
```

---

## Tailwind CSS Plugins (Optional)

```bash
npm install -D tailwindcss-animate@^1.0.7
```

**Purpose:** Additional animation utilities for Tailwind

---

## Supabase Configuration

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Tables Required

1. **`profiles`** - User profiles
   - `id` (UUID, primary key)
   - `display_name` (TEXT)
   - `avatar_url` (TEXT)
   - `role` (TEXT)
   - `user_type` (TEXT)
   - `account_status` (TEXT)
   - And other profile fields...

2. **`user_roles`** - User role management
   - `user_id` (UUID, foreign key to auth.users)
   - `role` (TEXT) - Values: 'admin', 'educator+', 'educator', 'moderator'
   - `created_at` (TIMESTAMP)

3. **`trade_alerts`** - Trading signals
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to auth.users)
   - `tradermade_symbol` (TEXT)
   - `entry_price` (NUMERIC)
   - `stop_loss` (NUMERIC)
   - `tp1`, `tp2`, `tp3` (NUMERIC)
   - `tp_hits` (INTEGER[])
   - `trade_type` (TEXT) - Values: 'buy', 'sell', 'buy_limit', 'sell_limit'
   - `status` (TEXT) - Values: 'active', 'closed'
   - `close_reason` (TEXT)
   - `created_at` (TIMESTAMP)

### Database Functions Required

#### 1. `get_user_roles(p_user_id UUID)`

```sql
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.user_id, ur.role, ur.created_at
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;
END;
$$;
```

#### 2. `check_user_xeon_subscription(user_id_param UUID)`

```sql
CREATE OR REPLACE FUNCTION check_user_xeon_subscription(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_subscription BOOLEAN;
BEGIN
  -- Your subscription check logic here
  -- Example:
  SELECT EXISTS(
    SELECT 1
    FROM subscriptions
    WHERE user_id = user_id_param
    AND status = 'active'
    AND plan_name = 'xeon_stream'
  ) INTO has_subscription;
  
  RETURN COALESCE(has_subscription, FALSE);
END;
$$;
```

---

## TypeScript Configuration

### Path Aliases

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite Config

Ensure your `vite.config.ts` includes:

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Version Compatibility Matrix

| Package | Minimum Version | Tested Version | Status |
|---------|----------------|----------------|--------|
| React | 18.0.0 | 18.3.1 | ✅ |
| React Router DOM | 6.0.0 | 6.26.2 | ✅ |
| Framer Motion | 12.0.0 | 12.23.0 | ✅ |
| Lucide React | 0.400.0 | 0.462.0 | ✅ |
| TanStack React Query | 5.0.0 | 5.56.2 | ✅ |
| Supabase JS | 2.40.0 | 2.50.3 | ✅ |
| TypeScript | 5.0.0 | 5.5.3 | ✅ |
| Tailwind CSS | 3.4.0 | 3.4.11 | ✅ |

---

## Installation Command (Copy-Paste Ready)

```bash
# Install all required dependencies at once
npm install framer-motion@^12.23.0 lucide-react@^0.462.0 @tanstack/react-query@^5.56.2 @supabase/supabase-js@^2.50.3 react-router-dom@^6.26.2 date-fns@^3.6.0 date-fns-tz@^3.2.0

# Install dev dependencies (optional)
npm install -D @types/react@^18.3.3 @types/react-dom@^18.3.0 @types/node@^20.19.6 typescript@^5.5.3 tailwindcss@^3.4.11 autoprefixer@^10.4.20 postcss@^8.4.47 tailwindcss-animate@^1.0.7
```

---

## Post-Installation Verification

Run these commands to verify successful installation:

```bash
# Check if all packages are installed
npm list framer-motion lucide-react @tanstack/react-query @supabase/supabase-js react-router-dom date-fns date-fns-tz

# Build to check for errors
npm run build
```

---

## Common Issues & Solutions

### Issue: Module not found '@/...'
**Solution:** Configure path aliases in `tsconfig.json` and `vite.config.ts`

### Issue: 'supabase' is not defined
**Solution:** Create `src/integrations/supabase/client.ts` with Supabase client initialization

### Issue: Type errors with Supabase
**Solution:** Generate Supabase types: `npx supabase gen types typescript`

### Issue: Framer Motion animations not working
**Solution:** Ensure `framer-motion` version is ^12.0.0 or higher

### Issue: Icons not rendering
**Solution:** Check that `lucide-react` is installed and imported correctly

---

✅ **All dependencies listed here are required for 100% identical reproduction**
