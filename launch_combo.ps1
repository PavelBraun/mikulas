# launch_combo.ps1
# Starts save_image_server.ps1 as a background job and then runs hotfolder-printer.ps1 in foreground.
param(
    [string]$ScriptDir = "$PSScriptRoot\"
)

function Journal($m) {
    try {
        $dirs = @('C:\temp\mikulas\logs')
        try { $proj = Join-Path $ScriptDir 'logs'; $dirs += $proj } catch {}
        foreach ($d in $dirs) {
            try { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } } catch {}
            try {
                $jpath = Join-Path $d ((Get-Date).ToString('yyyyMMdd') + '.jrn')
                $entry = (Get-Date).ToString('o') + ' - ' + $m
                Add-Content -Path $jpath -Value $entry
            } catch {}
        }
    } catch {}
}

try {
    $job = Start-Job -FilePath (Join-Path $ScriptDir 'save_image_server.ps1') -Name SaveServer
    Journal ("Started SaveImageServer job (Id=$($job.Id))")
    Write-Host "Started SaveImageServer as background job (Id=$($job.Id))."
    # Log job state and job list for diagnosis
    try {
        $jobsOut = Get-Job -Name SaveServer | Format-List * | Out-String
        Journal ("Get-Job SaveServer output: `n$jobsOut")
    } catch {
        Journal ("Get-Job failed: $($_ | Out-String)")
    }
    try {
        $psList = Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,StartTime | Out-String
        Journal ("Powershell processes: `n$psList")
    } catch {}
} catch {
    Journal ("Failed to start SaveImageServer job: $($_ | Out-String)")
    Write-Error "Failed to start SaveImageServer job: $_"

    # Start a monitoring job that periodically logs Get-Job and Receive-Job output to journal
    try {
        $monitor = Start-Job -ScriptBlock {
            param($scriptDir)
            function AddJournal($m) {
                try {
                    $dirs = @('C:\temp\mikulas\logs')
                    try { $proj = Join-Path $scriptDir 'logs'; $dirs += $proj } catch {}
                    foreach ($d in $dirs) {
                        try { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } } catch {}
                        try {
                            $jpath = Join-Path $d ((Get-Date).ToString('yyyyMMdd') + '.jrn')
                            $entry = (Get-Date).ToString('o') + ' - ' + $m
                            Add-Content -Path $jpath -Value $entry
                        } catch {}
                    }
                } catch {}
            }
            while ($true) {
                try {
                    $gj = Get-Job | Format-List * | Out-String
                    AddJournal("PERIODIC GET-JOB:\n$gj")
                } catch {}
                try {
                    $r = Get-Job -Name SaveServer -ErrorAction SilentlyContinue | Receive-Job -Keep -ErrorAction SilentlyContinue | Out-String
                    if ($r) { AddJournal("PERIODIC RECEIVE-JOB SaveServer:\n$r") }
                } catch {}
                Start-Sleep -Seconds 30
            }
        } -ArgumentList $ScriptDir
        Journal ("Started monitor job (Id=$($monitor.Id)) to log Get-Job/Receive-Job every 30s")
    } catch {
        Journal ("Failed to start monitor job: $($_ | Out-String)")
    }
}

Write-Host 'Launching HotfolderWatcher in foreground...'
Journal 'Launching HotfolderWatcher in foreground...'
& (Join-Path $ScriptDir 'hotfolder-printer.ps1')
