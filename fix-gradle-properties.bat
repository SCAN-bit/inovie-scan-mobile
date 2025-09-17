@echo off
echo ========================================
echo   CORRECTION GRADLE.PROPERTIES
echo ========================================
echo.

echo Nettoyage du fichier gradle.properties...

REM Supprimer les lignes problématiques
powershell -Command "(Get-Content 'android\gradle.properties') -replace 'kotlin.version=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'android\gradle.properties'"
powershell -Command "(Get-Content 'android\gradle.properties') -replace 'android.suppressKotlinVersionCompatibilityCheck=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'android\gradle.properties'"
powershell -Command "(Get-Content 'android\gradle.properties') -replace 'systemProp.kotlin.version=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'android\gradle.properties'"
powershell -Command "(Get-Content 'android\gradle.properties') -replace 'org.gradle.jvmargs=.*', '' | Where-Object { $_.Trim() -ne '' } | Set-Content 'android\gradle.properties'"

echo Lignes problématiques supprimées ✓

REM Ajouter les bonnes lignes avec des retours à la ligne
echo. >> android\gradle.properties
echo # Configuration Kotlin pour Expo 53 >> android\gradle.properties
echo kotlin.version=1.9.25 >> android\gradle.properties
echo android.suppressKotlinVersionCompatibilityCheck=true >> android\gradle.properties
echo systemProp.kotlin.version=1.9.25 >> android\gradle.properties
echo org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m >> android\gradle.properties

echo Configuration Kotlin ajoutée ✓

echo.
echo ========================================
echo   VERIFICATION DU FICHIER
echo ========================================
echo.

echo Contenu du fichier gradle.properties :
echo.
type android\gradle.properties

echo.
echo ========================================
echo   CORRECTION TERMINEE !
echo ========================================
echo.

pause
