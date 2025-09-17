@echo off
title RESTAURATION VERSIONS COMPATIBLES
color 0B

echo ========================================
echo    RESTAURATION VERSIONS COMPATIBLES
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo [1/4] Sauvegarde du package.json actuel...
copy package.json package.json.backup
echo [OK] Sauvegarde creee

echo.
echo [2/4] Suppression des dossiers de cache...
if exist "node_modules" (
    echo Suppression de node_modules...
    rmdir /s /q "node_modules"
)

if exist ".expo" (
    echo Suppression de .expo...
    rmdir /s /q ".expo"
)

echo.
echo [3/4] Restauration des versions compatibles...
echo Creation du nouveau package.json...

(
echo {
echo   "license": "0BSD",
echo   "main": "index.js",
echo   "scripts": {
echo     "start": "expo start --dev-client",
echo     "android": "expo run:android",
echo     "ios": "expo run:ios",
echo     "web": "expo start --web --clear",
echo     "postinstall": "patch-package"
echo   },
echo   "dependencies": {
echo     "@expo/metro-runtime": "~4.0.1",
echo     "@expo/vector-icons": "~14.0.4",
echo     "@expo/webpack-config": "^19.0.0",
echo     "@react-native-async-storage/async-storage": "1.23.1",
echo     "@react-native-clipboard/clipboard": "^1.16.3",
echo     "@react-native-community/datetimepicker": "8.2.0",
echo     "@react-native-community/netinfo": "^11.4.1",
echo     "@react-native-firebase/app": "^18.9.0",
echo     "@react-native-firebase/auth": "^18.8.0",
echo     "@react-native-picker/picker": "2.9.0",
echo     "@react-navigation/native": "^7.1.10",
echo     "@react-navigation/stack": "^7.3.3",
echo     "@supabase/supabase-js": "^2.55.0",
echo     "@types/react": "~18.3.12",
echo     "appwrite": "^18.2.0",
echo     "css-loader": "^7.1.2",
echo     "expo": "~49.0.0",
echo     "expo-auth-session": "~6.0.3",
echo     "expo-build-properties": "~0.13.3",
echo     "expo-camera": "~16.0.18",
echo     "expo-constants": "~17.0.8",
echo     "expo-dev-client": "~5.0.20",
echo     "expo-device": "~7.0.3",
echo     "expo-file-system": "~18.0.12",
echo     "expo-font": "~13.0.4",
echo     "expo-image-picker": "~16.0.6",
echo     "expo-intent-launcher": "~12.0.2",
echo     "expo-keep-awake": "~14.0.3",
echo     "expo-linking": "~7.0.5",
echo     "expo-splash-screen": "~0.29.24",
echo     "expo-status-bar": "~2.0.1",
echo     "expo-updates": "~0.27.4",
echo     "expo-web-browser": "~14.0.2",
echo     "firebase": "^10.14.1",
echo     "firebase-admin": "^13.4.0",
echo     "node-fetch": "^2.7.0",
echo     "react": "18.3.1",
echo     "react-dom": "^18.3.1",
echo     "react-native": "0.74.5",
echo     "react-native-datawedge-intents": "^0.1.8",
echo     "react-native-fs": "^2.20.0",
echo     "react-native-gesture-handler": "~2.20.2",
echo     "react-native-paper": "4.9.2",
echo     "react-native-safe-area-context": "4.12.0",
echo     "react-native-screens": "~4.4.0",
echo     "react-native-url-polyfill": "^2.0.0",
echo     "react-native-web": "^0.19.13",
echo     "readline-sync": "^1.4.10",
echo     "sharp-cli": "^5.1.0",
echo     "style-loader": "^4.0.0",
echo     "typescript": "~5.3.3",
echo     "uuid": "^9.0.1"
echo   },
echo   "devDependencies": {
echo     "@babel/core": "^7.20.0",
echo     "@react-native-community/cli": "^18.0.0",
echo     "patch-package": "^8.0.0"
echo   },
echo   "private": true,
echo   "name": "inovie-scan-mobile",
echo   "version": "1.0.0"
echo }
) > package.json

echo [OK] package.json restaure

echo.
echo [4/4] Reinstallation des dependances...
npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'installation
    echo Tentative avec --legacy-peer-deps...
    npm install --legacy-peer-deps
)

echo.
echo [5/5] Application des patches...
npx patch-package

echo.
echo Restauration terminee !
echo Vous pouvez maintenant utiliser lancer-app.bat
pause
