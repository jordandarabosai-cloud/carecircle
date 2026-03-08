$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/carecircle"
}
if (-not $env:PORT) { $env:PORT = "4010" }
if (-not $env:AUTH_CODE_DELIVERY_MODE) { $env:AUTH_CODE_DELIVERY_MODE = "dev" }

$job = Start-Job -ScriptBlock {
  param($repo, $dbUrl, $port, $deliveryMode)
  Set-Location $repo
  $env:DATABASE_URL = $dbUrl
  $env:PORT = $port
  $env:AUTH_CODE_DELIVERY_MODE = $deliveryMode
  node services/api/src/server.js
} -ArgumentList $root, $env:DATABASE_URL, $env:PORT, $env:AUTH_CODE_DELIVERY_MODE

Start-Sleep -Seconds 3

try {
  $base = "http://localhost:$($env:PORT)"

  $health = Invoke-RestMethod -Uri "$base/health" -Method Get
  $reqCode = Invoke-RestMethod -Uri "$base/auth/request-code" -Method Post -ContentType "application/json" -Body '{"email":"worker@carecircle.dev"}'
  $login = Invoke-RestMethod -Uri "$base/auth/verify-code" -Method Post -ContentType "application/json" -Body (@{ email = 'worker@carecircle.dev'; code = $reqCode.devCode } | ConvertTo-Json)
  $headers = @{ Authorization = "Bearer $($login.token)" }
  $cases = Invoke-RestMethod -Uri "$base/cases" -Method Get -Headers $headers
  $timeline = Invoke-RestMethod -Uri "$base/cases/$($cases.cases[0].id)/timeline" -Method Get -Headers $headers

  Write-Output "HEALTH_OK=$($health.ok)"
  Write-Output "CASES_COUNT=$($cases.cases.Count)"
  Write-Output "TIMELINE_COUNT=$($timeline.events.Count)"
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
}
