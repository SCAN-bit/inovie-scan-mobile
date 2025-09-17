@echo off
title LANCEMENT WEB SIMPLE
color 0A

echo ========================================
echo    LANCEMENT WEB SIMPLE
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"
echo Repertoire: %CD%

echo Verification du package.json...
if not exist "package.json" (
    echo [ERREUR] package.json non trouve !
    pause
    exit
)

echo [OK] package.json trouve

echo.
echo Lancement en mode WEB...
echo.
echo Si ca ne marche pas, appuyez sur Ctrl+C pour arreter
echo.

npx expo start --web

echo.
echo Application arretee.
pause
