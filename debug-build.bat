@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   DEBUG BUILD SCRIPT
echo ========================================
echo.

echo Dossier actuel: %CD%
echo.

echo Vérification des fichiers...
if exist "app.json" (
    echo ✓ app.json trouvé
) else (
    echo ❌ app.json introuvable
    echo Fichiers présents:
    dir /b
    pause
    exit /b 1
)

if exist "android" (
    echo ✓ Dossier android trouvé
) else (
    echo ❌ Dossier android introuvable
    pause
    exit /b 1
)

if exist "android\gradlew" (
    echo ✓ gradlew trouvé
) else (
    echo ❌ gradlew introuvable
    pause
    exit /b 1
)

if exist "node_modules" (
    echo ✓ node_modules trouvé
) else (
    echo ❌ node_modules introuvable
    echo Installation des dépendances...
    npm install
    if errorlevel 1 (
        echo Erreur lors de l'installation npm
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   LECTURE VERSION
echo ========================================

REM Lire la version actuelle depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "current_version=%%a"
    set "current_version=!current_version: =!"
    set "current_version=!current_version:"=!"
    set "current_version=!current_version:,=!"
)

echo Version actuelle: !current_version!

echo.
echo ========================================
echo   BUILD SIMPLE
echo ========================================

cd android
echo Dossier android: %CD%

echo Lancement du build...
.\gradlew assembleRelease
if errorlevel 1 (
    echo Erreur lors du build
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo   BUILD TERMINÉ !
echo ========================================

REM Vérifier si l'APK a été créée
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ✓ APK créée avec succès
    echo Emplacement: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo ❌ APK non trouvée
)

pause
