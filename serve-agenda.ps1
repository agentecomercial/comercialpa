# Servidor HTTP local minimalista pra servir agenda.html em http://127.0.0.1:5500
# Uso: clique direito no arquivo > "Executar com PowerShell"
#      ou:  powershell -ExecutionPolicy Bypass -File serve-agenda.ps1
# Pra parar: feche a janela ou aperte Ctrl+C

$port = 5500
$root = $PSScriptRoot

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.ttf'  = 'font/ttf'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

try {
  $listener.Start()
} catch {
  Write-Host "ERRO ao iniciar na porta $port. Pode ja estar em uso." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host "Pressione Enter para fechar"
  exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " Servidor rodando em:  http://127.0.0.1:$port/agenda.html" -ForegroundColor Green
Write-Host " Diretorio:            $root" -ForegroundColor DarkGray
Write-Host " Para parar:           Ctrl+C ou feche esta janela" -ForegroundColor DarkGray
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# Abre o navegador automaticamente
Start-Process "http://127.0.0.1:$port/agenda.html"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq '/' -or $path -eq '') { $path = '/agenda.html' }

    $file = Join-Path $root ($path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar))

    # bloqueia path traversal
    $fullRoot = [IO.Path]::GetFullPath($root)
    $fullFile = [IO.Path]::GetFullPath($file)
    if (-not $fullFile.StartsWith($fullRoot)) {
      $res.StatusCode = 403
      $res.Close()
      Write-Host "[403] $path (path traversal)" -ForegroundColor Yellow
      continue
    }

    if (Test-Path $fullFile -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($fullFile).ToLower()
      $ct  = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($fullFile)
      $res.ContentType = $ct
      $res.ContentLength64 = $bytes.Length
      $res.AddHeader('Cache-Control', 'no-cache')
      # Headers exigidos pelo Google Identity Services para o popup OAuth funcionar sem warnings COOP
      $res.AddHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
      $res.AddHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.StatusCode = 200
      Write-Host "[200] $path" -ForegroundColor DarkGray
    } else {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host "[404] $path" -ForegroundColor Yellow
    }
    $res.Close()
  } catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
  }
}
