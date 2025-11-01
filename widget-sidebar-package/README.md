# 📦 WidgetSidebar Migration Package

This package contains all the files needed to add the **WidgetSidebar** component to the **academy** and **orderflow** repositories.

## 📁 Package Contents

```
widget-sidebar-package/
├── components/
│   ├── navigation/
│   │   ├── WidgetSidebar.tsx          # Main sidebar component
│   │   └── EdgeIndicator.tsx          # Edge hover indicator
│   └── ui/
│       └── TradingSessionIndicator.tsx # Trading session display
├── hooks/
│   ├── useDeviceDetection.ts          # Device/screen detection
│   ├── useKeyboardShortcuts.ts        # Keyboard shortcuts (Ctrl+\, Esc)
│   └── useSmartProtection.ts          # Smart edge detection
├── utils/
│   ├── pipCalculations.ts             # Pip size calculations
│   ├── pipsCalculator.ts              # Signal pip calculations
│   ├── environment.ts                 # Main app (imperial-trade)
│   ├── environment.academy.ts         # ⚠️ USE THIS for ACADEMY repo
│   └── environment.orderflow.ts       # ⚠️ USE THIS for ORDERFLOW repo
└── README.md                          # This file
```

---

## 🚀 Quick Start - Academy Repository

### Option 1: Manual Copy (Recommended)

1. **Clone this branch** to your local machine:
```bash
cd /path/to/your/workspace
git clone -b claude/multi-repo-setup-011CUhpyq5N6sNGqGqpvg9AG https://github.com/Imperial-Trade/imperial-trade.git imperial-trade-widget-package
cd imperial-trade-widget-package
```

2. **Copy files to academy repo**:
```bash
# Navigate to academy repo
cd /path/to/academy

# Create directories if they don't exist
mkdir -p src/components/navigation
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/utils

# Copy files from the widget package
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/components/navigation/* src/components/navigation/
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/components/ui/* src/components/ui/
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/hooks/* src/hooks/
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/utils/pip* src/utils/

# ⚠️ IMPORTANT: Use the ACADEMY version of environment.ts
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/utils/environment.academy.ts src/utils/environment.ts
```

3. **Verify dependencies** are installed in `package.json`:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "framer-motion": "^12.23.0",
    "lucide-react": "^0.462.0",
    "@tanstack/react-query": "^5.56.2",
    "@supabase/supabase-js": "^2.50.3"
  }
}
```

4. **Install dependencies**:
```bash
npm install
# or
yarn install
```

5. **Add to your layout** (e.g., `src/App.tsx` or `src/layouts/MainLayout.tsx`):
```tsx
import { WidgetSidebar } from '@/components/navigation/WidgetSidebar';

function App() {
  return (
    <>
      <WidgetSidebar />
      {/* Your other components */}
    </>
  );
}
```

6. **Commit and push**:
```bash
git add .
git commit -m "feat: Add WidgetSidebar component from main app"
git push
```

### Option 2: Git Cherry-Pick (Advanced)

If you prefer to use git to merge the changes:

```bash
# From your academy repo
cd /path/to/academy

# Add imperial-trade as a remote
git remote add imperial-trade https://github.com/Imperial-Trade/imperial-trade.git

# Fetch the branch with the widget package
git fetch imperial-trade claude/multi-repo-setup-011CUhpyq5N6sNGqGqpvg9AG

# Cherry-pick the commit that adds the widget-sidebar-package
git cherry-pick <commit-hash>

# ⚠️ IMPORTANT: Replace environment.ts with the academy version
cp widget-sidebar-package/utils/environment.academy.ts src/utils/environment.ts

# Copy files to the correct locations
# ... (follow step 2 from Option 1)

# Remove the widget-sidebar-package folder after copying
rm -rf widget-sidebar-package

# Commit the final changes
git add .
git commit -m "feat: Add WidgetSidebar component from main app"
git push
```

---

## 🚀 Quick Start - OrderFlow Repository

**Follow the exact same steps as Academy**, but use the **OrderFlow version** of `environment.ts`:

```bash
# ⚠️ IMPORTANT: Use the ORDERFLOW version of environment.ts
cp /path/to/imperial-trade-widget-package/widget-sidebar-package/utils/environment.orderflow.ts src/utils/environment.ts
```

---

## 📋 Prerequisites

### Required Files (Must Already Exist in Your Repo)

The WidgetSidebar component depends on these files that should already exist in your academy/orderflow repositories:

1. **`/src/contexts/AuthContext.tsx`** - Authentication context
2. **`/src/contexts/SafeThemeProvider.tsx`** - Theme context
3. **`/src/hooks/useAuthorizationAware.ts`** - Role authorization hook
4. **`/src/hooks/useTopSignalProviders.ts`** - Top providers data hook
5. **`/src/components/theme/ThemeToggle.tsx`** - Theme toggle button
6. **`/src/components/dashboard/DashboardUserRole.tsx`** - User role display
7. **`/src/integrations/supabase/client.ts`** - Supabase client

If any of these **DON'T exist**, you'll need to copy them from the main imperial-trade repo or create simplified versions.

### Optional: Simplify the Component

If you want a **lighter version** without the top providers leaderboard:

1. Open `src/components/navigation/WidgetSidebar.tsx`
2. Remove the `useTopSignalProviders` import and hook
3. Remove the `useAuthorizationAware` import and hook
4. Remove lines 100-797 (the provider widgets)
5. Keep only the navigation tool cards

This will eliminate dependencies on:
- `useAuthorizationAware`
- `useTopSignalProviders`
- `DashboardUserRole`
- Most Supabase-related code

---

## 🔧 Configuration

### Environment Variables

Make sure your `.env` file has the required Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Path Aliases

Ensure your `tsconfig.json` or `vite.config.ts` has the `@/` path alias configured:

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**vite.config.ts:**
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## 🎨 Features

The WidgetSidebar includes:

- ✅ **Edge-triggered sidebar** - Opens when hovering near left edge
- ✅ **Keyboard shortcuts** - `Ctrl+\` to toggle, `Esc` to close
- ✅ **Drag to close** - Swipe left to dismiss
- ✅ **Top 3 signal providers** - Live leaderboard (last 24h)
- ✅ **Quick navigation cards** - Pattern Stream, Education, Community, Tools
- ✅ **Trading session indicator** - Shows current market session
- ✅ **Theme toggle** - Dark/light mode switch
- ✅ **User profile** - Avatar, name, role
- ✅ **Admin access** - Admin tools button for privileged users
- ✅ **Responsive design** - Mobile, tablet, desktop optimized
- ✅ **Smooth animations** - Framer Motion powered

---

## 🐛 Troubleshooting

### Import Errors

**Error:** `Cannot find module '@/...'`

**Solution:** Check that your path alias (`@/`) is configured in `tsconfig.json` and `vite.config.ts`

---

### Theme Not Working

**Error:** Theme toggle doesn't work

**Solution:**
1. Verify `SafeThemeProvider` wraps your app in `App.tsx`
2. Check if `ThemeToggle` component exists

---

### Auth Errors

**Error:** `useAuth must be used within an AuthProvider`

**Solution:**
1. Verify `AuthContext` exists and wraps your app
2. Check Supabase client configuration
3. Verify environment variables are set

---

### Top Providers Not Loading

**Error:** Providers show as empty or loading forever

**Solution:**
1. Check `useTopSignalProviders` hook exists
2. Verify Supabase connection
3. Check database has `trade_alerts` and `profiles` tables
4. Verify `user_roles` table exists with proper RLS policies

**Quick Fix:** Comment out the top providers section in `WidgetSidebar.tsx` (lines 100-145)

---

### Type Errors

**Error:** TypeScript type errors

**Solution:**
1. Run `npm install` to ensure all dependencies are installed
2. Check `@types/node` is installed: `npm install -D @types/node`
3. Restart your TypeScript server

---

## 📝 Customization

### Change URLs

Edit `src/utils/environment.ts` to change app URLs:

```typescript
export const getMainAppUrl = (): string => {
  return "https://your-domain.com/";
};

export const getOrderFlowAppUrl = (): string => {
  return "https://your-domain.com/orderflow";
};

export const getAcademyAppUrl = (): string => {
  return "https://your-domain.com/academy";
};
```

### Change Navigation Tools

Edit `WidgetSidebar.tsx` line 19-71 to customize the navigation cards:

```typescript
const tradingTools = [
  {
    name: "Your Tool",
    icon: YourIcon,
    description: "Your description",
    route: "/your-route"
  },
  // ...
];
```

### Change Edge Trigger Threshold

Edit `useDeviceDetection.ts` line 37-38:

```typescript
// Default: 35px on desktop, 50px on mobile
const edgeThreshold = isMobile ? 50 : isTablet ? 40 : 35;
```

---

## 📞 Support

If you encounter issues during migration:

1. Check this README's troubleshooting section
2. Verify all prerequisites are met
3. Check the imperial-trade main repo for reference implementations
4. Test in a clean branch first before merging to main

---

## ✅ Migration Checklist

- [ ] Files copied to correct directories
- [ ] Correct `environment.ts` version used (academy vs orderflow)
- [ ] Dependencies installed (`npm install`)
- [ ] Path aliases configured (`@/`)
- [ ] Prerequisites verified (AuthContext, ThemeProvider, etc.)
- [ ] WidgetSidebar added to layout
- [ ] App tested and working
- [ ] Changes committed and pushed

---

## 📄 License

This code is part of the Imperial Trade ecosystem and follows the same license as the main repository.

---

**Last Updated:** 2025-11-01
**Package Version:** 1.0.0
**Compatible With:** React 18+, Vite 5+
