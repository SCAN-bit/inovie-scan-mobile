@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo    NETTOYAGE ANDROID - TRACELINK
echo ========================================
echo.
echo [INFO] Suppression du dossier Android local...
echo.

if exist "android" (
    echo [FOUND] Dossier android detecte
    rmdir /s /q android
    if exist "android" (
        echo [ERROR] Impossible de supprimer le dossier android
        echo [INFO] Fermez tous les programmes qui utilisent ce dossier
        pause
        exit /b 1
    ) else (
        echo [OK] Dossier android supprime
    )
) else (
    echo [OK] Aucun dossier android a supprimer
)

echo.
echo [INFO] Nettoyage du cache Expo...
npx expo install --fix >nul 2>&1

echo.
echo ========================================
echo [SUCCESS] Nettoyage termine !
echo [INFO] Vous pouvez maintenant lancer :
echo         build-apk-local.bat
echo ========================================
echo.

pause 