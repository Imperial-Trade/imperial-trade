================================================================================
                    COMPLETE GUIDE FOR YOUR PC
================================================================================

This file has EVERYTHING you need to compile the EA on your Windows PC.

FULL GUIDE IS IN: PC_SESSION_COMPLETE_GUIDE.md (in this same folder)

OR just follow these quick steps below:

================================================================================
STEP 1: DOWNLOAD METAEDITOR (2 minutes)
================================================================================

1. Go to: https://www.mql5.com/en/download
2. Download MetaEditor (free, ~50MB)
3. Install it

================================================================================
STEP 2: COMPILE THE EA (3 minutes)
================================================================================

1. Open MetaEditor
2. File → New → Expert Advisor
3. Name it: ImperialSync
4. Delete all default code
5. Copy the EA code from: ImperialSync.mq5 (in this folder)
   OR from PC_SESSION_COMPLETE_GUIDE.md

6. Press F7 to compile
7. Look for: "0 error(s), 0 warning(s)"

8. Find the compiled file:
   - Press Windows Key + R
   - Type: %APPDATA%\MetaQuotes\Terminal\Common\MQL5\Experts
   - Press Enter
   - Copy ImperialSync.ex5 to Desktop

================================================================================
STEP 3: EXTRACT SPEED FILES (10 minutes)
================================================================================

EC MARKETS:
1. Download from: https://ecmarkets.com/mt5-download
2. Install and open once
3. Copy: C:\Program Files\EC Markets MT5\config\servers.dat
4. Paste to Desktop, rename to: ec-servers.dat

XS.COM:
1. Download from: https://xs.com/mt5
2. Install and open once
3. Copy: C:\Program Files\XS MT5\config\servers.dat
4. Paste to Desktop, rename to: xs-servers.dat

================================================================================
STEP 4: TRANSFER TO MAC (2 minutes)
================================================================================

You should have 3 files on Desktop:
- ImperialSync.ex5
- ec-servers.dat
- xs-servers.dat

Transfer to Mac:
- Email them to yourself
- Use Google Drive/Dropbox
- Use USB drive

================================================================================
STEP 5: UPLOAD TO VPS (On Mac)
================================================================================

Once files are on Mac Desktop, run:

cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
./upload-to-vps.sh

================================================================================
THAT'S IT!
================================================================================

Total time: ~17 minutes
Cost: FREE

For detailed instructions, see: PC_SESSION_COMPLETE_GUIDE.md
