@echo off
echo ========================================
echo     TEST DIAGNOSTIC - INOVIE SCAN
echo ========================================
echo.
echo [1] Test avec version simplifiee (sans Firebase)
echo [2] Test avec version normale (avec debug)
echo [3] Build version normale
echo.
set /p "CHOICE=Votre choix (1-3) : "

if "%CHOICE%"=="1" goto TEST_SIMPLE
if "%CHOICE%"=="2" goto TEST_NORMAL
if "%CHOICE%"=="3" goto BUILD_NORMAL
echo Choix invalide.
goto END_PAUSE

:TEST_SIMPLE
echo.
echo [INFO] Test avec App-debug.js (version simplifiee)...
echo.

REM Sauvegarder App.js original
copy App.js App-backup.js

REM Utiliser la version de debug
copy App-debug.js App.js

echo [INFO] Version simplifiee activee. Lancez maintenant :
echo   npx expo run:android
echo.
echo IMPORTANT: Apres le test, relancez ce script option [2] pour restaurer
goto END_PAUSE

:TEST_NORMAL
echo.
echo [INFO] Restauration de la version normale avec debug...
if exist App-backup.js (
    copy App-backup.js App.js
    del App-backup.js
    echo [SUCCESS] Version normale restauree !
) else (
    echo [WARNING] Pas de sauvegarde trouvee. Version actuelle conservee.
)
goto END_PAUSE

:BUILD_NORMAL
echo.
echo [INFO] Build APK version normale avec debug...
echo.

REM S'assurer qu'on utilise la version normale
if exist App-backup.js (
    copy App-backup.js App.js
    del App-backup.js
)

echo [1/3] Nettoyage...
Remove-Item -Force -Recurse node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

echo [2/3] Installation dependances...
npm install

echo [3/3] Build APK de debug...
npx expo run:android --variant debug

echo.
echo [SUCCESS] APK de debug buildee !
echo Verifiez les logs avec : adb logcat | findstr "DEBUG"
goto END_PAUSE

:END_PAUSE
echo.
pause 