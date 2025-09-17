@echo off
title CORRECTION IMMEDIATE WEB
color 0C

echo ========================================
echo    CORRECTION IMMEDIATE WEB
echo ========================================
echo.

REM Force le changement de repertoire
cd /d "%~dp0"
echo Repertoire courant: %CD%
echo.

REM Verification des fichiers essentiels
echo Verification des fichiers essentiels...
if not exist "package.json" (
    echo [ERREUR] package.json manquant dans %CD%
    echo Vous n'etes pas dans le bon repertoire!
    pause
    exit /b 1
)
echo [OK] package.json trouve

if not exist "app.json" (
    echo [ERREUR] app.json manquant dans %CD%
    echo Vous n'etes pas dans le bon repertoire!
    pause
    exit /b 1
)
echo [OK] app.json trouve
echo.

REM Installation forcee des dependances
echo Installation forcee des dependances...
echo.

echo 1. Installation de npm...
call npm install --force
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de npm install
    echo Tentative avec --legacy-peer-deps...
    call npm install --legacy-peer-deps --force
)
echo.

echo 2. Installation de @expo/webpack-config...
call npm install @expo/webpack-config@^19.0.0 --save
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation de @expo/webpack-config
)
echo.

echo 3. Installation de react-native-web...
call npm install react-native-web --save
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation de react-native-web
)
echo.

echo 4. Installation de react-dom...
call npm install react-dom --save
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation de react-dom
)
echo.

echo 5. Verification finale...
if exist "node_modules" (
    echo [OK] node_modules existe
) else (
    echo [ERREUR] node_modules manquant
    echo Creation manuelle...
    mkdir node_modules
)

if exist "node_modules\@expo\webpack-config" (
    echo [OK] @expo/webpack-config installe
) else (
    echo [WARNING] @expo/webpack-config manquant
)

if exist "node_modules\react-native-web" (
    echo [OK] react-native-web installe
) else (
    echo [WARNING] react-native-web manquant
)

if exist "node_modules\react-dom" (
    echo [OK] react-dom installe
) else (
    echo [WARNING] react-dom manquant
)
echo.

echo ========================================
echo    CORRECTION TERMINEE
echo ========================================
echo.

echo Test de lancement...
echo.

REM Test de lancement
echo Lancement de l'application web...
npx expo start --web

echo.
echo Si l'application ne se lance pas, redemarrez votre terminal
echo et relancez ce script.
echo.
pause
