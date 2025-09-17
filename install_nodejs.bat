@echo off
echo ========================================
echo    INSTALLATION AUTOMATIQUE NODE.JS
echo ========================================
echo.

REM Verification si Node.js est deja installe
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js est deja installe:
    node --version
    echo.
    echo npm version:
    npm --version
    echo.
    pause
    exit /b 0
)

echo Node.js n'est pas installe. Installation en cours...
echo.

REM Telechargement de Node.js LTS
echo Telechargement de Node.js LTS...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs-installer.msi'}"

if not exist "nodejs-installer.msi" (
    echo ERREUR: Echec du telechargement de Node.js
    echo.
    echo Installation manuelle requise:
    echo 1. Allez sur https://nodejs.org/
    echo 2. Telechargez la version LTS
    echo 3. Installez-la avec les options par defaut
    echo 4. Redemarrez votre terminal
    echo.
    pause
    exit /b 1
)

echo Installation de Node.js...
msiexec /i nodejs-installer.msi /quiet /norestart

if %errorlevel% neq 0 (
    echo ERREUR: Echec de l'installation de Node.js
    echo.
    echo Installation manuelle requise:
    echo 1. Allez sur https://nodejs.org/
    echo 2. Telechargez la version LTS
    echo 3. Installez-la avec les options par defaut
    echo 4. Redemarrez votre terminal
    echo.
    pause
    exit /b 1
)

echo Suppression du fichier d'installation...
del nodejs-installer.msi

echo.
echo Node.js installe avec succes!
echo.
echo IMPORTANT: Redemarrez votre terminal pour que les changements
echo du PATH prennent effet, puis relancez lancer-app-web.bat
echo.
pause
