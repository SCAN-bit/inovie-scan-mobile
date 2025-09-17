@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD DIRECT GITHUB - SIMPLE
echo ========================================
echo.

REM Incrémenter le build number
echo Incrémentation du build number...
powershell -ExecutionPolicy Bypass -File increment-build-only.ps1
if errorlevel 1 (
    echo Erreur lors de l'incrémentation du build !
    pause
    exit /b 1
)

REM Lire le nouveau build number
for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
    set "build_number=%%a"
)

REM Mettre à jour le versionCode dans app.json
echo Mise à jour du versionCode dans app.json...
powershell -ExecutionPolicy Bypass -File update-app-json.ps1 -VersionCode !build_number!
if errorlevel 1 (
    echo Erreur lors de la mise à jour du versionCode dans app.json !
    pause
    exit /b 1
)

REM Lire la version actuelle
for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.version"') do set "current_version=%%i"

REM Mettre à jour version.txt
echo !current_version! > version.txt
echo Version !current_version! écrite dans version.txt

echo.
echo ========================================
echo   PUSH VERS GITHUB
echo ========================================
echo Version: !current_version!
echo Build: !build_number!
echo.

REM Ajouter les fichiers modifiés
echo Ajout des fichiers modifiés...
git add app.json version.txt android\app\build.gradle

REM Commit avec message descriptif
echo Création du commit...
git commit -m "Release !current_version! - Build !build_number!"

REM Push vers GitHub
echo Push vers GitHub...
git push origin main
if errorlevel 1 (
    echo Erreur lors du push vers GitHub !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD GITHUB ACTIONS LANCÉ !
echo ========================================
echo.
echo ✅ Le build automatique a été lancé sur GitHub Actions
echo 📱 Version: !current_version!
echo 🔢 Build: !build_number!
echo.
echo 🔗 Suivez le build: https://github.com/SCAN-bit/inovie-scan-mobile/actions
echo 📦 L'APK sera disponible dans les releases
echo.

REM Ouvrir GitHub Actions
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/actions"

echo.
echo Le build prendra 5-10 minutes.
echo Vous recevrez un email quand l'APK sera prêt !
echo.

pause
