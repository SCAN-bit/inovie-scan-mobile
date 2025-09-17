Write-Host "Test de Node.js..." -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Test de Get-Command node:" -ForegroundColor Cyan
try {
    $nodeCmd = Get-Command node -ErrorAction Stop
    Write-Host "Node.js trouve: $($nodeCmd.Source)" -ForegroundColor Green
} catch {
    Write-Host "Node.js non trouve dans le PATH" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Test de node --version:" -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Version Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'execution de node --version" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de l'execution de node --version" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Test de npm --version:" -ForegroundColor Cyan
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Version npm: $npmVersion" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'execution de npm --version" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de l'execution de npm --version" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Test de npx --version:" -ForegroundColor Cyan
try {
    $npxVersion = npx --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Version npx: $npxVersion" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'execution de npx --version" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de l'execution de npx --version" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Test du PATH:" -ForegroundColor Cyan
$pathEntries = $env:PATH -split ';' | Where-Object { $_ -like '*node*' -or $_ -like '*npm*' }
if ($pathEntries) {
    Write-Host "Entrees Node.js dans le PATH:" -ForegroundColor Green
    $pathEntries | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
} else {
    Write-Host "Aucune entree Node.js trouvee dans le PATH" -ForegroundColor Red
}

Write-Host ""
Write-Host "6. Test d'execution directe:" -ForegroundColor Cyan
try {
    $result = node -e "console.log('Node.js fonctionne!')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'execution: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de l'execution directe" -ForegroundColor Red
}

Write-Host ""
Read-Host "Appuyez sur Entree pour continuer"
