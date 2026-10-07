# 🎬 Nuvio StreamBDIX

**Native on-device BDIX streaming plugins for Nuvio.**

---

## 🔍 What It Does

This is a complete suite of native Nuvio plugins that scrape BDIX FTP and streaming sites. 

**Say goodbye to the PC Node server!** Unlike the legacy Stremio addon, these plugins run entirely **on-device** (inside Nuvio's QuickJS engine on your TV or Android phone). They directly fetch cleartext `http://` streams from the BDIX network you are connected to.

• Automatically resolves TMDB IDs to titles/years  
• Scrapes multiple BDIX sources natively  
• Sorts and presents streams directly in Nuvio's UI  
• No companion apps, no PC servers, no Shizuku required

---

## ⚡ Installation

Because these plugins fetch from local cleartext HTTP IPs, you **MUST** use a sideloaded or GitHub-distributed build of Nuvio (Play Store builds disable plugins for compliance).

1. Open your sideloaded **Nuvio** app (TV or Mobile).
2. Navigate to **Settings → Content & Discovery → Plugins**.
3. Tap **Add Repository** and paste the following raw manifest URL:
   ```text
   https://raw.githubusercontent.com/benzophury/nuvio-streambdix/main/nuvio-plugin/manifest.json?v=11
   ```
4. Enable the BDIX providers you want (DhakaFlix, DFLIX, etc.).
5. Search for any movie or TV show and enjoy native local streaming!

---

## 🌐 Supported Sources

- **DhakaFlix** (Concurrently searches all nodes `172.16.50.4` to `.15`)
- **DFLIX** (`movies.discoveryftp.net`)
- **RoarZone** (`play.roarzone.info`)
- **FTPBD** (`media.ftpbd.net:8096`)
- **CircleFTP** (`new.circleftp.net`)
- **ICC FTP** (`10.16.100.244`)

---

## 🏗️ Architecture & Development

All scrapers are written in JavaScript and bundled via `esbuild`. 
The `nuvio-plugin/` directory contains the source code for the Nuvio JS providers.

To modify or build the plugins yourself:
```bash
cd nuvio-plugin
npm install
npm run build
```

*(Note: The legacy Node.js Stremio addon has been officially retired in favor of this native on-device plugin architecture).*
