# Uso: .\scripts\merge-http.ps1 -Version "2.1.3" -Message "Eliminar FAQ y dedup Qdrant"
# Merge main -> http con Dockerfile nginx y asunto [V@hash] para EasyPanel.

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Push-Location $root
try {
    git checkout http
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    git merge main -m "[V${Version}] merge main: ${Message}"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Resolver conflictos (suele ser Dockerfile). Luego:"
        Write-Host "  Copy-Item Dockerfile.http Dockerfile -Force"
        Write-Host "  git add Dockerfile"
        Write-Host "  git commit"
        exit $LASTEXITCODE
    }

    Copy-Item Dockerfile.http Dockerfile -Force
    $dockerChanged = git diff --name-only Dockerfile
    if ($dockerChanged) {
        git add Dockerfile
        git commit --amend --no-edit
    }

    $hash = (git rev-parse --short HEAD).Trim()
    $subject = "[V$Version@$hash] merge main: $Message"
    git commit --amend -m $subject

    Write-Host "OK: $subject"
    git log -1 --oneline
    Write-Host "`nPush: git push origin http"
}
finally {
    Pop-Location
}
