@echo off

echo ========================================
echo   BUILD APK GRADLE AVEC DISTRIBUTION
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

REM Proposer la distribution
set /p distribute="Voulez-vous distribuer sur Firebase App Distribution ? (o/N): "
if /i "%distribute%"=="o" (
    echo.
    echo ========================================
    echo   DISTRIBUTION FIREBASE
    echo ========================================
    
    echo Distribution vers Firebase App Distribution...
    firebase appdistribution:distribute android\app\build\outputs\apk\release\app-release.apk --app 1:566648702832:android:1a71f64c5b0399e76531b5 --groups "testers" --release-notes "%version_info% - Build automatique"
    
    if errorlevel 1 (
        echo.
        echo Erreur lors de la distribution !
        echo Verifiez que:
        echo - Vous etes connecte a Firebase CLI (firebase login)
        echo - Le groupe "testers" existe dans Firebase Console
        echo - L'app ID est correct
        pause
        exit /b 1
    )
    
    echo.
    echo ========================================
    echo   DISTRIBUTION TERMINEE !
    echo ========================================
    echo L'APK a ete distribue avec succes !
    echo Les testeurs vont recevoir une notification.
)

echo.
echo Build et distribution termines !
pause 