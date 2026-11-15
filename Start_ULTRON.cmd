@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS from https://nodejs.org/en/download then try again.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org/en/download then try again.
  pause
  exit /b 1
)
echo Starting ULTRON. First setup downloads the official Electron runtime directly.
echo No npm install is required. This window stays open until ULTRON closes.
echo Startup details are saved in ULTRON-startup.log beside this file.
node bootstrap.cjs >ULTRON-startup.log 2>&1
if errorlevel 1 goto failed
exit /b 0
:failed
type ULTRON-startup.log
echo.
echo Startup failed. Share ULTRON-startup.log from this folder for diagnosis.
pause
exit /b 1
