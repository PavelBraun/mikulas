@echo off
REM Usage: start-kiosk.bat [TOPMOST]
REM If first argument is TOPMOST (case-insensitive), the launched browser window will be set to topmost.

SET SCRIPT_DIR=%~dp0
SET TOP=%1
IF /I "%TOP%"=="TOPMOST" (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-kiosk.ps1" -TopMost
) ELSE (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-kiosk.ps1"
)

EXIT /B 0
