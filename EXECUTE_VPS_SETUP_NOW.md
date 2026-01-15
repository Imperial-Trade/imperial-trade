# 🚀 Execute VPS Setup - Copy & Paste Ready

## ⚡ Quick Execute Command

**Open Terminal in Cursor (Cmd+J) and run:**

```bash
ssh root@209.222.12.247
```

**When prompted for password, paste:**
```
eJ)3-BJ9p9RsF2S$
```

**Once logged in (you'll see `root@vultr:~#`), paste this ENTIRE command:**

```bash
apt update && apt upgrade -y && apt install docker.io golang-go wine64 wine32:i386 xvfb unzip wget -y && systemctl enable --now docker && dpkg --add-architecture i386 && apt update && mkdir -p /root/imperial-factory/{mt5-master,brain,config,logs} && docker --version && go version && wine --version && echo "✅ Setup complete!"
```

## ✅ Expected Output

You should see:
```
Docker version 20.x.x
go version go1.18.x
wine-5.0.x
✅ Setup complete!
```

## 📋 What This Does

1. Updates system packages
2. Installs Docker, Go, Wine, Xvfb
3. Enables Docker service
4. Sets up 32-bit architecture (required for Wine)
5. Creates directory structure:
   - `/root/imperial-factory/mt5-master/`
   - `/root/imperial-factory/brain/`
   - `/root/imperial-factory/config/`
   - `/root/imperial-factory/logs/`
6. Verifies installations

---

## 🎯 After Setup Completes

Once you see "✅ Setup complete!", tell me:
**"The foundation is installed. Now proceed to create the Docker MT5 image and the Go Brain."**

Then I'll create:
1. Dockerfile setup for MT5 image
2. Go Brain orchestrator code
3. All remaining components
