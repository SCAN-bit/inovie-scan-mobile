@echo off
title INSTALLATION DEPENDANCES WEB
color 0A

echo ========================================
echo    INSTALLATION DEPENDANCES WEB
echo ========================================
echo.

cd /d "%~dp0"

echo Installation des dependances requises pour le support web...
echo.

echo 1. Installation de @expo/webpack-config...
npx expo install @expo/webpack-config@^19.0.0
if %errorlevel% equ 0 (
    echo [OK] @expo/webpack-config installe
) else (
    echo [ERREUR] Echec de l'installation de @expo/webpack-config
    pause
    exit /b 1
)
echo.

echo 2. Installation de react-native-web...
npx expo install react-native-web
if %errorlevel% equ 0 (
    echo [OK] react-native-web installe
) else (
    echo [ERREUR] Echec de l'installation de react-native-web
    pause
    exit /b 1
)
echo.

echo 3. Installation de react-dom...
npx expo install react-dom
if %errorlevel% equ 0 (
    echo [OK] react-dom installe
) else (
    echo [ERREUR] Echec de l'installation de react-dom
    pause
    exit /b 1
)
echo.

echo 4. Installation des dependances web supplementaires...
npx expo install @expo/metro-runtime
if %errorlevel% equ 0 (
    echo [OK] @expo/metro-runtime installe
) else (
    echo [WARNING] Echec de l'installation de @expo/metro-runtime
)
echo.

echo ========================================
echo    INSTALLATION TERMINEE
echo ========================================
echo.

echo Toutes les dependances web ont ete installees.
echo.
echo Vous pouvez maintenant lancer l'application web avec:
echo   lancer-app-web.bat
echo.

pause
