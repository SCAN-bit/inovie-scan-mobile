@echo off
echo ========================================
echo    MISE A JOUR RAPIDE INOVIE SCAN
echo ========================================
echo.
echo [INFO] Lancement de la mise a jour OTA...
echo.

call npm run update

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERREUR] La mise a jour a echoue !
    echo Verifiez votre connexion internet et EAS CLI.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  MISE A JOUR TERMINEE AVEC SUCCES !
echo  L'app se mettra a jour au redemarrage
echo ========================================
echo.
timeout /t 5 