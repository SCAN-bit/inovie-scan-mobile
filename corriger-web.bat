@echo off
title CORRECTION SUPPORT WEB
color 0C

echo ========================================
echo    CORRECTION SUPPORT WEB
echo ========================================
echo.

cd /d "%~dp0"

echo 1. Verification du repertoire:
echo %CD%
echo.

echo 2. Verification de package.json:
if exist "package.json" (
    echo [OK] package.json trouve
) else (
    echo [ERREUR] package.json manquant
    pause
    exit /b 1
)
echo.

echo 3. Installation des dependances...
echo Installation en cours, veuillez patienter...
npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'installation des dependances
    echo.
    echo Tentative avec --force...
    npm install --force
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec meme avec --force
        pause
        exit /b 1
    )
)
echo [OK] Dependances installees
echo.

echo 4. Installation specifique de @expo/webpack-config...
npx expo install @expo/webpack-config@^19.0.0
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation specifique
    echo Tentative avec npm...
    npm install @expo/webpack-config@^19.0.0
)
echo.

echo 5. Installation de react-native-web...
npx expo install react-native-web
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation specifique
    echo Tentative avec npm...
    npm install react-native-web
)
echo.

echo 6. Installation de react-dom...
npx expo install react-dom
if %errorlevel% neq 0 (
    echo [WARNING] Echec de l'installation specifique
    echo Tentative avec npm...
    npm install react-dom
)
echo.

echo 7. Verification des dependances web...
echo Verification de @expo/webpack-config:
npm list @expo/webpack-config 2>nul
if %errorlevel% equ 0 (
    echo [OK] @expo/webpack-config installe
) else (
    echo [MANQUANT] @expo/webpack-config
)

echo Verification de react-native-web:
npm list react-native-web 2>nul
if %errorlevel% equ 0 (
    echo [OK] react-native-web installe
) else (
    echo [MANQUANT] react-native-web
)

echo Verification de react-dom:
npm list react-dom 2>nul
if %errorlevel% equ 0 (
    echo [OK] react-dom installe
) else (
    echo [MANQUANT] react-dom
)
echo.

echo ========================================
echo    CORRECTION TERMINEE
echo ========================================
echo.

echo Pour tester l'application web:
echo   lancer-app-web.bat
echo.

pause
