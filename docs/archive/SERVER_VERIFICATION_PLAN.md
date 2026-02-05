# 🔍 Server List Verification Plan

## Current Server Lists

### EC Markets (7 servers listed)
From `AutoJournalView.tsx`:
1. `ECMarketsLtd-Demo` ⚠️ **DUPLICATE** (appears twice in list)
2. `ECMarkets-MT5-Demo`
3. `ECMarkets-MT5-Live01`
4. `ECMarketsLtd-Demo` ⚠️ **DUPLICATE**
5. `ECMarketsLtd-Live01`
6. `ECMarketsLtd-Live02`
7. `ECMarketsLtd-Live03`

### XS.com (4 servers listed)
1. `XS.com-Demo`
2. `XS.com-Live`
3. `XS.com-MT5-Demo`
4. `XS.com-MT5-Live`

### PU Prime (5 servers listed)
1. `PUPrime-Demo`
2. `PUPrime-Live`
3. `PUPrime-Live01`
4. `PUPrime-MT5-Demo`
5. `PUPrime-MT5-Live`

---

## ⚠️ Issues Found

1. **EC Markets has duplicate**: `ECMarketsLtd-Demo` appears twice
2. **No verification**: None of these servers are verified to work
3. **Mixed formats**: Some use `-MT5-`, some don't

---

## 🔍 Verification Options

### Option 1: Manual Testing (Recommended)
**For each broker, test with demo credentials:**

```bash
# Test EC Markets servers
# Use demo account credentials
# Try each server one by one
```

**Pros:**
- Most accurate
- Can verify which servers actually exist

**Cons:**
- Time-consuming
- Requires demo credentials for each broker

---

### Option 2: Programmatic Testing
**Create a test script that tries each server:**

1. Use test/demo credentials
2. Call `test-broker-connection` Edge Function for each server
3. Record which servers succeed/fail
4. Update server lists based on results

**Pros:**
- Automated
- Can test all servers quickly

**Cons:**
- Requires valid test credentials
- May hit rate limits
- Some servers might not exist

---

### Option 3: Broker Documentation
**Check broker websites/documentation:**

1. EC Markets: Check their official server list
2. XS.com: Check their official server list  
3. PU Prime: Check their official server list

**Pros:**
- Most reliable source
- Official information

**Cons:**
- May not be publicly available
- Format might differ from MT5 internal names

---

## ✅ Recommended Approach

**Step 1: Clean Up Lists**
- Remove duplicate `ECMarketsLtd-Demo`
- Organize by priority (most common first)

**Step 2: Test with Real Credentials**
- Use your existing EC Markets credentials
- Test each EC Markets server
- Record which ones work

**Step 3: Create Test Script**
- Script to test all servers programmatically
- Use demo accounts if available
- Log results

**Step 4: Update Code**
- Remove non-working servers
- Order by success rate
- Add comments for verified servers

---

## 🚀 Next Steps

1. **Clean duplicate** in EC Markets list
2. **Create test script** to verify servers
3. **Test with your credentials** (EC Markets)
4. **Update server lists** based on results
5. **Document verified servers**

---

**Would you like me to:**
1. Clean up the duplicate?
2. Create a test script?
3. Help you test servers with your credentials?
