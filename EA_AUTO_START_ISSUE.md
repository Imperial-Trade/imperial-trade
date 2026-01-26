# ⚠️ EA Auto-Start Issue - Investigation

## 🔍 **Problem:**

Even with `[ExpertAdvisors]` section in `launch.ini`, the EA is **not auto-loading**:
- ❌ No EA logs in container
- ❌ No heartbeat sent
- ❌ Connection status remains `connecting`
- ❌ No trades synced

---

## 🔍 **Possible Causes:**

1. **MT5 launch.ini Format:**
   - `[ExpertAdvisors]` section might not be the correct format
   - MT5 might require different configuration

2. **EA Location:**
   - EA might not be in the correct location
   - MT5 might not be finding the EA file

3. **EA Auto-Start Method:**
   - MT5 might require EA to be attached to a chart
   - Or EA needs to be in a specific folder with specific naming

---

## 🔧 **Next Steps:**

1. Verify EA file exists in container
2. Check MT5's actual auto-start mechanism
3. Test alternative EA loading methods
4. Check if EA needs to be manually attached

---

## 📋 **Alternative Approaches:**

1. **Use MT5's auto-start feature** (if available)
2. **Manually attach EA** via script
3. **Use MT5's Expert folder** with specific naming
4. **Check MT5 documentation** for EA auto-start
