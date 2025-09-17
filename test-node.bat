@echo off
echo Test de Node.js...
echo.

echo 1. Test de la commande where:
where node
echo.

echo 2. Test de la commande node:
node --version
echo.

echo 3. Test de la commande npm:
npm --version
echo.

echo 4. Test de la commande npx:
npx --version
echo.

echo 5. Test du PATH:
echo %PATH%
echo.

echo 6. Test d'execution directe:
node -e "console.log('Node.js fonctionne!')"
echo.

pause
