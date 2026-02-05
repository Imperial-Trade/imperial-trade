# 🚀 How to Start the Dev Server

## ⚠️ **Issue: Connection Refused**

The dev server didn't start. Here's how to start it correctly:

---

## ✅ **Method 1: Using npx vite (Recommended)**

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
npx vite --host 0.0.0.0 --port 8080
```

This will:
- Start Vite dev server
- Listen on port 8080
- Accept connections from all interfaces

---

## ✅ **Method 2: Check package.json scripts**

The `package.json` in the root might be for a different service. 

Check if there's a `dev` script:
```bash
npm run dev
```

If that doesn't work, use Method 1 (npx vite directly).

---

## 📋 **After Starting:**

1. Wait for: "VITE ready in XXXms"
2. You'll see: "➜ Local: http://localhost:8080/"
3. Open browser to: http://localhost:8080

---

## 🔧 **Troubleshooting:**

If port 8080 is busy:
```bash
# Kill any process on port 8080
lsof -ti:8080 | xargs kill -9

# Then start again
npx vite --host 0.0.0.0 --port 8080
```

---

Let me start it for you now! 🚀
