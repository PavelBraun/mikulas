taskkill /IM chrome.exe /F
REM přizpůsob cestu k chrome.exe a k index.html
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing "file:///C:/Temp/mikulas/index.html"