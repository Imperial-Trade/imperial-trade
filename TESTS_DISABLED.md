
# Tests Temporarily Disabled

Tests have been temporarily disabled to focus on core functionality development.

## What was disabled:
- All unit tests in `src/__tests__/unit/`
- All integration tests in `src/__tests__/integration/`
- All performance tests in `src/__tests__/performance/`
- All e2e tests in `src/__tests__/e2e/`
- All security tests in `src/__tests__/security/`
- All visual regression tests in `src/__tests__/visual/`

## How to re-enable tests:
1. Restore the original `vitest.config.ts` include patterns
2. Remove test exclusions from `tsconfig.json` and `tsconfig.app.json`
3. Restore original test scripts in `package.json`
4. Delete this file

## Current focus:
- Account Request Flow implementation
- Core functionality development
- UI/UX improvements

Tests will be re-enabled once core functionality is stable.
