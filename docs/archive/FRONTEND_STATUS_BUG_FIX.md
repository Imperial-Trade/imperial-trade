# Frontend Status Display Bug - Fixed

## Issue
The frontend was showing "Connected" or "Connecting" even when the connection had an error.

## Root Cause
The status logic checked `status === 'connecting'` before checking if `data.last_error` exists. So connections with status='connecting' and an error would show "Connecting to MT5..." instead of the error message.

## Fix Applied
Updated the condition to prioritize error checking. Now if `data.last_error` exists, it will always show the error message, regardless of the status value.

---

**The fix ensures errors are always displayed when present, even if the status is 'connecting'.**
