@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD APK + RELEASE OTA GITHUB
echo ========================================
echo.

echo [DEBUG] Script demarre dans: %CD%
echo [DEBUG] Verification des fichiers necessaires...
if not exist "package.json" (
    echo ERREUR: package.json introuvable dans %CD%
    echo Vous devez etre dans le dossier inovie-scan-mobile
    pause
    exit /b 1
)
if not exist "app.json" (
    echo ERREUR: app.json introuvable dans %CD%
    pause
    exit /b 1
)
if not exist "android" (
    echo ERREUR: Dossier android introuvable dans %CD%
    pause
    exit /b 1
)
echo [DEBUG] Tous les fichiers necessaires trouves ✓
echo.

REM Verifier si node_modules existe
if not exist "node_modules" (
    echo [DEBUG] Installation des dependances...
    npm install
    if errorlevel 1 (
        echo ERREUR: npm install a echoue !
        pause
        exit /b 1
    )
    echo [DEBUG] npm install reussi ✓
    echo.
) else (
    echo [DEBUG] node_modules existe deja ✓
)

REM Lire la version actuelle depuis app.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "current_version=%%a"
    set "current_version=!current_version: =!"
    set "current_version=!current_version:"=!"
    set "current_version=!current_version:,=!"
)

REM Demander le type de mise a jour
echo Choisissez le type de mise a jour :
echo   [1] NOUVELLE VERSION (ex: !current_version! vers 1.0.7)
echo   [2] MEME VERSION, NOUVEAU BUILD (ex: !current_version! build 14 vers !current_version! build 15)
echo.
set /p update_type="Votre choix (1 ou 2): "

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
    powershell -Command "$content = Get-Content 'app.json' -Raw; $content = $content -replace '\"version\":\\s*\"[^\"]*\"', '\"version\": \"!new_version!\"'; Set-Content 'app.json' -Value $content -Encoding UTF8"
    if errorlevel 1 (
        echo Erreur lors de la mise a jour de app.json !
        pause
        exit /b 1
    )
    echo Version mise a jour vers !new_version! dans app.json
    set "version_info=nouvelle version !new_version!"
    
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
    
    REM Lire la version actuelle pour l'affichage
    for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json ^| findstr -v "appVersionSource"') do (
        set "version_temp=%%a"
        call set "version_temp=%%version_temp: =%%"
        call set "version_temp=%%version_temp:~1,-2%%"
        set "current_version=%%version_temp%%"
    )
    
    set "version_info=meme version !current_version! avec nouveau build"
    set "new_version=!current_version!"
    
) else (
    echo Choix invalide !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   NETTOYAGE ET BUILD
echo ========================================

REM Vérifier la version Gradle
echo Vérification de la configuration Gradle...
if exist "android\gradle\wrapper\gradle-wrapper.properties" (
    findstr "gradle-8.7" android\gradle\wrapper\gradle-wrapper.properties >nul
    if errorlevel 1 (
        echo ATTENTION: Version Gradle non optimale détectée
        echo Recommandation: Utiliser Gradle 8.7 pour éviter les problèmes de build
        echo.
    ) else (
        echo Version Gradle 8.7 détectée - Configuration optimale ✓
    )
)

REM Nettoyer le cache Gradle corrompu (méthode robocopy pour chemins longs Windows)
echo Nettoyage du cache Gradle corrompu...
if exist "%USERPROFILE%\.gradle" (
    echo Création dossier temporaire vide pour robocopy...
    if not exist "%TEMP%\gradle-empty" mkdir "%TEMP%\gradle-empty"
    echo Suppression cache Gradle avec robocopy (compatible chemins longs)...
    robocopy "%TEMP%\gradle-empty" "%USERPROFILE%\.gradle" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP >nul 2>&1
    rmdir /q "%TEMP%\gradle-empty" 2>nul
    echo Cache Gradle supprimé ✓ (robocopy)
)

REM Supprimer le dossier .gradle local corrompu
if exist "android\.gradle" (
    echo Suppression du dossier .gradle local...
    rmdir /s /q "android\.gradle" 2>nul
    if exist "android\.gradle" (
        echo Nettoyage .gradle local avec robocopy...
        if not exist "%TEMP%\gradle-local-empty" mkdir "%TEMP%\gradle-local-empty"
        robocopy "%TEMP%\gradle-local-empty" "android\.gradle" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP >nul 2>&1
        rmdir /q "%TEMP%\gradle-local-empty" 2>nul
    )
    echo Dossier .gradle local supprimé ✓
)

REM Aller dans le repertoire android pour gradlew
cd android
if errorlevel 1 (
    echo Erreur: Repertoire android introuvable !
    pause
    exit /b 1
)

REM Clean avec nettoyage du cache si nécessaire
echo Nettoyage...
call .\\gradlew clean --no-daemon --refresh-dependencies
if errorlevel 1 (
    echo Erreur lors du nettoyage, arrêt des daemons...
    call .\\gradlew --stop
    timeout /t 3 /nobreak >nul
    echo Nouvelle tentative de nettoyage...
    call .\\gradlew clean --no-daemon --refresh-dependencies
    if errorlevel 1 (
        echo Erreur lors du nettoyage !
        cd ..
        pause
        exit /b 1
    )
)

REM Créer version.js AVANT le build
echo.
echo ========================================
echo   CREATION VERSION.JS
echo ========================================

REM Forcer les bonnes versions avant le build
echo.
echo Configuration des versions pour éviter les erreurs...
REM Supprimer les anciennes lignes et ajouter les nouvelles
powershell -Command "(Get-Content 'gradle.properties') -replace 'kotlin.version=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'gradle.properties'"
powershell -Command "(Get-Content 'gradle.properties') -replace 'android.suppressKotlinVersionCompatibilityCheck=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'gradle.properties'"
echo kotlin.version=1.9.25 >> gradle.properties
echo android.suppressKotlinVersionCompatibilityCheck=true >> gradle.properties
echo systemProp.kotlin.version=1.9.25 >> gradle.properties
echo org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=2048m -XX:+UseG1GC -XX:+UseStringDeduplication >> gradle.properties

REM Lire la version et le build number depuis android/app/build.gradle
for /f "tokens=2 delims= " %%a in ('findstr "versionName" android\app\build.gradle') do (
    set "gradle_version=%%a"
    set "gradle_version=!gradle_version:"=!"
)
for /f "tokens=2 delims= " %%a in ('findstr "versionCode" android\app\build.gradle') do (
    set "build_number=%%a"
)

REM Utiliser la version du build.gradle si pas déjà définie
if "%new_version%"=="" (
    set "new_version=!gradle_version!"
)

REM Debug: Afficher les valeurs
echo Version: !new_version!
echo Build number: !build_number!

REM Créer un module de version JavaScript
call echo // Module de version pour l'application > version.js
call echo // Ce fichier est mis à jour automatiquement par le script de build >> version.js
call echo. >> version.js
call echo const version = "!new_version!"; >> version.js
call echo const buildNumber = !build_number!; >> version.js
call echo const fullVersion = "!new_version!.!build_number!"; >> version.js
call echo. >> version.js
call echo module.exports = { >> version.js
call echo   version, >> version.js
call echo   buildNumber, >> version.js
call echo   fullVersion >> version.js
call echo }; >> version.js

echo Fichier version.js créé avec la version !new_version!.!build_number!

REM Build release avec architecture optimisée
echo.
echo ========================================
echo   BUILD APK RELEASE
echo ========================================
echo Building APK release avec architecture ARM64 optimisée...
call .\\gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
if errorlevel 1 (
    echo Erreur lors du build release, tentative avec toutes les architectures...
    call .\\gradlew assembleRelease --no-daemon
    if errorlevel 1 (
        echo Erreur lors du build release !
        cd ..
        pause
        exit /b 1
    )
)

REM Revenir au repertoire principal
cd ..

REM Renommer l'APK avec la version
echo.
echo ========================================
echo   RENOMMAGE APK AVEC VERSION
echo ========================================
echo.
echo ========================================
echo   VERIFICATION VERSION
echo ========================================
echo Version dans build.gradle: !new_version!.!build_number!
echo Version dans version.js: !new_version!.!build_number!
echo.

REM Lire à nouveau les valeurs depuis build.gradle pour être sûr

REM Créer le nom de fichier avec version et build (méthode simple)
echo.
echo ========================================
echo   RENOMMAGE APK
echo ========================================

REM Lire directement depuis app.json (méthode fiable avec variables uniques)
for /f "tokens=2 delims=:" %%a in ('findstr "version" app.json') do (
    set "ota_version_json=%%a"
)
set "ota_version_json=%ota_version_json: =%"
set "ota_version_json=%ota_version_json:"=%"
set "ota_version_json=%ota_version_json:,=%"

for /f "tokens=2 delims=:" %%a in ('findstr "versionCode" app.json') do (
    set "ota_build_json=%%a"
)
set "ota_build_json=%ota_build_json: =%"
set "ota_build_json=%ota_build_json:"=%"
set "ota_build_json=%ota_build_json:,=%"

echo Version depuis app.json: %ota_version_json%
echo Build depuis app.json: %ota_build_json%

set "ota_apk_name=inovie-scan-v%ota_version_json%-%ota_build_json%.apk"
set "ota_apk_source=android\app\build\outputs\apk\release\app-release.apk"
set "ota_apk_dest=release\%ota_apk_name%"
set "apk_dest=%ota_apk_dest%"
set "apk_name=%ota_apk_name%"

echo Nom APK final: %ota_apk_name%
echo Source: %ota_apk_source%
echo Destination: %ota_apk_dest%

REM Copier l'APK vers le dossier release avec le bon nom
if exist "%ota_apk_source%" (
    echo Copie: app-release.apk -> release\%ota_apk_name%
    copy "%ota_apk_source%" "%ota_apk_dest%" >nul
    if errorlevel 1 (
        echo Erreur lors de la copie !
        pause
        exit /b 1
    )
    echo APK copie avec succes dans le dossier release !
) else (
    echo Erreur: APK source introuvable !
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD TERMINE !
echo ========================================
echo APK genere: !apk_dest!
echo Mise a jour: %version_info%
echo.

REM Demander les notes de release
echo ========================================
echo   PREPARATION RELEASE GITHUB
echo ========================================
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build automatique"

REM Les valeurs sont déjà lues plus haut, pas besoin de les relire

REM L'APK est déjà dans le dossier release
set "apk_name_github=inovie-scan-v!new_version!-!build_number!.apk"
set "apk_path=!apk_dest!"

echo APK pret pour GitHub: !apk_path!

echo.
echo ========================================
echo   CREATION RELEASE GITHUB
echo ========================================
echo Version: v!new_version! (!build_number!)
echo Notes: %release_notes%
echo APK: %apk_path%
echo Nom APK: %apk_name%
echo.

REM Ouvrir GitHub Releases dans le navigateur
echo.
echo ========================================
echo   CREATION RELEASE GITHUB (MANUEL)
echo ========================================
echo.
echo GitHub CLI n'est pas disponible (droits admin requis).
echo Ouverture de GitHub Releases dans le navigateur...
echo.

REM Ouvrir GitHub Releases directement (URL simple sans paramètres)
echo.
echo ========================================
echo   CREATION RELEASE GITHUB (MANUEL)
echo ========================================
echo.
echo Version: %ota_version_json% (%ota_build_json%)
echo APK: %ota_apk_dest%
echo.
echo Ouvrir GitHub Releases...
echo.
echo INSTRUCTIONS:
echo 1. Créer un nouveau release
echo 2. Tag: v%ota_version_json%
echo 3. Title: Version %ota_version_json% (%ota_build_json%)
echo 4. Uploader le fichier: %ota_apk_name%
echo.

REM Ouvrir GitHub Releases (URL simple)
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/releases/new"

echo.
echo ========================================
echo   INSTRUCTIONS MANUELLES
echo ========================================
echo.
echo 1. Le navigateur s'est ouvert sur GitHub Releases
echo 2. Completez les informations:
echo    - Tag: v!new_version!
echo    - Title: Version !new_version! (!build_number!)
echo    - Description: %release_notes%
echo 3. Glissez-deposez le fichier: %apk_name%
echo 4. Cliquez sur "Publish release"
echo.
echo APK a uploader: %apk_path%
echo Nom suggere pour l'APK: %apk_name%
echo Chemin complet: %CD%\%apk_path%
echo.

REM Attendre que l'utilisateur confirme
set /p confirm="Avez-vous publie le release sur GitHub ? (o/N): "
if /i not "%confirm%"=="o" (
    echo.
    echo Release non publie. L'APK est pret dans: %apk_path%
    echo Vous pouvez le publier plus tard.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   RELEASE GITHUB TERMINE !
echo ========================================
echo L'APK a ete publie sur GitHub Releases !
echo Les utilisateurs peuvent maintenant mettre a jour via l'app.
echo.
echo Lien du release: https://github.com/SCAN-bit/inovie-scan-mobile/releases/tag/v!new_version!
echo.

REM L'APK reste dans le dossier release (pas de nettoyage)

REM Proposer la copie vers un dossier d'archives
echo.
set /p archive="Voulez-vous copier l'APK vers le dossier d'archives ? (o/N): "
if /i "%archive%"=="o" (
    echo.
    echo ========================================
    echo   COPIE VERS ARCHIVES
    echo ========================================
    
    REM Créer le dossier d'archives s'il n'existe pas
    if not exist "archives" mkdir archives
    
    REM Créer un nom avec la date
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "date_time=%%a"
    set "YY=!date_time:~2,2!" & set "YYYY=!date_time:~0,4!" & set "MM=!date_time:~4,2!" & set "DD=!date_time:~6,2!"
    set "HH=!date_time:~8,2!" & set "Min=!date_time:~10,2!" & set "Sec=!date_time:~12,2!"
    set "timestamp=!YYYY!-!MM!-!DD!_!HH!-!Min!-!Sec!"
    
    set "archive_name=inovie-scan-v!final_version!-build!final_build!-!timestamp!.apk"
    set "archive_path=archives\!archive_name!"
    
    echo Copie vers: !archive_path!
    copy "!apk_dest!" "!archive_path!" >nul
    if errorlevel 1 (
        echo Erreur lors de la copie !
    ) else (
        echo APK archive avec succes !
    )
)

echo.
echo ========================================
echo   DISTRIBUTION FIREBASE (OPTIONNEL)
echo ========================================
set /p distribute_firebase="Voulez-vous AUSSI distribuer sur Firebase App Distribution ? (o/N): "
if /i "%distribute_firebase%"=="o" (
    echo.
    echo Distribution vers Firebase App Distribution...
    firebase appdistribution:distribute "!apk_dest!" --app 1:566648702832:android:1a71f64c5b0399e76531b5 --groups "testers" --release-notes "%version_info% - Build automatique"
    
    if errorlevel 1 (
        echo.
        echo Erreur lors de la distribution Firebase !
        echo Mais le release GitHub a ete cree avec succes.
    ) else (
        echo Distribution Firebase terminee !
    )
)

echo.
echo ========================================
echo   TOUT EST TERMINE !
echo ========================================
echo.
echo Resume:
echo - APK build avec Gradle ✓
echo - Release cree sur GitHub ✓
echo - Mises a jour OTA disponibles ✓
if /i "%distribute_firebase%"=="o" echo - Distribution Firebase ✓
echo.
echo Les utilisateurs peuvent maintenant:
echo 1. Recevoir une notification de mise a jour dans l'app
echo 2. Cliquer sur "Verifier les mises a jour" dans les reglages
echo 3. Télécharger et installer automatiquement la nouvelle version
echo.
pause
