@echo off
setlocal

echo ########################################################################
echo #           GENERATEUR QR CODE POUR TELECHARGEMENT APK               #
echo ########################################################################
echo.

REM Obtenir l'adresse IP locale
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do set IP=%%a
set IP=%IP: =%

if "%IP%"=="" (
    echo [ERREUR] Impossible de detecter l'adresse IP locale !
    echo Utilisez manuellement l'IP de votre PC.
    set /p "IP=Entrez votre adresse IP locale : "
)

echo [INFO] IP detectee : %IP%
echo.

echo Choisissez une option :
echo [1] Serveur web + QR Code (recommande)
echo [2] QR Code seulement (APK deja en ligne)
echo [3] Envoi par email
echo.
set /p "OPTION=Votre choix (1-3) : "

if "%OPTION%"=="1" goto SERVER_QR
if "%OPTION%"=="2" goto QR_ONLY  
if "%OPTION%"=="3" goto EMAIL_APK
echo Choix invalide.
goto END_PAUSE

:SERVER_QR
echo.
echo [1/3] Verification de l'APK...
if not exist "C:\Users\Public\Downloads\InovieScan\latest-inovie-scan.apk" (
    echo [ERREUR] APK introuvable ! Lancez d'abord 'update-app.bat' option 2 ou 3.
    goto END_PAUSE
)

echo [2/3] Generation du QR Code...
set DOWNLOAD_URL=http://%IP%:8080/latest-inovie-scan.apk
echo.
echo URL de telechargement : %DOWNLOAD_URL%
echo.

REM Générer QR Code avec PowerShell (nécessite internet pour qr-server.com)
echo [INFO] Generation du QR Code en cours...
powershell -Command "Invoke-WebRequest -Uri 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%DOWNLOAD_URL%' -OutFile 'qr-download.png'"

if exist qr-download.png (
    echo [SUCCESS] QR Code genere : qr-download.png
    start qr-download.png
) else (
    echo [WARNING] Impossible de generer le QR Code automatiquement.
    echo Utilisez un generateur en ligne avec cette URL : %DOWNLOAD_URL%
)

echo.
echo [3/3] Demarrage du serveur web...
echo.
echo INSTRUCTIONS :
echo 1. Scannez le QR Code ou utilisez l'URL : %DOWNLOAD_URL%
echo 2. Telechargez l'APK sur votre telephone
echo 3. Activez "Sources inconnues" dans les parametres Android
echo 4. Installez l'APK
echo.

cd "C:\Users\Public\Downloads\InovieScan"
echo Serveur demarre... Appuyez sur Ctrl+C pour arreter.
python -m http.server 8080
goto END_PAUSE

:QR_ONLY
set /p "URL=Entrez l'URL de telechargement : "
echo Generation du QR Code pour : %URL%
powershell -Command "Invoke-WebRequest -Uri 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%URL%' -OutFile 'qr-download.png'"
start qr-download.png
goto END_PAUSE

:EMAIL_APK
echo.
echo [INFO] Ouverture du client email avec APK en piece jointe...
if exist "C:\Users\Public\Downloads\InovieScan\latest-inovie-scan.apk" (
    start "" "mailto:?subject=APK Inovie Scan&body=Nouvelle version de l'application en piece jointe"
    start explorer.exe "C:\Users\Public\Downloads\InovieScan"
    echo [INFO] Glissez-deposez l'APK dans votre email.
) else (
    echo [ERREUR] APK introuvable !
)
goto END_PAUSE

:END_PAUSE
echo.
pause
endlocal 