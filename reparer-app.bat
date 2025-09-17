@echo off
title REPARATION APPLICATION MOBILE
color 0C

echo ========================================
echo    REPARATION APPLICATION MOBILE
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo [1/6] Nettoyage du cache Metro...
npx expo start --clear --no-dev --minify
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du nettoyage Metro
) else (
    echo [OK] Cache Metro nettoye
)

echo.
echo [2/6] Suppression des dossiers de cache...
if exist "node_modules" (
    echo Suppression de node_modules...
    rmdir /s /q "node_modules"
    echo [OK] node_modules supprime
)

if exist ".expo" (
    echo Suppression de .expo...
    rmdir /s /q ".expo"
    echo [OK] .expo supprime
)

if exist "metro-cache" (
    echo Suppression de metro-cache...
    rmdir /s /q "metro-cache"
    echo [OK] metro-cache supprime
)

echo.
echo [3/6] Nettoyage du cache npm...
npm cache clean --force
echo [OK] Cache npm nettoye

echo.
echo [4/6] Reinstallation des dependances...
npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'installation des dependances
    echo Tentative avec --legacy-peer-deps...
    npm install --legacy-peer-deps
)

echo.
echo [5/6] Application des patches...
npx patch-package
echo [OK] Patches appliques

echo.
echo [6/6] Test de lancement...
echo Lancement en mode LAN...
npx expo start --lan

echo.
echo Reparation terminee !
pause
