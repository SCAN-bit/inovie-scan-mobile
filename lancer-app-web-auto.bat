@echo off
title LANCEMENT APPLICATION WEB SCAN (AUTO)
color 0A

:start
cls
echo ========================================
echo    LANCEMENT APPLICATION WEB SCAN
echo    (Avec installation automatique)
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo Verification et installation des dependances web...
echo.

REM Verification de @expo/webpack-config
npm list @expo/webpack-config >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installation de @expo/webpack-config...
    npx expo install @expo/webpack-config@^19.0.0
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation de @expo/webpack-config
        echo Tentative avec npm...
        npm install @expo/webpack-config@^19.0.0
    )
    echo [OK] @expo/webpack-config installe
) else (
    echo [OK] @expo/webpack-config deja installe
)

REM Verification de react-native-web
npm list react-native-web >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installation de react-native-web...
    npx expo install react-native-web
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation de react-native-web
        echo Tentative avec npm...
        npm install react-native-web
    )
    echo [OK] react-native-web installe
) else (
    echo [OK] react-native-web deja installe
)

REM Verification de react-dom
npm list react-dom >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installation de react-dom...
    npx expo install react-dom
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation de react-dom
        echo Tentative avec npm...
        npm install react-dom
    )
    echo [OK] react-dom installe
) else (
    echo [OK] react-dom deja installe
)

echo.
echo Choisissez votre mode de lancement web :
echo.
echo   [1] WEB (Mode navigateur standard)
echo   [2] WEB + NETTOYER CACHE (Si bug)
echo   [3] LOCALHOST (Pour test local)
echo   [4] Quitter
echo.

set /p choice="Votre choix : "

if "%choice%"=="1" goto web
if "%choice%"=="2" goto web_clear
if "%choice%"=="3" goto localhost
if "%choice%"=="4" goto quit

echo.
echo Choix invalide.
pause
goto start

:web
echo.
echo --- Lancement en mode WEB ---
npx expo start --web
goto end

:web_clear
echo.
echo --- Lancement en mode WEB avec nettoyage cache ---
npx expo start --web --clear
goto end

:localhost
echo.
echo --- Lancement en mode LOCALHOST ---
npx expo start --localhost
goto end

:quit
exit

:end
echo.
echo --- Session terminee ---
pause
goto start
