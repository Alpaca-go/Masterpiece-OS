$ErrorActionPreference = 'Stop'
$testRepo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$testData = Join-Path $testRepo '.runtime/design-proposal-test-user-data'
$names = @('MASTERPIECE_REPO_ROOT','MASTERPIECE_USER_DATA_DIR','MASTERPIECE_WEB_RPC_PORT','MASTERPIECE_WEB_RENDERER_PORT')
$previous = @{}
$pushed = $false
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:MASTERPIECE_REPO_ROOT = $testRepo
    $env:MASTERPIECE_USER_DATA_DIR = $testData
    $env:MASTERPIECE_WEB_RPC_PORT = '4359'
    $env:MASTERPIECE_WEB_RENDERER_PORT = '5189'
    foreach ($port in @(4359,5189)) {
        if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
            throw "Test port $port is already in use. Stop the previous test instance before starting."
        }
    }
    Push-Location -LiteralPath $testRepo
    $pushed = $true
    Write-Host "Experimental website: http://127.0.0.1:5189"
    Write-Host "Isolated data: $testData"
    Write-Host 'Configure models in the experimental website. No existing project or credential is copied.'
    & npm.cmd run web:dev
} finally {
    if ($pushed) { Pop-Location }
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
