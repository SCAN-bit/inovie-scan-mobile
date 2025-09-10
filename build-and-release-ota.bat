@echo off

echo ========================================
echo   BUILD APK + RELEASE OTA GITHUB
echo ========================================
echo.

REM Verifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    echo.
)

REM Demander le type de mise a jour
echo Choisissez le type de mise a jour :
echo   [1] NOUVELLE VERSION (ex: 1.0.5 vers 1.0.6)
echo   [2] MEME VERSION, NOUVEAU BUILD (ex: 1.0.5 build 14 vers 1.0.5 build 15)
echo.
set /p update_type="Votre choix (1 ou 2): "

if "%update_type%"=="1" (
    set /p new_version="Entrez la nouvelle version (ex: 1.0.6): "
    if "%new_version%"=="" (
        echo Erreur: Vous devez entrer une version.
        pause
        exit /b 1
    )
    
    echo.
    echo ========================================
    echo   MISE A JOUR VERS NOUVELLE VERSION
    echo ========================================
    
    REM Utiliser le script PowerShell qui fonctionne
    powershell -ExecutionPolicy Bypass -File update_version_ultra_simple.ps1 -newVersion "%new_version%"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour des versions !
        pause
        exit /b 1
    )
    set "version_info=nouvelle version %new_version%"
    
) else if "%update_type%"=="2" (
    echo.
    echo ========================================
    echo   INCREMENTATION DU BUILD NUMBER
    echo ========================================
    
    REM Incrementer seulement le build number
    powershell -ExecutionPolicy Bypass -File increment-build-only.ps1
    if errorlevel 1 (
        echo Erreur lors de l'incrementation du build !
        pause
        exit /b 1
    )
    
    REM Lire la version actuelle pour l'affichage
    for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json ^| findstr -v "appVersionSource"') do (
        set "temp=%%a"
        call set "temp=%%temp: =%%"
        call set "temp=%%temp:~1,-2%%"
        set "current_version=%%temp%%"
    )
    set "version_info=meme version %current_version% avec nouveau build"
    set "new_version=%current_version%"
    
) else (
    echo Choix invalide !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   NETTOYAGE ET BUILD
echo ========================================

REM Aller dans le repertoire android pour gradlew
cd android
if errorlevel 1 (
    echo Erreur: Repertoire android introuvable !
    pause
    exit /b 1
)

REM Clean
echo Nettoyage...
call .\\gradlew clean
if errorlevel 1 (
    echo Erreur lors du nettoyage !
    cd ..
    pause
    exit /b 1
)

REM Build release
echo Building APK release...
call .\\gradlew assembleRelease
if errorlevel 1 (
    echo Erreur lors du build release !
    cd ..
    pause
    exit /b 1
)

REM Revenir au repertoire principal
cd ..

echo.
echo ========================================
echo   BUILD TERMINE !
echo ========================================
echo APK genere: android\app\build\outputs\apk\release\app-release.apk
echo Mise a jour: %version_info%
echo.

REM Demander les notes de release
echo ========================================
echo   PREPARATION RELEASE GITHUB
echo ========================================
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build automatique"

REM Utiliser l'APK original dans le dossier release
set "apk_path=android\app\build\outputs\apk\release\app-release.apk"
set "apk_name=inovie-scan-v%new_version%.apk"

echo.
echo ========================================
echo   CREATION RELEASE GITHUB
echo ========================================
echo Version: v%new_version%
echo Notes: %release_notes%
echo APK: %apk_path%
echo.

REM Ouvrir GitHub Releases dans le navigateur
echo.
echo ========================================
echo   CREATION RELEASE GITHUB (MANUEL)
echo ========================================
echo.
echo GitHub CLI n'est pas disponible (droits admin requis).
echo Ouverture de GitHub Releases dans le navigateur...
echo.

REM Construire l'URL GitHub
set "GITHUB_OWNER=SCAN-bit"
set "github_url=https://github.com/%GITHUB_OWNER%/inovie-scan-mobile/releases/new"
set "github_url=%github_url%?tag=v%new_version%"
set "github_url=%github_url%&title=Version %new_version%"
set "github_url=%github_url%&body=%release_notes%"

echo URL GitHub: %github_url%
echo.

REM Ouvrir le navigateur
start "" "%github_url%"

echo.
echo ========================================
echo   INSTRUCTIONS MANUELLES
echo ========================================
echo.
echo 1. Le navigateur s'est ouvert sur GitHub Releases
echo 2. Completez les informations:
echo    - Tag: v%new_version%
echo    - Title: Version %new_version%
echo    - Description: %release_notes%
echo 3. Glissez-deposez le fichier: %apk_path%
echo 4. Cliquez sur "Publish release"
echo.
echo APK a uploader: %apk_path%
echo Chemin complet: %CD%\%apk_path%
echo.

REM Attendre que l'utilisateur confirme
set /p confirm="Avez-vous publie le release sur GitHub ? (o/N): "
if /i not "%confirm%"=="o" (
    echo.
    echo Release non publie. L'APK est pret dans: %apk_path%
    echo Vous pouvez le publier plus tard.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   RELEASE GITHUB TERMINE !
echo ========================================
echo L'APK a ete publie sur GitHub Releases !
echo Les utilisateurs peuvent maintenant mettre a jour via l'app.
echo.
echo Lien du release: https://github.com/SCAN-bit/inovie-scan-mobile/releases/tag/v%new_version%
echo.

REM L'APK reste dans le dossier release (pas de nettoyage)

echo.
echo ========================================
echo   DISTRIBUTION FIREBASE (OPTIONNEL)
echo ========================================
set /p distribute_firebase="Voulez-vous AUSSI distribuer sur Firebase App Distribution ? (o/N): "
if /i "%distribute_firebase%"=="o" (
    echo.
    echo Distribution vers Firebase App Distribution...
    firebase appdistribution:distribute android\app\build\outputs\apk\release\app-release.apk --app 1:566648702832:android:1a71f64c5b0399e76531b5 --groups "testers" --release-notes "%version_info% - Build automatique"
    
    if errorlevel 1 (
        echo.
        echo Erreur lors de la distribution Firebase !
        echo Mais le release GitHub a ete cree avec succes.
    ) else (
        echo Distribution Firebase terminee !
    )
)

echo.
echo ========================================
echo   TOUT EST TERMINE !
echo ========================================
echo.
echo Resume:
echo - APK build avec Gradle ✓
echo - Release cree sur GitHub ✓
echo - Mises a jour OTA disponibles ✓
if /i "%distribute_firebase%"=="o" echo - Distribution Firebase ✓
echo.
echo Les utilisateurs peuvent maintenant:
echo 1. Recevoir une notification de mise a jour dans l'app
echo 2. Cliquer sur "Verifier les mises a jour" dans les reglages
echo 3. Télécharger et installer automatiquement la nouvelle version
echo.
pause
