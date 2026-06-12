@echo off
title OVERHEAD — Live Sky Projector
echo.
echo  ██████  ██╗   ██╗███████╗██████╗ ██╗  ██╗███████╗ █████╗ ██████╗
echo  ██╔══██╗██║   ██║██╔════╝██╔══██╗██║  ██║██╔════╝██╔══██╗██╔══██╗
echo  ██║  ██║██║   ██║█████╗  ██████╔╝███████║█████╗  ███████║██║  ██║
echo  ██║  ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══██║██╔══╝  ██╔══██║██║  ██║
echo  ██████╔╝ ╚████╔╝ ███████╗██║  ██║██║  ██║███████╗██║  ██║██████╔╝
echo  ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝
echo.
echo  Live Sky Projector — Starting...
echo.

:: Start the CORS proxy in a new window
start "OVERHEAD Proxy" cmd /k "node proxy.js"

:: Wait 2 seconds for proxy to initialise
timeout /t 2 /nobreak > nul

:: Start the file server in a new window
start "OVERHEAD Server" cmd /k "npx serve ."

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak > nul

:: Open the app in Chrome
start chrome "http://localhost:3000/OVERHEAD.html"

echo  Proxy running on localhost:3001
echo  App running on localhost:3000
echo.
echo  Opening Chrome...
echo  You can close this window.
