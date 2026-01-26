# Run the app on your mobile device

## Option A: Tunnel (works on any network, no firewall setup)

This exposes your dev server via a public URL. **Use this if `http://192.168.1.x:8081` does not work.**

### 1. Install deps (once)

```bash
npm install
```

### 2. Start dev + tunnel

```bash
npm run dev:mobile
```

If you see “Port 8081 is in use”, stop the other app using 8081, or run: `lsof -ti:8081 | xargs kill`

- **v** = Vite on `http://localhost:8081`
- **t** = Tunnel; when it’s ready it will print a URL like:
  ```text
  your url is: https://abc-xyz-123.loca.lt
  ```

### 3. On your phone

1. Open the **tunnel URL** (e.g. `https://abc-xyz-123.loca.lt`) in the browser.
2. If you see “Click to continue” or a similar page, tap it once; then the app should load.

You can use Wi‑Fi or mobile data; the tunnel works from anywhere.

---

## Option B: Same Wi‑Fi (no tunnel)

Use this only if your phone and computer are on the same Wi‑Fi and your firewall allows port 8081.

### 1. Start the dev server

```bash
npm run dev
```

In the terminal you’ll see something like:

```text
  ➜  Local:   http://localhost:8081/
  ➜  Network: http://192.168.1.105:8081/
```

### 2. On your phone

1. Connect the phone to the **same Wi‑Fi** as your computer.
2. In the browser, open the **Network** URL (e.g. `http://192.168.1.105:8081/`).  
   Do **not** use `http://localhost:8081/` on the phone; that points to the phone itself.

### 3. If it still doesn’t load

- **Firewall:** Allow inbound connections on port **8081** for Node/vite:
  - **macOS:** System Settings → Network → Firewall → Options → add/allow Node.
  - **Windows:** Windows Defender Firewall → Advanced → Inbound rules → New Rule → Port → TCP 8081.
- **Correct IP:** Use the exact **Network** URL from the `npm run dev` output.  
  To check your computer’s IP:
  - **macOS (Wi‑Fi):** `ipconfig getifaddr en0`
  - **Windows:** `ipconfig` → “IPv4 Address” of your Wi‑Fi adapter.

---

## Scripts

| Script          | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `npm run dev`   | Vite only on `http://localhost:8081` (and the Network URL if available) |
| `npm run dev:tunnel` | Tunnel only. Run **after** `npm run dev` in another terminal.       |
| `npm run dev:mobile` | Vite + tunnel in one command. Use the printed tunnel URL on your phone. |
