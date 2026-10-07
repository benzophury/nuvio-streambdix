# How to Install StreamBDIX in Nuvio

Welcome! If you want to watch BDIX content on your phone or Android TV, you've come to the right place. 

Because StreamBDIX connects directly to local BDIX servers on your WiFi/LAN network, everything happens right on your device. You don't need a PC, you don't need Node.js, and you don't need Stremio.

Just follow these simple steps to get set up!

---

## Step 1: Get the Right Version of Nuvio

Google Play Store policies do not allow apps to install external plugins. This means **the official Play Store version of Nuvio will NOT work**. 

You must download the **"Sideloaded" (GitHub) version**:
1. Go to the [Nuvio Releases Page on GitHub](https://github.com/NuvioMedia/NuvioTV/releases) (or their mobile equivalent).
2. Download the latest `.apk` file for your device. 
   - If you have an Android TV or Firestick, download the TV APK.
   - If you have an Android phone or tablet, download the Mobile APK.
3. Install the APK on your device. *(You may need to allow "Install from Unknown Sources" in your Android settings).*

## Step 2: Open Plugin Settings

1. Open the **Nuvio** app.
2. Navigate to **Settings** (usually a gear icon).
3. Scroll down and select **Content & Discovery**.
4. Select **Plugins** (or "Providers").

## Step 3: Add the StreamBDIX Repository

In the Plugins menu, you will see an option to add a new repository or manifest URL.

1. Click **Add Repository** (or the **+** button).
2. A text box will appear asking for a URL.
3. Carefully type or paste this exact link:
   ```text
   https://raw.githubusercontent.com/benzophury/nuvio-streambdix/main/manifest.json?v=11
   ```
4. Hit **Submit** or **Done**.

## Step 4: Enable Your Providers

After adding the URL, Nuvio will read the file and discover all the BDIX streaming sources we support. 

You should now see a list of providers like:
- DhakaFlix
- CircleFTP
- DFLIX
- RoarZone
- FTPBD
- ICC FTP

**Flip the switch to "On"** for the servers that your ISP supports! 
*(Note: Not all ISPs support all BDIX servers. If a server doesn't load streams for you, your ISP likely doesn't have a route to it. Just turn that specific one off).*

## Step 5: Start Watching!

You are completely done! 🎉

1. Go back to Nuvio's home screen.
2. Search for any Movie or TV Show (e.g., "Inception" or "Breaking Bad").
3. Click on it, and Nuvio will automatically search your enabled BDIX servers.
4. Click a stream and enjoy high-speed bufferless playback directly from your local network!
