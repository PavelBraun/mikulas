
@echo off
REM startMikulasKiosk.bat
REM Usage: startMikulasKiosk.bat [TOPMOST]
REM Launches kiosk for Mikulas located at C:\temp\mikulas without changing system printers or requesting admin.

SET SCRIPT_DIR=%~dp0
SET TOP=%1
REM Simple invocation logging to help debug double-click behavior
SET LOGFILE=%SCRIPT_DIR%startMikulasKiosk.log
echo %DATE% %TIME% - startMikulasKiosk invoked with arg='%TOP%' >> "%LOGFILE%"
echo %DATE% %TIME% - SCRIPT_DIR=%SCRIPT_DIR% >> "%LOGFILE%"
REM Append to daily journal for central analysis
set JOURNAL_DIR=%SCRIPT_DIR%logs
if not exist "%JOURNAL_DIR%" mkdir "%JOURNAL_DIR%"
set JPATH=%JOURNAL_DIR%\%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.jrn
echo %DATE% %TIME% - startMikulasKiosk invoked with arg='%TOP%' >> "%JPATH%"
echo %DATE% %TIME% - startMiklasKiosk invoked with arg='%TOP%' >> "%SCRIPT_DIR%startMikulasKiosk.log"
REM Start hotfolder server & watcher automatically in background
echo Starting hotfolder server and watcher...
REM Only auto-start hotfolder if save_image_server.ps1 exists and port 3333 is free
IF EXIST "%SCRIPT_DIR%save_image_server.ps1" (
    echo Found save_image_server.ps1
    REM check if port 3333 is already listening (simple substring match)
    netstat -ano | findstr ":3333" >nul 2>&1
    IF %ERRORLEVEL%==0 (
        echo Port 3333 already in use; assuming save server running, skipping auto-start
    ) ELSE (
        echo Starting hotfolder server and watcher in new window (keeps window open)...
        REM Use cmd /k so the new window stays open for diagnostics
        start "MikulasHotfolder" cmd /k "%SCRIPT_DIR%start-hotfolder-printer.bat"
    )
) ELSE (
    echo save_image_server.ps1 not found in %SCRIPT_DIR%; hotfolder auto-start skipped
)
REM Try to terminate any existing Chrome processes for the current user so new flags take effect
echo Stopping existing Chrome instances (if any)...
taskkill /IM chrome.exe /F >nul 2>&1
REM give the OS a short moment to clean up processes and handles
ping -n 2 127.0.0.1 >nul

IF /I "%TOP%"=="TOPMOST" (
    REM Prefer AutoHotkey if installed for reliable AlwaysOnTop
    IF EXIST "%ProgramFiles%\AutoHotkey\AutoHotkey.exe" (
        echo Found AutoHotkey, launching kiosk via kiosk.ahk
        "%ProgramFiles%\AutoHotkey\AutoHotkey.exe" "%SCRIPT_DIR%kiosk.ahk"
    ) ELSE IF EXIST "%ProgramFiles(x86)%\AutoHotkey\AutoHotkey.exe" (
        echo Found AutoHotkey (x86), launching kiosk via kiosk.ahk
        "%ProgramFiles(x86)%\AutoHotkey\AutoHotkey.exe" "%SCRIPT_DIR%kiosk.ahk"
    ) ELSE (
        echo AutoHotkey not found; falling back to PowerShell TopMost method
        powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-kiosk.ps1" -TopMost -AppPath "file:///c:/temp/mikulas/index.html"
    )
 ) ELSE (
    echo Launching kiosk PowerShell window (keeps window open for diagnostics)...
    start "MikulasKiosk" cmd /k powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-kiosk.ps1" -AppPath "file:///c:/temp/mikulas/index.html"
)


EXIT /B 0
EXIT /B 0