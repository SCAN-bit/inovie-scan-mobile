@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   TEST MINIMAL
echo ========================================
echo.

echo Node.js version:
node --version
echo.

echo npm version:
npm --version
echo.

echo Java version:
java -version 2>&1
echo.

echo React Native version:
npm list react-native --depth=0
echo.

echo Expo version:
npm list expo --depth=0
echo.

echo Test termine !
echo Appuyez sur une touche pour continuer...
pause
