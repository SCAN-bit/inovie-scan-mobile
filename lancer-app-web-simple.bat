@echo off
title LANCEMENT APPLICATION WEB SCAN
color 0A

echo ========================================
echo    LANCEMENT APPLICATION WEB SCAN
echo ========================================
echo.

REM Changement vers le repertoire du script
cd /d "%~dp0"

REM Test de Node.js avec plusieurs methodes
echo Verification de Node.js...

REM Methode 1: Test direct
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js detecte
    node --version
    goto :found_node
)

REM Methode 2: Recherche dans les emplacements courants
set NODE_PATHS=C:\Program Files\nodejs\node.exe;C:\Program Files (x86)\nodejs\node.exe;%APPDATA%\npm\node.exe;%USERPROFILE%\AppData\Roaming\npm\node.exe

for %%i in (%NODE_PATHS%) do (
    if exist "%%i" (
        echo [OK] Node.js trouve dans: %%i
        "%%i" --version
        set NODE_CMD=%%i
        goto :found_node
    )
)

REM Methode 3: Recherche recursive dans le PATH
for /f "tokens=*" %%i in ('where node 2^>nul') do (
    echo [OK] Node.js trouve dans: %%i
    "%%i" --version
    set NODE_CMD=%%i
    goto :found_node
)

echo [ERREUR] Node.js non trouve
echo.
echo Solutions possibles:
echo 1. Redemarrez votre terminal
echo 2. Verifiez que Node.js est installe
echo 3. Ajoutez Node.js au PATH manuellement
echo 4. Utilisez le script test-node.bat pour diagnostiquer
echo.
pause
exit /b 1

:found_node
echo.

REM Test de npm
echo Verification de npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] npm non disponible
    echo.
    pause
    exit /b 1
)

echo [OK] npm detecte
npm --version
echo.

REM Verification des dependances
if not exist "node_modules" (
    echo [INFO] Installation des dependances...
    npm install
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation des dependances
        pause
        exit /b 1
    )
    echo [OK] Dependances installees
    echo.
)

REM Lancement d'Expo
echo [INFO] Lancement d'Expo...
echo.
echo Le serveur va demarrer dans votre navigateur...
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

npx expo start --web --clear

echo.
echo [INFO] Serveur arrete.
pause
