@echo off
rem Keo Vang Lai Da Nang - scraper launcher for Windows.
rem Double-click to run. First run: installs packages, opens Chromium for Facebook login,
rem discovers groups, then crawls. Later runs: crawl only.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo [ERROR] Node.js not found. Install from https://nodejs.org then run again. & pause & exit /b 1)

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
  echo.
  echo [LOGIN] A Chromium window will open. Log in to Facebook ^(use a secondary account^),
  echo         join the badminton groups, then CLOSE the window to continue.
  call npm run login || (pause & exit /b 1)
  echo [DISCOVER] Searching Da Nang badminton groups...
  call npm run discover || (pause & exit /b 1)
)

if /i "%~1"=="discover" call npm run discover
if /i "%~1"=="watch" (call npm run watch) else (call npm run crawl)

echo.
echo [DONE] Finished. Press any key to close.
pause >nul
