@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK VIA GITHUB ACTIONS (MANUEL)
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
    set "version_info=nouvelle version !new_version!"
    
) else if "%update_type%"=="2" (
    set "version_type=build"
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
echo   PREPARATION DU BUILD
echo ========================================
echo Type: %version_type%
if "%update_type%"=="1" echo Nouvelle version: %new_version%
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

echo.
echo ========================================
echo   LANCEMENT MANUEL DU BUILD
echo ========================================
echo.
echo Étapes à suivre :
echo.
echo 1. Ouvrir GitHub Actions dans le navigateur
echo 2. Cliquer sur "Build APK and Release"
echo 3. Cliquer sur "Run workflow"
echo 4. Sélectionner les options :
echo    - Type: %version_type%
if "%update_type%"=="1" echo    - Nouvelle version: %new_version%
echo    - Notes: %release_notes%
echo 5. Cliquer sur "Run workflow"
echo.

REM Ouvrir GitHub Actions dans le navigateur
echo Ouverture de GitHub Actions...
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/actions"

echo.
echo ========================================
echo   INSTRUCTIONS DÉTAILLÉES
echo ========================================
echo.
echo 📋 Étapes à suivre :
echo.
echo 1️⃣  Le navigateur s'est ouvert sur GitHub Actions
echo 2️⃣  Cliquez sur "Build APK and Release" dans la liste
echo 3️⃣  Cliquez sur le bouton "Run workflow" (à droite)
echo 4️⃣  Dans le formulaire qui s'ouvre :
echo     - Version type: %version_type%
if "%update_type%"=="1" echo     - New version: %new_version%
echo     - Release notes: %release_notes%
echo 5️⃣  Cliquez sur "Run workflow" (bouton vert)
echo.
echo ⏱️  Le build prendra 5-10 minutes
echo 📱 Vous recevrez un email quand l'APK sera prêt
echo 📦 L'APK sera automatiquement publié dans les releases
echo.
echo 🔗 Liens utiles :
echo    - Actions: https://github.com/SCAN-bit/inovie-scan-mobile/actions
echo    - Releases: https://github.com/SCAN-bit/inovie-scan-mobile/releases
echo.

set /p confirm="Avez-vous lancé le workflow sur GitHub ? (o/N): "
if /i "%confirm%"=="o" (
    echo.
    echo ✅ Parfait ! Le build est en cours...
    echo 📧 Vous recevrez une notification email quand c'est prêt
    echo 🔗 Suivez le build: https://github.com/SCAN-bit/inovie-scan-mobile/actions
    echo.
) else (
    echo.
    echo ⚠️  N'oubliez pas de lancer le workflow manuellement !
    echo 🔗 Lien: https://github.com/SCAN-bit/inovie-scan-mobile/actions
    echo.
)

echo ========================================
echo   RÉSUMÉ
echo ========================================
echo.
echo ✅ Changements commités et poussés
echo 🔗 GitHub Actions ouvert dans le navigateur
echo 📋 Instructions affichées ci-dessus
echo.
echo Les utilisateurs pourront:
echo 1. Recevoir une notification de mise à jour dans l'app
echo 2. Télécharger l'APK depuis GitHub Releases
echo 3. Installer la nouvelle version
echo.

pause
