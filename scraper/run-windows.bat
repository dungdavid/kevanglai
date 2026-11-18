@echo off
rem Keo Vang Lai Da Nang - scraper launcher for Windows.
rem   run-windows.bat           first run: install + Facebook login, then crawl (window stays open)
rem   run-windows.bat auto      unattended crawl for Task Scheduler (headless, no pause, logs to data\crawl.log)
rem   run-windows.bat watch     crawl every WATCH_INTERVAL_MINUTES in this window
rem   run-windows.bat discover  search Facebook for more groups (new groups are added DISABLED)
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo [ERROR] Node.js not found. Install from https://nodejs.org then run again. & if /i not "%~1"=="auto" pause & exit /b 1)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [SETUP] Created scraper\.env - fill API_BASE and INGEST_SECRET, save, then run again.
  notepad ".env"
  pause
  exit /b 0
)

if not exist "node_modules" (
  echo [SETUP] Installing packages...
  call npm install || (pause & exit /b 1)
  echo [SETUP] Installing Chromium for Playwright...
  call npx playwright install chromium || (pause & exit /b 1)
)

if not exist ".fb-profile" (
  if /i "%~1"=="auto" (echo [ERROR] Not logged in yet. Run run-windows.bat once by hand first. & exit /b 1)
  echo.
  echo [LOGIN] A Chromium window will open. Log in to Facebook ^(use a secondary account^),
  echo         join the badminton group, then CLOSE the window to continue.
  call npm run login || (pause & exit /b 1)
)

if /i "%~1"=="auto" (
  if not exist "data" mkdir data
  set HEADLESS=true
  echo ==== %date% %time% ==== >> data\crawl.log
  call npm run crawl >> data\crawl.log 2>&1
  exit /b %errorlevel%
)
if /i "%~1"=="discover" call npm run discover
if /i "%~1"=="watch" (call npm run watch) else (call npm run crawl)

echo.
echo [DONE] Finished. Press any key to close.
pause >nul
