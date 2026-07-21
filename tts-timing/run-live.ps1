param(
    [string]$Segments = "..\docs\examples\script-agent-v2-rag-segments.json",
    [string]$Output = "..\RawMaterialCollector\RAG\script\tts",
    [string]$CredentialPath = (Join-Path $env:LOCALAPPDATA "VideoFactory\credentials\minimax-api-key.dpapi"),
    [switch]$ResetCredential,
    [switch]$SaveCredentialOnly
)

. (Join-Path $PSScriptRoot "credential-store.ps1")

$taskSecureKey = $null
$taskKeyPointer = [IntPtr]::Zero
$taskPlainKey = $null
$taskLogPath = Join-Path $PSScriptRoot "live-run.log"
$taskShouldSaveCredential = $false

try {
    if ((-not $ResetCredential) -and (Test-Path -LiteralPath $CredentialPath -PathType Leaf)) {
        $taskSecureKey = Get-VideoFactoryCredential -Path $CredentialPath
        Write-Host "Using the MiniMax credential saved for this Windows account."
    }
    else {
        $taskSecureKey = Read-Host "Enter MINIMAX_API_KEY (saved securely after this prompt)" -AsSecureString
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
        Write-Host "Credential saved. No MiniMax request was made." -ForegroundColor Green
        return
    }

    $env:MINIMAX_API_KEY = $taskPlainKey
    & npm.cmd run synthesize -- --segments $Segments --output $Output 2>&1 |
        ForEach-Object { $_ -replace 'sk-api-[^\s]+', '[REDACTED]' } |
        Tee-Object -FilePath $taskLogPath
    $taskExitCode = $LASTEXITCODE
    if ($taskExitCode -ne 0) {
        throw "TTS synthesis failed with exit code $taskExitCode. See $taskLogPath"
    }

    Write-Host "Synthesis completed. Output: $Output" -ForegroundColor Green
}
catch {
    $taskSafeError = $_.Exception.Message -replace 'sk-api-[^\s]+', '[REDACTED]'
    $taskSafeError | Add-Content -Encoding UTF8 $taskLogPath
    Write-Host $taskSafeError -ForegroundColor Red
}
finally {
    Remove-Item Env:MINIMAX_API_KEY -ErrorAction SilentlyContinue
    $taskPlainKey = $null
    if ($taskKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskKeyPointer)
    }
}
