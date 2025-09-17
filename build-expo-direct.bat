@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK DIRECT AVEC EXPO
echo ========================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dépendances...
    npm install
    echo.
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
echo   BUILD AVEC EXPO DIRECT
echo ========================================

REM Utiliser Expo pour build directement (sans appareil)
echo Building avec Expo...
npx expo run:android --variant release --no-install --no-bundler
if errorlevel 1 (
    echo Erreur lors du build avec Expo !
    echo Tentative avec React Native CLI...
    npx react-native run-android --variant=release --no-packager
    if errorlevel 1 (
        echo Erreur lors du build !
        pause
        exit /b 1
    )
)

echo Build réussi ✓

REM Lire les valeurs finales depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "final_version=%%a"
)
set "final_version=%final_version: =%"
set "final_version=%final_version:"=%"
set "final_version=%final_version:,=%"

for /f "tokens=2 delims=:" %%a in ('findstr "versionCode" app.json') do (
    set "final_build=%%a"
)
set "final_build=%final_build: =%"
set "final_build=%final_build:"=%"
set "final_build=%final_build:,=%"

REM Chercher l'APK généré
set "apk_name=inovie-scan-v%final_version%-%final_build%.apk"
set "apk_source=android\app\build\outputs\apk\release\app-release.apk"
set "apk_dest=release\%apk_name%"

echo.
echo ========================================
echo   COPIE APK VERS RELEASE
echo ========================================

REM Créer le dossier release s'il n'existe pas
if not exist "release" mkdir release

REM Copier l'APK
if exist "%apk_source%" (
    copy "%apk_source%" "%apk_dest%" >nul
    if errorlevel 1 (
        echo Erreur lors de la copie !
        pause
        exit /b 1
    )
    echo APK copié avec succès dans le dossier release !
) else (
    echo Erreur: APK source introuvable !
    echo Cherchons l'APK généré...
    dir android\app\build\outputs\apk\release\ /b
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD TERMINÉ !
echo ========================================
echo APK généré: %apk_dest%
echo Version: %final_version%
echo Build: %final_build%
echo.

REM Ouvrir GitHub Releases
echo Ouverture de GitHub Releases...
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/releases/new"

echo.
echo Instructions:
echo 1. Tag: v%final_version%
echo 2. Title: Version %final_version% (%final_build%)
echo 3. Uploader le fichier: %apk_name%
echo 4. Cliquer sur "Publish release"
echo.

pause
