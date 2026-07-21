param(
    [string]$CredentialPath = (Join-Path $env:LOCALAPPDATA "VideoFactory\credentials\siliconflow-api-key.dpapi")
)

$secureKey = Read-Host "Paste the ROTATED SILICONFLOW_API_KEY (it will be encrypted for this Windows user)" -AsSecureString
$pointer = [IntPtr]::Zero

try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ([string]::IsNullOrWhiteSpace($plainKey)) {
        throw "API key cannot be empty."
    }

    $directory = Split-Path -Parent $CredentialPath
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    ConvertFrom-SecureString -SecureString $secureKey | Set-Content -LiteralPath $CredentialPath -Encoding UTF8
    Write-Host "Credential saved securely for this Windows account. You may close this window." -ForegroundColor Green
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    $plainKey = $null
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}
