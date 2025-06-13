@echo off
chcp 65001 >nul 2>&1
cls
echo ========================================
echo   VERIFICATION PREPARATION ANDROID
echo ========================================
echo.

set "ERROR_COUNT=0"

echo [1/7] Verification package.json...
if exist package.json (
    findstr /C:"expo" package.json >nul && (
        echo [OK] Expo configure
    ) || (
        echo [ERREUR] Expo manquant
        set /a ERROR_COUNT+=1
    )
    findstr /C:"react-native" package.json >nul && (
        echo [OK] React Native present
    ) || (
        echo [ERREUR] React Native manquant
        set /a ERROR_COUNT+=1
    )
) else (
    echo [ERREUR] package.json manquant
    set /a ERROR_COUNT+=1
)

echo.
echo [2/7] Verification app.json...
if exist app.json (
    findstr /C:"android" app.json >nul && (
        echo [OK] Configuration Android presente
    ) || (
        echo [ERREUR] Configuration Android manquante
        set /a ERROR_COUNT+=1
    )
    findstr /C:"package.*inovie" app.json >nul && (
        echo [OK] Package Android configure
    ) || (
        echo [WARN] Package Android par defaut
    )
) else (
    echo [ERREUR] app.json manquant
    set /a ERROR_COUNT+=1
)

echo.
echo [3/7] Verification Firebase...
if exist services\firebaseService.js (
    findstr /C:"firebaseConfig" services\firebaseService.js >nul && (
        echo [OK] Configuration Firebase presente
    ) || (
        echo [ERREUR] Configuration Firebase manquante
        set /a ERROR_COUNT+=1
    )
) else (
    echo [ERREUR] FirebaseService manquant
    set /a ERROR_COUNT+=1
)

echo.
echo [4/7] Verification assets...
if exist assets\logo-inovie.png (
    echo [OK] Logo application present
) else (
    echo [ERREUR] Logo application manquant
    set /a ERROR_COUNT+=1
)

echo.
echo [5/7] Verification dependances critiques...
if exist node_modules (
    echo [OK] Node modules installes
) else (
    echo [ERREUR] Node modules manquants - Executez: npm install
    set /a ERROR_COUNT+=1
)

echo.
echo [6/7] Verification plugins Expo...
if exist plugins\withDataWedgeReceiver.js (
    echo [OK] Plugin DataWedge present
) else (
    echo [WARN] Plugin DataWedge manquant (optionnel)
)

echo.
echo [7/7] Verification structure code...
if exist App.js (
    echo [OK] Point d'entree App.js present
) else (
    echo [ERREUR] App.js manquant
    set /a ERROR_COUNT+=1
)

if exist screens\ScanScreen.js (
    echo [OK] ScanScreen present
) else (
    echo [ERREUR] ScanScreen manquant
    set /a ERROR_COUNT+=1
)

if exist components\TourneeProgress.js (
    echo [OK] TourneeProgress present
) else (
    echo [ERREUR] TourneeProgress manquant
    set /a ERROR_COUNT+=1
)

if exist services\firebaseService.js (
    echo [OK] FirebaseService present
) else (
    echo [ERREUR] FirebaseService manquant
    set /a ERROR_COUNT+=1
)

echo.
echo ========================================
echo           RESUME FINAL
echo ========================================

if "%ERROR_COUNT%"=="0" (
    echo [SUCCESS] PRET POUR ANDROID !
    echo [SUCCESS] L'application peut etre buildee en APK
    echo.
    echo Etapes suivantes recommandees :
    echo 1. Executez: test-android-docker.bat (option 6^)
    echo 2. Si tous les tests passent, creez l'APK
    echo 3. Utilisez: build-apk-local.bat (option 3^)
    goto :SUCCESS_END
)

echo [ERREUR] %ERROR_COUNT% ERREUR(S) DETECTEE(S)
echo [ERREUR] Corrigez les erreurs avant de creer l'APK
echo.
echo Actions recommandees :
if not exist package.json echo - Verifiez que vous etes dans le bon dossier
if not exist node_modules echo - Executez: npm install
if not exist services\firebaseService.js echo - Configurez Firebase
if not exist App.js echo - Verifiez la structure du projet

:SUCCESS_END

echo.
echo Appuyez sur une touche pour continuer...
pause >nul
echo.
echo Script termine. Vous pouvez fermer cette fenetre. 