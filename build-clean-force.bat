@echo off
title BUILD CLEAN FORCE
cd /d "%~dp0"

echo ===============================================
echo   NETTOYAGE ULTRA COMPLET + BUILD APK
echo ===============================================
echo.

echo Suppression du cache Gradle local...
if exist "android\.gradle" rmdir /s /q "android\.gradle"
if exist "android\app\build" rmdir /s /q "android\app\build"
if exist "android\build" rmdir /s /q "android\build"

echo Suppression du cache Gradle utilisateur pour forcer le re-telechargement...
if exist "%USERPROFILE%\.gradle\caches\8.6" rmdir /s /q "%USERPROFILE%\.gradle\caches\8.6"
if exist "%USERPROFILE%\.gradle\caches\8.10.2" rmdir /s /q "%USERPROFILE%\.gradle\caches\8.10.2"

echo.
echo Reinstallation des dependances Node...
npm install --legacy-peer-deps

echo.
echo Build avec environnement propre...
cd android

echo Nettoyage complet du cache Gradle...
call .\gradlew clean --no-daemon --refresh-dependencies

echo.
echo Build APK Release avec cache vide...
call .\gradlew assembleRelease --no-daemon --refresh-dependencies
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ERREUR DE BUILD !
    echo ========================================
    echo Le build a echoue.
    echo Verifiez les erreurs ci-dessus.
    echo.
    echo Appuyez sur une touche pour fermer...
    pause > nul
    cd ..
    exit /b 1
)

cd ..

echo.
echo ========================================
echo   BUILD REUSSI !
echo ========================================

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo APK genere avec succes !
    echo Emplacement: android\app\build\outputs\apk\release\app-release.apk
    
    if not exist "release" mkdir release
    copy "android\app\build\outputs\apk\release\app-release.apk" "release\inovie-scan-v1.0.8-33.apk" >nul
    echo APK copie vers: release\inovie-scan-v1.0.8-33.apk
) else (
    echo ERREUR: APK non trouve !
)

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
