$serverScript = Join-Path $PSScriptRoot "start_server.ps1"
Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File ""$serverScript""" -WindowStyle Hidden

# Esperar a que el servidor localhost levante
Start-Sleep -Seconds 3

# Lanzar Chrome limpio en modo app contra localhost
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--app=http://localhost:8080 --kiosk"
