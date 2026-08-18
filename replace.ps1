$files = Get-ChildItem -Path . -Recurse -File -Include '*.html','*.js','*.css','*.txt','*.ps1'
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -match '(?i)kairi|J\.A\.R\.V\.I\.S\.') {
        $content = $content -ireplace 'J\.A\.R\.V\.I\.S\.', 'K.A.I.R.I.'
        $content = $content -creplace 'KAIRI', 'KAIRI'
        $content = $content -creplace 'Kairi', 'Kairi'
        $content = $content -creplace 'kairi', 'kairi'
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}
Write-Output "Done"
