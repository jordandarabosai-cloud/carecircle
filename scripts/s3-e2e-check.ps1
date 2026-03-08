$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:DATABASE_URL) { $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/carecircle" }
if (-not $env:PORT) { $env:PORT = "4010" }
if (-not $env:AUTH_CODE_DELIVERY_MODE) { $env:AUTH_CODE_DELIVERY_MODE = "dev" }
if (-not $env:AUTH_RATE_LIMIT_BYPASS) { $env:AUTH_RATE_LIMIT_BYPASS = "true" }

$required = @("S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY")
$missing = $required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($missing.Count -gt 0) {
  throw "Missing required env vars for S3 check: $($missing -join ', ')"
}

$env:STORAGE_MODE = "s3"

$job = Start-Job -ScriptBlock {
  param($repo, $dbUrl, $port, $deliveryMode, $rateLimitBypass, $storageMode, $s3Bucket, $s3Region, $s3Access, $s3Secret, $s3Endpoint, $s3PathStyle, $s3PublicBase)
  Set-Location $repo
  $env:DATABASE_URL = $dbUrl
  $env:PORT = $port
  $env:AUTH_CODE_DELIVERY_MODE = $deliveryMode
  $env:AUTH_RATE_LIMIT_BYPASS = $rateLimitBypass
  $env:STORAGE_MODE = $storageMode
  $env:S3_BUCKET = $s3Bucket
  $env:S3_REGION = $s3Region
  $env:S3_ACCESS_KEY_ID = $s3Access
  $env:S3_SECRET_ACCESS_KEY = $s3Secret
  if ($s3Endpoint) { $env:S3_ENDPOINT = $s3Endpoint }
  if ($s3PathStyle) { $env:S3_FORCE_PATH_STYLE = $s3PathStyle }
  if ($s3PublicBase) { $env:S3_PUBLIC_BASE_URL = $s3PublicBase }
  node services/api/src/server.js
} -ArgumentList $root, $env:DATABASE_URL, $env:PORT, $env:AUTH_CODE_DELIVERY_MODE, $env:AUTH_RATE_LIMIT_BYPASS, $env:STORAGE_MODE, $env:S3_BUCKET, $env:S3_REGION, $env:S3_ACCESS_KEY_ID, $env:S3_SECRET_ACCESS_KEY, $env:S3_ENDPOINT, $env:S3_FORCE_PATH_STYLE, $env:S3_PUBLIC_BASE_URL

Start-Sleep -Seconds 3

try {
  $base = "http://localhost:$($env:PORT)"

  $codeReq = Invoke-RestMethod -Uri "$base/auth/request-code" -Method Post -ContentType "application/json" -Body (@{ email = "worker@carecircle.dev" } | ConvertTo-Json)
  $login = Invoke-RestMethod -Uri "$base/auth/verify-code" -Method Post -ContentType "application/json" -Body (@{ email = "worker@carecircle.dev"; code = $codeReq.devCode } | ConvertTo-Json)
  $headers = @{ Authorization = "Bearer $($login.token)" }

  $cases = Invoke-RestMethod -Uri "$base/cases" -Method Get -Headers $headers
  if ($cases.cases.Count -lt 1) { throw "No cases available for test" }
  $caseId = $cases.cases[0].id

  $presign = Invoke-RestMethod -Uri "$base/cases/$caseId/documents/presign" -Method Post -Headers $headers -ContentType "application/json" -Body (@{ fileName = "s3-check.txt"; contentType = "text/plain" } | ConvertTo-Json)

  $uploadUrl = $presign.upload.uploadUrl
  if (-not $uploadUrl) { throw "Missing uploadUrl from presign response" }

  $tempFile = Join-Path $env:TEMP "carecircle-s3-check.txt"
  "carecircle s3 check $(Get-Date -Format o)" | Out-File -FilePath $tempFile -Encoding utf8

  # Upload to signed URL
  $uploadHeaders = @{ "Content-Type" = "text/plain" }
  Invoke-WebRequest -Uri $uploadUrl -Method Put -Headers $uploadHeaders -InFile $tempFile | Out-Null

  $doc = Invoke-RestMethod -Uri "$base/cases/$caseId/documents" -Method Post -Headers $headers -ContentType "application/json" -Body (@{ name = "S3 Check"; url = $presign.upload.fileUrl; visibility = "all" } | ConvertTo-Json)

  if (-not $doc.document.id) { throw "Document registration failed" }

  Write-Output "S3_E2E=PASS"
  Write-Output ("DOC_ID=" + $doc.document.id)
  Write-Output ("FILE_URL=" + $doc.document.url)
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
}
