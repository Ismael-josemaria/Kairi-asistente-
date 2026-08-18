$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\KAIRI.lnk")
$IconPath = (Get-Item -Path ".\kairi_icon.ico").FullName
$LauncherPath = (Get-Item -Path ".\INICIAR_KAIRI.ps1").FullName

$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File ""$LauncherPath"""
$Shortcut.IconLocation = $IconPath
$Shortcut.WorkingDirectory = (Get-Item -Path ".\").FullName
$Shortcut.WindowStyle = 7 # Minimized
$Shortcut.Description = "Sistema Operativo K.A.I.R.I. (Core)"
$Shortcut.Save()

# Eliminar el acceso directo viejo que daba problemas con file:///
$OldShortcut = "$DesktopPath\KAIRI Open.lnk"
if (Test-Path $OldShortcut) {
    Remove-Item $OldShortcut -Force
}

Write-Host "Acceso directo nativo creado en el escritorio con exito. El anterior ha sido eliminado."
