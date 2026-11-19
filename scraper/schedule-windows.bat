@echo off
rem Registers a Windows scheduled task that runs the scraper every 10 minutes
rem (06:00-23:30 is when badminton posts are written; the task simply runs all day).
rem   schedule-windows.bat          create / update the task
rem   schedule-windows.bat remove   delete the task
chcp 65001 >nul
setlocal
set "TASK=KeoVangLai Scraper"
set "RUNNER=%~dp0run-windows.bat"

if /i "%~1"=="remove" (
  schtasks /Delete /F /TN "%TASK%"
  pause
  exit /b
)

if not exist "%~dp0.fb-profile" (
  echo [ERROR] Run run-windows.bat by hand once first ^(Facebook login^), then run this again.
  pause
  exit /b 1
)

schtasks /Create /F /SC MINUTE /MO 10 /TN "%TASK%" /TR "\"%RUNNER%\" auto" || (pause & exit /b 1)
echo.
echo [OK] Task "%TASK%" created: the scraper now runs every 10 minutes while you are logged in to Windows.
echo      Log file: %~dp0data\crawl.log
echo      Run it right now:  schtasks /Run /TN "%TASK%"
echo      Remove it:         schedule-windows.bat remove
pause
