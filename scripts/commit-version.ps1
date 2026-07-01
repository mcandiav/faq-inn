# Uso: .\scripts\commit-version.ps1 -Version "2.1" -Message "feat: importar Excel FAQs"
# Crea commit con asunto [V2.1@abc1234] para que EasyPanel lo muestre en Deployment History.

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

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

Write-Host "OK: $subject"
git log -1 --oneline
