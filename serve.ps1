# Minimal static file server for local development: powershell -File serve.ps1
param([int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8080 }))
$root = $PSScriptRoot
$types = @{ '.html'='text/html'; '.css'='text/css'; '.js'='application/javascript'; '.json'='application/json'; '.png'='image/png'; '.svg'='image/svg+xml'; '.stl'='model/stl' }
$l = [Net.HttpListener]::new()
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$Port"
while ($l.IsListening) {
  $c = $l.GetContext()
  $rel = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
  if ($rel -eq '') { $rel = 'index.html' }
  $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
  if ($path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($path)
    $ext = [IO.Path]::GetExtension($path).ToLower()
    $c.Response.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
