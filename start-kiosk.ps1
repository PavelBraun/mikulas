param(
    [switch]$TopMost,
    [string]$PrinterName = "",
    [string]$AppPath = "file:///c:/Workspace/_Applikace/mikulas/index.html"
)

# Path to Chrome (adjust if installed elsewhere)
$chromePaths = @("C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
    Write-Error "Chrome not found in default path. Please edit start-kiosk.ps1 to point to your chrome.exe"
    exit 1
}

$appHtml = $AppPath

# If a printer name was provided, try to set it as the default printer
if ($PrinterName -and $PrinterName.Trim() -ne "") {
    Write-Host "Setting default printer to: $PrinterName"
    try {
        # Use rundll32 printui to set default printer
        $cmd = 'rundll32 printui.dll,PrintUIEntry /y /n "' + $PrinterName + '"'
        cmd.exe /c $cmd
        Start-Sleep -Milliseconds 200
    } catch {
        Write-Warning "Could not set default printer via PrintUI: $_"
    }
}

# Use a fresh temporary profile to ensure flags like --kiosk-printing are applied
$profileDir = Join-Path $env:TEMP 'mikulas_chrome_profile'
if (Test-Path $profileDir) {
    try {
        Remove-Item -Recurse -Force -Path $profileDir -ErrorAction SilentlyContinue
        Write-Host "Removed existing profile dir: $profileDir"
    } catch {
        Write-Warning "Could not remove existing profile dir: $_"
    }
}

# Extra flags to reduce chance of UI/prompt interference
$args = @(
    '--kiosk',
    '--kiosk-printing',
    '--disable-print-preview',
    '--disable-features=PrintPreview',
    '--no-first-run',
    '--disable-infobars',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-popup-blocking',
    '--disable-component-update',
    '--enable-automation',
    "--user-data-dir=$profileDir",
    $appHtml
)

# Log Chrome version for diagnostics
try {
    $ver = & "$chrome" --version 2>$null
    if ($ver) { Write-Host "Chrome version: $ver" }
} catch { }

Write-Host "Launching Chrome in kiosk mode..."
 Write-Host "Chrome args: $($args -join ' ')"
 $proc = Start-Process -FilePath $chrome -ArgumentList $args -PassThru

if ($TopMost) {
    # Wait for window to appear and set topmost via user32 SetWindowPos
    $hwnd = 0
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 200
        try {
            $handle = (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue).MainWindowHandle
            if ($handle -and $handle -ne 0) { $hwnd = $handle; break }
        } catch { }
    }
    if ($hwnd -eq 0) { Write-Warning "Could not find Chrome main window to set TOPMOST."; exit 0 }

    $signature = @"
using System;
using System.Runtime.InteropServices;
public static class Win {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
    Add-Type -TypeDefinition $signature -PassThru | Out-Null
    $HWND_TOPMOST = [IntPtr](-1)
    $SWP_NOMOVE = 0x0002
    $SWP_NOSIZE = 0x0001
    $SWP_SHOWWINDOW = 0x0040
    $flags = $SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW
    [Win]::SetWindowPos([IntPtr]$hwnd, $HWND_TOPMOST, 0,0,0,0, $flags) | Out-Null
    Write-Host "Set Chrome window TOPMOST (hwnd=$hwnd)"
}

Write-Host "Done."
