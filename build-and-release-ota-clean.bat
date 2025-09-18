@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK + RELEASE OTA (PROPRE)
echo ========================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dépendances...
    npm install
    echo.
)

REM Lire la version actuelle depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "\"version\":" app.json') do (
    set "current_version=%%a"
    set "current_version=!current_version: =!"
    set "current_version=!current_version:"=!"
    set "current_version=!current_version:,=!"
)

REM Demander le type de mise à jour
echo Choisissez le type de mise à jour :
echo   [1] NOUVELLE VERSION (ex: !current_version! vers 1.0.7)
echo   [2] MÊME VERSION, NOUVEAU BUILD (ex: !current_version! build 14 vers !current_version! build 15)
echo.
set /p update_type="Votre choix (1 ou 2): "

if "%update_type%"=="1" (
    set /p new_version="Entrez la nouvelle version (ex: 1.0.6): "
    if "!new_version!"=="" (
        echo Erreur: Vous devez entrer une version.
        pause
        exit /b 1
    )
    
    echo.
    echo ========================================
    echo   MISE À JOUR VERS NOUVELLE VERSION
    echo ========================================
    
    REM Mettre à jour la version dans app.json
    echo Mise à jour de la version dans app.json...
    powershell -Command "$content = Get-Content 'app.json' -Raw; $content = $content -replace '\"version\":\\s*\"[^\"]*\"', '\"version\": \"!new_version!\"'; Set-Content 'app.json' -Value $content -Encoding UTF8"
    if errorlevel 1 (
        echo Erreur lors de la mise à jour de app.json !
        pause
        exit /b 1
    )
    echo Version mise à jour vers !new_version! dans app.json
    set "version_info=nouvelle version !new_version!"
    
) else if "%update_type%"=="2" (
    echo.
    echo ========================================
    echo   INCRÉMENTATION DU BUILD NUMBER
    echo ========================================
    
    REM Lire le build number actuel depuis build.gradle
    for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
        set "current_build=%%a"
    )
    
    REM Incrémenter seulement le build number
    powershell -ExecutionPolicy Bypass -File increment-build-only.ps1
    if errorlevel 1 (
        echo Erreur lors de l'incrémentation du build !
        pause
        exit /b 1
    )
    
    REM Lire le nouveau build number depuis build.gradle
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
    echo versionCode mis à jour vers !build_number! dans app.json
    
    REM Lire la version actuelle pour l'affichage
    for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json ^| findstr -v "appVersionSource"') do (
        set "version_temp=%%a"
        call set "version_temp=%%version_temp: =%%"
        call set "version_temp=%%version_temp:~1,-2%%"
        set "current_version=%%version_temp%%"
    )
    
    set "version_info=même version !current_version! avec nouveau build"
    set "new_version=!current_version!"
    
) else (
    echo Choix invalide !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD PROPRE (SANS NETTOYAGE AGRESSIF)
echo ========================================

REM Vérifier la version Gradle
echo Vérification de la configuration Gradle...
if exist "android\gradle\wrapper\gradle-wrapper.properties" (
    findstr "gradle-8.7" android\gradle\wrapper\gradle-wrapper.properties >nul
    if errorlevel 1 (
        echo ATTENTION: Version Gradle non optimale détectée
        echo Recommandation: Utiliser Gradle 8.7 pour éviter les problèmes de build
        echo.
    ) else (
        echo Version Gradle 8.7 détectée - Configuration optimale ✓
    )
)

REM Aller dans le répertoire android pour gradlew
cd android
if errorlevel 1 (
    echo Erreur: Répertoire android introuvable !
    pause
    exit /b 1
)

REM Clean simple (sans nettoyage agressif du cache)
echo Nettoyage simple...
call .\gradlew clean --no-daemon
if errorlevel 1 (
    echo Erreur lors du nettoyage, arrêt des daemons...
    call .\gradlew --stop
    timeout /t 3 /nobreak >nul
    echo Nouvelle tentative de nettoyage...
    call .\gradlew clean --no-daemon
    if errorlevel 1 (
        echo Erreur lors du nettoyage !
        cd ..
        pause
        exit /b 1
    )
)

REM Créer version.js AVANT le build
echo.
echo ========================================
echo   CRÉATION VERSION.JS
echo ========================================

REM Lire la version et le build number depuis android/app/build.gradle
for /f "tokens=2 delims= " %%a in ('findstr "versionName" android\app\build.gradle') do (
    set "gradle_version=%%a"
    set "gradle_version=!gradle_version:"=!"
)
for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
    set "build_number=%%a"
)

REM Utiliser la version du build.gradle si pas déjà définie
if "%new_version%"=="" (
    set "new_version=!gradle_version!"
)

REM Debug: Afficher les valeurs
echo Version: !new_version!
echo Build number: !build_number!

REM Créer un module de version JavaScript
call echo // Module de version pour l'application > version.js
call echo // Ce fichier est mis à jour automatiquement par le script de build >> version.js
call echo. >> version.js
call echo const version = "!new_version!"; >> version.js
call echo const buildNumber = !build_number!; >> version.js
call echo const fullVersion = "!new_version!.!build_number!"; >> version.js
call echo. >> version.js
call echo module.exports = { >> version.js
call echo   version, >> version.js
call echo   buildNumber, >> version.js
call echo   fullVersion >> version.js
call echo }; >> version.js

echo Fichier version.js créé avec la version !new_version!.!build_number!

REM Build release avec architecture optimisée
echo.
echo ========================================
echo   BUILD APK RELEASE
echo ========================================
echo Building APK release avec architecture ARM64 optimisée...
call .\gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
if errorlevel 1 (
    echo Erreur lors du build release, tentative avec toutes les architectures...
    call .\gradlew assembleRelease --no-daemon
    if errorlevel 1 (
        echo Erreur lors du build release !
        cd ..
        pause
        exit /b 1
    )
)

REM Revenir au répertoire principal
cd ..

REM Renommer l'APK avec la version
echo.
echo ========================================
echo   RENOMMAGE APK AVEC VERSION
echo ========================================

REM Lire directement depuis app.json (méthode fiable avec variables uniques)
for /f "tokens=2 delims=:" %%a in ('findstr "\"version\":" app.json') do (
    set "ota_version_json=%%a"
)
set "ota_version_json=%ota_version_json: =%"
set "ota_version_json=%ota_version_json:"=%"
set "ota_version_json=%ota_version_json:,=%"

for /f "tokens=2 delims=:" %%a in ('findstr "versionCode" app.json') do (
    set "ota_build_json=%%a"
)
set "ota_build_json=%ota_build_json: =%"
set "ota_build_json=%ota_build_json:"=%"
set "ota_build_json=%ota_build_json:,=%"

echo Version depuis app.json: %ota_version_json%
echo Build depuis app.json: %ota_build_json%

set "ota_apk_name=inovie-scan-v%ota_version_json%-%ota_build_json%.apk"
set "ota_apk_source=android\app\build\outputs\apk\release\app-release.apk"
set "ota_apk_dest=release\%ota_apk_name%"
set "apk_dest=%ota_apk_dest%"
set "apk_name=%ota_apk_name%"

echo Nom APK final: %ota_apk_name%
echo Source: %ota_apk_source%
echo Destination: %ota_apk_dest%

REM Créer le dossier release s'il n'existe pas
if not exist "release" mkdir release

REM Copier l'APK vers le dossier release avec le bon nom
if exist "%ota_apk_source%" (
    echo Copie: app-release.apk -> release\%ota_apk_name%
    copy "%ota_apk_source%" "%ota_apk_dest%" >nul
    if errorlevel 1 (
        echo Erreur lors de la copie !
        pause
        exit /b 1
    )
    echo APK copié avec succès dans le dossier release !
) else (
    echo Erreur: APK source introuvable !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD TERMINÉ !
echo ========================================
echo APK généré: !apk_dest!
echo Mise à jour: %version_info%
echo.

REM Demander les notes de release
echo ========================================
echo   PRÉPARATION RELEASE GITHUB
echo ========================================
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build automatique"

echo.
echo ========================================
echo   CRÉATION RELEASE GITHUB (MANUEL)
echo ========================================
echo.
echo Version: %ota_version_json% (%ota_build_json%)
echo APK: %ota_apk_dest%
echo.
echo Ouvrir GitHub Releases...
echo.
echo INSTRUCTIONS:
echo 1. Créer un nouveau release
echo 2. Tag: v%ota_version_json%
echo 3. Title: Version %ota_version_json% (%ota_build_json%)
echo 4. Uploader le fichier: %ota_apk_name%
echo.

REM Ouvrir GitHub Releases (URL simple)
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/releases/new"

echo.
echo ========================================
echo   INSTRUCTIONS MANUELLES
echo ========================================
echo.
echo 1. Le navigateur s'est ouvert sur GitHub Releases
echo 2. Complétez les informations:
echo    - Tag: v!new_version!
echo    - Title: Version !new_version! (!build_number!)
echo    - Description: %release_notes%
echo 3. Glissez-déposez le fichier: %apk_name%
echo 4. Cliquez sur "Publish release"
echo.
echo APK à uploader: %apk_path%
echo Nom suggéré pour l'APK: %apk_name%
echo Chemin complet: %CD%\%apk_path%
echo.

REM Attendre que l'utilisateur confirme
set /p confirm="Avez-vous publié le release sur GitHub ? (o/N): "
if /i not "%confirm%"=="o" (
    echo.
    echo Release non publié. L'APK est prêt dans: %apk_path%
    echo Vous pouvez le publier plus tard.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   RELEASE GITHUB TERMINÉ !
echo ========================================
echo L'APK a été publié sur GitHub Releases !
echo Les utilisateurs peuvent maintenant mettre à jour via l'app.
echo.
echo Lien du release: https://github.com/SCAN-bit/inovie-scan-mobile/releases/tag/v!new_version!
echo.

REM Proposer la copie vers un dossier d'archives
echo.
set /p archive="Voulez-vous copier l'APK vers le dossier d'archives ? (o/N): "
if /i "%archive%"=="o" (
    echo.
    echo ========================================
    echo   COPIE VERS ARCHIVES
    echo ========================================
    
    REM Créer le dossier d'archives s'il n'existe pas
    if not exist "archives" mkdir archives
    
    REM Créer un nom avec la date
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "date_time=%%a"
    set "YY=!date_time:~2,2!" & set "YYYY=!date_time:~0,4!" & set "MM=!date_time:~4,2!" & set "DD=!date_time:~6,2!"
    set "HH=!date_time:~8,2!" & set "Min=!date_time:~10,2!" & set "Sec=!date_time:~12,2!"
    set "timestamp=!YYYY!-!MM!-!DD!_!HH!-!Min!-!Sec!"
    
    set "archive_name=inovie-scan-v%ota_version_json%-build%ota_build_json%-%timestamp%.apk"
    set "archive_path=archives\%archive_name%"
    
    echo Copie vers: %archive_path%
    copy "%apk_dest%" "%archive_path%" >nul
    if errorlevel 1 (
        echo Erreur lors de la copie !
    ) else (
        echo APK archivé avec succès !
    )
)

echo.
echo ========================================
echo   DISTRIBUTION FIREBASE (OPTIONNEL)
echo ========================================
set /p distribute_firebase="Voulez-vous AUSSI distribuer sur Firebase App Distribution ? (o/N): "
if /i "%distribute_firebase%"=="o" (
    echo.
    echo Distribution vers Firebase App Distribution...
    firebase appdistribution:distribute "%apk_dest%" --app 1:566648702832:android:1a71f64c5b0399e76531b5 --groups "testers" --release-notes "%version_info% - Build automatique"
    
    if errorlevel 1 (
        echo.
        echo Erreur lors de la distribution Firebase !
        echo Mais le release GitHub a été créé avec succès.
    ) else (
        echo Distribution Firebase terminée !
    )
)

echo.
echo ========================================
echo   TOUT EST TERMINÉ !
echo ========================================
echo.
echo Résumé:
echo - APK build avec Gradle ✓
echo - Release créé sur GitHub ✓
echo - Mises à jour OTA disponibles ✓
if /i "%distribute_firebase%"=="o" echo - Distribution Firebase ✓
echo.
echo Les utilisateurs peuvent maintenant:
echo 1. Recevoir une notification de mise à jour dans l'app
echo 2. Cliquer sur "Vérifier les mises à jour" dans les réglages
echo 3. Télécharger et installer automatiquement la nouvelle version
echo.
pause
