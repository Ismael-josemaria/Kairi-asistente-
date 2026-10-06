$port = 8080
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevando privilegios para permitir acceso externo..." -ForegroundColor Yellow
    try {
        Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
        exit
    } catch {
        Write-Host "No se pudieron elevar los privilegios. Iniciando en modo local solamente." -ForegroundColor Red
    }
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    
    public static string GetActiveWindowTitle() {
        const int nChars = 256;
        StringBuilder Buff = new StringBuilder(nChars);
        IntPtr handle = GetForegroundWindow();
        if (GetWindowText(handle, Buff, nChars) > 0)
        {
            return Buff.ToString();
        }
        return null;
    }
}
"@

Add-Type -AssemblyName System.Web

$listener = New-Object System.Net.HttpListener
if ($isAdmin) {
    $listener.Prefixes.Add("http://+:$port/")
} else {
    $listener.Prefixes.Add("http://localhost:$port/")
}

try {
    $listener.Start()
    if ($isAdmin) {
        Write-Host "K.A.I.R.I. Core Bridge activado externamente en el puerto $port" -ForegroundColor Cyan
    } else {
        Write-Host "K.A.I.R.I. Core Bridge activado en http://localhost:$port" -ForegroundColor Cyan
    }
    Write-Host "Esperando directivas del núcleo web..."
    [System.Diagnostics.Process]::Start("chrome", "--app=http://localhost:$port --kiosk")
} catch {
    Write-Host "ERROR CRÍTICO: No se pudo iniciar el servidor en el puerto $port." -ForegroundColor Red
    Write-Host "Es posible que otra aplicación ya esté utilizando este puerto." -ForegroundColor Yellow
    Write-Host "Cierre la aplicación conflictiva y vuelva a intentarlo." -ForegroundColor Yellow
    Read-Host "Presione Enter para salir"
    exit
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    # CORS Headers para permitir conexiones desde el navegador local
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

    if ($request.HttpMethod -eq "OPTIONS") {
        $response.StatusCode = 200
        $response.Close()
        continue
    }

    $path = $request.Url.LocalPath.TrimStart('/')
    
    # ------------------ API DEL SISTEMA (HOST BRIDGE) ------------------
    if ($path.StartsWith("api/shutdown")) {
        Write-Host "Iniciando secuencia de apagado del sistema..." -ForegroundColor Red
        shutdown /s /t 15
        
        $json = '{"status":"success", "message":"Apagando sistema en 15 segundos"}'
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }
    
    if ($path.StartsWith("api/cancel_shutdown")) {
        Write-Host "Cancelando secuencia de apagado del sistema." -ForegroundColor Green
        shutdown /a
        
        $json = '{"status":"success", "message":"Apagado cancelado"}'
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/media")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $action = $query["action"]
        
        $obj = New-Object -com wscript.shell
        if ($action -eq "playpause") {
            $obj.SendKeys([char]179) 
        } elseif ($action -eq "next") {
            $obj.SendKeys([char]176) 
        } elseif ($action -eq "prev") {
            $obj.SendKeys([char]177)
        }
        
        $json = '{"status":"success", "message":"Media control executed"}'
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/listdir")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $targetPath = $query["path"]
        
        if ([string]::IsNullOrEmpty($targetPath)) {
            $targetPath = (Get-Item $PSScriptRoot).Root.FullName
        }

        try {
            $items = Get-ChildItem -Path $targetPath -ErrorAction Stop | Select-Object Name, @{Name="IsFolder";Expression={$_.PSIsContainer}}
            $jsonItems = @()
            foreach ($item in $items) {
                $type = if ($item.IsFolder) { "folder" } else { "file" }
                $name = $item.Name -replace '"','\"'
                $jsonItems += '{"name":"' + $name + '", "type":"' + $type + '"}'
            }
            $jsonStr = "[" + ($jsonItems -join ",") + "]"
            $json = '{"status":"success", "path":"' + ($targetPath -replace '\\','\\') + '", "items":' + $jsonStr + '}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo acceder a la ruta especificada"}'
        }

        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/processes")) {
        try {
            $procs = Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, CPU
            $jsonItems = @()
            foreach ($proc in $procs) {
                $name = $proc.Name -replace '"','\"'
                $cpu = if ($proc.CPU) { [math]::Round($proc.CPU, 2) } else { 0 }
                $jsonItems += '{"name":"' + $name + '", "cpu":' + $cpu + '}'
            }
            $jsonStr = "[" + ($jsonItems -join ",") + "]"
            $json = '{"status":"success", "processes":' + $jsonStr + '}'
        } catch {
            $json = '{"status":"error", "message":"Error leyendo procesos"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/games")) {
        try {
            # 1. Liberar Memoria RAM cerrando navegadores en segundo plano
            Stop-Process -Name "chrome", "msedge", "brave", "firefox" -Force -ErrorAction SilentlyContinue
            
            # 2. Flush DNS
            ipconfig /flushdns | Out-Null

            # 3. Conectar a la red conocida más fuerte
            $available = netsh wlan show networks | Select-String "SSID" | ForEach-Object { ($_ -split ":")[1].Trim() }
            $profiles = netsh wlan show profiles | Select-String ":" | ForEach-Object { ($_ -split ":")[1].Trim() }
            
            $target = $null
            foreach ($net in $available) {
                if ($profiles -contains $net -and $net -ne "") {
                    $target = $net
                    break
                }
            }

            $msg = "Modo juego activado. Memoria liberada y caché de red limpia. "
            if ($target) {
                netsh wlan connect name="$target" | Out-Null
                $msg += "Conexión enrutada a la red óptima: $target."
            } else {
                $msg += "Manteniendo la conexión de red actual."
            }

            $json = '{"status":"success", "message":"' + $msg + '"}'
        } catch {
            $json = '{"status":"error", "message":"Error iniciando el protocolo games"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/open")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $app = $query["app"]
        $targetPath = $query["path"]
        try {
            if ($targetPath) {
                Start-Process "explorer.exe" $targetPath
                $json = '{"status":"success", "path":"' + $targetPath + '"}'
            } else {
                if ($app -eq "notepad") { Start-Process "notepad.exe" }
                elseif ($app -eq "calculator") { Start-Process "calc.exe" }
                elseif ($app -eq "spotify") { Start-Process "spotify.exe" }
                elseif ($app -eq "chrome") { Start-Process "chrome" }
                elseif ($app -eq "explorer") { Start-Process "explorer.exe" }
                elseif ($app -eq "downloads") { Start-Process "explorer.exe" "$env:USERPROFILE\Downloads" }
                elseif ($app -eq "documents") { Start-Process "explorer.exe" "$env:USERPROFILE\Documents" }
                elseif ($app -eq "desktop") { Start-Process "explorer.exe" "$env:USERPROFILE\Desktop" }
                elseif ($app -eq "pokemon") { Start-Process "explorer.exe" (Join-Path $PSScriptRoot "..\..\Pokemon Krystal\index.html") }
                elseif ($app -eq "space_basket") { Start-Process "explorer.exe" (Join-Path $PSScriptRoot "..\SPACE BASKET\index.html") }
                elseif ($app -eq "valorant") { Start-Process "riotclient://launch/valorant/live" }
                elseif ($app -eq "lol") { Start-Process "riotclient://launch/league_of_legends/live" }
                $json = '{"status":"success", "app":"' + $app + '"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo lanzar la app ' + $app + '"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/brightness")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $level = $query["level"]
        try {
            $levelInt = [int]$level
            if ($levelInt -lt 0) { $levelInt = 0 }
            if ($levelInt -gt 100) { $levelInt = 100 }
            $wmi = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods
            if ($wmi) { $wmi | Invoke-WmiMethod -Name WmiSetBrightness -ArgumentList 1, $levelInt | Out-Null }
            $json = '{"status":"success", "message":"Brillo ajustado al ' + $levelInt + '%"}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo ajustar el brillo (quizas no es un portátil)."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/launch_generic")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $app = $query["app"]
        try {
            Start-Process $app -ErrorAction Stop
            $json = '{"status":"success", "message":"Aplicación iniciada: ' + $app + '"}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo iniciar la aplicación ' + $app + '. Verifica que esté instalada."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/cinema")) {
        try {
            $wmi = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods
            if ($wmi) { $wmi | Invoke-WmiMethod -Name WmiSetBrightness -ArgumentList 1, 30 | Out-Null }
            Stop-Process -Name "msedge", "brave", "firefox" -Force -ErrorAction SilentlyContinue
            $json = '{"status":"success", "message":"Modo Cine activado."}'
        } catch {
            $json = '{"status":"error", "message":"Error al activar Modo Cine."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/network_scan")) {
        try {
            $arp = arp -a | Select-String "dinámico|dynamic"
            $count = if ($arp) { ($arp | Measure-Object).Count } else { 0 }
            $json = '{"status":"success", "devices":' + $count + ', "message":"' + $count + ' dispositivos detectados en la red local."}'
        } catch {
            $json = '{"status":"error", "message":"Fallo en el escáner de red local."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/memory/save")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $key = $query["key"]
        $val = $query["value"]
        
        $memFile = Join-Path $PSScriptRoot "kairi_memory.json"
        try {
            $memData = @{}
            if (Test-Path $memFile) {
                $memData = Get-Content $memFile -Raw | ConvertFrom-Json
            }
            $k = $key.ToLower().Trim()
            $memData | Add-Member -MemberType NoteProperty -Name $k -Value $val -Force
            $memData | ConvertTo-Json -Depth 10 | Set-Content $memFile -Encoding UTF8
            $json = '{"status":"success", "message":"Memoria guardada."}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo escribir en el cortex de memoria."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/memory/search")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $q = $query["q"].ToLower().Trim()
        
        $memFile = Join-Path $PSScriptRoot "kairi_memory.json"
        try {
            if (Test-Path $memFile) {
                $memData = Get-Content $memFile -Raw | ConvertFrom-Json
                $matchKey = $null
                $matchVal = $null
                
                foreach ($prop in $memData.psobject.properties) {
                    if ($prop.name -match $q -or $q -match $prop.name) {
                        $matchKey = $prop.name
                        $matchVal = $prop.value
                        break
                    }
                }
                
                if ($matchKey) {
                    $matchVal = $matchVal -replace '"', '\"'
                    $json = '{"status":"success", "found":true, "value":"' + $matchVal + '"}'
                } else {
                    $json = '{"status":"success", "found":false}'
                }
            } else {
                $json = '{"status":"success", "found":false}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo acceder a la memoria."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/volume")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $action = $query["action"]
        try {
            $wshell = New-Object -ComObject wscript.shell
            if ($action -eq "up") { 
                for($i=0; $i -lt 5; $i++) { $wshell.SendKeys([char]175) } 
            }
            elseif ($action -eq "down") { 
                for($i=0; $i -lt 5; $i++) { $wshell.SendKeys([char]174) } 
            }
            elseif ($action -eq "mute") { 
                $wshell.SendKeys([char]173) 
            }
            $json = '{"status":"success", "action":"' + $action + '"}'
        } catch {
            $json = '{"status":"error", "message":"Error controlando audio"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }
    if ($path.StartsWith("api/clipboard")) {
        try {
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                Set-Clipboard -Value $body
                $json = '{"status":"success", "message":"Copiado al portapapeles"}'
            } else {
                $clip = Get-Clipboard -Raw -ErrorAction SilentlyContinue
                if ($clip) {
                    $escaped = $clip -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
                    $json = '{"status":"success", "text":"' + $escaped + '"}'
                } else {
                    $json = '{"status":"success", "text":""}'
                }
            }
        } catch {
            $json = '{"status":"error", "message":"Error accediendo al portapapeles"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/observer")) {
        try {
            # Obtener ventana activa
            $activeWindow = [Win32]::GetActiveWindowTitle()
            if (-not $activeWindow) { $activeWindow = "Desconocido" }
            
            # Obtener portapapeles reciente (último texto copiado)
            $clip = Get-Clipboard -Raw -ErrorAction SilentlyContinue
            if (-not $clip) { $clip = "" }
            
            # Limpiar textos para evitar romper JSON
            $activeWindow = $activeWindow -replace '\\', '\\\\' -replace '"', '\"'
            $clip = $clip -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
            
            # Truncar clipboard si es muy largo
            if ($clip.Length -gt 500) { $clip = $clip.Substring(0, 500) + "..." }

            $json = '{"status":"success", "active_window":"' + $activeWindow + '", "clipboard_preview":"' + $clip + '"}'
        } catch {
            $json = '{"status":"error", "message":"Error leyendo el observador local"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }


    if ($path.StartsWith("api/stats")) {
        try {
            $cpu = Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
            $os = Get-WmiObject Win32_OperatingSystem
            $ramTotal = [math]::Round($os.TotalVisibleMemorySize / 1024)
            $ramFree = [math]::Round($os.FreePhysicalMemory / 1024)
            $ramUsed = $ramTotal - $ramFree
            $ramPercent = [math]::Round(($ramUsed / $ramTotal) * 100)
            
            $json = '{"status":"success", "cpu_percent":' + $cpu + ', "ram_percent":' + $ramPercent + ', "ram_free_mb":' + $ramFree + '}'
        } catch {
            $json = '{"status":"error", "message":"Error leyendo hardware"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/network")) {
        try {
            # Local IP
            $localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi","Ethernet" -ErrorAction SilentlyContinue | Where-Object IPAddress -NotMatch "169.254" | Select-Object -First 1).IPAddress
            if (-not $localIp) { $localIp = "Desconocida" }
            
            # Public IP
            $publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -UseBasicParsing -ErrorAction SilentlyContinue)
            if (-not $publicIp) { $publicIp = "Desconocida" }

            $json = '{"status":"success", "local_ip":"' + $localIp + '", "public_ip":"' + $publicIp + '"}'
        } catch {
            $json = '{"status":"error", "message":"Error leyendo red"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/battery")) {
        try {
            $battery = Get-WmiObject Win32_Battery
            if ($battery) {
                $level = $battery.EstimatedChargeRemaining
                $status = $battery.BatteryStatus
                $json = '{"status":"success", "level":' + $level + ', "charging":' + ($status -eq 2 -or $status -eq 6).ToString().ToLower() + '}'
            } else {
                $json = '{"status":"error", "message":"No se detecta batería (equipo de sobremesa)"}'
            }
        } catch {
            $json = '{"status":"error", "message":"Error leyendo la batería"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/note")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $text = $query["text"]
        try {
            $notePath = Join-Path $PSScriptRoot "Notas_KAIRI.txt"
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $notePath -Value "[$timestamp] $text"
            $json = '{"status":"success", "message":"Nota guardada correctamente"}'
        } catch {
            $json = '{"status":"error", "message":"Error guardando la nota"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/score")) {
        try {
            $scorePath = Join-Path $PSScriptRoot "puntuaciones_tetris.txt"
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                # Check if file exists, if not create empty array
                if (!(Test-Path $scorePath)) {
                    "[]" | Out-File -FilePath $scorePath -Encoding UTF8
                }
                
                $scoresJson = Get-Content $scorePath -Raw
                $scores = if ($scoresJson) { $scoresJson | ConvertFrom-Json } else { @() }
                
                $newScore = $body | ConvertFrom-Json
                $scores += $newScore
                
                # Sort by score descending and keep top 10
                $scores = $scores | Sort-Object -Property score -Descending | Select-Object -First 10
                
                $scores | ConvertTo-Json -Compress | Out-File -FilePath $scorePath -Encoding UTF8
                
                $json = '{"status":"success", "message":"Puntuación guardada"}'
            } else {
                if (Test-Path $scorePath) {
                    $scoresJson = Get-Content $scorePath -Raw
                    $json = '{"status":"success", "scores":' + $scoresJson + '}'
                } else {
                    $json = '{"status":"success", "scores":[]}'
                }
            }
        } catch {
            $json = '{"status":"error", "message":"Error accediendo a puntuaciones"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/read_file")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $targetPath = $query["path"]
        try {
            if (Test-Path $targetPath) {
                $content = Get-Content -Path $targetPath -Raw
                $escaped = $content -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
                $json = '{"status":"success", "content":"' + $escaped + '"}'
            } else {
                $json = '{"status":"error", "message":"El archivo no existe"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo leer el archivo"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/note")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $text = $query["text"]
        try {
            $filePath = Join-Path $PSScriptRoot "Notas_KAIRI.txt"
            Add-Content -Path $filePath -Value $text -Encoding UTF8
            $json = '{"status":"success", "message":"Nota añadida"}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo escribir en el archivo"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/sysinfo")) {
        try {
            $drives = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
            $jsonItems = @()
            foreach ($drive in $drives) {
                $free = [math]::Round($drive.FreeSpace / 1GB, 2)
                $total = [math]::Round($drive.Size / 1GB, 2)
                $name = $drive.DeviceID
                $jsonItems += '{"drive":"' + $name + '", "free_gb":' + $free + ', "total_gb":' + $total + '}'
            }
            $jsonStr = "[" + ($jsonItems -join ",") + "]"
            $json = '{"status":"success", "drives":' + $jsonStr + '}'
        } catch {
            $json = '{"status":"error", "message":"Error leyendo discos"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/launch")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $app = $query["app"]
        try {
            if (-not [string]::IsNullOrEmpty($app)) {
                Start-Process $app -ErrorAction Stop
                $json = '{"status":"success", "message":"Aplicación iniciada"}'
            } else {
                $json = '{"status":"error", "message":"Aplicación no especificada"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo iniciar la aplicación"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/create_dir")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $targetPath = $query["path"]
        try {
            if (-not [string]::IsNullOrEmpty($targetPath)) {
                New-Item -Path $targetPath -ItemType Directory -Force | Out-Null
                $json = '{"status":"success", "message":"Carpeta creada"}'
            } else {
                $json = '{"status":"error", "message":"Ruta no especificada"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo crear la carpeta"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/create_file")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $targetPath = $query["path"]
        try {
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                Set-Content -Path $targetPath -Value $body -Encoding UTF8
                $json = '{"status":"success", "message":"Archivo creado"}'
            } else {
                $json = '{"status":"error", "message":"Método no permitido"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo crear el archivo"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/lock")) {
        try {
            rundll32.exe user32.dll,LockWorkStation
            $json = '{"status":"success", "message":"Equipo bloqueado"}'
        } catch {
            $json = '{"status":"error", "message":"Error bloqueando equipo"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/sleep")) {
        try {
            # Sleep command uses powrprof
            rundll32.exe powrprof.dll,SetSuspendState 0,1,0
            $json = '{"status":"success", "message":"Equipo suspendido"}'
        } catch {
            $json = '{"status":"error", "message":"Error suspendiendo equipo"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/empty_bin")) {
        try {
            Clear-RecycleBin -Force -ErrorAction SilentlyContinue
            $json = '{"status":"success", "message":"Papelera vaciada"}'
        } catch {
            $json = '{"status":"error", "message":"Error vaciando papelera"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/kill")) {
        $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
        $app = $query["app"]
        try {
            if (-not [string]::IsNullOrEmpty($app)) {
                Stop-Process -Name $app -Force -ErrorAction SilentlyContinue
                $json = '{"status":"success", "message":"Aplicación cerrada"}'
            } else {
                $json = '{"status":"error", "message":"Aplicación no especificada"}'
            }
        } catch {
            $json = '{"status":"error", "message":"No se pudo cerrar la aplicación"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/screenshot")) {
        try {
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing

            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bmp = New-Object System.Drawing.Bitmap $bounds.width, $bounds.height
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            
            $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.size)
            
            $desktop = [Environment]::GetFolderPath("Desktop")
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $filepath = Join-Path $desktop "KAIRI_Screenshot_$timestamp.png"
            
            $bmp.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
            $graphics.Dispose()
            $bmp.Dispose()
            
            $json = '{"status":"success", "message":"Captura guardada en el escritorio", "file":"' + ($filepath -replace '\\', '\\\\') + '"}'
        } catch {
            $json = '{"status":"error", "message":"Error al realizar captura"}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }

    if ($path.StartsWith("api/panic")) {
        try {
            # 1. Minimize all windows
            (New-Object -ComObject Shell.Application).MinimizeAll()
            
            # 2. Clear clipboard
            Set-Clipboard -Value ""
            
            # 3. Mute system volume (toggle)
            # To ensure it mutes, we could just send the mute key. Usually it toggles, so if it's already muted, it might unmute.
            # A more robust way to just silence is to use nircmd or similar, but sending mute key is a quick fallback.
            $wshell = New-Object -ComObject wscript.shell
            $wshell.SendKeys([char]173) 

            $json = '{"status":"success", "message":"Modo pánico activado."}'
        } catch {
            $json = '{"status":"error", "message":"No se pudo activar el modo pánico."}'
        }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.ContentLength64 = $buffer.Length
        try { $response.OutputStream.Write($buffer, 0, $buffer.Length) } catch {}
        try { $response.Close() } catch {}
        continue
    }

    # ------------------ SERVIDOR WEB ESTÁTICO ------------------
    if ($path -eq "") { $path = "index.html" }
    $fullPath = Join-Path $PSScriptRoot $path
    
    if (Test-Path $fullPath) {
        $content = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentLength64 = $content.Length
        if ($path.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
        elseif ($path.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
        elseif ($path.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
        elseif ($path.EndsWith(".txt")) { $response.ContentType = "text/plain; charset=utf-8" }
        try { $response.OutputStream.Write($content, 0, $content.Length) } catch {}
    } else {
        $response.StatusCode = 404
    }
    try { $response.Close() } catch {}
}
