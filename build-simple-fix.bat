@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK SIMPLE - CORRECTION GRADLE
echo ========================================
echo.

REM Supprimer complètement tous les caches Gradle
echo Nettoyage complet des caches Gradle...
if exist "%USERPROFILE%\.gradle" (
    echo Suppression du cache Gradle global...
    rmdir /s /q "%USERPROFILE%\.gradle" 2>nul
)

if exist "android\.gradle" (
    echo Suppression du cache Gradle local...
    rmdir /s /q "android\.gradle" 2>nul
)

echo Cache Gradle supprimé ✓

REM Aller dans le répertoire android
cd android
if errorlevel 1 (
    echo Erreur: Répertoire android introuvable !
    pause
    exit /b 1
)

REM Télécharger Gradle 8.7 proprement
echo Téléchargement de Gradle 8.7...
call .\gradlew --version
if errorlevel 1 (
    echo Erreur lors du téléchargement de Gradle
    cd ..
    pause
    exit /b 1
)

echo Gradle 8.7 téléchargé ✓

REM Clean simple
echo Nettoyage...
call .\gradlew clean --no-daemon
if errorlevel 1 (
    echo Erreur lors du nettoyage !
    cd ..
    pause
    exit /b 1
)

echo Nettoyage réussi ✓

REM Build release
echo.
echo ========================================
echo   BUILD APK RELEASE
echo ========================================
echo Building APK release...
call .\gradlew assembleRelease --no-daemon
if errorlevel 1 (
    echo Erreur lors du build release !
    cd ..
    pause
    exit /b 1
)

echo Build réussi ✓

REM Revenir au répertoire principal
cd ..

REM Copier l'APK vers le dossier release
echo.
echo ========================================
echo   COPIE APK VERS RELEASE
echo ========================================

REM Lire la version depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "version=%%a"
)
set "version=%version: =%"
set "version=%version:"=%"
set "version=%version:,=%"

for /f "tokens=2 delims=:" %%a in ('findstr "versionCode" app.json') do (
    set "build=%%a"
)
set "build=%build: =%"
set "build=%build:"=%"
set "build=%build:,=%"

set "apk_name=inovie-scan-v%version%-%build%.apk"
set "apk_source=android\app\build\outputs\apk\release\app-release.apk"
set "apk_dest=release\%apk_name%"

echo Nom APK: %apk_name%
echo Source: %apk_source%
echo Destination: %apk_dest%

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
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD TERMINÉ !
echo ========================================
echo APK généré: %apk_dest%
echo Version: %version%
echo Build: %build%
echo.

REM Ouvrir GitHub Releases
echo Ouverture de GitHub Releases...
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/releases/new"

echo.
echo Instructions:
echo 1. Tag: v%version%
echo 2. Title: Version %version% (%build%)
echo 3. Uploader le fichier: %apk_name%
echo 4. Cliquer sur "Publish release"
echo.

pause
