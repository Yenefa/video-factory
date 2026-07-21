function Save-VideoFactoryCredential {
    param(
        [Parameter(Mandatory = $true)]
        [Security.SecureString]$SecureValue,

        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $taskCredentialDirectory = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($taskCredentialDirectory)) {
        New-Item -ItemType Directory -Path $taskCredentialDirectory -Force | Out-Null
    }

    $taskEncryptedValue = ConvertFrom-SecureString -SecureString $SecureValue
    Set-Content -LiteralPath $Path -Value $taskEncryptedValue -Encoding UTF8
}

function Get-VideoFactoryCredential {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Stored MiniMax credential was not found. Run .\run-live.ps1 -ResetCredential to save it again."
    }

    try {
        $taskEncryptedValue = (Get-Content -LiteralPath $Path -Raw -Encoding UTF8).Trim()
        return ConvertTo-SecureString -String $taskEncryptedValue -ErrorAction Stop
    }
    catch {
        throw "Stored MiniMax credential could not be decrypted by this Windows account. Run .\run-live.ps1 -ResetCredential to save it again."
    }
}
