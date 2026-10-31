ADHD PLANNER — SETUP AND HANDOFF NOTES
=====================================

Thank you for your purchase. This is a calm, offline-first budget planner.
Everything runs in your browser. There is no account, no login, no server,
no bank connection, and no tracking. Your data stays on your device.


1. WHAT IS IN THE FOLDER
------------------------

  index.html        The planner itself. This is the file you open.
  styles.css        Colours, layout, night mode, print styles.
  app.js            All planner logic and the demo-mode settings.
  README-SETUP.txt  This file.

Keep all four files together in the same folder. The app will not load
correctly if index.html is separated from styles.css and app.js.


2. OPENING THE PLANNER
----------------------

  Easiest: double-click index.html. It opens in your default browser and
  works immediately, with no internet connection.

  If your browser refuses to save data when opened this way (a few
  browsers restrict local storage on file:// pages), do one of these:

    - Use Chrome, Edge, or Firefox and open index.html directly.
    - Put the folder on any static web host (Netlify Drop, GitHub Pages,
      your own website). There is no backend and nothing to install.
    - For local testing only, run a simple static file server from this
      folder and visit the address it prints. For example, if you have
      Python:  python -m http.server 8000
      Then open http://localhost:8000/

  The planner does not need a server, a database, a build step, or an
  internet connection. Hosting is only a workaround for browsers that
  block local storage on file:// pages.

  First run: the Setup screen appears. Enter a display name (optional),
  your currency symbol, the month you want to start with, and an optional
  starting balance. You can change all of this later in Settings.


3. DEMO MODE — IMPORTANT BEFORE YOU SELL OR SHARE
-------------------------------------------------

This copy ships in demo mode. Demo mode is ON so buyers can try the
planner before buying the full version.

  - There are exactly 10 free changes.
  - Saving a new entry, saving an edit, deleting something, marking a
    bill or task done, adding or renaming a category, archiving,
    restoring a backup, and erasing data each use one change.
  - Moving between months, opening screens, changing the theme, changing
    night mode, changing currency, and changing your display name are
    free and do not use a change.
  - When the 10 changes are used, a locked banner appears with one button
    to the Etsy listing. Data-changing controls are disabled. Viewing and
    printing still work.
  - The used-change count is stored in the browser and survives reloads.
  - Loading or clearing the fictional sample data does not use a change.

To turn demo mode OFF for the paid version, open app.js in any plain text
editor (Notepad, TextEdit, VS Code) and find the settings near the top:

    const DEMO_MODE = true;

Change it to:

    const DEMO_MODE = false;

Save the file and reload the planner. The banner, the change counter,
and the 10-change limit disappear. All data-changing controls work
without limits. No other code changes are needed.

You can confirm the setting by searching app.js for DEMO_MODE. Leave
DEMO_CHANGE_LIMIT at 10; it is ignored when demo mode is off.


4. REPLACE THE ETSY LINK
------------------------

The demo banner links to a placeholder. Before publishing, replace it
with your real listing URL. Open app.js and find:

    const ETSY_LISTING_URL = "https://www.etsy.com/listing/000000000/replace-with-your-listing-url";

Replace the URL between the quotes with your own Etsy listing address.
Keep the quotes and the semicolon. Save the file.

If you sell somewhere other than Etsy, you can use that URL instead.
You may also want to reword the button text, which is in the demo banner
section of app.js: "Get the full planner on Etsy".


5. CHANGE THE PRODUCT NAME (OPTIONAL)
-------------------------------------

The planner is named "ADHD Planner" throughout. To rename it, open app.js
and change:

    const PRODUCT_NAME = "ADHD Planner";

Use your own product name, keeping the quotes. This updates the sidebar,
the mobile header, the browser tab title, the printed summary heading,
and the backup file's app name.

For a fully consistent rename, also update these places:

  index.html   <title>...</title>
               <meta name="description" ...>
               The "ADHD Planner" text inside #mobile-title and #brand-name
               (the app overwrites the visible brand name on load, but
               updating the HTML keeps things tidy).

  README-SETUP.txt  The title at the top, if you like.

Do not rename the storage keys in app.js. They are internal identifiers
and changing them would make existing saved data appear lost.


6. WHERE DATA IS SAVED
----------------------

All planner data is saved in your browser's localStorage for this site.
Nothing is uploaded. There is no cloud sync between devices and no
multi-user access.

  - The data belongs to one browser on one device.
  - Clearing the browser's site data, cookies, or "cookies and other
    site data" removes the planner data.
  - Private/incognito windows usually discard data when closed.
  - Different browsers and different devices each have separate data.
  - Moving the folder to another computer does not move the data.
  - The only supported way to move data is a backup file (below).

The planner states this in Settings and in the sidebar footer so buyers
are not surprised.


7. BACKUP AND RESTORE
---------------------

  Backup:   Settings > Download a backup. This downloads a JSON file named
            adhd-planner-backup-YYYY-MM-DD.json. Keep it somewhere safe.

  Restore:  Settings > Restore backup. Choose a JSON file you downloaded
            from this planner. Restoring replaces the current data, so
            download a backup first if you want to keep what is there.

  Moving devices: download a backup on the old device, transfer the JSON
  file, open the planner on the new device, and restore the file.

  The backup is plain JSON. It is readable by anyone who opens it, so
  treat it like a personal document.


8. USING THE PLANNER
--------------------

Screens in the sidebar:

  Home        Month overview: money in, money out, safe to spend, bills,
              goals, and quick actions.
  Today       A short list of what needs attention now.
  Calendar    Bills and repeating items. Repeats can be daily, weekly,
              every two weeks, twice a month, or monthly. You can delete
              one occurrence or the whole series.
  Goals       Savings goals with target dates and monthly amounts needed.
  Savings     Savings funds and logged contributions.
  Debt        Debts, balances, payments, and a payoff estimate.
  Envelopes   Monthly category budgets, a yearly review, and a
              transaction log.
  Settings    Name, currency, theme, night mode, sample data, backup,
              restore, archive, erase, and demo status.

  Track spending is available from every screen: use the sidebar button,
  the mobile + button, or the floating Track button.

Calculations are shown with breakdowns rather than hidden totals:

  Money in        Logged income when income entries exist for the month;
                  otherwise the expected income you entered.
  Money out       Logged spending plus bills marked paid in that month.
  Safe to spend   Money in minus money out minus unpaid bills still due
                  this month. If that would be negative, the planner shows
                  zero and a separate shortfall amount so the gap is clear.
  Rollover        Prior month money in minus money out, never below zero,
                  carried forward from your start month. The starting
                  balance applies only to the start month.
  Yearly totals   The sum of the twelve monthly figures as displayed,
                  including rollover and starting balance.
  Savings         Monthly amount needed to reach a goal by its date.
  Debt            Estimated payoff based on the payment you enter.
  Category left   Budget minus spent, with an "over" amount when spent is
                  higher.

Money is displayed with your chosen currency symbol. Amounts are entered
as plain numbers. Nothing is connected to a bank, so all figures are the
ones you type or log.


9. APPEARANCE, ACCESSIBILITY, AND PRINTING
------------------------------------------

  - Light mode is the default. Night mode is in Settings.
  - Themes: Calm Teal, Soft Sage, Warm Sand, Slate Blue, Coral Light,
    and a custom accent colour.
  - Layouts work at phone, tablet, and desktop widths. Tables turn into
    stacked cards on small screens.
  - Labels are visible, errors are written in plain language, focus
    outlines are visible, and buttons are at least 44px tall.
  - Status is never shown by colour alone; text labels accompany colour.
  - Keyboard: Tab moves through controls, Enter activates buttons, and
    Escape closes dialogs.
  - Printing prints only the monthly summary, not the navigation or
    surrounding screen. Use Home > Print monthly summary. Turn on
    "Background graphics" in the print dialog if you want the shaded
    areas to appear.


10. SAMPLE DATA
---------------

The planner starts empty on purpose. Settings includes a fictional sample
data option so buyers can see how a filled-in planner looks. It uses
invented names and amounts (for example "Jordan", "Student card",
"Car loan", and "Emergency cushion"). Loading or clearing the sample does
not use a demo change. Clearing the sample removes the fictional name too.

Never put real customer data in the sample.


11. WHAT THIS PLANNER DOES NOT DO
---------------------------------

  - No bank connections or automatic imports
  - No CSV, PDF, or spreadsheet import/export (backup is JSON)
  - No investment, tax, or financial advice
  - No accounts, logins, multi-user access, or cloud sync
  - No notifications, emails, or reminders outside the app
  - No analytics, tracking pixels, external fonts, or remote assets

The planner is a budgeting aid, not financial advice. All figures come
from what the user enters.


12. QUICK PRE-PUBLISH CHECKLIST
-------------------------------

  [ ] Replace ETSY_LISTING_URL in app.js with your real listing.
  [ ] Decide whether to rename PRODUCT_NAME.
  [ ] Set DEMO_MODE to false for the paid/full copy, or leave it true
      for the free trial copy. Do not ship the full version with demo
      mode on by mistake.
  [ ] Open index.html and click through every screen once.
  [ ] Add one income, one spending entry, one bill, one goal, one fund,
      and one debt. Confirm the totals and breakdowns look right.
  [ ] Download a backup and restore it to confirm the flow.
  [ ] Print a monthly summary and check the print preview.
  [ ] Check the layout at a narrow phone width and at desktop width.
  [ ] Confirm the sidebar footer and Settings both say data stays on
      the device.
  [ ] If you changed the product name, update the title and description
      in index.html as well.

There are no other placeholders. No frameworks, build tools, external
APIs, webfonts, or remote files are used. The folder is ready to zip and
deliver once the Etsy URL and demo setting are set the way you want.
