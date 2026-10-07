# StreamBDIX Nuvio Plugin (Phase 0 Spike)

This plugin ports the DhakaFlix scraper directly into a Nuvio plugin so it can run **on-device** (TV or mobile) within the same network as your BDIX providers. 

**Say goodbye to the PC Node server!** The scraper runs inside Nuvio's QuickJS engine and talks to `http://172.16.50.14` locally.

## Why this architecture?
- **No companion apps, no Shizuku, no forks, no Node.js server.** 
- Nuvio pulls this `manifest.json` once, downloads the JS scrapers, and executes them on the phone/TV itself.
- Because it's on-device, `fetch()` commands in the scraper automatically resolve local IPs like `172.16.50.14`.

## Prerequisites
Store-distributed builds of Nuvio disable the plugin system for compliance. You MUST use a **sideloaded/full build** from the Nuvio GitHub releases (TV or Mobile APK).

## Installation

1. Open your sideloaded Nuvio app (TV or Mobile).
2. Go to **Settings → Content & Discovery → Plugins**.
3. Paste the raw URL of the `manifest.json`. For example, if you host this repository on GitHub:
   `https://raw.githubusercontent.com/<YOUR_USERNAME>/NuvioXStreamBDIX/main/nuvio-plugin/manifest.json`
4. Enable the **DhakaFlix** provider.
5. Search for a title (e.g. "Fight Club") and enjoy local streaming!

## Developer Spike (Building & Testing)
This folder contains the Phase 0 spike to test cleartext LAN HTTP fetching in Nuvio's plugin engine. 

### To build the plugin:
```bash
cd nuvio-plugin
npm install
npm run build
```
*(This bundles `src/dhakaflix/index.js` into a standalone script in `providers/dhakaflix.js` using esbuild).*

### TMDB Meta Resolution
Nuvio sends a TMDB ID, but these LAN FTP sources need title searches. We've built an on-device TMDB scraper in `src/utils.js`. If you encounter Cloudflare blocks, you can optionally supply a TMDB API key at the top of `src/utils.js`.

### Next Steps
If this spike succeeds and video plays properly:
1. We will port the remaining 5 scrapers (CircleFTP, DFLIX, RoarZone, FTPBD, ICC FTP).
2. The Node.js Stremio addon in `StreamBDIX` will be fully retired and deleted.
3. No parallel Kotlin apps or Shizuku hacks are needed. 
