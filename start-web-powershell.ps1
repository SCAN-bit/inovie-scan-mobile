# Script PowerShell pour corriger et lancer l'application web
Write-Host "========================================" -ForegroundColor Green
Write-Host "    CORRECTION ET LANCEMENT WEB" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Navigation vers le répertoire
Set-Location $PSScriptRoot
Write-Host "Repertoire: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Nettoyage des caches corrompus
Write-Host "1. Nettoyage des caches corrompus..." -ForegroundColor Cyan
if (Test-Path ".expo") { Remove-Item ".expo" -Recurse -Force -ErrorAction SilentlyContinue }
Get-ChildItem | Where-Object { $_.Name -match "^[0-9]+\.[0-9]+\.[0-9]+\)?" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Caches nettoyes" -ForegroundColor Green
Write-Host ""

# Recherche de Node.js dans différents emplacements
Write-Host "2. Recherche de Node.js..." -ForegroundColor Cyan

$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe", 
    "$env:APPDATA\npm\node.exe",
    "$env:USERPROFILE\AppData\Roaming\npm\node.exe",
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\node.exe"
)

$nodeFound = $false
$nodeCmd = "node"

# Test de la commande node standard
try {
    $version = & node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Node.js detecte: $version" -ForegroundColor Green
        $nodeFound = $true
    }
} catch {}

# Si node n'est pas dans le PATH, chercher dans les emplacements communs
if (-not $nodeFound) {
    foreach ($path in $nodePaths) {
        if (Test-Path $path) {
            try {
                $version = & $path --version 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Node.js trouve dans: $path" -ForegroundColor Green
                    Write-Host "Version: $version" -ForegroundColor Green
                    $nodeCmd = $path
                    $nodeFound = $true
                    break
                }
            } catch {}
        }
    }
}

if (-not $nodeFound) {
    Write-Host "[ERREUR] Node.js non trouve" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "- Installez Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "- Redemarrez votre terminal" -ForegroundColor Yellow
    Write-Host "- Utilisez l'invite de commande Windows (cmd)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entree pour continuer"
    exit 1
}
Write-Host ""

# Lancement d'Expo
Write-Host "3. Lancement d'Expo en mode web..." -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: L'application va s'ouvrir dans votre navigateur" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arreter le serveur" -ForegroundColor Yellow
Write-Host ""

try {
    & npx expo start --web --clear
} catch {
    Write-Host "[ERREUR] Echec du lancement d'Expo: $_" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour continuer"
}

Write-Host ""
Write-Host "[INFO] Serveur arrete." -ForegroundColor Yellow
