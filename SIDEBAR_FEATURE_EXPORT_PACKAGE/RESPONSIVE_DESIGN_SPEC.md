# 📱 Responsive Design Specification - 100% Exact Reproduction

## Overview

This document details **every responsive behavior** for desktop, tablet, and mobile to ensure **100% identical** reproduction.

---

## 🖥️ Desktop (≥1024px)

### Sidebar Dimensions
```typescript
{
  width: 384,                    // w-96 (24rem)
  height: viewportHeight - 80,   // Full height minus AuthenticatedAppBar
  top: 80,                       // Fixed header height
  left: '8px',                   // left-2 sm:left-4
  bottomNavHeight: 0             // No bottom nav on desktop
}
```

### Positioning
- **Fixed position** at left edge
- **Starts 80px from top** (below fixed header)
- **8px left margin** (left-2)
- **Z-index**: 105 (sidebar), 80 (backdrop), 100 (edge trigger)

### Glassmorphism
```css
background: rgba(255, 255, 255, 0.08);  /* Light mode */
background: rgba(15, 15, 20, 0.3);      /* Dark mode */
backdrop-filter: blur(30px) saturate(180%);
-webkit-backdrop-filter: blur(30px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.15);  /* Light mode */
border: 1px solid rgba(255, 255, 255, 0.2);   /* Dark mode */
box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08);  /* Light mode */
box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3);   /* Dark mode */
border-radius: 0.75rem;  /* rounded-xl */
```

### Content Padding
```typescript
{
  paddingTop: '8px',     // pt-2 sm:pt-3 md:pt-4 → pt-4 (16px)
  paddingX: '16px',      // px-2 sm:px-3 md:px-4 → px-4 (16px)
  paddingBottom: '16px'  // Fixed 16px
}
```

### Edge Trigger Zone
```typescript
{
  width: 35,  // 35px trigger zone
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 100
}
```

### Provider Cards
**Rank #1 (Full Width):**
```typescript
{
  width: '100%',          // col-span-2
  padding: '12px',        // p-3
  height: 'auto',
  avatarSize: '40px',     // w-10 h-10
  nameSize: '14px',       // text-sm
  pipsSize: '16px',       // text-base
  emojiSize: '24px'       // text-2xl
}
```

**Rank #2 & #3 (Half Width):**
```typescript
{
  width: '50%',           // col-span-1
  padding: '8px',         // p-2
  height: 'auto',
  avatarSize: '32px',     // w-8 h-8
  nameSize: '12px',       // text-xs
  pipsSize: '14px',       // text-sm
  emojiSize: '20px'       // text-xl
}
```

### Widget Tool Cards
```typescript
{
  height: '128px',        // lg:h-32
  gridColumns: 2,         // grid-cols-2
  gap: '12px',           // gap-3
  iconSize: '48px'       // md:w-12 md:h-12
}
```

### Animation Timing
```typescript
{
  sidebarSlideIn: {
    duration: 0.12,
    easing: 'easeOut'
  },
  providerCardFadeIn: {
    delay: [0.1, 0.2, 0.3],  // Staggered by rank
    duration: 0.3
  },
  widgetCardHover: {
    scale: 1.03,
    y: -4,
    duration: 0.2
  }
}
```

---

## 📱 Tablet (768px - 1023px)

### Sidebar Dimensions
```typescript
{
  width: 288,                    // w-72 (18rem)
  height: viewportHeight,        // Full viewport height (overlay mode)
  top: 0,                        // No fixed header (full overlay)
  left: '16px',                  // sm:left-4
  bottomNavHeight: 0             // No bottom nav on tablet
}
```

### Positioning
- **Fixed position** at left edge
- **Starts at top of viewport** (0px) - full overlay
- **16px left margin** (sm:left-4)
- **Overlays entire screen** with backdrop

### Content Padding
```typescript
{
  paddingTop: '12px',    // sm:pt-3 (12px)
  paddingX: '12px',      // sm:px-3 (12px)
  paddingBottom: '12px'
}
```

### Edge Trigger Zone
```typescript
{
  width: 50,  // 50px trigger zone (larger for touch)
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 100
}
```

### Provider Cards
**Rank #1 (Full Width):**
```typescript
{
  width: '100%',
  padding: '12px',        // p-3
  avatarSize: '40px',     // w-10 h-10
  nameSize: '14px',       // text-sm
  pipsSize: '16px',       // text-base
  emojiSize: '24px'       // text-2xl
}
```

**Rank #2 & #3 (Half Width):**
```typescript
{
  width: '50%',
  padding: '8px',         // p-2
  avatarSize: '32px',     // w-8 h-8
  nameSize: '12px',       // text-xs
  pipsSize: '14px',       // text-sm
  emojiSize: '20px'       // text-xl
}
```

### Widget Tool Cards
```typescript
{
  height: '112px',        // md:h-28
  gridColumns: 2,         // grid-cols-2
  gap: '12px',           // sm:gap-3
  iconSize: '40px'       // sm:w-10 sm:h-10
}
```

---

## 📱 Mobile (<768px)

### Sidebar Dimensions (Dynamic)
```typescript
// Width calculation based on device size
const calculateDynamicWidth = () => {
  const { viewportWidth, deviceCategory } = deviceInfo;
  
  let width;
  if (deviceCategory === 'xs') {
    width = Math.floor(viewportWidth * 0.70);  // 70% for small phones (<375px)
  } else if (deviceCategory === 'sm') {
    width = Math.floor(viewportWidth * 0.75);  // 75% for standard phones (375-414px)
  } else {
    width = Math.floor(viewportWidth * 0.80);  // 80% for large phones (414-768px)
  }
  
  // Clamp between 240px and 320px
  return Math.max(240, Math.min(320, width));
};

{
  width: calculateDynamicWidth(),  // Dynamic based on device
  height: viewportHeight,          // Full viewport height
  top: 0,                          // No fixed header
  left: '8px',                     // left-2 (8px margin)
  bottomNavHeight: hasBottomNav ? 64 : 0  // Dynamic bottom nav detection
}
```

### Bottom Nav Detection
```typescript
const PAGES_WITH_BOTTOM_NAV = [
  '/dashboard/signal-stream',
  '/dashboard/advanced-tools'
];

const hasBottomNav = PAGES_WITH_BOTTOM_NAV.some(
  page => location.pathname === page || location.pathname.startsWith(page + '?')
);

// Add extra padding at bottom if bottom nav exists
paddingBottom: hasBottomNav ? `${64 + 16}px` : '16px'
```

### Positioning
- **Fixed position** at left edge
- **Full height overlay** (top: 0)
- **8px left margin**
- **Dynamic bottom padding** based on page

### Content Padding
```typescript
{
  paddingTop: '8px',     // pt-2 (8px)
  paddingX: '8px',       // px-2 (8px)
  paddingBottom: bottomNavHeight > 0 ? `${bottomNavHeight + 16}px` : '16px'
}
```

### Edge Trigger Zone
```typescript
{
  width: 50,  // 50px trigger zone (larger for touch)
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 100
}
```

### Provider Cards
**Rank #1 (Full Width):**
```typescript
{
  width: '100%',
  padding: '12px',        // p-3
  avatarSize: '40px',     // w-10 h-10
  nameSize: '14px',       // text-sm
  pipsSize: '16px',       // text-base
  emojiSize: '24px'       // text-2xl
}
```

**Rank #2 & #3 (Half Width):**
```typescript
{
  width: '50%',
  padding: '8px',         // p-2
  avatarSize: '32px',     // w-8 h-8
  nameSize: '12px',       // text-xs
  pipsSize: '14px',       // text-sm
  emojiSize: '20px'       // text-xl
}
```

### Widget Tool Cards
```typescript
{
  height: '80px',         // h-20 (mobile)
  gridColumns: 2,         // grid-cols-2
  gap: '8px',            // gap-2
  iconSize: '24px'       // w-6 h-6
}
```

### Touch Interactions
```typescript
// Swipe to open (from left edge)
{
  edgeWidth: 50,
  triggerDistance: 80,   // Must swipe >80px
  triggerVelocity: 0.5   // Or swipe velocity >0.5 px/ms
}

// Swipe to close (on open sidebar)
{
  swipeDirection: 'left',
  closeDistance: 80,     // Must swipe >80px left
  closeVelocity: 0.5     // Or swipe velocity >0.5 px/ms
}

// Haptic feedback
{
  onOpen: 15,   // 15ms vibration
  onClose: 25   // 25ms vibration
}
```

---

## 🎨 Exact Visual Specifications

### Header Section
```typescript
// Desktop & Tablet
{
  title: {
    fontSize: '24px',      // text-2xl
    fontWeight: 700,       // font-bold
    marginBottom: '4px',   // mb-1
    text: "Today's"
  },
  subtitle: {
    fontSize: '14px',      // text-sm
    color: 'text-gray-600 dark:text-gray-400',
    text: "Trading Arsenal"
  },
  closeButton: {
    size: '16px',          // w-4 h-4
    padding: '6px',        // p-1.5
    borderRadius: '8px'    // rounded-lg
  }
}

// Mobile
{
  title: {
    fontSize: '18px',      // text-lg
    fontWeight: 700,
    marginBottom: '2px',   // mb-0.5
    text: "Today's"
  },
  subtitle: {
    fontSize: '12px',      // text-xs
    color: 'text-gray-600 dark:text-gray-400',
    text: "Trading Arsenal"
  }
}
```

### Trading Session Indicator
```typescript
{
  marginBottom: '12px',   // mb-3 sm:mb-4
  padding: '12px',        // p-3
  borderRadius: '8px',    // rounded-lg
  background: 'bg-white/10 dark:bg-black/20',
  backdropFilter: 'blur(12px)',
  clockIcon: {
    size: '16px',         // w-4 h-4
    color: 'text-foreground/60'
  },
  timeText: {
    fontSize: '14px',     // text-sm
    fontFamily: 'mono',
    fontWeight: 500
  }
}
```

### Grid Layout
```typescript
// All breakpoints
{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',  // grid-cols-2
  gap: {
    mobile: '8px',       // gap-2
    tablet: '12px',      // sm:gap-3
    desktop: '12px'      // gap-3
  }
}
```

### Profile Section
```typescript
{
  marginTop: 'auto',      // mt-auto (pushes to bottom)
  borderTop: '1px solid',
  borderColor: 'border-border/30',
  paddingTop: '12px',     // pt-6
  
  avatar: {
    size: {
      mobile: '24px',     // w-6 h-6
      tablet: '32px',     // sm:w-8 sm:h-8
      desktop: '32px'     // w-8 h-8
    },
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #3b82f6, #9333ea)'
  },
  
  name: {
    fontSize: {
      mobile: '12px',     // text-xs
      tablet: '14px',     // sm:text-sm
      desktop: '14px'     // text-sm
    },
    fontWeight: 500,
    truncate: true
  },
  
  role: {
    fontSize: '12px',     // text-xs
    color: 'text-foreground/60'
  },
  
  settingsIcon: {
    size: {
      mobile: '12px',     // w-3 h-3
      tablet: '16px',     // sm:w-4 sm:h-4
      desktop: '16px'     // w-4 h-4
    }
  }
}
```

### Sign Out Button
```typescript
{
  width: '100%',
  padding: {
    mobile: '8px',        // p-2
    tablet: '12px',       // sm:p-3
    desktop: '12px'       // p-3
  },
  marginTop: {
    mobile: '12px',       // mt-3
    tablet: '16px',       // sm:mt-4
    desktop: '16px'       // mt-4
  },
  background: 'bg-white/10 dark:bg-black/20',
  backdropFilter: 'blur(12px)',
  borderRadius: {
    mobile: '12px',       // rounded-xl
    tablet: '16px',       // sm:rounded-2xl
    desktop: '16px'       // rounded-2xl
  },
  iconSize: {
    mobile: '16px',       // w-4 h-4
    tablet: '20px',       // sm:w-5 sm:h-5
    desktop: '20px'       // w-5 h-5
  },
  fontSize: {
    mobile: '14px',       // text-sm
    tablet: '16px',       // sm:text-base
    desktop: '16px'       // text-base
  }
}
```

---

## 🎭 Animation Specifications

### Sidebar Entry Animation
```typescript
// Desktop
{
  initial: { x: '-110%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-110%', opacity: 0 },
  transition: {
    type: 'tween',
    duration: 0.12,       // 120ms enter
    ease: 'easeOut'
  }
}

// Tablet & Mobile
{
  initial: { x: '-110%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-110%', opacity: 0 },
  transition: {
    type: 'tween',
    duration: 0.12,       // Same speed for all
    ease: 'easeOut'
  }
}
```

### Provider Card Stagger Animation
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.provider-widget-animated {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Delays */
Rank #1: animation-delay: 0.1s;
Rank #2: animation-delay: 0.2s;
Rank #3: animation-delay: 0.3s;
```

### Widget Card Hover (Desktop & Tablet)
```typescript
{
  whileHover: {
    scale: 1.03,
    y: -4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transition: { duration: 0.2 }
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
}
```

### Widget Card Tap (Mobile)
```typescript
{
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
  // No hover effects on mobile (touch only)
}
```

---

## 📐 Exact Spacing & Gaps

### Desktop
```typescript
{
  sidebarMarginLeft: '8px',      // left-2 sm:left-4 → left-4
  contentPaddingTop: '16px',     // pt-2 sm:pt-3 md:pt-4 → pt-4
  contentPaddingX: '16px',       // px-2 sm:px-3 md:px-4 → px-4
  headerMarginBottom: '24px',    // mb-3 sm:mb-4 md:mb-6 → mb-6
  sessionMarginBottom: '16px',   // mb-3 sm:mb-4 → mb-4
  gridGap: '12px',              // gap-2 sm:gap-3 → gap-3
  profilePaddingTop: '24px'     // pt-6
}
```

### Tablet
```typescript
{
  sidebarMarginLeft: '16px',     // sm:left-4
  contentPaddingTop: '12px',     // sm:pt-3
  contentPaddingX: '12px',       // sm:px-3
  headerMarginBottom: '16px',    // sm:mb-4
  sessionMarginBottom: '16px',   // sm:mb-4
  gridGap: '12px',              // sm:gap-3
  profilePaddingTop: '24px'     // pt-6
}
```

### Mobile
```typescript
{
  sidebarMarginLeft: '8px',      // left-2
  contentPaddingTop: '8px',      // pt-2
  contentPaddingX: '8px',        // px-2
  headerMarginBottom: '12px',    // mb-3
  sessionMarginBottom: '12px',   // mb-3
  gridGap: '8px',               // gap-2
  profilePaddingTop: '12px',    // pt-3
  bottomSafePadding: 'max(1rem, env(safe-area-inset-bottom))'  // iOS safe area
}
```

---

## ✅ Complete Responsive Checklist

### Desktop (≥1024px)
- [ ] Width: 384px
- [ ] Height: viewportHeight - 80px
- [ ] Top: 80px (below fixed header)
- [ ] Left margin: 8px
- [ ] No bottom nav padding
- [ ] Edge trigger: 35px
- [ ] Provider card #1: Full width, 40px avatar, 14px name
- [ ] Provider cards #2 & #3: Half width, 32px avatar, 12px name
- [ ] Widget cards: 128px height, 48px icons
- [ ] Grid gap: 12px
- [ ] Content padding: 16px
- [ ] Slide-in animation: 0.12s

### Tablet (768-1023px)
- [ ] Width: 288px
- [ ] Height: Full viewport
- [ ] Top: 0px (full overlay)
- [ ] Left margin: 16px
- [ ] No bottom nav padding
- [ ] Edge trigger: 50px
- [ ] Provider card #1: Full width, 40px avatar, 14px name
- [ ] Provider cards #2 & #3: Half width, 32px avatar, 12px name
- [ ] Widget cards: 112px height, 40px icons
- [ ] Grid gap: 12px
- [ ] Content padding: 12px
- [ ] Slide-in animation: 0.12s

### Mobile (<768px)
- [ ] Width: 70-80% of viewport (240-320px clamped)
- [ ] Height: Full viewport
- [ ] Top: 0px (full overlay)
- [ ] Left margin: 8px
- [ ] Dynamic bottom nav padding (64px + 16px if present)
- [ ] Edge trigger: 50px
- [ ] Provider card #1: Full width, 40px avatar, 14px name
- [ ] Provider cards #2 & #3: Half width, 32px avatar, 12px name
- [ ] Widget cards: 80px height, 24px icons
- [ ] Grid gap: 8px
- [ ] Content padding: 8px
- [ ] Slide-in animation: 0.12s
- [ ] Swipe to open: >80px or >0.5px/ms velocity
- [ ] Swipe to close: >80px or >0.5px/ms velocity
- [ ] Haptic feedback: 15ms open, 25ms close
- [ ] iOS safe area padding at bottom

---

## 🎯 100% Reproduction Guarantee

This specification ensures that the sidebar will look and behave **exactly the same** on all devices. Every dimension, spacing, animation, and interaction has been documented precisely.

Follow this specification along with the code in the export package for **perfect reproduction**.
