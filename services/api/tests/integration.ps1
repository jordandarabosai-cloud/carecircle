$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location $root

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/carecircle"
}
if (-not $env:PORT) { $env:PORT = "4010" }

$job = Start-Job -ScriptBlock {
  param($repo, $dbUrl, $port)
  Set-Location $repo
  $env:DATABASE_URL = $dbUrl
  $env:PORT = $port
  node services/api/src/server.js
} -ArgumentList $root, $env:DATABASE_URL, $env:PORT

Start-Sleep -Seconds 3

function Assert-True($cond, $message) {
  if (-not $cond) { throw "Assertion failed: $message" }
}

try {
  $base = "http://localhost:$($env:PORT)"

  $health = Invoke-RestMethod -Uri "$base/health" -Method Get
  Assert-True ($health.ok -eq $true) "health should be ok"

  $workerLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "worker@carecircle.dev" } | ConvertTo-Json)
  Assert-True (-not [string]::IsNullOrWhiteSpace($workerLogin.token)) "worker token should exist"
  $workerHeaders = @{ Authorization = "Bearer $($workerLogin.token)" }

  $cases = Invoke-RestMethod -Uri "$base/cases" -Method Get -Headers $workerHeaders
  Assert-True ($cases.cases.Count -ge 1) "worker should see at least one case"
  $caseId = $cases.cases[0].id

  $invite = Invoke-RestMethod -Uri "$base/cases/$caseId/invites" -Method Post -Headers $workerHeaders -ContentType "application/json" -Body (@{ email = "itest.parent@carecircle.dev"; role = "biological_parent" } | ConvertTo-Json)
  Assert-True ($invite.invite.status -eq "pending") "invite should be pending"

  $accepted = Invoke-RestMethod -Uri "$base/invites/accept" -Method Post -ContentType "application/json" -Body (@{ token = $invite.invite.token; fullName = "Integration Parent" } | ConvertTo-Json)
  Assert-True ($accepted.accepted -eq $true) "invite should be accepted"

  $parentHeaders = @{ Authorization = "Bearer $($accepted.token)" }
  $parentCases = Invoke-RestMethod -Uri "$base/cases" -Method Get -Headers $parentHeaders
  Assert-True ($parentCases.cases.Count -ge 1) "accepted user should have case access"

  $timeline = Invoke-RestMethod -Uri "$base/cases/$caseId/timeline" -Method Get -Headers $parentHeaders
  Assert-True ($timeline.events.Count -ge 1) "timeline should be visible"

  Write-Output "INTEGRATION_TESTS=PASS"
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
}
