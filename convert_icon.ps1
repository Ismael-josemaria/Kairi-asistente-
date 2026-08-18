Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\User\.gemini\antigravity-ide\brain\143f7c17-9b64-4085-8905-97cb6b4faba3\kairi_logo_1786999628860.jpg')
$bmp = new-object System.Drawing.Bitmap($img, 256, 256)
$ms = new-object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$ms.Position = 0
$bw = new-object System.IO.BinaryWriter([System.IO.File]::Open('C:\Users\User\Desktop\Proyectos personales\Programacion propia\JARVIS\kairi_icon.ico', [System.IO.FileMode]::Create))
$bw.Write([int16]0)
$bw.Write([int16]1)
$bw.Write([int16]1)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([int16]1)
$bw.Write([int16]32)
$bw.Write([int32]$ms.Length)
$bw.Write([int32]22)
$ms.WriteTo($bw.BaseStream)
$bw.Close()
$ms.Close()
$bmp.Dispose()
$img.Dispose()
Write-Output "Icon created successfully."
