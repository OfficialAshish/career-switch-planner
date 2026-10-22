@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 LTS or newer is required. Install it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])^<24)process.exit(1)"
if errorlevel 1 (
  echo Please upgrade to Node.js 24 or newer.
  pause
  exit /b 1
)
node scripts/install.mjs
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
if not defined PORT set PORT=4317
node scripts/launch.mjs
if errorlevel 1 goto failed
exit /b 0
:failed
echo Startup failed. Read the message above. Your data folder was not deleted.
pause
exit /b 1
