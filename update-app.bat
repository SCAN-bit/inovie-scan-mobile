@echo off
setlocal enabledelayedexpansion

echo ########################################################################
echo #               SCRIPT DE MISE A JOUR INOVIE SCAN                    #
echo ########################################################################
echo.
echo Choisissez le type de mise a jour :
echo.
echo [1] UPDATE RAPIDE (OTA) - Code JavaScript uniquement (30s)
echo [2] BUILD APK COMPLET - Docker + Nouvelle APK (15min)
echo [3] BUILD + SERVEUR WEB LOCAL - APK + URL de téléchargement
echo [4] INSTALL DIRECT - Build + Install sur appareil connecté
echo.
set /p "CHOICE=Votre choix (1-4) : "

if "%CHOICE%"=="1" goto UPDATE_OTA
if "%CHOICE%"=="2" goto BUILD_APK
if "%CHOICE%"=="3" goto BUILD_WITH_SERVER
if "%CHOICE%"=="4" goto BUILD_AND_INSTALL
echo Choix invalide. Arret.
goto END_PAUSE

REM ########################################################################
REM                           UPDATE OTA (RAPIDE)
REM ########################################################################
:UPDATE_OTA
echo.
echo [1/3] MISE A JOUR OTA (Over-The-Air)...
echo.
set /p "UPDATE_MSG=Message de mise a jour (optionnel) : "

if defined UPDATE_MSG (
    echo [INFO] Publication avec message: "%UPDATE_MSG%"
    call npm run update-msg "%UPDATE_MSG%"
) else (
    echo [INFO] Publication automatique...
    call npm run update
)

if %ERRORLEVEL% neq 0 (
    echo [ERREUR] La mise a jour OTA a echoue !
    goto END_PAUSE
)

echo.
echo ########################################################################
echo # MISE A JOUR OTA TERMINEE AVEC SUCCES !                            #
echo # L'application se mettra a jour au prochain redemarrage            #
echo ########################################################################
goto END_PAUSE

REM ########################################################################
REM                           BUILD APK COMPLET
REM ########################################################################
:BUILD_APK
echo.
echo [1/5] BUILD APK COMPLET avec Docker...
echo.

REM Configuration
set IMAGE_NAME=inovie-scan-release-builder
set TEMP_CONTAINER_NAME=temp_builder_apk_release_simple
set YEAR=%DATE:~6,4%
set MONTH=%DATE:~3,2%
set DAY=%DATE:~0,2%
set MyTime=%TIME: =0%
set HOUR=%MyTime:~0,2%
set MINUTE=%MyTime:~3,2%
set SECOND=%MyTime:~6,2%
set TIMESTAMP=%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%
set OUTPUT_APK_NAME=inovie-scan-app-release_%TIMESTAMP%.apk

echo [INFO] Construction de l'image Docker...
docker build -t %IMAGE_NAME% . --no-cache --progress=plain
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Build Docker echoue !
    goto END_PAUSE
)

echo [2/5] Creation du conteneur...
docker rm %TEMP_CONTAINER_NAME% >nul 2>&1
docker create --name %TEMP_CONTAINER_NAME% %IMAGE_NAME%

echo [3/5] Copie de l'APK...
if not exist ".\APK" mkdir ".\APK"
docker cp %TEMP_CONTAINER_NAME%:/app/inovie-scan-mobile/android/app/build/outputs/apk/release/app-release.apk ".\APK\%OUTPUT_APK_NAME%"

echo [4/5] Nettoyage...
docker rm %TEMP_CONTAINER_NAME%

echo [5/5] Copie vers dossier partage...
if not exist "C:\Users\Public\Downloads\InovieScan" mkdir "C:\Users\Public\Downloads\InovieScan"
copy ".\APK\%OUTPUT_APK_NAME%" "C:\Users\Public\Downloads\InovieScan\latest-inovie-scan.apk"

echo.
echo ########################################################################
echo # BUILD APK TERMINE AVEC SUCCES !                                   #
echo # APK disponible :                                                   #
echo # - Local: %CD%\APK\%OUTPUT_APK_NAME%                    #
echo # - Partage: C:\Users\Public\Downloads\InovieScan\latest-inovie-scan.apk #
echo ########################################################################
goto END_PAUSE

REM ########################################################################
REM                       BUILD + SERVEUR WEB LOCAL
REM ########################################################################
:BUILD_WITH_SERVER
call :BUILD_APK

echo.
echo [BONUS] Demarrage du serveur web local...
echo.
echo URL de telechargement: http://localhost:8080/latest-inovie-scan.apk
echo.
echo INSTRUCTIONS:
echo 1. Connectez votre telephone au meme WiFi que ce PC
echo 2. Ouvrez un navigateur sur votre telephone
echo 3. Allez a http://[IP-DE-CE-PC]:8080/latest-inovie-scan.apk
echo 4. Telechargez et installez l'APK
echo 5. Appuyez sur une touche ici pour arreter le serveur
echo.

REM Demarrer serveur web simple avec Python
cd "C:\Users\Public\Downloads\InovieScan"
echo Serveur demarre... Appuyez sur Ctrl+C puis une touche pour arreter.
python -m http.server 8080
goto END_PAUSE

REM ########################################################################
REM                       BUILD + INSTALL DIRECT
REM ########################################################################
:BUILD_AND_INSTALL
call :BUILD_APK

echo.
echo [BONUS] Installation directe sur appareil connecte...
echo.
echo Assurez-vous qu'un appareil Android est connecte en USB avec le debogage active.
pause

adb devices
adb install -r ".\APK\%OUTPUT_APK_NAME%"

if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Installation ADB echouee ! Verifiez la connexion USB.
    goto END_PAUSE
)

echo.
echo ########################################################################
echo # INSTALLATION TERMINEE AVEC SUCCES !                               #
echo # L'application a ete installee sur l'appareil connecte             #
echo ########################################################################
goto END_PAUSE

REM ########################################################################
REM                               FIN
REM ########################################################################
:END_PAUSE
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
endlocal 