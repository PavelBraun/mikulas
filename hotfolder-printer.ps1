param(
    [string]$HotFolder = 'C:\\temp\\mikulas\\hotfolder',
    [string]$PrintedFolder = 'C:\\temp\\mikulas\\printed',
    [string]$PrinterName = 'Diebold Nixdorf TP31'
)

if (-not (Test-Path $HotFolder)) { New-Item -ItemType Directory -Path $HotFolder | Out-Null }
if (-not (Test-Path $PrintedFolder)) { New-Item -ItemType Directory -Path $PrintedFolder | Out-Null }

Write-Host "Watching hotfolder: $HotFolder" -ForegroundColor Cyan

$log = Join-Path $HotFolder 'printer.log'
function PLog($m) { try { $t = "$(Get-Date -Format o) - $m"; Add-Content -Path $log -Value $t } catch {} }
PLog "Started watcher. HotFolder: $HotFolder; PrintedFolder: $PrintedFolder; Printer: $PrinterName"
function Journal($m) {
    try {
        $dirs = @('C:\temp\mikulas\logs')
        try { $proj = Join-Path $PSScriptRoot 'logs'; $dirs += $proj } catch {}
        foreach ($d in $dirs) {
            try { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } } catch {}
            try {
                $jpath = Join-Path $d ((Get-Date).ToString('yyyyMMdd') + '.jrn')
                $entry = (Get-Date).ToString('o') + ' - ' + $m
                Add-Content -Path $jpath -Value $entry
                # Also attempt to include recent printer.log contents immediately after the journal entry
                try {
                    $printerLogPath = Join-Path $PSScriptRoot 'hotfolder' | Join-Path -ChildPath 'printer.log'
                    if (-not (Test-Path $printerLogPath)) {
                        $printerLogPath = Join-Path $PSScriptRoot 'printer.log'
                    }
                    if (Test-Path $printerLogPath) {
                        $plines = Get-Content -Path $printerLogPath -ErrorAction SilentlyContinue
                        if ($plines) {
                            Add-Content -Path $jpath -Value "<printerLog>"
                            Add-Content -Path $jpath -Value $plines
                        }
                    }
                } catch {
                    # swallow any errors while trying to attach printer log
                }
            } catch {}
        }
    } catch {}
}
Journal "Started watcher. HotFolder: $HotFolder; PrintedFolder: $PrintedFolder; Printer: $PrinterName"

function Process-File($path) {
    try {
        $name = [IO.Path]::GetFileName($path)
        $ext = [IO.Path]::GetExtension($path).ToLower()
        if ($ext -notin '.jpg','.jpeg','.png','.pdf') { return }
        PLog "Processing file: $name"
        Journal "Processing file: $name"
        Write-Host "Detected/Processing: $name" -ForegroundColor Green
        if ($ext -eq '.pdf') {
            $printCmd = 'rundll32.exe shell32.dll,ShellExec_RunDLL "' + $path + '" print'
            cmd.exe /c $printCmd
        } else {
            $msp = "$env:windir\system32\mspaint.exe"
            if (Test-Path $msp) {
                Start-Process -FilePath $msp -ArgumentList '/pt', ('"' + $path + '"'), ('"' + $PrinterName + '"') -NoNewWindow -Wait
            } else {
                $printCmd = 'rundll32.exe shell32.dll,ShellExec_RunDLL "' + $path + '" print'
                cmd.exe /c $printCmd
            }
        }
        $dest = Join-Path $PrintedFolder $name
        $i = 0
        while (Test-Path $dest) { $i++; $dest = Join-Path $PrintedFolder -ChildPath ([IO.Path]::GetFileNameWithoutExtension($name) + "_" + $i + [IO.Path]::GetExtension($name)) }
        Move-Item -Path $path -Destination $dest -Force
        PLog "Moved to: $dest"
        Journal "Moved to: $dest"
        Write-Host "Moved to: $dest" -ForegroundColor Yellow
    } catch {
        $err = $_ | Out-String
        PLog ("Process-File failed for {0}: {1}" -f $path, $err)
        Journal ("Process-File failed for {0}: {1}" -f $path, $err)
        Write-Warning ("Process-File failed for {0}: {1}" -f $path, $err)
    }
}

# Fallback polling loop: every 2s scan for files in hotfolder to ensure none are missed
Start-Job -ScriptBlock {
    param($HotFolder, $PrintedFolder, $PrinterName, $log)
    while ($true) {
        try {
                Get-ChildItem -Path $HotFolder -File -Include *.jpg,*.jpeg,*.png,*.pdf -ErrorAction SilentlyContinue | ForEach-Object {
                    try {
                        PLog "Polling detected: $($_.Name)"
                        Journal "Polling detected: $($_.FullName)"
                        Process-File $_.FullName
                    } catch {}
                }
            } catch {}
            Start-Sleep -Seconds 2
    }
} -ArgumentList $HotFolder, $PrintedFolder, $PrinterName, $log | Out-Null

$fsw = New-Object System.IO.FileSystemWatcher $HotFolder -Property @{IncludeSubdirectories=$false; Filter='*.*'; NotifyFilter=[IO.NotifyFilters]'FileName,LastWrite'}

$onCreated = Register-ObjectEvent $fsw Created -Action {
    Start-Sleep -Milliseconds 300
        $path = $Event.SourceEventArgs.FullPath
        $name = $Event.SourceEventArgs.Name
    PLog "Created event: $name"
    Journal "Created event: $path"
    Write-Host "Created event: $name"
        Start-Sleep -Milliseconds 500
        Process-File $path
}

Write-Host 'Press Ctrl+C to stop watcher.'
while ($true) { Start-Sleep -Seconds 3600 }
