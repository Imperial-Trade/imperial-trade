# Shared Header Implementation Guide

## Overview
The `SharedHeader` component provides a consistent navigation experience across all Imperial Trading apps:
- **Main App**: `https://www.tradeimperial.com/`
- **OrderFlow App**: `https://www.tradeimperial.com/orderflow`  
- **Imperial Academy App**: `https://www.tradeimperial.com/academy`

## Component Location
```
src/components/shared/SharedHeader.tsx
```

## Usage

### Main App (Current Implementation)
```tsx
import { SharedHeader } from "@/components/shared/SharedHeader"

// Used in Layout.tsx
<SharedHeader />
// or explicitly with baseUrl
<SharedHeader baseUrl="" />
```

### OrderFlow App
```tsx
import { SharedHeader } from "@/components/shared/SharedHeader"

// In OrderFlow app layout
<SharedHeader baseUrl="/orderflow" />
```

### Imperial Academy App  
```tsx
import { SharedHeader } from "@/components/shared/SharedHeader"

// In Academy app layout
<SharedHeader baseUrl="/academy" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `baseUrl` | `string` | `""` | Base URL prefix for navigation links |

## Navigation Links
The header automatically generates the following navigation structure:

- **Pattern Stream**: `{baseUrl}/dashboard/signal-stream`
- **Education**: `{baseUrl}/dashboard/education`
- **Live Sessions**: `{baseUrl}/dashboard/live`
- **Community**: `{baseUrl}/dashboard/forum`
- **Tools**: `{baseUrl}/dashboard/advanced-tools`

## Features
- ✅ Responsive design (mobile/desktop)
- ✅ Collapsible header state
- ✅ Theme toggle integration
- ✅ User authentication status
- ✅ Apple/Stripe style dropdown menus
- ✅ Consistent Imperial branding
- ✅ Cross-app navigation support

## Implementation Steps

### 1. Copy Shared Components
Copy these files to your OrderFlow/Academy apps:
```
src/components/shared/SharedHeader.tsx
src/components/ui/button.tsx
src/components/ui/badge.tsx
src/components/ui/sheet.tsx
src/components/theme/ThemeToggle.tsx
src/hooks/use-mobile.ts
src/contexts/AuthContext.tsx
```

### 2. Install Dependencies
Ensure these packages are installed:
```bash
npm install lucide-react @radix-ui/react-sheet react-router-dom
```

### 3. Update Your Layout
Replace your existing header with:
```tsx
import { SharedHeader } from "@/components/shared/SharedHeader"

function Layout() {
  return (
    <div className="min-h-screen">
      <SharedHeader baseUrl="/orderflow" /> {/* or /academy */}
      <main className="pt-20">
        {/* Your content */}
      </main>
    </div>
  )
}
```

### 4. Configure Routing
Ensure your routing handles the navigation paths correctly:
```tsx
// OrderFlow routes example
<Route path="/orderflow/dashboard/signal-stream" element={<SignalStream />} />
<Route path="/orderflow/dashboard/education" element={<Education />} />
<Route path="/orderflow/dashboard/live" element={<Live />} />
<Route path="/orderflow/dashboard/forum" element={<Forum />} />
<Route path="/orderflow/dashboard/advanced-tools" element={<AdvancedTools />} />
```

## Styling Requirements
Ensure your CSS includes the Imperial design system tokens:
```css
/* Required in index.css */
:root {
  --primary: /* your primary color */;
  --muted: /* your muted color */;
  --border: /* your border color */;
  --background: /* your background color */;
  --foreground: /* your foreground color */;
}

/* Imperial branding font */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
```

## Cross-App Navigation
The shared header enables seamless navigation between apps:
- Users can access any section from any app
- Consistent user experience across the platform
- Unified branding and styling

## Maintenance
When updating navigation or styling:
1. Make changes to `SharedHeader.tsx` in the main app
2. Copy the updated component to OrderFlow and Academy apps
3. Test navigation across all apps
4. Deploy updates simultaneously to maintain consistency

## Troubleshooting

### Common Issues
1. **Missing dependencies**: Install required packages listed above
2. **Routing conflicts**: Ensure baseUrl matches your app's route structure  
3. **Styling issues**: Verify CSS design tokens are properly imported
4. **Auth context**: Ensure AuthContext is properly set up in each app

### Testing Checklist
- [ ] Header renders correctly on mobile/desktop
- [ ] Navigation links work with correct baseUrl
- [ ] Theme toggle functions properly
- [ ] User authentication displays correctly
- [ ] Dropdown menus appear and function
- [ ] Cross-app navigation works (if implemented)