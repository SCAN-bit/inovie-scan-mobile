# Script PowerShell pour lancer l'application web SCAN
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    LANCEMENT APPLICATION WEB SCAN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verification de Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js non trouve"
    }
    Write-Host "Node.js detecte: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pour installer Node.js:" -ForegroundColor Yellow
    Write-Host "1. Allez sur https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Telechargez la version LTS" -ForegroundColor White
    Write-Host "3. Installez-la avec les options par defaut" -ForegroundColor White
    Write-Host "4. Redemarrez votre terminal" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou utilisez le script d'installation automatique:" -ForegroundColor Yellow
    Write-Host ".\install_nodejs.bat" -ForegroundColor White
    Write-Host ""
    Read-Host "Appuyez sur Entree pour continuer"
    exit 1
}

# Verification de npm
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "npm non trouve"
    }
    Write-Host "npm detecte: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: npm n'est pas disponible" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour continuer"
    exit 1
}

Write-Host ""
Write-Host "Demarrage du serveur de developpement..." -ForegroundColor Yellow
Write-Host ""

# Changement vers le repertoire du script
Set-Location $PSScriptRoot

# Verification que les dependances sont installees
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dependances..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Echec de l'installation des dependances" -ForegroundColor Red
        Read-Host "Appuyez sur Entree pour continuer"
        exit 1
    }
}

Write-Host "Lancement d'Expo..." -ForegroundColor Green
npx expo start --web --clear

Write-Host ""
Write-Host "Serveur arrete." -ForegroundColor Yellow
Read-Host "Appuyez sur Entree pour continuer"
