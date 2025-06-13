@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo    NETTOYAGE ET REBUILD - TRACELINK
echo ========================================
echo.
echo [INFO] Nettoyage des images Docker corrompues...
echo.

echo [1/4] Suppression des images corrompues...
docker rmi tracelink-release 2>nul
docker rmi tracelink-debug 2>nul
docker rmi tracelink-test-prod 2>nul
docker rmi tracelink-test-dev 2>nul

echo [2/4] Nettoyage du cache Docker...
docker builder prune -f

echo [3/4] Suppression des containers arretes...
docker container prune -f

echo [4/4] Verification Docker...
docker system df

echo.
echo ========================================
echo [SUCCESS] Nettoyage termine !
echo [INFO] Vous pouvez maintenant relancer:
echo         build-apk-local.bat (option 3)
echo ========================================
echo.

pause 