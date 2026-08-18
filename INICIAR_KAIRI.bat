@echo off
title K.A.I.R.I. - SISTEMA OPERATIVO
color 0b
echo =======================================================
echo              SISTEMAS K.A.I.R.I. Mk V
echo =======================================================
echo.
echo Iniciando el servidor local de KAIRI en segundo plano...
start /B powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
echo.
echo Esperando inicializacion del nucleo (3 segundos)...
timeout /t 3 /nobreak >nul
echo.
echo Lanzando interfaz grafica...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:8080" --kiosk
exit
