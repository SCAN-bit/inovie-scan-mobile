@echo off
title LANCEMENT WEB SIMPLE
color 0A

echo ========================================
echo    LANCEMENT WEB SIMPLE
echo ========================================
echo.

REM Force le changement vers le repertoire du script
cd /d "%~dp0"

echo Repertoire de travail: %CD%
echo.

REM Verification rapide
if not exist "package.json" (
    echo [ERREUR] Ce script doit etre dans le dossier inovie-scan-mobile
    echo Repertoire actuel: %CD%
    echo.
    echo Solution: Deplacez ce script dans le dossier inovie-scan-mobile
    pause
    exit /b 1
)

echo [OK] Repertoire correct
echo.

REM Installation rapide des dependances si necessaire
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    echo.
)

REM Lancement direct
echo Lancement de l'application web...
echo.
echo L'application va s'ouvrir dans votre navigateur
echo Appuyez sur Ctrl+C pour arreter
echo.

npx expo start --web

echo.
echo Application fermee.
pause
