# Installs Eclipse Temurin JDK 17 and Apache Maven under the current user's
# %LOCALAPPDATA%\Programs (no Administrator UAC required).
# Sets JAVA_HOME and prepends JDK + Maven bin dirs to the user PATH.
#
# Usage (from repo root, in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   .\scripts\install-jdk-maven-user.ps1
#
# Open a new terminal after running so PATH/JAVA_HOME are picked up.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$mavenVersion = "3.9.15"
$programs = Join-Path $env:LOCALAPPDATA "Programs"
$mavenHome = Join-Path $programs "apache-maven-$mavenVersion"
$mavenBin = Join-Path $mavenHome "bin"
$mavenZip = Join-Path $env:TEMP "apache-maven-$mavenVersion-bin.zip"
$mavenUrl = "https://dlcdn.apache.org/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"

$jdkRoot = Join-Path $programs "EclipseAdoptium"
$jdkApi = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
$jdkZip = Join-Path $env:TEMP "OpenJDK17-temurin.zip"

function Add-UserPathPrefix {
  param([string]$Dir)
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if ([string]::IsNullOrEmpty($current)) {
    [Environment]::SetEnvironmentVariable("Path", $Dir, "User")
    return
  }
  $parts = $current -split ";" | Where-Object { $_ -and ($_ -ne $Dir) }
  [Environment]::SetEnvironmentVariable("Path", ($Dir + ";" + ($parts -join ";")), "User")
}

Write-Host "== JDK 17 (Temurin, zip) -> $jdkRoot" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $jdkRoot -Force | Out-Null
$existingJava = Get-ChildItem $jdkRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "jdk-17*" } |
  ForEach-Object { Join-Path $_.FullName "bin\java.exe" } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
if (-not $existingJava) {
  Write-Host "Downloading JDK (this may take a minute)..."
  Invoke-WebRequest -Uri $jdkApi -OutFile $jdkZip -MaximumRedirection 5 -UseBasicParsing
  Expand-Archive -Path $jdkZip -DestinationPath $jdkRoot -Force
  Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
}
$jdkHome = (Get-ChildItem $jdkRoot -Directory | Where-Object { $_.Name -like "jdk-17*" } | Select-Object -First 1).FullName
if (-not $jdkHome) {
  throw "JDK extraction failed: no jdk-17* folder under $jdkRoot"
}
$javaBin = Join-Path $jdkHome "bin"
Write-Host "JAVA_HOME -> $jdkHome"
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkHome, "User")
Add-UserPathPrefix -Dir $javaBin

Write-Host "== Apache Maven $mavenVersion -> $mavenHome" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $mavenBin "mvn.cmd"))) {
  Write-Host "Downloading Maven..."
  Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing
  Expand-Archive -Path $mavenZip -DestinationPath $programs -Force
  Remove-Item $mavenZip -Force -ErrorAction SilentlyContinue
}
if (-not (Test-Path (Join-Path $mavenBin "mvn.cmd"))) {
  throw "Maven install failed: mvn.cmd missing under $mavenBin"
}
Add-UserPathPrefix -Dir $mavenBin

Write-Host ""
Write-Host "Done. Open a NEW PowerShell or CMD window, then run:" -ForegroundColor Green
Write-Host "  java -version" -ForegroundColor Gray
Write-Host "  mvn -version" -ForegroundColor Gray
Write-Host "  cd spring-backend && mvn spring-boot:run" -ForegroundColor Gray
