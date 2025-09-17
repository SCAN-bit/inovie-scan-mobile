@echo off
title REPARATION COMPLETE
color 0C

echo ========================================
echo    REPARATION COMPLETE
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Suppression des caches...
if exist "node_modules" rmdir /s /q "node_modules"
if exist ".expo" rmdir /s /q ".expo"
if exist "package-lock.json" del "package-lock.json"

echo [2/6] Nettoyage npm...
npm cache clean --force

echo [3/6] Installation des dependances...
npm install --legacy-peer-deps

echo [4/6] Verification...
if exist "node_modules\expo" (
    echo [OK] Expo installe
) else (
    echo [ERREUR] Expo non installe
    echo Tentative d'installation directe...
    npm install expo@~49.0.0 --legacy-peer-deps
)

echo [5/6] Application des patches...
npx patch-package

echo [6/6] Test de lancement...
npx expo start --lan

pause
