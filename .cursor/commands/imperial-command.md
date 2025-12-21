# Imperial Trade - Project Commands

## format-pnl
Format all PnL values in a component to exactly 2 decimal places.
Usage: `/format-pnl [file-path]`
- Finds all instances of `pnl`, `PnL`, `totalPnL`, `monthlyPnL`, `dayPnl`
- Replaces with `.toFixed(2)` version
- Updates display code, tooltips, and calculations

## check-supabase-query
Verify a Supabase query follows project patterns.
Usage: `/check-supabase-query [query-code]`
- Checks for proper error handling
- Verifies loading states
- Confirms use of correct hooks/utilities
- Suggests improvements

## add-dark-mode
Add dark mode support to a component.
Usage: `/add-dark-mode [file-path]`
- Adds `dark:` variants to all color classes
- Uses `isDarkMode` from theme context if needed
- Ensures contrast and readability

## create-edge-function
Generate a new Supabase Edge Function template.
Usage: `/create-edge-function [function-name]`
- Creates `supabase/functions/[name]/index.ts`
- Includes CORS headers import
- Adds proper TypeScript types
- Includes error handling structure

## deploy-edge-function
Provide deployment instructions for an Edge Function.
Usage: `/deploy-edge-function [function-name]`
- Checks if function uses shared modules
- Provides CLI command if needed
- Warns about MCP limitations
- Includes verification steps

## check-component-structure
Verify component follows project conventions.
Usage: `/check-component-structure [file-path]`
- Checks file location matches naming convention
- Verifies TypeScript interfaces for props
- Confirms error handling
- Validates styling patterns

## find-related-components
Find components that might be affected by a change.
Usage: `/find-related-components [component-name]`
- Searches for imports of the component
- Finds components using similar patterns
- Identifies shared state/hooks
- Lists potential impact areas

## validate-navigation
Check if navigation route exists and is properly configured.
Usage: `/validate-navigation [route-path]`
- Verifies route in `App.tsx`
- Checks if route is protected
- Confirms navigation method (Link vs useNavigate)
- Validates authentication requirements
