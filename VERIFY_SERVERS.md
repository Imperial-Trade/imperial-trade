# Server Verification Guide

## Issues Fixed
✅ Removed duplicate `ECMarketsLtd-Demo`

## How to Verify Servers

### Quick Manual Test (Recommended)
1. Open frontend (localhost:8080)
2. Go to broker connection form
3. Test each server with your EC Markets credentials:
   - Account: 81071266
   - Password: Imperial@2026
   - Try each server one by one

### Results to Record
- ✅ Working servers (connection succeeds)
- ❌ Failed servers (connection fails)

### Next Steps
After verification, we'll:
1. Remove non-working servers
2. Order by success rate (most common first)
3. Implement auto-detection with verified servers only

**I can't test directly, but you can test manually or we can create a script you run.**
