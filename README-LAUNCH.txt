SPROUT CALCULATOR — HOW TO LAUNCH LOCALLY
==========================================

1. Double-click launch-local.bat

2. If Windows shows a security warning, click "Run anyway"
   (this is normal for .bat files downloaded from the internet)

3. The calculator will open in your browser automatically at:
   http://localhost:3000

4. A separate terminal window will stay open — that is the server.
   Do not close it while you are using the calculator.
   When you are done, close that terminal window to stop the server.


IF IT DOES NOT OPEN AUTOMATICALLY
──────────────────────────────────
Open your browser manually and go to:
  http://localhost:3000


IF YOU SEE "Node.js is not installed"
──────────────────────────────────────
1. Go to https://nodejs.org
2. Download and install the LTS version
3. Restart your computer
4. Double-click launch-local.bat again


WHY YOU CANNOT JUST OPEN index.html DIRECTLY
─────────────────────────────────────────────
The calculator uses JavaScript modules (import/export).
Browsers block these when opening files directly from your computer.
The local server gets around this — it serves files the same way
a website does, so modules load correctly.


TROUBLESHOOTING
───────────────
Port already in use:
  Another program is using port 3000.
  Either close it, or open a different tab at http://localhost:3000
  (the calculator may already be running from a previous launch).

Nothing happens when double-clicking:
  Right-click launch-local.bat → Run as administrator

Still not working:
  Open a Command Prompt (not PowerShell), navigate to this folder,
  and run: node server.js
  Then open http://localhost:3000 in your browser.
