# Imperial Trading Platform - Shared Navigation Components

This package contains reusable navigation components that can be copied to Academy and OrderFlow Lovable projects for consistent cross-app navigation.

## Quick Setup Guide

### 1. Copy Required Files

Copy these files to your new Lovable project:

**Core Components:**
- `src/shared/components/navigation/` (entire directory)
- `src/shared/templates/` (entire directory)
- `src/contexts/NavigationContext.tsx`
- `src/components/navigation/CrossAppLink.tsx`
- `src/hooks/useNavigation.ts`

**UI Components (if not already present):**
- `src/components/ui/` (entire shadcn/ui directory)
- `src/components/theme/ThemeToggle.tsx`

### 2. Install Dependencies

```bash
npm install @radix-ui/react-navigation-menu lucide-react framer-motion
```

### 3. Academy App Setup

Replace your main layout with:

```tsx
// src/components/Layout.tsx (Academy)
import { AcademyLayout } from '@/shared/templates/academy-layout';
import { useAuth } from '@/contexts/AuthContext';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  
  return (
    <AcademyLayout user={user} onLogout={logout}>
      {children}
    </AcademyLayout>
  );
}
```

### 4. OrderFlow App Setup

Replace your main layout with:

```tsx
// src/components/Layout.tsx (OrderFlow)
import { OrderFlowLayout } from '@/shared/templates/orderflow-layout';
import { useAuth } from '@/contexts/AuthContext';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  
  return (
    <OrderFlowLayout user={user} onLogout={logout}>
      {children}
    </OrderFlowLayout>
  );
}
```

## Environment Configuration

Add these URLs to your environment utils:

```tsx
// src/utils/environment.ts
export const getMainAppUrl = (): string => {
  return "https://www.tradeimperial.com/";
};

export const getAcademyAppUrl = (): string => {
  return "https://www.tradeimperial.com/academy";
};

export const getOrderFlowAppUrl = (): string => {
  return "https://www.tradeimperial.com/orderflow";
};
```

## Features

✅ **Cross-App Navigation**: Smooth transitions between Main, Academy, and OrderFlow
✅ **Loading States**: Visual feedback during navigation
✅ **Session Preservation**: Maintains user session across apps
✅ **Responsive Design**: Perfect mobile, tablet, and desktop experience
✅ **Consistent Branding**: Imperial Trading platform identity
✅ **Accessibility**: Full keyboard navigation and screen reader support

## Customization

### Navigation Items

Modify navigation items in the template files:

```tsx
// Academy navigation
const academyNavigationItems = [
  { to: "/dashboard/courses", icon: GraduationCap, label: "Courses" },
  // Add your custom routes here
];
```

### Styling

The components use Tailwind CSS with semantic tokens. Customize in your `tailwind.config.ts`:

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      // Add your custom colors
    }
  }
}
```

## Troubleshooting

### Navigation Not Working
- Ensure all navigation components are imported correctly
- Check that `NavigationProvider` wraps your app
- Verify environment URLs are correct

### Styling Issues
- Ensure Tailwind CSS is configured with shadcn/ui
- Check that all UI components are installed
- Verify CSS variables are defined in `globals.css`

### Cross-App Links Not Loading
- Check browser console for errors
- Verify target URLs are accessible
- Ensure session preservation is working

## Support

For issues or questions:
1. Check the main project's implementation as reference
2. Verify all required files are copied
3. Ensure dependencies are installed correctly

## Migration Notes

When copying to existing projects:
- Backup your current navigation components
- Test thoroughly before deploying
- Update any custom navigation logic to use new components