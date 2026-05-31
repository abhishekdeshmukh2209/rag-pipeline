# Run in its own terminal: Angular dev server + proxy to Spring on :8080
# Requires Node.js 18+ and npm on PATH.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path (Split-Path $PSScriptRoot -Parent) "frontend")
if (-not (Test-Path "node_modules")) {
  npm.cmd install
}
Write-Host "Angular (frontend) -> http://127.0.0.1:4200" -ForegroundColor Cyan
Write-Host "API proxy: /api -> http://127.0.0.1:8080 (start Spring in another console first)" -ForegroundColor DarkGray
npm.cmd start -- --host 127.0.0.1 --port 4200
