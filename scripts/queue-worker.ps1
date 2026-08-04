$ErrorActionPreference = 'Stop'

$applicationRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $applicationRoot

while ($true) {
    & 'C:\xampp\php\php.exe' artisan queue:work redis --sleep=3 --tries=3 --timeout=120
    Start-Sleep -Seconds 5
}
