@echo off
title BUILD SIMPLE APK
cd /d "%~dp0"

echo ===============================================
echo   BUILD SIMPLE APK - INOVIE SCAN
echo ===============================================
echo.

echo Nettoyage...
cd android
call .\gradlew clean --no-daemon
if errorlevel 1 (
    echo ERREUR CLEAN - Appuyez sur une touche pour continuer...
    pause > nul
    cd ..
    exit /b 1
)

echo.
echo Build APK Release...
call .\gradlew assembleRelease --no-daemon
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
