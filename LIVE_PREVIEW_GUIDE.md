# 🚀 Live Preview Guide - See Your Edits Instantly!

This guide will help you set up a live preview so you can see your changes in real-time as you edit your code.

## Step-by-Step Instructions

### Step 1: Install Dependencies (First Time Only)
If you haven't installed dependencies yet, run:
```bash
npm install
```
or if you're using bun:
```bash
bun install
```

### Step 2: Start the Development Server
Run this command in your terminal:
```bash
npm run dev
```
or with bun:
```bash
bun run dev
```

### Step 3: Open Your Browser
Once the server starts, you'll see output like:
```
  VITE v5.4.1  ready in 500 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://[::]:8080/
```

**Open your browser and go to:** `http://localhost:8080`

### Step 4: Start Editing!
Now you can:
- ✨ Edit any file in `src/` directory
- 💾 Save your changes (Ctrl+S or Cmd+S)
- 🔄 **Watch your browser automatically update** - no refresh needed!

## How It Works

Vite uses **Hot Module Replacement (HMR)** which means:
- ✅ Changes appear instantly in your browser
- ✅ Your app state is preserved (no page reload)
- ✅ Only the changed components update
- ✅ Fast refresh for React components

## Tips for Best Experience

1. **Keep the terminal open** - The dev server needs to keep running
2. **Check the browser console** - Any errors will show there
3. **Network access** - If you want to access from another device on your network, use the Network URL shown in terminal
4. **Stop the server** - Press `Ctrl+C` in the terminal when you're done

## Troubleshooting

### Port Already in Use?
If port 8080 is busy, you can change it in `vite.config.ts`:
```typescript
server: {
  port: 3000, // Change to any available port
}
```

### Changes Not Showing?
- Make sure you saved the file (Ctrl+S / Cmd+S)
- Check the browser console for errors
- Try a hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Need to Restart?
If something goes wrong, stop the server (Ctrl+C) and run `npm run dev` again.

## What Files Trigger Live Updates?

- ✅ All `.tsx`, `.ts` files in `src/`
- ✅ CSS files
- ✅ Component files
- ✅ Configuration files (may require restart)

Enjoy your live preview! 🎉
