$output = "C:\Users\User\.gemini\antigravity-ide\brain\cc2752b7-aaf4-45a2-980a-99b742ddd9aa\scratch\strings.txt"
New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null

$htmlFiles = Get-ChildItem -Filter *.html -File
foreach ($f in $htmlFiles) {
    Add-Content -Path $output -Value "--- $($f.Name) ---"
    $c = Get-Content $f.FullName -Raw
    $text = $c -replace '<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', ' '
    $text = $text -replace '<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', ' '
    $text = $text -replace '<[^>]+>', ' '
    $text = $text -replace '&nbsp;', ' '
    $text = $text -replace '\s+', ' '
    Add-Content -Path $output -Value $text
}

$jsFiles = Get-ChildItem -Filter *.js -File
foreach ($f in $jsFiles) {
    Add-Content -Path $output -Value "--- $($f.Name) ---"
    $c = Get-Content $f.FullName -Raw
    [regex]::Matches($c, '(["''])(.*?)\1') | ForEach-Object {
        $val = $_.Groups[2].Value
        if ($val -match '[a-zA-Z]{3,}') {
            Add-Content -Path $output -Value $val
        }
    }
}
