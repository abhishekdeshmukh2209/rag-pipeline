# Run in its own terminal: Spring Boot API on http://127.0.0.1:8080
# Requires JDK 17+ and Maven on PATH.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$jdkRoot = Join-Path $env:LOCALAPPDATA "Programs\EclipseAdoptium"
$jdkHome = Get-ChildItem $jdkRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "jdk-17*" } |
  Select-Object -First 1
if ($jdkHome) {
  $env:JAVA_HOME = $jdkHome.FullName
  $env:Path = "$(Join-Path $jdkHome.FullName "bin");$env:Path"
}
$mavenBin = Join-Path $env:LOCALAPPDATA "Programs\apache-maven-3.9.15\bin"
if (Test-Path (Join-Path $mavenBin "mvn.cmd")) {
  $env:Path = "$mavenBin;$env:Path"
}
Set-Location (Join-Path (Split-Path $PSScriptRoot -Parent) "spring-backend")
Write-Host "Spring Boot (spring-backend) -> http://127.0.0.1:8080" -ForegroundColor Cyan
Write-Host "Health: http://127.0.0.1:8080/health" -ForegroundColor DarkGray
mvn.cmd spring-boot:run
