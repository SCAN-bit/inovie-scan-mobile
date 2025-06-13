@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    BUILD APK LOCAL AVEC DOCKER
echo ========================================
echo.
echo [INFO] Ce script crée un APK local sans EAS Cloud
echo [INFO] Utilise Docker pour un environnement Android complet
echo.

echo [1] APK de développement (debug, plus rapide)
echo [2] APK de production (release, optimisé)
echo [3] APK avec extraction (copie vers dossier local)
echo.
set /p "CHOICE=Votre choix (1-3) : "

if "%CHOICE%"=="1" goto BUILD_DEBUG
if "%CHOICE%"=="2" goto BUILD_RELEASE
if "%CHOICE%"=="3" goto BUILD_AND_EXTRACT
echo Choix invalide.
goto END

:BUILD_DEBUG
echo.
echo [INFO] Construction APK de développement...
echo [INFO] Plus rapide, avec debug activé
echo.

docker build -f Dockerfile.debug -t tracelink-debug .
if !errorlevel! neq 0 (
    echo [ERROR] Échec du build debug !
    goto END
)

echo [SUCCESS] APK debug créé dans le container !
echo [INFO] Pour extraire l'APK : choisissez option 3
goto END

:BUILD_RELEASE
echo.
echo [INFO] Construction APK de production...
echo [INFO] Plus long, mais APK optimisé pour distribution
echo.

docker build -f Dockerfile.release -t tracelink-release .
if !errorlevel! neq 0 (
    echo [ERROR] Échec du build release !
    goto END
)

echo [SUCCESS] APK release créé dans le container !
echo [INFO] Pour extraire l'APK : choisissez option 3
goto END

:BUILD_AND_EXTRACT
echo.
echo [INFO] Construction et extraction de l'APK...
echo.

echo [1/3] Construction de l'APK release...
docker build -f Dockerfile.release -t tracelink-release .
if !errorlevel! neq 0 (
    echo [ERROR] Échec du build !
    goto END
)

echo [2/3] Création du container temporaire...
docker create --name temp-apk tracelink-release

echo [3/3] Extraction de l'APK...
if not exist apk-output mkdir apk-output

docker cp temp-apk:/app/android/app/build/outputs/apk/release/app-release.apk apk-output/TraceLink-release.apk
if !errorlevel! neq 0 (
    echo [ERROR] Échec de l'extraction !
    docker rm temp-apk
    goto END
)

docker rm temp-apk

echo [SUCCESS] APK extrait avec succès !
echo.
echo 📦 APK disponible : apk-output\TraceLink-release.apk
echo 📊 Taille de l'APK :
for %%F in (apk-output\TraceLink-release.apk) do echo    %%~zF octets (%%~zF / 1024 / 1024 MB)

echo.
echo [INFO] Vous pouvez maintenant :
echo 1. Installer l'APK sur votre appareil Android
echo 2. Tester l'application
echo 3. Distribuer l'APK si tout fonctionne
goto END

:END
echo.
echo ========================================
echo [INFO] Pour créer les Dockerfiles manquants, exécutez :
echo       create-docker-files.bat
echo ========================================
echo.
pause 