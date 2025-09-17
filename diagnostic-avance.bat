@echo off
title DIAGNOSTIC AVANCE
color 0E

echo ========================================
echo    DIAGNOSTIC AVANCE
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo [1] Verification de l'environnement...
echo Repertoire courant: %CD%
echo.

echo [2] Verification de Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non trouve dans le PATH
    echo PATH actuel: %PATH%
) else (
    echo [OK] Node.js trouve
    node --version
)
echo.

echo [3] Verification de npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] npm non trouve
) else (
    echo [OK] npm trouve
    npm --version
)
echo.

echo [4] Verification des fichiers critiques...
if exist "package.json" (
    echo [OK] package.json present
) else (
    echo [ERREUR] package.json manquant
)

if exist "app.json" (
    echo [OK] app.json present
) else (
    echo [ERREUR] app.json manquant
)

if exist "App.js" (
    echo [OK] App.js present
) else (
    echo [ERREUR] App.js manquant
)
echo.

echo [5] Verification des dependances critiques...
npm list expo --depth=0 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Expo non installe ou probleme
) else (
    echo [OK] Expo installe
)

npm list react-native --depth=0 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] React Native non installe ou probleme
) else (
    echo [OK] React Native installe
)
echo.

echo [6] Test de connexion Expo...
npx expo --version 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Expo CLI ne fonctionne pas
) else (
    echo [OK] Expo CLI fonctionne
)
echo.

echo [7] Verification de l'espace disque...
dir /-c | find "bytes free"
echo.

echo [8] Verification des processus Metro...
tasklist | find "node" | find "metro"
if %errorlevel% neq 0 (
    echo [INFO] Aucun processus Metro en cours
) else (
    echo [ATTENTION] Processus Metro detectes
)
echo.

echo Diagnostic termine !
echo.
echo Si des erreurs sont detectees, executez reparer-app.bat
pause
