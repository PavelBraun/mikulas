
@echo off
REM Start PowerShell save server (background job) and hotfolder watcher (foreground) in a single PS window
SET SCRIPT_DIR=%~dp0

REM Simple runlog for diagnostics
SET LOGFILE=%SCRIPT_DIR%start-hotfolder-printer.log
echo %DATE% %TIME% - start-hotfolder-printer invoked >> "%LOGFILE%"
REM Also append to project daily journal
set PROJ_LOGS=%~dp0logs
if not exist "%PROJ_LOGS%" mkdir "%PROJ_LOGS%"
set JPATH=%PROJ_LOGS%\%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.jrn
echo %DATE% %TIME% - start-hotfolder-printer invoked >> "%JPATH%"

REM Launch a single PowerShell window which starts the save server as a background job
REM and then runs the hotfolder watcher in the foreground so the window stays open.
start "HotfolderCombo" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SCRIPT_DIR%launch_combo.ps1" -ScriptDir "%SCRIPT_DIR%"

echo %DATE% %TIME% - launched combo window >> "%LOGFILE%"
echo %DATE% %TIME% - launched combo window >> "%JPATH%"

EXIT /B 0
