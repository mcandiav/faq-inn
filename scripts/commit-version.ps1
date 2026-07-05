# Uso: .\scripts\commit-version.ps1 -Version "2.1" -Message "feat: importar Excel FAQs"
# Crea commit con asunto [V2.1@abc1234] para que EasyPanel lo muestre en Deployment History.
# Sincroniza api/src/lib/tenant.js APP_VERSION con -Version (contrato UI /api/health).

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tenantFile = Join-Path $root "api\src\lib\tenant.js"
$indexFile = Join-Path $root "http\public\index.html"

if (-not (Test-Path $tenantFile)) {
    Write-Error "No se encontró $tenantFile"
}

$tenantContent = Get-Content $tenantFile -Raw -Encoding UTF8
$tenantContent = $tenantContent -replace "export const APP_VERSION = '[^']*';", "export const APP_VERSION = '$Version';"
Set-Content -Path $tenantFile -Value $tenantContent -Encoding UTF8 -NoNewline
git add $tenantFile

if (Test-Path $indexFile) {
    $indexContent = Get-Content $indexFile -Raw -Encoding UTF8
    $indexContent = $indexContent -replace '(i18n\.js\?v=)[0-9.]+', "`${1}$Version"
    $indexContent = $indexContent -replace '(app\.js\?v=)[0-9.]+', "`${1}$Version"
    Set-Content -Path $indexFile -Value $indexContent -Encoding UTF8 -NoNewline
    git add $indexFile
}

$staged = git diff --cached --quiet 2>$null
if ($LASTEXITCODE -eq 0) {
    $unstaged = git diff --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Error "No hay cambios para commitear. Haz git add antes."
    }
}

# Primer commit con placeholder; amend inyecta el hash real.
git commit -m "[$Version] $Message"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$hash = (git rev-parse --short HEAD).Trim()
$subject = "[V$Version@$hash] $Message"

git commit --amend -m $subject
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK: $subject (APP_VERSION=$Version)"
git log -1 --oneline
