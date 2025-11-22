; kiosk.ahk - Launch Chrome in kiosk and set AlwaysOnTop
; Usage: double-click this script or run via autohotkey.exe

#NoTrayIcon
SetWorkingDir, %A_ScriptDir%

chromePath := "C:\Program Files\Google\Chrome\Application\chrome.exe"
profile := A_Temp "\\mikulas_chrome_profile_ahk"
app := "file:///c:/temp/mikulas/index.html"

; start watcher to auto-accept print dialogs (if present)
if FileExist(A_ScriptDir "\\print-watcher.ahk") {
    if FileExist("%ProgramFiles%\\AutoHotkey\\AutoHotkey.exe") {
        Run, "%ProgramFiles%\\AutoHotkey\\AutoHotkey.exe" "%A_ScriptDir%\\print-watcher.ahk", , Hide
    } else if FileExist("%ProgramFiles(x86)%\\AutoHotkey\\AutoHotkey.exe") {
        Run, "%ProgramFiles(x86)%\\AutoHotkey\\AutoHotkey.exe" "%A_ScriptDir%\\print-watcher.ahk", , Hide
    }
}

Run, "%chromePath%" --kiosk --kiosk-printing --disable-print-preview --disable-features=PrintPreview --no-first-run --disable-infobars --user-data-dir="%profile%" "%app%", , Hide
WinWait, ahk_exe chrome.exe, , 10
if ErrorLevel
{
    ; couldn't find window in 10s
    ExitApp
}
WinSet, AlwaysOnTop, On, ahk_exe chrome.exe
Return
