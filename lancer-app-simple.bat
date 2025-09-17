@echo off
title LANCEMENT SIMPLE
color 0A

echo ========================================
echo    LANCEMENT SIMPLE - INOVIE SCAN
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo Verification de l'environnement...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non trouve !
    echo Veuillez installer Node.js ou verifier le PATH
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] npm non trouve !
    pause
    exit /b 1
)

echo [OK] Environnement verifie
echo.

echo Nettoyage du cache Metro...
npx expo start --clear --lan --no-dev --minify
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du lancement
    echo.
    echo Solutions possibles :
    echo 1. Executez diagnostic-avance.bat
    echo 2. Executez reparer-app.bat
    echo 3. Verifiez votre connexion reseau
    echo 4. Redemarrez votre ordinateur
    pause
    exit /b 1
)

echo.
echo Application lancee avec succes !
pause
