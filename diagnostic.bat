@echo off
title DIAGNOSTIC SYSTEME
color 0E

echo ========================================
echo    DIAGNOSTIC SYSTEME
echo ========================================
echo.

echo 1. Verification du repertoire courant:
echo %CD%
echo.

echo 2. Verification de Node.js:
where node
if %errorlevel% neq 0 (
    echo Node.js NON TROUVE
) else (
    echo Node.js trouve
    node --version
)
echo.

echo 3. Verification de npm:
where npm
if %errorlevel% neq 0 (
    echo npm NON TROUVE
) else (
    echo npm trouve
    npm --version
)
echo.

echo 4. Verification de npx:
where npx
if %errorlevel% neq 0 (
    echo npx NON TROUVE
) else (
    echo npx trouve
    npx --version
)
echo.

echo 5. Verification du PATH:
echo %PATH%
echo.

echo 6. Verification des fichiers du projet:
if exist "package.json" (
    echo package.json: OK
) else (
    echo package.json: MANQUANT
)

if exist "node_modules" (
    echo node_modules: OK
) else (
    echo node_modules: MANQUANT
)

if exist "app.json" (
    echo app.json: OK
) else (
    echo app.json: MANQUANT
)
echo.

echo 7. Test d'execution simple:
echo Test de la commande echo...
echo [TEST REUSSI]
echo.

echo 8. Test d'execution de Node.js:
node -e "console.log('Node.js fonctionne')"
if %errorlevel% neq 0 (
    echo ERREUR: Node.js ne peut pas s'executer
) else (
    echo Node.js s'execute correctement
)
echo.

echo Diagnostic termine.
pause
