@echo off
echo ========================================
echo   TEST BUILD GITHUB ACTIONS
echo ========================================
echo.

echo 🧪 TEST DU WORKFLOW GITHUB ACTIONS
echo.

echo 📋 Étapes :
echo 1. Commit et push des changements
echo 2. Ouvrir GitHub Actions
echo 3. Tester le workflow "Build APK Simple"
echo.

REM Commiter les changements
echo 📝 Commit des changements...
git add .
git commit -m "Add simple build workflow for testing"
git push

if errorlevel 1 (
    echo ❌ Erreur lors du push !
    pause
    exit /b 1
)

echo ✅ Changements poussés sur GitHub ✓
echo.

echo 🔗 Ouverture de GitHub Actions...
start "" "https://github.com/SCAN-bit/inovie-scan-mobile/actions"

echo.
echo ========================================
echo   INSTRUCTIONS DE TEST
echo ========================================
echo.
echo 📋 Étapes à suivre :
echo.
echo 1️⃣  Le navigateur s'est ouvert sur GitHub Actions
echo 2️⃣  Cherchez "Build APK Simple" dans la liste
echo 3️⃣  Cliquez sur "Build APK Simple"
echo 4️⃣  Cliquez sur "Run workflow" (bouton à droite)
echo 5️⃣  Ajoutez des notes de release (optionnel)
echo 6️⃣  Cliquez sur "Run workflow" (bouton vert)
echo.
echo ⏱️  Le build prendra 5-10 minutes
echo 📧 Vous recevrez un email quand c'est prêt
echo 📦 L'APK sera dans GitHub Releases
echo.

echo 🎯 Ce test va :
echo ✅ Vérifier que le workflow fonctionne
echo ✅ Build l'APK avec Gradle
echo ✅ Créer un release GitHub
echo ✅ Uploader l'APK
echo.

pause
