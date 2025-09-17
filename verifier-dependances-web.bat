@echo off
title VERIFICATION DEPENDANCES WEB
color 0B

echo ========================================
echo    VERIFICATION DEPENDANCES WEB
echo ========================================
echo.

cd /d "%~dp0"

echo Verification des dependances web requises...
echo.

REM Verification de @expo/webpack-config
echo 1. Verification de @expo/webpack-config:
npm list @expo/webpack-config >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] @expo/webpack-config installe
    npm list @expo/webpack-config
) else (
    echo [MANQUANT] @expo/webpack-config
    echo Installation en cours...
    npx expo install @expo/webpack-config@^19.0.0
    if %errorlevel% equ 0 (
        echo [OK] @expo/webpack-config installe avec succes
    ) else (
        echo [ERREUR] Echec de l'installation de @expo/webpack-config
    )
)
echo.

REM Verification de react-native-web
echo 2. Verification de react-native-web:
npm list react-native-web >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] react-native-web installe
    npm list react-native-web
) else (
    echo [MANQUANT] react-native-web
    echo Installation en cours...
    npx expo install react-native-web
    if %errorlevel% equ 0 (
        echo [OK] react-native-web installe avec succes
    ) else (
        echo [ERREUR] Echec de l'installation de react-native-web
    )
)
echo.

REM Verification de react-dom
echo 3. Verification de react-dom:
npm list react-dom >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] react-dom installe
    npm list react-dom
) else (
    echo [MANQUANT] react-dom
    echo Installation en cours...
    npx expo install react-dom
    if %errorlevel% equ 0 (
        echo [OK] react-dom installe avec succes
    ) else (
        echo [ERREUR] Echec de l'installation de react-dom
    )
)
echo.

echo ========================================
echo    VERIFICATION TERMINEE
echo ========================================
echo.

echo Pour lancer l'application web:
echo   lancer-app-web.bat
echo.

pause
