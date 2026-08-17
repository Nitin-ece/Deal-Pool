# DealPool Backend — Windows PowerShell Test Runner
$ErrorActionPreference = "Continue"

$Tests = @(
    "tests/auth.test.ts",
    "tests/admin.test.ts",
    "tests/deals.test.ts",
    "tests/offers.test.ts",
    "tests/resources.test.ts",
    "tests/transactions.test.ts",
    "tests/wallet.test.ts",
    "tests/contracts.test.ts",
    "tests/reports.test.ts"
)

$Passed = @()
$Failed = @()

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " DealPool Backend - Full Test Suite (Windows)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$tsxCmd = ".\node_modules\.bin\tsx.cmd"
if (-not (Test-Path $tsxCmd)) {
    $tsxCmd = ".\node_modules\.bin\tsx"
}

foreach ($testFile in $Tests) {
    Write-Host ""
    Write-Host "---- Running $testFile ----" -ForegroundColor Yellow
    
    & $tsxCmd $testFile
    
    if ($LASTEXITCODE -eq 0) {
        $Passed += $testFile
        Write-Host "  [PASSED] $testFile" -ForegroundColor Green
    } else {
        $Failed += $testFile
        Write-Host "  [FAILED] $testFile" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Summary" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Passed: $($Passed.Length)" -ForegroundColor Green
foreach ($p in $Passed) {
    Write-Host "  [PASS] $p" -ForegroundColor Green
}

Write-Host "Failed: $($Failed.Length)" -ForegroundColor Red
foreach ($f in $Failed) {
    Write-Host "  [FAIL] $f" -ForegroundColor Red
}
Write-Host "==============================================" -ForegroundColor Cyan

if ($Failed.Length -gt 0) {
    exit 1
}

exit 0
