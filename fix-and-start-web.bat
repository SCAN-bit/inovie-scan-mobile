@echo off
title CORRECTION ET LANCEMENT WEB
color 0A

echo ========================================
echo    CORRECTION ET LANCEMENT WEB
echo ========================================
echo.

cd /d "%~dp0"
echo Repertoire: %CD%
echo.

REM Nettoyage des caches corrompus
echo 1. Nettoyage des caches corrompus...
if exist ".expo" rmdir /s /q ".expo"
if exist "1.0.1)" rmdir /s /q "1.0.1)"
if exist "1.0.3" rmdir /s /q "1.0.3"
if exist "1.0.5" rmdir /s /q "1.0.5" 
if exist "1.0.6" rmdir /s /q "1.0.6"
if exist "1.1.0)" rmdir /s /q "1.1.0)"
if exist "2.0.0)" rmdir /s /q "2.0.0)"
echo [OK] Caches nettoyes
echo.

REM Verification de Node.js
echo 2. Verification de Node.js...
node --version 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js non trouve dans le PATH
    echo.
    echo Solutions:
    echo - Redemarrez votre terminal
    echo - Verifiez que Node.js est installe
    echo - Utilisez l'invite de commande Windows cmd au lieu de PowerShell
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detecte:
node --version
echo.

REM Verification de npm
echo 3. Verification de npm...
npm --version 2>nul
if errorlevel 1 (
    echo [ERREUR] npm non disponible
    pause
    exit /b 1
)

echo [OK] npm detecte:
npm --version
echo.

REM Installation des dependances si necessaire
echo 4. Verification des dependances...
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    if errorlevel 1 (
        echo [ERREUR] Echec de l'installation
        pause
        exit /b 1
    )
)
echo [OK] Dependances disponibles
echo.

REM Lancement d'Expo
echo 5. Lancement d'Expo en mode web...
echo.
echo IMPORTANT: L'application va s'ouvrir dans votre navigateur
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

npx expo start --web --clear

echo.
echo [INFO] Serveur arrete.
pause
