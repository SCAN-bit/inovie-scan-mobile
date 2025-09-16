# Script PowerShell pour build APK
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BUILD APK POWERSHELL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Demander le type de mise à jour
Write-Host "Choisissez le type de mise à jour :"
Write-Host "  [1] NOUVELLE VERSION (ex: 1.0.6 vers 1.0.7)"
Write-Host "  [2] MEME VERSION, NOUVEAU BUILD (ex: 1.0.6 build 62 vers 1.0.6 build 63)"
Write-Host ""
$updateType = Read-Host "Votre choix (1 ou 2)"

if ($updateType -eq "1") {
    $newVersion = Read-Host "Entrez la nouvelle version (ex: 1.0.7)"
    if ([string]::IsNullOrEmpty($newVersion)) {
        Write-Host "Erreur: Vous devez entrer une version." -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour continuer"
        exit 1
    }
    $versionInfo = "nouvelle version $newVersion"
    
} elseif ($updateType -eq "2") {
    Write-Host "Incrementation du build number..."
    & ".\increment-build-only.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors de l'incrementation du build !" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour continuer"
        exit 1
    }
    
    # Lire la version actuelle
    $appJson = Get-Content 'app.json' | ConvertFrom-Json
    $newVersion = $appJson.expo.version
    $versionInfo = "meme version $newVersion avec nouveau build"
    
} else {
    Write-Host "Choix invalide !" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BUILD APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Aller dans android
Set-Location android
if (-not (Test-Path "gradlew")) {
    Write-Host "Erreur: Repertoire android introuvable !" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

# Clean et build
Write-Host "Nettoyage..."
& ".\gradlew" clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du nettoyage !" -ForegroundColor Red
    Set-Location ..
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host "Building APK release..."
& ".\gradlew" assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du build release !" -ForegroundColor Red
    Set-Location ..
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ORGANISATION DES FICHIERS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Creer le dossier release
if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Name "release"
}

# Lire les valeurs finales
$gradleContent = Get-Content 'android\app\build.gradle'
$versionName = ($gradleContent | Where-Object { $_ -match 'versionName' }) -replace '.*versionName\s+"([^"]*)".*', '$1'
$versionCode = ($gradleContent | Where-Object { $_ -match 'versionCode' }) -replace '.*versionCode\s+(\d+).*', '$1'

Write-Host "Version finale: $versionName" -ForegroundColor Green
Write-Host "Build final: $versionCode" -ForegroundColor Green

# Creer le nom de fichier
$apkName = "inovie-scan-v$versionName-build$versionCode.apk"
$apkSource = "android\app\build\outputs\apk\release\app-release.apk"
$apkDest = "release\$apkName"

# Copier vers release
if (Test-Path $apkSource) {
    Write-Host "Copie vers release: $apkName" -ForegroundColor Green
    Copy-Item $apkSource $apkDest
    Write-Host "APK copie avec succes !" -ForegroundColor Green
} else {
    Write-Host "Erreur: APK source introuvable !" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BUILD TERMINE !" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APK genere: $apkDest" -ForegroundColor Green
Write-Host "Mise a jour: $versionInfo" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CREATION RELEASE GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# URL GitHub simple et propre
$githubUrl = "https://github.com/SCAN-bit/inovie-scan-mobile/releases/new?tag=v$versionName"

Write-Host "URL GitHub: $githubUrl" -ForegroundColor Yellow
Write-Host ""

# Ouvrir le navigateur
Start-Process $githubUrl

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Le navigateur s'est ouvert sur GitHub Releases"
Write-Host "2. Completez les informations:"
Write-Host "   - Tag: v$versionName"
Write-Host "   - Title: Version $versionName (Build $versionCode)"
Write-Host "   - Description: $versionInfo - Build automatique"
Write-Host "3. Glissez-deposez le fichier: $apkName"
Write-Host "4. Cliquez sur 'Publish release'"
Write-Host ""
Write-Host "APK a uploader: $apkDest"
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer"

