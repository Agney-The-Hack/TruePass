param(
    [int]$Port = 8080,
    [string]$Directory = $PSScriptRoot,
    [string]$DefaultFile = "resale.html"
)

if (-not $Directory) {
    $Directory = Get-Location
}

# Multi-threaded High-Performance Web Server via .NET
$csharpCode = @'
using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

public class QuaiResaleWebServer {
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
        { ".txt",  "text/plain; charset=utf-8" }
    };

    public QuaiResaleWebServer(string rootDir, int port, string defaultFile) {
        _rootDir = Path.GetFullPath(rootDir);
        _defaultFile = string.IsNullOrEmpty(defaultFile) ? "resale.html" : defaultFile;
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

            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate");

            if (request.HttpMethod == "OPTIONS") {
                response.StatusCode = 204;
                response.Close();
                return;
            }

            string rawUrl = request.RawUrl;
            int qIndex = rawUrl.IndexOf('?');
            string cleanPath = (qIndex >= 0) ? rawUrl.Substring(0, qIndex) : rawUrl;
            string relPath = cleanPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);

            if (string.IsNullOrEmpty(relPath)) relPath = _defaultFile;

            string filePath = Path.Combine(_rootDir, relPath);

            if (!File.Exists(filePath)) {
                response.StatusCode = 404;
                using (StreamWriter sw = new StreamWriter(response.OutputStream)) {
                    sw.Write("404 Not Found: " + relPath);
                }
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
'@

if (-not ([System.Management.Automation.PSTypeName]'QuaiResaleWebServer').Type) {
    Add-Type -TypeDefinition $csharpCode -Language CSharp
}

$candidatePorts = @($Port, 8080, 8081, 8082, 8083, 8084, 8085, 3000, 5000, 8088, 8090)
$server = $null
$activePort = $Port

foreach ($p in $candidatePorts) {
    try {
        $server = New-Object QuaiResaleWebServer($Directory, $p, $DefaultFile)
        $server.Start()
        $activePort = $p
        break
    } catch {
        if ($server) { try { $server.Stop() } catch {} }
        $server = $null
    }
}

if (-not $server) {
    Write-Host "Failed to start server on any candidate port." -ForegroundColor Red
    exit 1
}

$prefix = "http://localhost:$activePort/"
$startUrl = "$prefix$DefaultFile"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TruePass - Quai Network Secondary Resale Marketplace    " -ForegroundColor Red
Write-Host "  URL: $startUrl" -ForegroundColor Yellow
Write-Host "  Serving files from: $Directory" -ForegroundColor White
Write-Host "  Shard: Cyprus-1 (Shard 0x00) | Chain ID: 15000" -ForegroundColor Gray
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
    Write-Host ""
    Write-Host "Quai Resale server stopped cleanly." -ForegroundColor Yellow
}
