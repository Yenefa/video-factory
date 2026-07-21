param(
    [string]$Jobs = "..\docs\examples\asset-planning-v0.3-rag-jobs.json",
    [string]$Output = "..\RawMaterialCollector\RAG\script\assets",
    [string]$CredentialPath = (Join-Path $env:LOCALAPPDATA "VideoFactory\credentials\siliconflow-api-key.dpapi"),
    [switch]$ResetCredential,
    [switch]$SaveCredentialOnly
)

. (Join-Path $PSScriptRoot "..\tts-timing\credential-store.ps1")

$taskSecureKey = $null
$taskKeyPointer = [IntPtr]::Zero
$taskPlainKey = $null
$taskLogPath = Join-Path $PSScriptRoot "live-run.log"
$taskShouldSaveCredential = $false

try {
    if ((-not $ResetCredential) -and (Test-Path -LiteralPath $CredentialPath -PathType Leaf)) {
        $taskSecureKey = Get-VideoFactoryCredential -Path $CredentialPath
        Write-Host "Using the SiliconFlow credential saved for this Windows account."
    }
    else {
        $taskSecureKey = Read-Host "Enter SILICONFLOW_API_KEY (saved securely after this prompt)" -AsSecureString
        $taskShouldSaveCredential = $true
    }

    $taskKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecureKey)
    $taskPlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskKeyPointer)
    if ([string]::IsNullOrWhiteSpace($taskPlainKey)) {
        throw "API key cannot be empty"
    }

    if ($taskShouldSaveCredential) {
        Save-VideoFactoryCredential -SecureValue $taskSecureKey -Path $CredentialPath
        Write-Host "Credential saved with Windows DPAPI: $CredentialPath"
    }

    if ($SaveCredentialOnly) {
        Write-Host "No SiliconFlow request was made." -ForegroundColor Green
        return
    }

    $env:SILICONFLOW_API_KEY = $taskPlainKey
    & npm.cmd run generate -- --jobs $Jobs --output $Output 2>&1 |
        ForEach-Object { $_ -replace 'sk-[A-Za-z0-9_-]+', '[REDACTED]' } |
        Tee-Object -FilePath $taskLogPath
    $taskExitCode = $LASTEXITCODE
    if ($taskExitCode -ne 0) {
        throw "asset generation failed with exit code $taskExitCode. See $taskLogPath"
    }

    Write-Host "Asset generation completed. Output: $Output" -ForegroundColor Green
}
catch {
    $taskSafeError = $_.Exception.Message -replace 'sk-[A-Za-z0-9_-]+', '[REDACTED]'
    $taskSafeError | Add-Content -Encoding UTF8 $taskLogPath
    Write-Host $taskSafeError -ForegroundColor Red
}
finally {
    Remove-Item Env:SILICONFLOW_API_KEY -ErrorAction SilentlyContinue
    $taskPlainKey = $null
    if ($taskKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskKeyPointer)
    }
}
