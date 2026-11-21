param(
    [int]$Port = 8080,
    [string]$Directory = $PSScriptRoot,
    [string]$DefaultFile = "tickets.html"
)

if (-not $Directory) {
    $Directory = Get-Location
}

# 1. Cleanly terminate any stale background processes holding port $Port
try {
    $serviceState = netsh http show servicestate
    if ($serviceState -match "(?s)ID:\s*(\d+)[^\r\n]*?powershell.*?HTTP://LOCALHOST:$Port/") {
        $stalePid = [int]$matches[1]
        if ($stalePid -gt 4 -and $stalePid -ne $PID) {
            Write-Host "Releasing port $Port from previous background process (PID $stalePid)..." -ForegroundColor Yellow
            Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 600
        }
    }
} catch {}

try {
    $existingConns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($existingConns) {
        foreach ($conn in $existingConns) {
            $targetProcId = $conn.OwningProcess
            if ($targetProcId -and $targetProcId -gt 4 -and $targetProcId -ne $PID) {
                Stop-Process -Id $targetProcId -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 400
    }
} catch {}

# 2. Multi-threaded High-Performance Web Server via .NET
$csharpCode = @"
using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

public class FastWebServer {
    private readonly HttpListener _listener;
    private readonly string _rootDir;
    private readonly string _defaultFile;
    private volatile bool _running;
    private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
        { ".html", "text/html; charset=utf-8" },
        { ".htm",  "text/html; charset=utf-8" },
        { ".css",  "text/css; charset=utf-8" },
        { ".js",   "application/javascript; charset=utf-8" },
        { ".mjs",  "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png",  "image/png" },
        { ".jpg",  "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif",  "image/gif" },
        { ".svg",  "image/svg+xml" },
        { ".ico",  "image/x-icon" },
        { ".bin",  "application/octet-stream" },
        { ".wasm", "application/wasm" },
        { ".txt",  "text/plain; charset=utf-8" },
        { ".mp3",  "audio/mpeg" },
        { ".wav",  "audio/wav" }
    };

    public FastWebServer(string rootDir, int port, string defaultFile) {
        _rootDir = Path.GetFullPath(rootDir);
        _defaultFile = string.IsNullOrEmpty(defaultFile) ? "tickets.html" : defaultFile;
        _listener = new HttpListener();
        _listener.Prefixes.Add("http://localhost:" + port + "/");
    }

    public void Start() {
        _listener.Start();
        _running = true;
        Task.Factory.StartNew(ListenLoop);
    }

    public void Stop() {
        _running = false;
        try { _listener.Stop(); } catch {}
    }

    private void ListenLoop() {
        while (_running && _listener.IsListening) {
            try {
                HttpListenerContext context = _listener.GetContext();
                ThreadPool.QueueUserWorkItem(new WaitCallback(HandleRequest), context);
            } catch (Exception) {
                if (!_running) break;
            }
        }
    }

    private void HandleRequest(object state) {
        HttpListenerContext context = (HttpListenerContext)state;
        try {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            response.AddHeader("Access-Control-Allow-Origin", "*");
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
            response.AddHeader("Access-Control-Allow-Headers", "*");
            response.AddHeader("Cache-Control", "no-cache");

            if (request.HttpMethod.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase)) {
                response.StatusCode = 204;
                response.Close();
                return;
            }

            string relPath = request.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(relPath)) relPath = _defaultFile;
            relPath = Uri.UnescapeDataString(relPath).Replace('/', Path.DirectorySeparatorChar);

            string filePath = Path.GetFullPath(Path.Combine(_rootDir, relPath));
            if (!filePath.StartsWith(_rootDir, StringComparison.OrdinalIgnoreCase)) {
                response.StatusCode = 403;
                response.Close();
                return;
            }

            if (!File.Exists(filePath)) {
                response.StatusCode = 404;
                byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found: " + relPath);
                response.ContentType = "text/plain";
                response.ContentLength64 = notFound.Length;
                response.OutputStream.Write(notFound, 0, notFound.Length);
                response.Close();
                return;
            }

            string ext = Path.GetExtension(filePath);
            string mime;
            if (!MimeTypes.TryGetValue(ext, out mime)) mime = "application/octet-stream";
            response.ContentType = mime;

            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) {
                response.ContentLength64 = fs.Length;
                response.StatusCode = 200;
                fs.CopyTo(response.OutputStream);
            }
            response.Close();
        } catch (Exception) {
            try { context.Response.Abort(); } catch {}
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'FastWebServer').Type) {
    Add-Type -TypeDefinition $csharpCode -Language CSharp
}

$server = $null
$activePort = $Port

for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
        $server = New-Object FastWebServer($Directory, $activePort, $DefaultFile)
        $server.Start()
        break
    } catch {
        if ($server) { try { $server.Stop() } catch {} }
        Write-Host "Port $activePort is busy, trying port $($activePort + 1)..." -ForegroundColor Yellow
        $activePort = $activePort + 1
        $server = $null
    }
}

if (-not $server) {
    Write-Host "Failed to start server on ports $Port through $activePort" -ForegroundColor Red
    exit 1
}

$prefix = "http://localhost:$activePort/"
$startUrl = "${prefix}${DefaultFile}"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TruePass Web Server Running (Multi-Threaded)            " -ForegroundColor Green
Write-Host "  Tickets:    ${prefix}tickets.html" -ForegroundColor Yellow
Write-Host "  Onboarding: ${prefix}onboarding.html" -ForegroundColor Yellow
Write-Host "  Serving files from: $Directory" -ForegroundColor White
Write-Host "  Port: $activePort (Concurrent streaming active - immune to F5 drops)" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

try {
    Start-Process $startUrl
} catch {}

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    if ($server) { $server.Stop() }
    Write-Host "`nServer stopped cleanly." -ForegroundColor Yellow
}
