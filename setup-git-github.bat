@echo off

echo ========================================
echo   CONFIGURATION GIT + GITHUB POUR OTA
echo ========================================
echo.

echo Ce script va configurer Git et pousser votre code sur GitHub
echo pour permettre les mises a jour OTA.
echo.

REM Aller dans le repertoire du projet
cd /d "C:\dev\inovie-scan-mobile"

echo ========================================
echo   ETAPE 1: INITIALISATION GIT
echo ========================================

REM Initialiser Git
echo Initialisation de Git...
git init
if errorlevel 1 (
    echo ERREUR: Git n'est pas installe !
    echo Installez Git depuis: https://git-scm.com/
    pause
    exit /b 1
)

echo ✓ Git initialise

REM Ajouter tous les fichiers
echo Ajout des fichiers...
git add .
if errorlevel 1 (
    echo ERREUR: Impossible d'ajouter les fichiers
    pause
    exit /b 1
)

echo ✓ Fichiers ajoutes

REM Premier commit
echo Creation du premier commit...
git commit -m "Initial commit - Application mobile Inovie SCAN"
if errorlevel 1 (
    echo ERREUR: Impossible de creer le commit
    pause
    exit /b 1
)

echo ✓ Premier commit cree

REM Configurer la branche principale
echo Configuration de la branche principale...
git branch -M main
if errorlevel 1 (
    echo ERREUR: Impossible de configurer la branche
    pause
    exit /b 1
)

echo ✓ Branche principale configuree

REM Ajouter le remote GitHub (ou le mettre à jour s'il existe)
echo Configuration du remote GitHub...
git remote add origin https://github.com/SCAN-bit/inovie-scan-mobile.git 2>nul
if errorlevel 1 (
    echo Remote existe deja, mise a jour...
    git remote set-url origin https://github.com/SCAN-bit/inovie-scan-mobile.git
)

echo ✓ Remote GitHub configure

echo.
echo ========================================
echo   ETAPE 2: PUSH VERS GITHUB
echo ========================================

echo Poussee du code vers GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo ERREUR: Impossible de pousser vers GitHub !
    echo.
    echo Solutions possibles:
    echo 1. Verifiez que vous etes connecte a GitHub
    echo 2. Verifiez que le repository existe
    echo 3. Essayez de vous connecter a GitHub dans le navigateur
    echo.
    echo Vous pouvez aussi pousser manuellement:
    echo git push -u origin main
    pause
    exit /b 1
)

echo ✓ Code pousse vers GitHub avec succes !

echo.
echo ========================================
echo   CONFIGURATION TERMINEE !
echo ========================================
echo.
echo Votre repository GitHub est maintenant configure !
echo.
echo Prochaines etapes:
echo 1. Lancez: build-and-release-ota.bat
echo 2. L'APK sera publie sur GitHub Releases
echo 3. Les utilisateurs pourront mettre a jour via l'app !
echo.
echo Repository: https://github.com/SCAN-bit/inovie-scan-mobile
echo.
pause
