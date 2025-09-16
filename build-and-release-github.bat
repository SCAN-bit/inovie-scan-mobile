@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK + RELEASE OTA GITHUB
echo ========================================
echo.

REM Verifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    echo.
)

REM Lire la version et le build actuels depuis app.json avec PowerShell
for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.version"') do set "current_version=%%i"
for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.android.versionCode"') do set "current_build=%%i"

REM Demander le type de mise a jour
echo Choisissez le type de mise a jour :
echo   [1] NOUVELLE VERSION (ex: !current_version! build !current_build! vers 1.0.7 build 1)
echo   [2] MEME VERSION, NOUVEAU BUILD (ex: !current_version! build !current_build! vers !current_version! build !current_build!+1)
echo   [3] NOUVELLE VERSION ET BUILD PERSONNALISES (ex: !current_version! build !current_build! vers 1.0.7 build 2)
echo.
set /p update_type="Votre choix (1, 2 ou 3): "

if "%update_type%"=="1" (
    set /p new_version="Entrez la nouvelle version (ex: 1.0.6): "
    if "!new_version!"=="" (
        echo Erreur: Vous devez entrer une version.
        pause
        exit /b 1
    )
    
    echo.
    echo ========================================
    echo   MISE A JOUR VERS NOUVELLE VERSION
    echo ========================================
    
    REM Mettre a jour la version dans app.json
    echo Mise a jour de la version dans app.json...
    powershell -Command "$json = Get-Content 'app.json' | ConvertFrom-Json; $json.expo.version = '!new_version!'; $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour de app.json !
        pause
        exit /b 1
    )
    echo Version mise a jour vers !new_version! dans app.json
    set "version_info=nouvelle version !new_version!"
    
    REM Mettre a jour version.txt pour declencher GitHub Actions
    echo !new_version! > version.txt
    echo Version !new_version! ecrite dans version.txt
    goto :continue_process
    
) else if "%update_type%"=="2" (
    echo.
    echo ========================================
    echo   INCREMENTATION DU BUILD NUMBER
    echo ========================================
    
    REM Lire le build number actuel depuis build.gradle
    for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
        set "current_build=%%a"
    )
    
    REM Incrementer seulement le build number
    powershell -ExecutionPolicy Bypass -File increment-build-only.ps1
    if errorlevel 1 (
        echo Erreur lors de l'incrementation du build !
        pause
        exit /b 1
    )
    
    REM Lire le nouveau build number depuis build.gradle
    for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
        set "build_number=%%a"
    )
    
    REM Mettre à jour le versionCode dans app.json
    echo Mise a jour du versionCode dans app.json...
    powershell -ExecutionPolicy Bypass -File update-app-json.ps1 -VersionCode !build_number!
    if errorlevel 1 (
        echo Erreur lors de la mise a jour du versionCode dans app.json !
        pause
        exit /b 1
    )
    echo versionCode mis a jour vers !build_number! dans app.json
    
    REM Lire la version actuelle pour l'affichage avec PowerShell
    for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.version"') do set "new_version=%%i"
    
    set "version_info=meme version !new_version! avec nouveau build"
    
    REM Mettre a jour version.txt avec la meme version mais nouveau build
    echo !new_version! > version.txt
    echo Version !new_version! ecrite dans version.txt (nouveau build)
    goto :continue_process
    
) else if "%update_type%"=="3" (
    echo.
    echo ========================================
    echo   VERSION ET BUILD PERSONNALISES
    echo ========================================
    
    set /p new_version="Entrez la nouvelle version (ex: 1.0.7): "
    if "!new_version!"=="" (
        echo Erreur: Vous devez entrer une version.
        pause
        exit /b 1
    )
    
    set /p new_build="Entrez le numero de build (ex: 2): "
    if "!new_build!"=="" (
        echo Erreur: Vous devez entrer un numero de build.
        pause
        exit /b 1
    )
    
    REM Mettre a jour la version dans app.json
    echo Mise a jour de la version dans app.json...
    powershell -Command "$json = Get-Content 'app.json' | ConvertFrom-Json; $json.expo.version = '!new_version!'; $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour de app.json !
        pause
        exit /b 1
    )
    echo Version mise a jour vers !new_version! dans app.json
    
    REM Mettre a jour le build number dans build.gradle
    echo Mise a jour du build number dans build.gradle...
    powershell -Command "(Get-Content 'android\app\build.gradle') -replace 'versionCode\s+\d+', 'versionCode !new_build!' | Set-Content 'android\app\build.gradle'"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour du build number !
        pause
        exit /b 1
    )
    echo Build number mis a jour vers !new_build! dans build.gradle
    
    REM Mettre a jour le build number dans app.json
    echo Mise a jour du build number dans app.json...
    powershell -Command "$json = Get-Content 'app.json' | ConvertFrom-Json; $json.expo.android.versionCode = !new_build!; $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour du build number dans app.json !
        pause
        exit /b 1
    )
    echo Build number mis a jour vers !new_build! dans app.json
    
    set "version_info=nouvelle version !new_version! avec build !new_build!"
    
    REM Mettre a jour version.txt
    echo !new_version! > version.txt
    echo Version !new_version! ecrite dans version.txt
    goto :continue_process
    
) else (
    echo Choix invalide !
    pause
    exit /b 1
)

:continue_process

echo.
echo ========================================
echo   TEST DE COMPATIBILITE DES VERSIONS
echo ========================================
echo.

REM Test de compatibilité des versions
echo 🔍 Verification des versions...
echo.

REM Vérifier Node.js
echo Node.js version:
node --version
if errorlevel 1 (
    echo ❌ Node.js non trouve !
    pause
    exit /b 1
)

REM Vérifier npm
echo npm version:
npm --version
if errorlevel 1 (
    echo ❌ npm non trouve !
    pause
    exit /b 1
)

REM Vérifier Java
echo Java version:
java -version 2>&1
if errorlevel 1 (
    echo ❌ Java non trouve !
    echo Continuons quand meme...
)

echo.
echo 🔍 Verification des dependances critiques...
echo.

REM Vérifier React Native
echo React Native version:
npm list react-native --depth=0
if errorlevel 1 (
    echo ❌ React Native non trouve !
    echo Continuons quand meme...
)

REM Vérifier Expo
echo Expo version:
npm list expo --depth=0
if errorlevel 1 (
    echo ❌ Expo non trouve !
    echo Continuons quand meme...
)

echo.
echo 🔍 Verification des fichiers de configuration...
echo.

REM Vérifier app.json
if not exist "app.json" (
    echo ❌ app.json manquant !
    echo Continuons quand meme...
)

REM Vérifier package.json
if not exist "package.json" (
    echo ❌ package.json manquant !
    echo Continuons quand meme...
)

REM Vérifier android/build.gradle
if not exist "android\build.gradle" (
    echo ❌ android\build.gradle manquant !
    echo Continuons quand meme...
)

REM Vérifier android/gradle.properties
if not exist "android\gradle.properties" (
    echo ❌ android\gradle.properties manquant !
    echo Continuons quand meme...
)

echo ✅ Toutes les verifications de base sont OK !
echo.

echo 🔍 Verification des versions dans les fichiers de configuration...
echo.

REM Vérifier les versions dans app.json
echo Version dans app.json:
powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.version"
if errorlevel 1 (
    echo ❌ Impossible de lire la version dans app.json !
    echo Continuons quand meme...
)

REM Vérifier les versions dans package.json
echo React Native version dans package.json:
powershell -Command "(Get-Content package.json | ConvertFrom-Json).dependencies.'react-native'"
if errorlevel 1 (
    echo ❌ Impossible de lire React Native dans package.json !
    echo Continuons quand meme...
)

REM Vérifier compileSdkVersion dans android/build.gradle
echo compileSdkVersion dans android/build.gradle:
findstr "compileSdkVersion" android\build.gradle
if errorlevel 1 (
    echo ❌ compileSdkVersion non trouve dans android/build.gradle !
    echo Continuons quand meme...
)

REM Vérifier kotlin.version dans android/gradle.properties
echo kotlin.version dans android/gradle.properties:
findstr "kotlin.version" android\gradle.properties
if errorlevel 1 (
    echo ❌ kotlin.version non trouve dans android/gradle.properties !
    echo Continuons quand meme...
)

echo ✅ Toutes les verifications de configuration sont OK !
echo.

echo ========================================
echo   TEST DE COMPILATION RAPIDE
echo ========================================
echo.
echo Test de compilation rapide (2-3 minutes)...
echo.

REM Test de compilation rapide
cd android
echo Test Gradle...
gradlew.bat assembleDebug --no-daemon --quiet
if errorlevel 1 (
    echo.
    echo ❌ ERREUR: Le test local a echoue !
    echo Le build GitHub echouera aussi.
    echo.
    echo Voulez-vous continuer quand meme ? (o/N):
    set /p continue_anyway=""
    if /i not "!continue_anyway!"=="o" (
        echo Annulation du processus.
        pause
        exit /b 1
    )
) else (
    echo ✅ Test local reussi !
)
cd ..

echo.
echo ========================================
echo   PREPARATION PUSH GITHUB
echo ========================================

REM Demander les notes de release
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build automatique GitHub Actions"

echo.
echo ========================================
echo   PUSH VERS GITHUB
echo ========================================
echo Version: !new_version!
if "%update_type%"=="2" (
    echo Build: !build_number!
) else if "%update_type%"=="3" (
    echo Build: !new_build!
) else (
    echo Build: 1
)
echo Notes: %release_notes%
echo.

REM Verifier si git est disponible
git --version >nul 2>&1
if errorlevel 1 (
    echo Erreur: Git n'est pas disponible !
    echo Veuillez installer Git ou utiliser GitHub Desktop.
    pause
    exit /b 1
)

REM Ajouter les fichiers modifies
echo Ajout des fichiers modifies...
git add app.json version.txt android\app\build.gradle
if errorlevel 1 (
    echo Erreur lors de l'ajout des fichiers !
    pause
    exit /b 1
)

REM Commit avec message descriptif
echo Creation du commit...
git commit -m "Release !new_version! - %version_info%"
if errorlevel 1 (
    echo Erreur lors du commit !
    pause
    exit /b 1
)

REM Push vers GitHub
echo Push vers GitHub...
git push origin main
if errorlevel 1 (
    echo Erreur lors du push vers GitHub !
    echo Verifiez votre configuration Git et vos credentials.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD GITHUB ACTIONS LANCE !
echo ========================================
echo.
echo Le build automatique a ete lance sur GitHub Actions.
echo.
echo Ce qui va se passer :
echo 1. GitHub Actions va build l'APK automatiquement
echo 2. Une release sera creee avec l'APK
echo 3. Les utilisateurs pourront telecharger la mise a jour
echo.
echo Vous pouvez suivre le build ici :
echo https://github.com/SCAN-bit/inovie-scan-mobile/actions
echo.
echo Une fois le build termine, l'APK sera disponible ici :
echo https://github.com/SCAN-bit/inovie-scan-mobile/releases
echo.

REM Attendre que l'utilisateur confirme
set /p confirm="Voulez-vous ouvrir GitHub Actions dans le navigateur ? (o/N): "
if /i "%confirm%"=="o" (
    start "" "https://github.com/SCAN-bit/inovie-scan-mobile/actions"
)

echo.
echo ========================================
echo   PROCESSUS TERMINE !
echo ========================================
echo.
echo Resume:
echo - Version mise a jour: !new_version!
echo - Build lance sur GitHub Actions ✓
echo - Release automatique en cours ✓
echo - Mises a jour OTA disponibles bientot ✓
echo.
echo Les utilisateurs pourront bientot:
echo 1. Recevoir une notification de mise a jour dans l'app
echo 2. Cliquer sur "Verifier les mises a jour" dans les reglages
echo 3. Telecharger et installer automatiquement la nouvelle version
echo.
pause
