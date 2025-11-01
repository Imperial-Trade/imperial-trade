# OrderFlow - Complete Imperial Trade Source

This folder contains a **complete copy** of the Imperial Trade `src` directory, including the full WidgetSidebar with real-time provider ranking functionality.

## 🏆 Provider Ranking System

### How It Works

The **$1-3 Providers** section in the WidgetSidebar displays the top 3 signal providers based on **total pips gained in the last 24 hours**. This ranking is calculated in real-time and updates automatically.

### Key Features

1. **Real-Time Updates**
   - Subscribes to Supabase `trade_alerts` table changes
   - Automatically refetches data every 5 minutes
   - Instantly reflects when new signals are closed

2. **Calculation Logic** (`src/hooks/useTopSignalProviders.ts`)
   - Fetches all closed signals from the last 24 hours
   - Only counts **profitable signals** (where TP was hit)
   - Calculates pips using `calculatePipsForSignal()` utility
   - Ranks providers by total pips in descending order
   - Returns top 3 providers with full metadata

3. **Provider Filtering**
   - Only includes users with these roles:
     - `admin` (highest priority)
     - `educator+`
     - `educator`
     - `moderator`

4. **Ranking Display**
   - 🥇 **Rank 1**: Gold gradient border, yellow glow, largest display
   - 🥈 **Rank 2**: Silver gradient border, gray glow
   - 🥉 **Rank 3**: Bronze gradient border, orange glow

### Data Shown Per Provider

```typescript
{
  rank: 1 | 2 | 3;           // Provider position
  userId: string;            // User ID
  displayName: string;       // Display name
  avatarUrl: string | null;  // Avatar image
  userType: string;          // Role badge (admin, educator+, etc.)
  totalPips: number;         // Total pips gained in last 24h
  signalCount: number;       // Number of closed signals
  winRate: number;           // Win rate percentage
}
```

## 📦 Complete File Structure

### Core Components

- **WidgetSidebar**: `src/components/navigation/WidgetSidebar.tsx` (886 lines)
- **Provider Ranking Hook**: `src/hooks/useTopSignalProviders.ts` (242 lines)
- **Top Provider Card**: `src/components/leaderboard/TopProviderCard.tsx` (147 lines)
- **Pips Calculator**: `src/utils/pipsCalculator.ts` (70 lines)
- **Pip Calculations**: `src/utils/pipCalculations.ts` (103 lines)

### Directory Structure

```
src/
├── components/
│   ├── navigation/
│   │   └── WidgetSidebar.tsx          ← Main sidebar with provider display
│   ├── leaderboard/
│   │   └── TopProviderCard.tsx        ← Reusable provider card
│   └── [30+ other component folders]
├── hooks/
│   ├── useTopSignalProviders.ts       ← Provider ranking calculation
│   └── [80+ other hooks]
├── utils/
│   ├── pipsCalculator.ts              ← Pips calculation wrapper
│   ├── pipCalculations.ts             ← Core pip math
│   └── [other utilities]
├── pages/
│   └── dashboard/
│       └── signal-stream/
│           └── SignalStream.tsx       ← Live signal integration
├── domain/                            ← DTOs and entities
├── api/                               ← API services
├── contexts/                          ← React contexts
├── services/                          ← Business logic services
└── [complete application structure]
```

## 🔄 Will It Work in Other Repositories?

### ✅ YES - The provider ranking will work in other repositories IF:

1. **Same Supabase Instance**
   - The other repository connects to the **same Supabase project**
   - Copy the `.env` file with these variables:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

2. **Same Database Structure**
   - The `trade_alerts` table exists with the same schema
   - The `user_profiles` table exists with role information
   - All necessary tables and relationships are set up

3. **Required Dependencies Installed**
   - React, TypeScript, Vite
   - Supabase client library
   - TailwindCSS for styling
   - All other dependencies from `package.json`

### How to Use in Another Repository

1. **Copy this entire `src` folder** to your new repository
2. **Copy the `.env` file** (or set environment variables)
3. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```
4. **Ensure Supabase configuration** matches the imperial-trade project
5. **The ranking will automatically sync** across all repositories using the same Supabase instance

### Real-Time Synchronization

Since all repositories connect to the **same Supabase database**:
- When a signal provider closes a trade in **any** repository
- The `trade_alerts` table is updated
- **All repositories** using this code will see the updated ranking within 5 minutes (or instantly via real-time subscription)

This means the $1-3 providers display will be **consistent across all apps** using this codebase!

## 🎯 Pips Calculation System

### Asset Classes Supported

| Asset Type | Pip Size | Examples |
|------------|----------|----------|
| Forex (default) | 0.0001 | EUR/USD, GBP/USD, AUD/USD |
| JPY pairs | 0.01 | USD/JPY, EUR/JPY, GBP/JPY |
| Gold | 0.1 | XAU/USD |
| Bitcoin | 1.0 | BTC/USD |
| Indices | 1.0 | US30, NAS100, SPX500 |

### Calculation Method

```typescript
// For BUY signals
pips = (currentPrice - entryPrice) / pipSize

// For SELL signals
pips = (entryPrice - currentPrice) / pipSize
```

Only **profitable signals** count toward provider ranking!

## 🚀 Integration Points

The provider ranking integrates with:

1. **Signal Stream** (`src/pages/dashboard/signal-stream/SignalStream.tsx`)
   - Live pip calculations when TPs are hit
   - Modern notification system with pip data

2. **Leaderboard** (`src/components/leaderboard/TopProviderCard.tsx`)
   - Standalone card component for dashboards
   - Can be used independently of WidgetSidebar

3. **Real-time Price Updates**
   - WebSocket integration for live price data
   - Instant pip calculations as prices change

## 📝 Notes

- This is a **complete, standalone copy** of the imperial-trade src folder
- All components are self-contained and functional
- No modifications needed for basic functionality
- Provider ranking works out-of-the-box with proper Supabase configuration

## 🔧 Maintenance

To keep this folder in sync with imperial-trade updates:

```bash
# From imperial-trade root directory
cp -r src/* orderflow/src/
```

Or set up automated sync if needed.

---

**Last Updated**: November 1, 2025
**Source**: Imperial Trade Main Repository
**Version**: Complete Feature Set with Real-Time Provider Ranking
