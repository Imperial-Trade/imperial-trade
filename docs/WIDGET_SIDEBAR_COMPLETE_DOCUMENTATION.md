# WidgetSidebar Complete Visual Design Documentation

## 📋 Table of Contents
1. [Executive Overview](#executive-overview)
2. [Complete Visual Design Specifications](#complete-visual-design-specifications)
3. [Provider Widget Cards - Exact JSX](#provider-widget-cards---exact-jsx)
4. [All 10 Widget Tool Cards - Complete Designs](#all-10-widget-tool-cards---complete-designs)
5. [Complete CSS Styling](#complete-css-styling)
6. [Exact Dimensions & Positioning](#exact-dimensions--positioning)
7. [All Button Designs](#all-button-designs)
8. [Complete Component Layouts](#complete-component-layouts)
9. [Animation Details](#animation-details)
10. [Color Schemes & Design Tokens](#color-schemes--design-tokens)
11. [Complete File Structure](#complete-file-structure)
12. [Full Component Implementation](#full-component-implementation)

---

## Executive Overview

### Purpose
The **WidgetSidebar** is a sophisticated, glassmorphic trading arsenal sidebar featuring:
- **Top 3 signal providers** with rank-based visual styling
- **10 unique animated tool cards** with custom designs
- **User profile section** with theme toggle and admin controls
- **Edge swipe gestures** and keyboard shortcuts
- **Fully responsive** glassmorphism design

---

## Complete Visual Design Specifications

### Design System Colors

#### Light Mode Colors
```css
--background: 0 0% 100%; /* Pure white */
--foreground: 0 0% 26%; /* #434343 */
--primary: 0 0% 26%; /* Spanish Gray */
--border: 0 0% 80%; /* #CBCBCB */
--accent-gold: 43 84% 38%; /* Trading gold */
```

#### Dark Mode Colors
```css
--background: 0 0% 0%; /* Pure black */
--foreground: 0 0% 95%; /* White text */
--primary: 43 74% 60%; /* Gold #E6B800 */
--card: 210 20% 12%; /* Dark navy #1A1F2E */
--border: 210 12% 22%; /* Dark navy border */
```

---

## Provider Widget Cards - Exact JSX

### Rank #1 Gold Card (Full Width)

```tsx
<div 
  className="
    provider-widget-animated relative bg-black/50 backdrop-blur-md rounded-xl 
    p-3 border border-yellow-500/40 shadow-lg shadow-yellow-500/30 
    pointer-events-none transition-all duration-300
  "
  style={{ animationDelay: "0.1s" }}
>
  {/* Medal - Top Right */}
  <div className="absolute top-2 right-2">
    <span className="text-2xl">🥇</span>
  </div>

  {/* Avatar - Centered */}
  <div className="flex justify-center mb-2">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
      {provider.avatarUrl ? (
        <img src={provider.avatarUrl} alt={provider.displayName} className="w-full h-full object-cover" />
      ) : (
        <User className="w-5 h-5 text-primary" />
      )}
    </div>
  </div>

  {/* Name - Centered */}
  <div className="text-center mb-1">
    <span className="text-sm font-bold text-white truncate block px-1">
      {provider.displayName}
    </span>
  </div>

  {/* Badge - Centered */}
  <div className="flex justify-center mb-2">
    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
      EDUCATOR+
    </span>
  </div>

  {/* Stats - Two columns */}
  <div className="flex items-center justify-between pt-2 border-t border-border/30">
    <div className="text-base font-bold text-green-400 flex items-center gap-1">
      +547.3
      <span className="text-xs text-gray-400 font-normal">pips</span>
      <span className='text-sm'>🟢</span>
    </div>
    <div className="text-xs text-foreground">
      12 trades
    </div>
  </div>
</div>
```

**Visual Specs:**
- **Width**: Full width (100% of grid column)
- **Padding**: `p-3` (12px)
- **Border**: `border-yellow-500/40` (Gold with 40% opacity)
- **Shadow**: `shadow-lg shadow-yellow-500/30` (Large glow)
- **Background**: `bg-black/50 backdrop-blur-md` (Glassmorphism)
- **Animation Delay**: 0.1s

### Rank #2 Silver Card (Half Width)

```tsx
<div 
  className="
    provider-widget-animated relative bg-black/50 backdrop-blur-md rounded-xl 
    p-2 border border-gray-400/40 shadow-md shadow-gray-400/20 
    pointer-events-none transition-all duration-300
  "
  style={{ animationDelay: "0.2s" }}
>
  {/* Medal - Top Right */}
  <div className="absolute top-1.5 right-1.5">
    <span className="text-xl">🥈</span>
  </div>

  {/* Avatar - Centered with top margin for medal */}
  <div className="flex justify-center mb-1.5 mt-4">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
      <User className="w-4 h-4 text-primary" />
    </div>
  </div>

  {/* Name - Centered */}
  <div className="text-center mb-1">
    <span className="text-xs font-semibold text-white truncate block px-1">
      Trader Name
    </span>
  </div>

  {/* Badge - Centered */}
  <div className="flex justify-center mb-1.5">
    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
      EDUCATOR
    </span>
  </div>

  {/* Stats - Stacked vertically */}
  <div className="text-center mb-0.5">
    <div className="text-sm font-bold text-green-400 flex items-center justify-center gap-1">
      +342.1
      <span className="text-[10px] text-gray-400 font-normal">pips</span>
      <span className='text-xs'>🟢</span>
    </div>
  </div>
  <div className="text-center text-foreground text-[10px]">
    8 trades
  </div>
</div>
```

**Visual Specs:**
- **Width**: Half width (50% of grid)
- **Padding**: `p-2` (8px)
- **Border**: `border-gray-400/40` (Silver with 40% opacity)
- **Shadow**: `shadow-md shadow-gray-400/20` (Medium glow)
- **Animation Delay**: 0.2s

### Rank #3 Bronze Card (Half Width)

```tsx
<div 
  className="
    provider-widget-animated relative bg-black/50 backdrop-blur-md rounded-xl 
    p-2 border border-orange-500/40 shadow-md shadow-orange-500/20 
    pointer-events-none transition-all duration-300
  "
  style={{ animationDelay: "0.3s" }}
>
  {/* Same structure as Rank #2 */}
  {/* Medal emoji: 🥉 */}
  {/* Border: border-orange-500/40 */}
  {/* Shadow: shadow-orange-500/20 */}
</div>
```

---

## All 10 Widget Tool Cards - Complete Designs

### 1. Trading Journal Card

```tsx
<motion.div
  whileHover={{ scale: 1.02, y: -4 }}
  whileTap={{ scale: 0.98 }}
  className="col-span-1 h-20 sm:h-24 md:h-28 lg:h-32 bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:bg-card/80"
  onClick={() => handleToolClick(tool)}
>
  <div className="flex flex-col h-full">
    {/* Animated browser window design */}
    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
      <div className="p-1 sm:p-2 h-full flex flex-col">
        {/* Browser dots (red, yellow, green) */}
        <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500"></div>
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
        </div>
        
        {/* Journal entry lines */}
        <div className="flex-1 space-y-1 sm:space-y-1.5">
          <div className="h-1 sm:h-1.5 bg-blue-400 dark:bg-blue-600 rounded w-3/4 opacity-70"></div>
          <div className="h-1 sm:h-1.5 bg-green-400 dark:bg-green-600 rounded w-full opacity-60"></div>
          <div className="h-1 sm:h-1.5 bg-purple-400 dark:bg-purple-600 rounded w-2/3 opacity-50"></div>
        </div>
      </div>
    </div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Browser Window**: Gradient from slate-800 to gray-900
- **Dots**: Red (#EF4444), Yellow (#EAB308), Green (#22C55E)
- **Lines**: Blue, Green, Purple with decreasing opacity
- **Hover**: Scale 1.02, translateY -4px, shadow-lg

### 2. Economic Calendar Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Calendar grid 7x2 */}
  <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-indigo-100 dark:to-purple-100 rounded-lg overflow-hidden p-1 sm:p-2">
    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 h-full">
      {[...Array(14)].map((_, i) => (
        <div 
          key={i}
          className={`
            rounded-sm sm:rounded 
            ${i === 4 ? 'bg-red-500 shadow-lg shadow-red-500/50' : 
              i === 9 ? 'bg-yellow-500 shadow-md shadow-yellow-500/30' : 
              'bg-white/20 dark:bg-gray-800/30'}
          `}
        />
      ))}
    </div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Grid**: 7 columns × 2 rows
- **Background**: Indigo-to-purple gradient
- **Highlighted Days**: Red (day 5) with shadow, Yellow (day 10) with shadow
- **Default Days**: White/20 opacity

### 3. Risk Calculator Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Percentage symbol with animated bars */}
  <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 dark:from-emerald-100 dark:to-teal-100 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
    {/* Animated percentage bars */}
    <motion.div
      className="absolute inset-0 flex items-center justify-around p-2"
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="w-1 h-3/4 bg-emerald-400 dark:bg-emerald-600 rounded-full"></div>
      <div className="w-1 h-1/2 bg-teal-400 dark:bg-teal-600 rounded-full"></div>
      <div className="w-1 h-2/3 bg-cyan-400 dark:bg-cyan-600 rounded-full"></div>
    </motion.div>
    
    {/* Percentage symbol */}
    <Calculator className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Emerald-to-teal gradient
- **Bars**: 3 vertical bars with pulse animation
- **Icon**: Calculator symbol, responsive sizing
- **Animation**: Opacity pulse 0.3 → 0.7 → 0.3 (2s loop)

### 4. Trade Analyst Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Upload area with dashed border */}
  <div className="w-full h-full bg-gradient-to-br from-violet-800 to-fuchsia-900 dark:from-violet-100 dark:to-fuchsia-100 rounded-lg flex flex-col items-center justify-center p-2">
    <div className="w-full h-full border-2 border-dashed border-white/40 dark:border-gray-700/40 rounded-lg flex items-center justify-center">
      <Brain className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white dark:text-gray-800" />
    </div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Violet-to-fuchsia gradient
- **Border**: Dashed, white/40 opacity
- **Icon**: Brain symbol (AI analysis)

### 5. Opportunity Scanner Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Scanning lines animation */}
  <div className="w-full h-full bg-gradient-to-br from-orange-800 to-red-900 dark:from-orange-100 dark:to-red-100 rounded-lg relative overflow-hidden flex items-center justify-center">
    {/* Animated scanning line */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '200%' }}
      transition={{ 
        duration: 2, 
        repeat: Infinity, 
        ease: "linear" 
      }}
    />
    
    <Search className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Orange-to-red gradient
- **Scanning Line**: White gradient moving left to right
- **Animation**: Infinite linear scan (2s duration)
- **Icon**: Search magnifying glass

### 6. Risk Simulator Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Concentric circles with ping effect */}
  <div className="w-full h-full bg-gradient-to-br from-cyan-800 to-blue-900 dark:from-cyan-100 dark:to-blue-100 rounded-lg relative overflow-hidden flex items-center justify-center">
    {/* Ping effect */}
    <motion.div
      className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-cyan-400/50"
      animate={{
        scale: [1, 1.5, 2],
        opacity: [0.8, 0.4, 0]
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity,
        ease: "easeOut"
      }}
    />
    
    <Scale className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Cyan-to-blue gradient
- **Ping Ring**: Expanding circle with fade-out
- **Animation**: Scale 1 → 2, opacity 0.8 → 0 (2s loop)
- **Icon**: Scale/balance symbol

### 7. Pattern Stream Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Bell icon with notification dot */}
  <div className="w-full h-full bg-gradient-to-br from-pink-800 to-rose-900 dark:from-pink-100 dark:to-rose-100 rounded-lg flex items-center justify-center relative">
    {/* Pulsing notification dot */}
    <motion.div
      className="absolute top-2 right-2 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1]
      }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity 
      }}
    />
    
    <Bell className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Pink-to-rose gradient
- **Notification Dot**: Red, pulsing animation
- **Animation**: Scale + opacity pulse (1.5s loop)
- **Icon**: Bell symbol

### 8. Education Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Graduation cap with floating animation */}
  <div className="w-full h-full bg-gradient-to-br from-blue-800 to-indigo-900 dark:from-blue-100 dark:to-indigo-100 rounded-lg flex items-center justify-center">
    <motion.div
      animate={{ 
        y: [0, -8, 0],
        rotate: [0, 2, 0, -2, 0]
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
    </motion.div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Blue-to-indigo gradient
- **Animation**: Vertical float + subtle rotation (3s loop)
- **Icon**: Graduation cap

### 9. Community Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Message bubble with scale pulse */}
  <div className="w-full h-full bg-gradient-to-br from-green-800 to-emerald-900 dark:from-green-100 dark:to-emerald-100 rounded-lg flex items-center justify-center">
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1]
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
    </motion.div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Green-to-emerald gradient
- **Animation**: Scale pulse 1 → 1.05 → 1 (2s loop)
- **Icon**: Message square/chat bubble

### 10. Tools Card

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
  {/* Target icon with continuous rotation */}
  <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 dark:from-amber-100 dark:to-orange-100 rounded-lg flex items-center justify-center">
    <motion.div
      animate={{ 
        rotate: 360
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <Target className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
    </motion.div>
  </div>
</motion.div>
```

**Visual Elements:**
- **Background**: Amber-to-orange gradient
- **Animation**: Continuous 360° rotation (8s loop)
- **Icon**: Target/bullseye symbol

---

## Complete CSS Styling

### Glassmorphism Navigation Effect

```css
/* src/index.css */

.nav-glass-effect {
  /* Light mode glassmorphism */
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(30px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08) !important;
}

.dark .nav-glass-effect {
  /* Dark mode glassmorphism */
  background: rgba(15, 15, 20, 0.3) !important;
  backdrop-filter: blur(30px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3) !important;
}
```

### Provider Widget Animation

```css
/* Fade-in animation for provider cards */
@keyframes provider-widget-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.provider-widget-animated {
  animation: provider-widget-fade-in 0.5s ease-out forwards;
  opacity: 0;
}
```

### Rank Gradients

```css
/* Gold Gradient (Rank #1) */
.gradient-gold {
  background: linear-gradient(135deg, 
    #facc15 0%,    /* from-yellow-400 */
    #eab308 50%,   /* via-yellow-500 */
    #d97706 100%   /* to-amber-600 */
  );
}

/* Silver Gradient (Rank #2) */
.gradient-silver {
  background: linear-gradient(135deg,
    #d1d5db 0%,    /* from-gray-300 */
    #9ca3af 50%,   /* via-gray-400 */
    #71717a 100%   /* to-zinc-500 */
  );
}

/* Bronze Gradient (Rank #3) */
.gradient-bronze {
  background: linear-gradient(135deg,
    #f97316 0%,    /* from-orange-500 */
    #ea580c 50%,   /* via-orange-600 */
    #d97706 100%   /* to-amber-700 */
  );
}
```

### Glow Shadows

```css
/* Gold Glow (Rank #1) */
.shadow-gold-glow {
  box-shadow: 0 10px 40px -10px rgba(234, 179, 8, 0.3);
}

/* Silver Glow (Rank #2) */
.shadow-silver-glow {
  box-shadow: 0 4px 20px -4px rgba(156, 163, 175, 0.2);
}

/* Bronze Glow (Rank #3) */
.shadow-bronze-glow {
  box-shadow: 0 4px 20px -4px rgba(249, 115, 22, 0.2);
}
```

---

## Exact Dimensions & Positioning

### Desktop (≥1024px)
```tsx
const dimensions = {
  width: 384,  // w-96 (24rem)
  height: viewportHeight - 80,  // Full height minus header
  top: 80,     // AuthenticatedAppBar height
  bottomNavHeight: 0,  // No bottom nav on desktop
  edgeWidth: 35,  // Edge trigger zone
  padding: {
    x: 16,  // p-4
    y: 16   // p-4
  }
};
```

### Tablet (768px - 1023px)
```tsx
const dimensions = {
  width: 288,  // w-72 (18rem)
  height: viewportHeight,  // Full viewport height
  top: 0,      // Overlay mode (no fixed header)
  bottomNavHeight: 0,
  edgeWidth: 50,  // Larger edge trigger
  padding: {
    x: 12,  // p-3
    y: 12   // p-3
  }
};
```

### Mobile (<768px)
```tsx
const dimensions = {
  // Dynamic width based on device category
  width: calculateDynamicWidth(), // 70-80% of viewport
  // xs phones: Math.floor(viewportWidth * 0.70)
  // sm phones: Math.floor(viewportWidth * 0.75)
  // lg phones: Math.floor(viewportWidth * 0.80)
  // Clamped: Math.max(240, Math.min(320, width))
  
  height: viewportHeight,  // Full height
  top: 0,  // No fixed header
  bottomNavHeight: hasBottomNav ? 64 : 0,  // Dynamic based on route
  edgeWidth: 50,
  padding: {
    x: 8,   // p-2
    y: 8    // p-2
  }
};

// Bottom nav detection
const PAGES_WITH_BOTTOM_NAV = [
  '/dashboard/signal-stream',
  '/dashboard/advanced-tools'
];
```

### Provider Card Sizing

**Rank #1 (Full Width):**
```tsx
{
  avatarSize: "w-10 h-10",  // 40px × 40px
  nameSize: "text-sm",       // 14px
  pipsSize: "text-base",     // 16px
  pipsSuffix: "text-xs",     // 12px
  signalSize: "text-xs",     // 12px
  emojiSize: "text-2xl",     // 24px
  cardPadding: "p-3"         // 12px
}
```

**Rank #2 & #3 (Half Width):**
```tsx
{
  avatarSize: "w-8 h-8",     // 32px × 32px
  nameSize: "text-xs",       // 12px
  pipsSize: "text-sm",       // 14px
  pipsSuffix: "text-[10px]", // 10px
  signalSize: "text-[10px]", // 10px
  emojiSize: "text-xl",      // 20px
  cardPadding: "p-2"         // 8px
}
```

### Widget Tool Card Sizing

```tsx
const sizeClasses = {
  small: "col-span-1 h-20 sm:h-24 md:h-28 lg:h-32",
  // Mobile: 80px, SM: 96px, MD: 112px, LG: 128px
  
  medium: "col-span-2 h-20 sm:h-24 md:h-28 lg:h-32",
  // Full width on grid
  
  large: "col-span-2 h-24 sm:h-28 md:h-32 lg:h-36"
  // Mobile: 96px, SM: 112px, MD: 128px, LG: 144px
};
```

---

## All Button Designs

### Close Button (X)

```tsx
<button
  onClick={handleClose}
  className="
    absolute top-4 right-4 z-50
    w-8 h-8 
    flex items-center justify-center
    rounded-full 
    bg-background/50 hover:bg-background/80
    border border-border/50 hover:border-border
    text-foreground/70 hover:text-foreground
    transition-all duration-200
    hover:scale-110
    active:scale-95
  "
  aria-label="Close sidebar"
>
  <X className="w-4 h-4" />
</button>
```

**Visual Specs:**
- **Size**: 32px × 32px (w-8 h-8)
- **Icon**: X (16px × 16px)
- **Background**: Semi-transparent with blur
- **Hover**: Scale 1.1, darker background
- **Active**: Scale 0.95

### Profile Button

```tsx
<button
  onClick={() => navigate('/dashboard/profile')}
  className="
    w-full flex items-center gap-3 p-3
    rounded-xl
    bg-card/40 hover:bg-card/60
    border border-border/30 hover:border-primary/30
    transition-all duration-200
    group
  "
>
  {/* Avatar */}
  <div className="
    w-10 h-10 
    rounded-full 
    bg-gradient-to-br from-primary/20 to-accent/20 
    border border-primary/30
    flex items-center justify-center
    overflow-hidden
    flex-shrink-0
  ">
    {user?.user_metadata?.avatar_url ? (
      <img 
        src={user.user_metadata.avatar_url} 
        alt="Profile" 
        className="w-full h-full object-cover" 
      />
    ) : (
      <User className="w-5 h-5 text-primary" />
    )}
  </div>

  {/* User info */}
  <div className="flex-1 text-left overflow-hidden">
    <div className="text-sm font-semibold text-foreground truncate">
      {user?.user_metadata?.display_name || 'User'}
    </div>
    <DashboardUserRole className="text-xs text-muted-foreground" />
  </div>

  {/* Chevron */}
  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
</button>
```

### Settings Button

```tsx
<button
  onClick={() => navigate('/dashboard/settings')}
  className="
    flex items-center gap-3 p-2.5
    rounded-lg
    hover:bg-accent/50
    text-foreground/80 hover:text-foreground
    transition-all duration-200
    w-full
    group
  "
>
  <Settings className="w-4 h-4 shrink-0" />
  <span className="text-sm font-medium">Settings</span>
  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
</button>
```

### Theme Toggle Button

```tsx
<button
  onClick={toggleTheme}
  className="
    w-8 h-8 p-0
    flex items-center justify-center
    rounded-lg
    text-muted-foreground hover:text-foreground
    hover:bg-accent
    transition-colors duration-200
  "
  aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
>
  {theme === 'dark' ? (
    <Sun className="h-4 w-4" />
  ) : (
    <Moon className="h-4 w-4" />
  )}
</button>
```

### Admin Tools Button

```tsx
<button
  onClick={() => navigate('/dashboard/admin')}
  className="
    w-full flex items-center justify-between p-3
    rounded-xl
    bg-gradient-to-r from-primary/10 to-accent/10
    hover:from-primary/20 hover:to-accent/20
    border border-primary/20 hover:border-primary/30
    transition-all duration-200
    group
  "
>
  <div className="flex items-center gap-3">
    <Shield className="w-5 h-5 text-primary" />
    <span className="text-sm font-semibold text-foreground">Admin Tools</span>
  </div>
  <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
</button>
```

### Sign Out Button

```tsx
<button
  onClick={() => signOut()}
  className="
    w-full flex items-center justify-center gap-2 p-3
    rounded-xl
    bg-destructive/10 hover:bg-destructive/20
    border border-destructive/20 hover:border-destructive/30
    text-destructive
    font-semibold
    transition-all duration-200
    hover:shadow-lg hover:shadow-destructive/10
  "
>
  <LogOut className="w-4 h-4" />
  <span className="text-sm">Sign Out</span>
</button>
```

---

## Complete Component Layouts

### Header Section

```tsx
<div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-bold text-foreground">
    Today's Trading Arsenal
  </h2>
  
  {/* Close button */}
  <button onClick={handleClose} className="...">
    <X className="w-4 h-4" />
  </button>
</div>
```

### Trading Session Indicator

```tsx
<div className="mb-6">
  <TradingSessionIndicator className="w-full" />
</div>
```

### Provider Leaderboard Section

```tsx
<div className="mb-6">
  <div className="flex items-center gap-2 mb-4">
    <Trophy className="w-5 h-5 text-yellow-500" />
    <h3 className="text-sm font-semibold text-foreground">
      Top Providers (7-day)
    </h3>
  </div>

  {isLoadingProviders ? (
    <div className="text-sm text-muted-foreground">Loading...</div>
  ) : topProviders.length > 0 ? (
    <div className="grid grid-cols-2 gap-3" key={animationKey}>
      {/* Rank #1 - Full width */}
      <div className="col-span-2">
        <ProviderWidget provider={topProviders[0]} rank={1} />
      </div>
      
      {/* Rank #2 & #3 - Half width each */}
      {topProviders[1] && (
        <ProviderWidget provider={topProviders[1]} rank={2} />
      )}
      {topProviders[2] && (
        <ProviderWidget provider={topProviders[2]} rank={3} />
      )}
    </div>
  ) : (
    <div className="text-sm text-muted-foreground">No providers yet</div>
  )}
</div>
```

### Widget Tools Grid

```tsx
<div className="mb-6">
  <div className="flex items-center gap-2 mb-4">
    <Sparkles className="w-5 h-5 text-primary" />
    <h3 className="text-sm font-semibold text-foreground">
      Quick Access Tools
    </h3>
  </div>

  <div className="grid grid-cols-2 gap-3">
    {tradingTools.map((tool) => (
      <WidgetTool key={tool.name} tool={tool} size="small" />
    ))}
  </div>
</div>
```

### Profile Section

```tsx
<div className="border-t border-border/30 pt-6 mt-auto">
  {/* Profile button */}
  <button onClick={() => navigate('/dashboard/profile')} className="...">
    {/* Avatar + User info */}
  </button>

  {/* Settings & Theme row */}
  <div className="flex items-center justify-between mt-3 px-2">
    <button onClick={() => navigate('/dashboard/settings')} className="...">
      <Settings className="w-4 h-4" />
      <span>Settings</span>
    </button>
    
    <ThemeToggle />
  </div>

  {/* Admin Tools (conditional) */}
  {canAccessAdminPanel && (
    <button onClick={() => navigate('/dashboard/admin')} className="mt-3 ...">
      <Shield className="w-5 h-5" />
      <span>Admin Tools</span>
    </button>
  )}

  {/* Sign Out */}
  <button onClick={() => signOut()} className="mt-4 ...">
    <LogOut className="w-4 h-4" />
    <span>Sign Out</span>
  </button>
</div>
```

---

## Animation Details

### Framer Motion Configurations

#### Sidebar Entry/Exit

```tsx
<motion.div
  ref={sidebarRef}
  initial={{ x: '-100%', opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: '-100%', opacity: 0 }}
  transition={{
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8
  }}
  className="fixed left-0 z-40"
  style={{
    top: `${dimensions.top}px`,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`
  }}
>
  {/* Sidebar content */}
</motion.div>
```

**Animation Specs:**
- **Type**: Spring animation
- **Stiffness**: 300 (responsive feel)
- **Damping**: 30 (smooth deceleration)
- **Mass**: 0.8 (light weight)
- **Direction**: Slide from left (-100% → 0)

#### Backdrop Overlay

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  onClick={handleCloseSidebar}
  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
/>
```

#### Widget Tool Card Hover

```tsx
<motion.div
  whileHover={{ 
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2 }
  }}
  whileTap={{ 
    scale: 0.98,
    transition: { duration: 0.1 }
  }}
  className="..."
>
  {/* Card content */}
</motion.div>
```

**Hover Effects:**
- **Scale**: 1.02 (2% larger)
- **Y-offset**: -4px (lift up)
- **Duration**: 0.2s

**Tap Effects:**
- **Scale**: 0.98 (2% smaller)
- **Duration**: 0.1s (instant feedback)

#### Provider Card Staggered Animation

```tsx
// Each card has a delay based on rank
<div 
  className="provider-widget-animated"
  style={{ animationDelay: `${rank * 0.1}s` }}
>
  {/* Rank 1: 0.1s, Rank 2: 0.2s, Rank 3: 0.3s */}
</div>
```

---

## Color Schemes & Design Tokens

### All HSL Color Values

#### Light Mode
```css
/* Backgrounds */
--background: 0 0% 100%;        /* Pure white */
--card: 0 0% 100%;              /* White cards */
--surface: 0 0% 98%;            /* Light surface */

/* Foreground */
--foreground: 0 0% 26%;         /* #434343 Dark gray text */
--card-foreground: 0 0% 26%;

/* Primary */
--primary: 0 0% 26%;            /* Spanish Gray */
--primary-foreground: 0 0% 100%; /* White on primary */

/* Borders */
--border: 0 0% 80%;             /* #CBCBCB Light border */
--input: 0 0% 96%;

/* Accents */
--accent-gold: 43 84% 38%;      /* Trading gold */
--accent-green: 142 76% 28%;    /* Trading green (darker) */
--accent-blue: 210 100% 46%;    /* Trading blue */
```

#### Dark Mode
```css
/* Backgrounds */
--background: 0 0% 0%;          /* Pure black */
--card: 210 20% 12%;            /* Dark navy #1A1F2E */
--surface: 210 20% 12%;

/* Foreground */
--foreground: 0 0% 95%;         /* White text */
--card-foreground: 0 0% 95%;

/* Primary */
--primary: 43 74% 60%;          /* Gold #E6B800 */
--primary-foreground: 210 24% 9%; /* Dark on gold */

/* Borders */
--border: 210 12% 22%;          /* Dark navy border */
--input: 210 18% 14%;

/* Accents */
--accent-gold: 43 74% 60%;      /* Trading gold (bright) */
--accent-green: 142 69% 58%;    /* Trading green #00C896 */
--accent-blue: 210 100% 60%;    /* Trading blue (bright) */
```

### Provider Rank Colors

```css
/* Gold (Rank #1) */
--rank-gold-border: rgba(234, 179, 8, 0.4);        /* #eab308 at 40% */
--rank-gold-shadow: rgba(234, 179, 8, 0.3);        /* Shadow glow */
--rank-gold-gradient-from: #facc15;                /* Yellow-400 */
--rank-gold-gradient-via: #eab308;                 /* Yellow-500 */
--rank-gold-gradient-to: #d97706;                  /* Amber-600 */

/* Silver (Rank #2) */
--rank-silver-border: rgba(156, 163, 175, 0.4);    /* #9ca3af at 40% */
--rank-silver-shadow: rgba(156, 163, 175, 0.2);
--rank-silver-gradient-from: #d1d5db;              /* Gray-300 */
--rank-silver-gradient-via: #9ca3af;               /* Gray-400 */
--rank-silver-gradient-to: #71717a;                /* Zinc-500 */

/* Bronze (Rank #3) */
--rank-bronze-border: rgba(249, 115, 22, 0.4);     /* #f97316 at 40% */
--rank-bronze-shadow: rgba(249, 115, 22, 0.2);
--rank-bronze-gradient-from: #f97316;              /* Orange-500 */
--rank-bronze-gradient-via: #ea580c;               /* Orange-600 */
--rank-bronze-gradient-to: #d97706;                /* Amber-700 */
```

### Widget Tool Gradients

```css
/* Trading Journal */
.journal-gradient {
  background: linear-gradient(135deg, #1e293b 0%, #111827 100%);
  /* from-slate-800 to-gray-900 */
}

/* Economic Calendar */
.calendar-gradient {
  background: linear-gradient(135deg, #312e81 0%, #581c87 100%);
  /* from-indigo-900 to-purple-900 */
}

/* Risk Calculator */
.calculator-gradient {
  background: linear-gradient(135deg, #065f46 0%, #115e59 100%);
  /* from-emerald-800 to-teal-900 */
}

/* Trade Analyst */
.analyst-gradient {
  background: linear-gradient(135deg, #5b21b6 0%, #86198f 100%);
  /* from-violet-800 to-fuchsia-900 */
}

/* Opportunity Scanner */
.scanner-gradient {
  background: linear-gradient(135deg, #9a3412 0%, #7f1d1d 100%);
  /* from-orange-800 to-red-900 */
}

/* Risk Simulator */
.simulator-gradient {
  background: linear-gradient(135deg, #155e75 0%, #1e3a8a 100%);
  /* from-cyan-800 to-blue-900 */
}

/* Pattern Stream */
.stream-gradient {
  background: linear-gradient(135deg, #831843 0%, #881337 100%);
  /* from-pink-800 to-rose-900 */
}

/* Education */
.education-gradient {
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
  /* from-blue-800 to-indigo-900 */
}

/* Community */
.community-gradient {
  background: linear-gradient(135deg, #166534 0%, #065f46 100%);
  /* from-green-800 to-emerald-900 */
}

/* Tools */
.tools-gradient {
  background: linear-gradient(135deg, #92400e 0%, #9a3412 100%);
  /* from-amber-800 to-orange-900 */
}
```

---

## Complete File Structure

```
src/
├── components/
│   ├── navigation/
│   │   ├── WidgetSidebar.tsx           # Main sidebar (903 lines)
│   │   └── EdgeTriggerZone.tsx         # Edge swipe trigger (52 lines)
│   ├── ui/
│   │   └── TradingSessionIndicator.tsx # Session indicator
│   ├── theme/
│   │   └── ThemeToggle.tsx             # Theme toggle (33 lines)
│   └── dashboard/
│       └── DashboardUserRole.tsx       # User role display
├── hooks/
│   ├── useTopSignalProviders.ts        # Provider data (150+ lines)
│   ├── useDeviceDetection.ts           # Device info (120+ lines)
│   ├── useKeyboardShortcuts.ts         # Keyboard events (37 lines)
│   └── useAuthorizationAware.ts        # Permissions
├── utils/
│   ├── pipsCalculator.ts               # Pip calculations
│   └── environment.ts                  # URL helpers
├── contexts/
│   └── AuthContext.tsx                 # Authentication
├── index.css                           # Global styles + animations
└── tailwind.config.ts                  # Design tokens
```

---

## Full Component Implementation

### WidgetSidebar.tsx (Complete - 903 lines)

```typescript
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  BookOpen, Calendar, Calculator, Brain, Search, Scale, 
  ChevronRight, Sparkles, User, BarChart3, Settings, 
  Shield, LogOut, X, Bell, GraduationCap, MessageSquare, 
  Target, Trophy 
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TradingSessionIndicator } from "@/components/ui/TradingSessionIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";
import { DashboardUserRole } from "@/components/dashboard/DashboardUserRole";
import { EdgeTriggerZone } from "./EdgeTriggerZone";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTopSignalProviders, TopProvider } from "@/hooks/useTopSignalProviders";
import { getAcademyAppUrl, getOrderFlowAppUrl } from "@/utils/environment";

// Trading tools configuration
const tradingTools = [
  {
    name: "Trading Journal",
    icon: BookOpen,
    description: "Log and analyze your trades with AI-powered feedback.",
    route: "/dashboard/advanced-tools?tool=journal"
  },
  {
    name: "Economic Calendar",
    icon: Calendar,
    description: "Stay ahead of market-moving events and news releases.",
    route: "/dashboard/advanced-tools?tool=calendar"
  },
  {
    name: "Risk Calculator",
    icon: Calculator,
    description: "Calculate position size, risk, and potential profit.",
    route: "/dashboard/advanced-tools?tool=calculator"
  },
  {
    name: "Trade Analyst",
    icon: Brain,
    description: "Upload screenshots for deep performance analysis.",
    route: "/dashboard/advanced-tools?tool=analyst"
  },
  {
    name: "Opportunity Scanner",
    icon: Search,
    description: "Scan markets for high-probability trading setups.",
    route: "/dashboard/advanced-tools?tool=scanner"
  },
  {
    name: "Risk Simulator",
    icon: Scale,
    description: "Simulate trade setups to assess risk before you enter.",
    route: "/dashboard/advanced-tools?tool=simulator"
  },
  {
    name: "Pattern Stream",
    icon: Bell,
    description: "Live trading signals and market alerts.",
    route: "/dashboard/signal-stream"
  },
  {
    name: "Education",
    icon: GraduationCap,
    description: "Courses, videos and learning pathways.",
    route: getAcademyAppUrl(),
    external: true
  },
  {
    name: "Community",
    icon: MessageSquare,
    description: "Forum, discussions and networking.",
    route: getOrderFlowAppUrl(),
    external: true
  },
  {
    name: "Tools",
    icon: Target,
    description: "Advanced trading calculators and analyzers.",
    route: "/dashboard/advanced-tools"
  }
];

interface WidgetSidebarProps {
  className?: string;
}

export function WidgetSidebar({ className = "" }: WidgetSidebarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Authorization checks
  const { isAdmin, isEducator, isEducatorPlus, isModerator } = useAuthorizationAware();
  const canAccessAdminPanel = isAdmin || isEducatorPlus || isEducator || isModerator;

  // Fetch top signal providers
  const { topProviders, isLoading: isLoadingProviders } = useTopSignalProviders();

  // Device detection
  const deviceInfo = useDeviceDetection();
  const { isMobile, isTouchDevice } = deviceInfo;

  // Location for bottom nav detection
  const location = useLocation();

  // Dynamic sidebar dimensions
  const getSidebarDimensions = () => {
    const { viewportWidth, viewportHeight, deviceCategory, isMobile, isTablet, isDesktop } = deviceInfo;
    
    let width = 256;
    if (isMobile) {
      if (deviceCategory === 'xs') {
        width = Math.floor(viewportWidth * 0.70);
      } else if (deviceCategory === 'sm') {
        width = Math.floor(viewportWidth * 0.75);
      } else {
        width = Math.floor(viewportWidth * 0.80);
      }
      width = Math.max(240, Math.min(320, width));
    } else if (isTablet) {
      width = 288;
    } else {
      width = 384;
    }
    
    let headerHeight = 0;
    let bottomNavHeight = 0;
    let top = 0;
    
    if (isDesktop) {
      headerHeight = 80;
      top = 80;
      bottomNavHeight = 0;
    } else if (isTablet) {
      headerHeight = 0;
      top = 0;
      bottomNavHeight = 0;
    } else {
      headerHeight = 0;
      top = 0;
      
      const PAGES_WITH_BOTTOM_NAV = [
        '/dashboard/signal-stream',
        '/dashboard/advanced-tools'
      ];
      
      const hasBottomNav = PAGES_WITH_BOTTOM_NAV.some(
        page => location.pathname === page || location.pathname.startsWith(page + '?')
      );
      bottomNavHeight = hasBottomNav ? 64 : 0;
    }
    
    const height = viewportHeight - headerHeight;
    
    return { width, height, top, bottomNavHeight };
  };

  const dimensions = getSidebarDimensions();

  // Swipe detection refs
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const prevVisibleRef = useRef(false);

  // Force refetch when sidebar opens
  useEffect(() => {
    if (isVisible && !prevVisibleRef.current) {
      queryClient.invalidateQueries({ queryKey: ['top-signal-providers'] });
      setAnimationKey(prev => prev + 1);
    }
    prevVisibleRef.current = isVisible;
  }, [isVisible, queryClient]);

  const handleToggleSidebar = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);
  
  const handleCloseSidebar = useCallback(() => {
    setIsVisible(false);
    if (isTouchDevice && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [isTouchDevice]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onCloseSidebar: handleCloseSidebar,
    isEnabled: true
  });

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isVisible) {
        handleCloseSidebar();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible, handleCloseSidebar]);

  const handleToolClick = (tool: typeof tradingTools[0]) => {
    setActiveTool(tool.name);
    if (tool.external) {
      window.location.href = tool.route;
    } else {
      navigate(tool.route);
    }
  };

  // Swipe-to-close detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isVisible) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  }, [isVisible]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isVisible) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndTime = Date.now();
    const swipeDistance = touchStartX.current - touchEndX;
    const swipeTime = touchEndTime - touchStartTime.current;
    const swipeVelocity = swipeDistance / swipeTime;

    if (swipeDistance > 80 || swipeVelocity > 0.5) {
      handleCloseSidebar();
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }
    }
  }, [isVisible, handleCloseSidebar]);

  const handleClose = () => {
    handleCloseSidebar();
  };

  // Provider Widget Component
  const ProviderWidget = React.memo(({ provider, rank }: { provider: TopProvider; rank: 1 | 2 | 3 }) => {
    const getRankEmoji = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1: return "🥇";
        case 2: return "🥈";
        case 3: return "🥉";
      }
    };

    const getRankBorder = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1: return "border-yellow-500/40";
        case 2: return "border-gray-400/40";
        case 3: return "border-orange-500/40";
      }
    };

    const getRankGlow = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1: return "shadow-lg shadow-yellow-500/30";
        case 2: return "shadow-md shadow-gray-400/20";
        case 3: return "shadow-md shadow-orange-500/20";
      }
    };

    const formatRoleDisplay = (userType: string) => {
      switch (userType) {
        case 'educator+': return 'EDUCATOR+';
        case 'educator': return 'EDUCATOR';
        case 'admin': return 'ADMIN';
        case 'moderator': return 'MODERATOR';
        default: return userType.toUpperCase();
      }
    };

    const isFullWidth = rank === 1;
    const avatarSize = isFullWidth ? "w-10 h-10" : "w-8 h-8";
    const nameSize = isFullWidth ? "text-sm" : "text-xs";
    const pipsSize = isFullWidth ? "text-base" : "text-sm";
    const pipsSuffix = isFullWidth ? "text-xs" : "text-[10px]";
    const signalSize = isFullWidth ? "text-xs" : "text-[10px]";
    const emojiSize = isFullWidth ? "text-2xl" : "text-xl";
    const cardPadding = isFullWidth ? "p-3" : "p-2";

    return (
      <div 
        className={`
          provider-widget-animated relative bg-black/50 backdrop-blur-md rounded-xl 
          ${cardPadding} border ${getRankBorder(rank)} ${getRankGlow(rank)} 
          pointer-events-none transition-all duration-300
        `}
        style={{ animationDelay: `${rank * 0.1}s` }}
      >
        <div className={`absolute ${isFullWidth ? 'top-2 right-2' : 'top-1.5 right-1.5'}`}>
          <span className={emojiSize}>{getRankEmoji(rank)}</span>
        </div>

        <div className={`flex justify-center ${isFullWidth ? 'mb-2' : 'mb-1.5 mt-4'}`}>
          <div className={`${avatarSize} rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0`}>
            {provider.avatarUrl ? (
              <img src={provider.avatarUrl} alt={provider.displayName} className="w-full h-full object-cover" />
            ) : (
              <User className={`${isFullWidth ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} />
            )}
          </div>
        </div>

        <div className="text-center mb-1">
          <span className={`${nameSize} ${isFullWidth ? 'font-bold' : 'font-semibold'} text-white truncate block px-1`}>
            {provider.displayName}
          </span>
        </div>

        <div className={`flex justify-center ${isFullWidth ? 'mb-2' : 'mb-1.5'}`}>
          <span className={`text-[${isFullWidth ? '10px' : '9px'}] text-gray-400 uppercase tracking-wider font-semibold`}>
            {formatRoleDisplay(provider.userType)}
          </span>
        </div>

        {isFullWidth ? (
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className={`${pipsSize} font-bold ${provider.totalPips >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
              {provider.totalPips >= 0 ? '+' : ''}{provider.totalPips.toFixed(1)}
              <span className={`${pipsSuffix} text-gray-400 font-normal`}>pips</span>
              {provider.totalPips >= 0 && <span className='text-sm'>🟢</span>}
            </div>
            <div className={`${signalSize} text-foreground`}>
              {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-0.5">
              <div className={`${pipsSize} font-bold ${provider.totalPips >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center justify-center gap-1`}>
                {provider.totalPips >= 0 ? '+' : ''}{provider.totalPips.toFixed(1)}
                <span className={`${pipsSuffix} text-gray-400 font-normal`}>pips</span>
                {provider.totalPips >= 0 && <span className='text-xs'>🟢</span>}
              </div>
            </div>
            <div className={`text-center text-foreground ${signalSize}`}>
              {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    );
  });

  // Widget Tool Component
  const WidgetTool = ({ tool }: { tool: typeof tradingTools[0] }) => {
    const Icon = tool.icon;

    const renderWidgetContent = () => {
      switch (tool.name) {
        case "Trading Journal":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex flex-col">
                <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  <div className="h-1 sm:h-1.5 bg-blue-400 dark:bg-blue-600 rounded w-3/4 opacity-70"></div>
                  <div className="h-1 sm:h-1.5 bg-green-400 dark:bg-green-600 rounded w-full opacity-60"></div>
                  <div className="h-1 sm:h-1.5 bg-purple-400 dark:bg-purple-600 rounded w-2/3 opacity-50"></div>
                </div>
              </div>
            </div>
          );

        case "Economic Calendar":
          return (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-indigo-100 dark:to-purple-100 rounded-lg overflow-hidden p-1 sm:p-2">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 h-full">
                {[...Array(14)].map((_, i) => (
                  <div 
                    key={i}
                    className={`
                      rounded-sm sm:rounded 
                      ${i === 4 ? 'bg-red-500 shadow-lg shadow-red-500/50' : 
                        i === 9 ? 'bg-yellow-500 shadow-md shadow-yellow-500/30' : 
                        'bg-white/20 dark:bg-gray-800/30'}
                    `}
                  />
                ))}
              </div>
            </div>
          );

        case "Risk Calculator":
          return (
            <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 dark:from-emerald-100 dark:to-teal-100 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 flex items-center justify-around p-2"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-1 h-3/4 bg-emerald-400 dark:bg-emerald-600 rounded-full"></div>
                <div className="w-1 h-1/2 bg-teal-400 dark:bg-teal-600 rounded-full"></div>
                <div className="w-1 h-2/3 bg-cyan-400 dark:bg-cyan-600 rounded-full"></div>
              </motion.div>
              <Calculator className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
            </div>
          );

        case "Trade Analyst":
          return (
            <div className="w-full h-full bg-gradient-to-br from-violet-800 to-fuchsia-900 dark:from-violet-100 dark:to-fuchsia-100 rounded-lg flex flex-col items-center justify-center p-2">
              <div className="w-full h-full border-2 border-dashed border-white/40 dark:border-gray-700/40 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white dark:text-gray-800" />
              </div>
            </div>
          );

        case "Opportunity Scanner":
          return (
            <div className="w-full h-full bg-gradient-to-br from-orange-800 to-red-900 dark:from-orange-100 dark:to-red-100 rounded-lg relative overflow-hidden flex items-center justify-center">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Search className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
            </div>
          );

        case "Risk Simulator":
          return (
            <div className="w-full h-full bg-gradient-to-br from-cyan-800 to-blue-900 dark:from-cyan-100 dark:to-blue-100 rounded-lg relative overflow-hidden flex items-center justify-center">
              <motion.div
                className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-cyan-400/50"
                animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <Scale className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800 relative z-10" />
            </div>
          );

        case "Pattern Stream":
          return (
            <div className="w-full h-full bg-gradient-to-br from-pink-800 to-rose-900 dark:from-pink-100 dark:to-rose-100 rounded-lg flex items-center justify-center relative">
              <motion.div
                className="absolute top-2 right-2 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <Bell className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
            </div>
          );

        case "Education":
          return (
            <div className="w-full h-full bg-gradient-to-br from-blue-800 to-indigo-900 dark:from-blue-100 dark:to-indigo-100 rounded-lg flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 2, 0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
              </motion.div>
            </div>
          );

        case "Community":
          return (
            <div className="w-full h-full bg-gradient-to-br from-green-800 to-emerald-900 dark:from-green-100 dark:to-emerald-100 rounded-lg flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
              </motion.div>
            </div>
          );

        case "Tools":
          return (
            <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 dark:from-amber-100 dark:to-orange-100 rounded-lg flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Target className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
              </motion.div>
            </div>
          );

        default:
          return (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 rounded-lg flex items-center justify-center">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white dark:text-gray-800" />
            </div>
          );
      }
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="col-span-1 h-20 sm:h-24 md:h-28 lg:h-32 bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:bg-card/80"
        onClick={() => handleToolClick(tool)}
      >
        <div className="flex flex-col h-full">
          {renderWidgetContent()}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Edge trigger zone */}
      <EdgeTriggerZone
        onTrigger={handleToggleSidebar}
        isVisible={isVisible}
        edgeWidth={isMobile ? 50 : 35}
      />

      {/* Backdrop overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseSidebar}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 0.8
            }}
            className="fixed left-0 z-40 nav-glass-effect overflow-y-auto scrollbar-hide"
            style={{
              top: `${dimensions.top}px`,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              paddingBottom: `${dimensions.bottomNavHeight}px`
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="p-4 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Today's Trading Arsenal
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-background/50 hover:bg-background/80 border border-border/50 hover:border-border text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trading Session Indicator */}
              <div className="mb-6">
                <TradingSessionIndicator className="w-full" />
              </div>

              {/* Top Providers Leaderboard */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Top Providers (7-day)
                  </h3>
                </div>

                {isLoadingProviders ? (
                  <div className="text-sm text-muted-foreground">Loading providers...</div>
                ) : topProviders.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3" key={animationKey}>
                    <div className="col-span-2">
                      <ProviderWidget provider={topProviders[0]} rank={1} />
                    </div>
                    {topProviders[1] && (
                      <ProviderWidget provider={topProviders[1]} rank={2} />
                    )}
                    {topProviders[2] && (
                      <ProviderWidget provider={topProviders[2]} rank={3} />
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No providers yet</div>
                )}
              </div>

              {/* Quick Access Tools */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Quick Access Tools
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {tradingTools.map((tool) => (
                    <WidgetTool key={tool.name} tool={tool} />
                  ))}
                </div>
              </div>

              {/* Profile Section */}
              <div className="border-t border-border/30 pt-6 mt-auto">
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/40 hover:bg-card/60 border border-border/30 hover:border-primary/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 text-left overflow-hidden">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {user?.user_metadata?.display_name || 'User'}
                    </div>
                    <DashboardUserRole className="text-xs text-muted-foreground" />
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <div className="flex items-center justify-between mt-3 px-2">
                  <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 text-foreground/80 hover:text-foreground transition-all duration-200 w-full group"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Settings</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  
                  <ThemeToggle />
                </div>

                {canAccessAdminPanel && (
                  <button
                    onClick={() => navigate('/dashboard/admin')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-primary/20 hover:border-primary/30 transition-all duration-200 mt-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Admin Tools</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/30 text-destructive font-semibold transition-all duration-200 mt-4 hover:shadow-lg hover:shadow-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

## Usage & Integration

### Installation

```tsx
// In your main dashboard layout
import { WidgetSidebar } from "@/components/navigation/WidgetSidebar";

export function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <WidgetSidebar />
      {/* Your dashboard content */}
    </div>
  );
}
```

### Keyboard Shortcuts

- **Ctrl/Cmd + \\**: Toggle sidebar
- **Escape**: Close sidebar

### Gestures

- **Edge Swipe**: Swipe from left edge to open
- **Swipe Left**: Close sidebar (when open)

---

This documentation provides 100% copy-paste ready visual specifications for every element in the WidgetSidebar component.
