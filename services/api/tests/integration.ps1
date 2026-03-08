$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location $root

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/carecircle"
}
if (-not $env:PORT) { $env:PORT = "4010" }
if (-not $env:AUTH_CODE_DELIVERY_MODE) { $env:AUTH_CODE_DELIVERY_MODE = "dev" }
if (-not $env:AUTH_RATE_LIMIT_BYPASS) { $env:AUTH_RATE_LIMIT_BYPASS = "true" }

$job = Start-Job -ScriptBlock {
  param($repo, $dbUrl, $port, $deliveryMode, $rateLimitBypass)
  Set-Location $repo
  $env:DATABASE_URL = $dbUrl
  $env:PORT = $port
  $env:AUTH_CODE_DELIVERY_MODE = $deliveryMode
  $env:AUTH_RATE_LIMIT_BYPASS = $rateLimitBypass
  node services/api/src/server.js
} -ArgumentList $root, $env:DATABASE_URL, $env:PORT, $env:AUTH_CODE_DELIVERY_MODE, $env:AUTH_RATE_LIMIT_BYPASS

Start-Sleep -Seconds 3

function Assert-True($cond, $message) {
  if (-not $cond) { throw "Assertion failed: $message" }
}

try {
  $base = "http://localhost:$($env:PORT)"

  $health = Invoke-RestMethod -Uri "$base/health" -Method Get
  Assert-True ($health.ok -eq $true) "health should be ok"

  $workerCodeReq = Invoke-RestMethod -Uri "$base/auth/request-code" -Method Post -ContentType "application/json" -Body (@{ email = "worker@carecircle.dev" } | ConvertTo-Json)
  Assert-True (-not [string]::IsNullOrWhiteSpace($workerCodeReq.devCode)) "worker dev code should exist"

  $workerLogin = Invoke-RestMethod -Uri "$base/auth/verify-code" -Method Post -ContentType "application/json" -Body (@{ email = "worker@carecircle.dev"; code = $workerCodeReq.devCode } | ConvertTo-Json)
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

  $newTask = Invoke-RestMethod -Uri "$base/cases/$caseId/tasks" -Method Post -Headers $workerHeaders -ContentType "application/json" -Body (@{ title = "Complete weekly check-in"; description = "Share weekly update with case members" } | ConvertTo-Json)
  Assert-True ($newTask.task.status -eq "open") "task should be open"

  $updatedTask = Invoke-RestMethod -Uri "$base/cases/$caseId/tasks/$($newTask.task.id)" -Method Patch -Headers $workerHeaders -ContentType "application/json" -Body (@{ status = "in_progress" } | ConvertTo-Json)
  Assert-True ($updatedTask.task.status -eq "in_progress") "task should update status"

  $tasks = Invoke-RestMethod -Uri "$base/cases/$caseId/tasks" -Method Get -Headers $parentHeaders
  Assert-True ($tasks.tasks.Count -ge 1) "tasks should be visible"

  $newMsg = Invoke-RestMethod -Uri "$base/cases/$caseId/messages" -Method Post -Headers $workerHeaders -ContentType "application/json" -Body (@{ body = "Quick coordination update" } | ConvertTo-Json)
  Assert-True (-not [string]::IsNullOrWhiteSpace($newMsg.message.id)) "message id should exist"

  $messages = Invoke-RestMethod -Uri "$base/cases/$caseId/messages" -Method Get -Headers $parentHeaders
  Assert-True ($messages.messages.Count -ge 1) "messages should be visible"

  $doc = Invoke-RestMethod -Uri "$base/cases/$caseId/documents" -Method Post -Headers $workerHeaders -ContentType "application/json" -Body (@{ name = "Visit Plan"; url = "https://files.carecircle.dev/visit-plan.pdf"; visibility = "all" } | ConvertTo-Json)
  Assert-True ($doc.document.visibility -eq "all") "document should be created"

  $docs = Invoke-RestMethod -Uri "$base/cases/$caseId/documents" -Method Get -Headers $parentHeaders
  Assert-True ($docs.documents.Count -ge 1) "documents should be visible"

  Write-Output "INTEGRATION_TESTS=PASS"
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
}
