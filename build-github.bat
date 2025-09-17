@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK VIA GITHUB ACTIONS
echo ========================================
echo.

REM Vérifier si git est configuré
git status >nul 2>&1
if errorlevel 1 (
    echo Erreur: Ce n'est pas un dépôt Git !
    echo Veuillez initialiser Git ou vous placer dans le bon dossier.
    pause
    exit /b 1
)

REM Vérifier si GitHub CLI est installé
gh --version >nul 2>&1
if errorlevel 1 (
    echo GitHub CLI n'est pas installé.
    echo Installation de GitHub CLI...
    winget install --id GitHub.cli
    if errorlevel 1 (
        echo Erreur lors de l'installation de GitHub CLI !
        echo Veuillez l'installer manuellement depuis: https://cli.github.com/
        pause
        exit /b 1
    )
)

REM Lire la version actuelle depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "current_version=%%a"
    set "current_version=!current_version: =!"
    set "current_version=!current_version:"=!"
    set "current_version=!current_version:,=!"
)

REM Demander le type de mise à jour
echo Choisissez le type de mise à jour :
echo   [1] NOUVELLE VERSION (ex: !current_version! vers 1.0.7)
echo   [2] MEME VERSION, NOUVEAU BUILD (ex: !current_version! build 14 vers !current_version! build 15)
echo.
set /p update_type="Votre choix (1 ou 2): "

if "%update_type%"=="1" (
    set /p new_version="Entrez la nouvelle version (ex: 1.0.6): "
    if "!new_version!"=="" (
        echo Erreur: Vous devez entrer une version.
        pause
        exit /b 1
    )
    
    set "version_type=version"
    set "version_param=--field new_version=!new_version!"
    set "version_info=nouvelle version !new_version!"
    
) else if "%update_type%"=="2" (
    set "version_type=build"
    set "version_param="
    set "version_info=même version !current_version! avec nouveau build"
    
) else (
    echo Choix invalide !
    pause
    exit /b 1
)

REM Demander les notes de release
echo.
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build automatique"

echo.
echo ========================================
echo   LANCEMENT DU BUILD GITHUB
echo ========================================
echo Type: %version_type%
echo Version: %new_version%
echo Notes: %release_notes%
echo.

REM Commiter les changements si nécessaire
echo Vérification des changements...
git add .
git diff --cached --quiet
if errorlevel 1 (
    echo Changements détectés, commit automatique...
    git commit -m "Auto-commit avant build: %version_info%"
    git push
    echo Changements commités et poussés ✓
) else (
    echo Aucun changement détecté ✓
)

REM Déclencher le workflow GitHub Actions
echo.
echo Déclenchement du build sur GitHub Actions...
gh workflow run build-and-release.yml --field version_type=%version_type% %version_param% --field release_notes=%release_notes%

if errorlevel 1 (
    echo Erreur lors du déclenchement du workflow !
    echo Vérifiez que vous êtes connecté à GitHub CLI:
    echo   gh auth login
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD LANCÉ SUR GITHUB !
echo ========================================
echo.
echo ✅ Le build a été lancé sur GitHub Actions
echo 📱 Vous recevrez une notification quand l'APK sera prêt
echo 🔗 Suivez le build: https://github.com/SCAN-bit/inovie-scan-mobile/actions
echo 📦 L'APK sera automatiquement publié dans les releases
echo.
echo Les utilisateurs pourront:
echo 1. Recevoir une notification de mise à jour dans l'app
echo 2. Télécharger l'APK depuis GitHub Releases
echo 3. Installer la nouvelle version
echo.

REM Ouvrir GitHub Actions dans le navigateur
echo Ouverture de GitHub Actions...
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/actions"

pause
