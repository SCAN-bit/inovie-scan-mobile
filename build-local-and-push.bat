@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BUILD LOCAL + PUSH GITHUB
echo ========================================
echo.

REM Lire la version actuelle
for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.version"') do set "current_version=%%i"
for /f "delims=" %%i in ('powershell -Command "(Get-Content app.json | ConvertFrom-Json).expo.android.versionCode"') do set "current_build=%%i"

echo Version actuelle: !current_version! build !current_build!
echo.

REM Demander le type de mise a jour
echo Choisissez le type de mise a jour :
echo   [1] NOUVELLE VERSION
echo   [2] MEME VERSION, NOUVEAU BUILD
echo.
set /p update_type="Votre choix (1 ou 2): "

if "%update_type%"=="1" (
    set /p new_version="Entrez la nouvelle version (ex: 1.0.8): "
    if "!new_version!"=="" (
        echo Erreur: Vous devez entrer une version.
        goto :end
    )
    
    REM Mettre a jour la version dans app.json
    powershell -Command "$json = Get-Content 'app.json' | ConvertFrom-Json; $json.expo.version = '!new_version!'; $json.expo.android.versionCode = 1; $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8"
    
    REM Mettre a jour android/app/build.gradle
    powershell -Command "(Get-Content 'android/app/build.gradle') -replace 'versionCode \d+', 'versionCode 1' -replace 'versionName \"[^\"]*\"', 'versionName \"!new_version!\"' | Set-Content 'android/app/build.gradle'"
    
    echo !new_version! > version.txt
    set "version_info=nouvelle version !new_version!"
    
) else if "%update_type%"=="2" (
    REM Incrémenter le build
    set /a new_build=!current_build!+1
    
    REM Mettre a jour le build dans app.json
    powershell -Command "$json = Get-Content 'app.json' | ConvertFrom-Json; $json.expo.android.versionCode = !new_build!; $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8"
    
    REM Mettre a jour android/app/build.gradle
    powershell -Command "(Get-Content 'android/app/build.gradle') -replace 'versionCode \d+', 'versionCode !new_build!' | Set-Content 'android/app/build.gradle'"
    
    echo !current_version! > version.txt
    set "version_info=meme version !current_version! avec nouveau build !new_build!"
    
) else (
    echo Choix invalide.
    goto :end
)

echo.
echo ========================================
echo   BUILD LOCAL APK
echo ========================================
echo.

REM Build local
cd android
echo Build de l'APK local...
gradlew.bat assembleRelease --no-daemon
if errorlevel 1 (
    echo ❌ Erreur lors du build local !
    cd ..
    goto :end
)
cd ..

echo ✅ Build local reussi !
echo.

REM Copier l'APK vers le dossier release
if not exist "release" mkdir release
copy "android\app\build\outputs\apk\release\app-release.apk" "release\inovie-scan-v!current_build!-!current_build!.apk"

echo ✅ APK copie vers release\inovie-scan-v!current_build!-!current_build!.apk
echo.

echo ========================================
echo   PUSH VERS GITHUB
echo ========================================
echo.

REM Demander les notes de release
set /p release_notes="Notes de release (optionnel): "
if "%release_notes%"=="" set "release_notes=%version_info% - Build local"

echo Version: !current_version!
echo Notes: !release_notes!
echo.

REM Ajouter les fichiers modifies
echo Ajout des fichiers modifies...
git add app.json android/app/build.gradle version.txt release\inovie-scan-v!current_build!-!current_build!.apk

REM Creer le commit
echo Creation du commit...
git commit -m "Release !current_version! - !version_info! - Build local"

REM Push vers GitHub
echo Push vers GitHub...
git push origin main

echo.
echo ========================================
echo   RELEASE CREEE LOCALEMENT
echo ========================================
echo.
echo ✅ APK disponible dans le dossier release/
echo ✅ Commit pousse vers GitHub
echo ✅ Vous pouvez distribuer l'APK manuellement
echo.

:end
echo Appuyez sur une touche pour continuer...
pause
