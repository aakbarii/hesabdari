# Creates a clean zip for sharing — without your data, env, or node_modules.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = $PSScriptRoot
  if (-not (Test-Path (Join-Path $root "package.json"))) {
    $root = Get-Location
  }
}

# Prefer project root (script lives in /scripts)
$pkg = Join-Path (Split-Path $PSScriptRoot -Parent) "package.json"
if (Test-Path $pkg) {
  $root = Split-Path $PSScriptRoot -Parent
} elseif (Test-Path ".\package.json") {
  $root = (Get-Location).Path
}

Set-Location $root
$out = Join-Path $root "hesabdari-share.zip"
if (Test-Path $out) { Remove-Item $out -Force }

$excludeDirs = @(
  "node_modules",
  ".next",
  "data",
  ".git",
  ".vercel",
  "coverage",
  "agent-transcripts"
)

$excludeFiles = @(
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  "hesabdari-share.zip"
)

$temp = Join-Path $env:TEMP ("hesabdari-share-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp | Out-Null

try {
  Get-ChildItem -Force | ForEach-Object {
    $name = $_.Name
    if ($excludeDirs -contains $name) { return }
    if ($excludeFiles -contains $name) { return }
    if ($name -like ".env*") { return }
    Copy-Item $_.FullName -Destination (Join-Path $temp $name) -Recurse -Force
  }

  # Ensure friend gets empty data folder placeholder
  $dataDir = Join-Path $temp "data"
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  Set-Content -Path (Join-Path $dataDir ".gitkeep") -Value ""

  Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $out -Force
  Write-Host ""
  Write-Host "Ready: $out"
  Write-Host "Send this zip to your friend. Your database and .env were NOT included."
} finally {
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
