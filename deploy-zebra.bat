@echo off
echo ================================================
echo   DÉPLOIEMENT APK ZEBRA - Configuration Auto
echo ================================================
echo.

echo 1. Copie de l'APK en cours...
copy "android\app\build\outputs\apk\release\app-release.apk" "inovie-scan-zebra.apk"

echo.
echo 2. APK créé : inovie-scan-zebra.apk
echo.

echo ================================================
echo   INSTALLATION SUR APPAREIL ZEBRA
echo ================================================
echo.
echo ÉTAPES À SUIVRE :
echo.
echo 1. TRANSFÉRER l'APK sur votre appareil Zebra
echo    - Via USB, email, ou partage réseau
echo.
echo 2. INSTALLER l'APK sur l'appareil Zebra
echo    - Activer "Sources inconnues" si nécessaire
echo    - Taper sur le fichier APK pour installer
echo.
echo 3. LANCER L'APPLICATION
echo    - Au premier lancement, elle va :
echo      * SUPPRIMER l'ancien profil DataWedge
echo      * CRÉER un nouveau profil "InovieScanProfile"  
echo      * CONFIGURER automatiquement :
echo        - Intent Action: com.inovie.scan.ACTION
echo        - Keystroke Output: DÉSACTIVÉ
echo        - Notifications: DÉSACTIVÉES
echo.
echo 4. TESTER LE SCAN
echo    - Scanner un code-barre site
echo    - Aucune popup ne devrait apparaître
echo    - Passage automatique à l'étape suivante
echo.
echo ================================================
echo   RÉSOLUTION DE PROBLÈMES
echo ================================================
echo.
echo Si des popups persistent après installation :
echo.
echo 1. Ouvrir DataWedge (app système)
echo 2. Aller dans Profils
echo 3. Vérifier "InovieScanProfile" :
echo    - Sortie d'intention : ACTIVÉ
echo    - Action : com.inovie.scan.ACTION  
echo    - Sortie clavier : DÉSACTIVÉ
echo    - Notifications audio/haptic : DÉSACTIVÉ
echo.
echo Ou DÉSINSTALLER et RÉINSTALLER l'app.
echo.

pause 