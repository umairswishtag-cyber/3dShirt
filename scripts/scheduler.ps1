$ErrorActionPreference = 'Stop'

$applicationRoot = Split-Path -Parent $PSScriptRoot
$phpExecutable = 'C:\xampp\php\php.exe'
Set-Location -LiteralPath $applicationRoot

$scheduler = $null
$queueWorker = $null

while ($true) {
    if ($null -eq $scheduler -or $scheduler.HasExited) {
        $scheduler = Start-Process -FilePath $phpExecutable `
            -ArgumentList @('artisan', 'schedule:work', '--no-interaction') `
            -WorkingDirectory $applicationRoot `
            -WindowStyle Hidden `
            -PassThru
    }

    if ($null -eq $queueWorker -or $queueWorker.HasExited) {
        $queueWorker = Start-Process -FilePath $phpExecutable `
            -ArgumentList @('artisan', 'queue:work', 'redis', '--sleep=2', '--tries=3', '--timeout=120', '--no-interaction') `
            -WorkingDirectory $applicationRoot `
            -WindowStyle Hidden `
            -PassThru
    }

    Start-Sleep -Seconds 5
}
