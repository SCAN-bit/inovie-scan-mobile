# SOLUTION - Raccourci lancer-app-web.bat ne fonctionne plus

## Problème identifié
Le raccourci `lancer-app-web.bat` ne fonctionne plus car **Node.js n'est pas installé** sur le système ou n'est pas dans le PATH.

## Solutions disponibles

### SOLUTION 1 - Installation manuelle de Node.js (RECOMMANDÉE)
1. Allez sur https://nodejs.org/
2. Téléchargez la version LTS (Long Term Support)
3. Installez-la avec les options par défaut
4. Redémarrez votre terminal
5. Relancez `lancer-app-web.bat`

### SOLUTION 2 - Installation automatique
1. Exécutez le script `install_nodejs.bat` que j'ai créé
2. Redémarrez votre terminal
3. Relancez `lancer-app-web.bat`

### SOLUTION 3 - Utilisation de Node.js portable
1. Téléchargez Node.js portable depuis https://nodejs.org/dist/
2. Extrayez `node.exe` dans le dossier `inovie-scan-mobile`
3. Relancez `lancer-app-web.bat`

## Scripts créés pour vous aider

1. **lancer-app-web.bat** - Script principal corrigé avec diagnostics
2. **install_nodejs.bat** - Installation automatique de Node.js
3. **lancer-app-web.ps1** - Version PowerShell alternative
4. **diagnostic.bat** - Script de diagnostic du système

## Vérification rapide
Ouvrez un terminal et tapez :
```
node --version
```
Si cette commande ne fonctionne pas, Node.js n'est pas installé.

## Après installation de Node.js
1. Ouvrez un nouveau terminal
2. Naviguez vers le dossier `inovie-scan-mobile`
3. Exécutez `lancer-app-web.bat`
4. L'application web devrait se lancer dans votre navigateur

## Note importante
Le script a été amélioré pour :
- Détecter automatiquement si Node.js est installé
- Afficher des messages d'erreur clairs
- Proposer des solutions automatiques
- Installer les dépendances si nécessaire
