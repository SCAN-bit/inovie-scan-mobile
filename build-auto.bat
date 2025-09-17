@echo off
echo ========================================
echo   BUILD AUTOMATIQUE - NOUVEAU BUILD
echo ========================================
echo.

echo Lancement du build automatique...
echo Type: Même version, nouveau build
echo.

REM Créer un fichier de réponses automatiques
echo 2 > responses.txt
echo o >> responses.txt
echo o >> responses.txt
echo Build automatique - Nouveau build >> responses.txt
echo o >> responses.txt

REM Lancer le script avec les réponses automatiques
.\build-and-release-github.bat < responses.txt

REM Nettoyer le fichier temporaire
del responses.txt

echo.
echo ========================================
echo   BUILD TERMINÉ !
echo ========================================
echo.
echo ✅ Le build a été lancé sur GitHub Actions
echo 🔗 Suivez le build: https://github.com/SCAN-bit/inovie-scan-mobile/actions
echo 📦 L'APK sera disponible dans les releases
echo.

pause
