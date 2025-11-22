; print-watcher.ahk
; Watch for print dialogs (English/Czech heuristics) and auto-press Enter to confirm printing.
; Run this in background alongside kiosk.ahk. Requires AutoHotkey (v1) installed.

SetTitleMatchMode, 2
DetectHiddenWindows, On
; Keywords to detect print dialog titles (add more if needed)
keywords := ["Print", "Print Preview", "Tisk", "Náhled tisku", "Tiskárna"]

Loop {
    ; wait briefly for any dialog-class window
    WinWait, ahk_class #32770,, 3
    if ErrorLevel {
        Sleep 250
        continue
    }
    WinGetTitle, winTitle, A
    if (winTitle = "") {
        ; not descriptive, skip
        Sleep 250
        continue
    }

    found := false
    For index, kw in keywords {
        if InStr(winTitle, kw, false) {
            found := true
            break
        }
    }

    if found {
        ; small delay to let controls initialize
        Sleep 200
        ; send Enter to accept/print
        ControlSend,, {Enter}, A
        Sleep 300
        ; If still exists, try sending Space (sometimes triggers Print)
        if WinExist("ahk_class #32770") {
            ControlSend,, {Space}, A
            Sleep 200
        }
    }

    Sleep 200
}
