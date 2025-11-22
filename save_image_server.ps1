# save_image_server.ps1
# Simple HTTP listener in PowerShell that accepts POST /save with JSON { filename, data }
# and saves base64 data to C:\temp\mikulas\hotfolder

param(
    [int]$Port = 3333,
    [string]$HotFolder = 'C:\temp\mikulas\hotfolder'
)

if (-not (Test-Path $HotFolder)) { New-Item -ItemType Directory -Path $HotFolder | Out-Null }
$logFile = Join-Path $HotFolder 'save-server.log'
function Log($m) { try { $t = "$(Get-Date -Format o) - $m"; Add-Content -Path $logFile -Value $t } catch {} }
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
            } catch {}
        }
    } catch {}
}
Log "Starting save_image_server on port $Port. HotFolder: $HotFolder"
Journal "Starting save_image_server on port $Port. HotFolder: $HotFolder"

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
try {
    $listener.Prefixes.Add($prefix)
} catch {
    Write-Error "Could not add prefix $prefix. Try running PowerShell as Administrator if this fails. $_"
    exit 1
}

try {
    $listener.Start()
    Write-Host "save_image_server listening on $prefix" -ForegroundColor Green
    Journal ("save_image_server listening on $prefix")
} catch {
    Write-Error "Failed to start HttpListener: $_"
    Journal ("Failed to start HttpListener: $($_ | Out-String)")
    exit 1
}

while ($true) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        # Add CORS headers for browser requests
        $res.Headers.Add('Access-Control-Allow-Origin','*')
        $res.Headers.Add('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        $res.Headers.Add('Access-Control-Allow-Headers','Content-Type')

        # Handle preflight OPTIONS
        if ($req.HttpMethod -ieq 'OPTIONS') {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        if ($req.HttpMethod -ieq 'POST' -and $req.Url.AbsolutePath -ieq '/save') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
            $body = $reader.ReadToEnd(); $reader.Close();
            # Log basic info about request for debugging
            try { Log "Received POST /save - length=$(if ($body) { $body.Length } else { 0 })" } catch {}
            try { Log "Request head (first 200 chars): $([string]$body).Substring(0,[Math]::Min(200,([string]$body).Length))" } catch {}
            try {
                $obj = ConvertFrom-Json $body
                if (-not $obj.filename -or -not $obj.data) { throw "Missing filename or data" }
                # If data contains a data: URL prefix, strip it
                if ($obj.data -match '^data:.*;base64,') {
                    $obj.data = $obj.data -replace '^data:.*;base64,',''
                    Log "Stripped data: URL prefix from data field"
                }
                $safe = [IO.Path]::GetFileName($obj.filename)
                $out = Join-Path $HotFolder $safe
                $bytes = [Convert]::FromBase64String($obj.data)
                [IO.File]::WriteAllBytes($out, $bytes)
                $respObj = @{ ok = $true; path = $out }
                Journal ("Saved: $out")
                $buffer = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $respObj))
                $res.StatusCode = 200
                $res.ContentType = 'application/json'
                $res.ContentLength64 = $buffer.Length
                $res.OutputStream.Write($buffer, 0, $buffer.Length)
                $res.OutputStream.Close()
                Log "Saved: $out"
            } catch {
                # Log full exception and raw body for diagnosis
                try { Log "ERROR handling save request: $($_ | Out-String)" } catch {}
                try { Log "Raw request body (first 2000 chars): $([string]$body).Substring(0,[Math]::Min(2000,([string]$body).Length))" } catch {}
                try { Journal ("ERROR handling save request: $($_ | Out-String)") } catch {}
                try { Journal ("Raw request body (first 2000 chars): $([string]$body).Substring(0,[Math]::Min(2000,([string]$body).Length))") } catch {}
                $err = @{ ok = $false; error = ($_.Exception.Message -replace '\r|\n',' ') }
                $b = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $err))
                $res.StatusCode = 400
                $res.ContentType = 'application/json'
                $res.ContentLength64 = $b.Length
                $res.OutputStream.Write($b, 0, $b.Length)
                $res.OutputStream.Close()
                Write-Warning "Failed to handle save request: $_"
            }
        } else {
            $res.StatusCode = 404
            $res.Close()
        }
    } catch {
        Write-Warning "Listener exception: $_"
    }
}
