# Guide de résolution - Node.js installé mais non détecté

## Problème
Node.js est installé sur votre ordinateur mais le script `lancer-app-web.bat` ne le trouve pas.

## Causes possibles
1. **PATH non mis à jour** - Le terminal n'a pas été redémarré après l'installation
2. **Installation dans un emplacement non standard** - Node.js installé ailleurs que dans Program Files
3. **Problème de permissions** - PowerShell/CMD n'a pas accès aux commandes Node.js
4. **Installation corrompue** - Node.js installé mais non fonctionnel

## Solutions à essayer

### 1. Redémarrage du terminal (LE PLUS SIMPLE)
1. Fermez complètement votre terminal/PowerShell
2. Rouvrez un nouveau terminal
3. Naviguez vers le dossier `inovie-scan-mobile`
4. Exécutez `lancer-app-web.bat`

### 2. Test de diagnostic
Exécutez le script de diagnostic :
```
test-node.bat
```
ou
```
powershell -ExecutionPolicy Bypass -File test-node.ps1
```

### 3. Utilisation du script amélioré
Utilisez la version améliorée qui cherche Node.js dans plusieurs emplacements :
```
lancer-app-web-simple.bat
```

### 4. Vérification manuelle
Ouvrez un nouveau terminal et testez :
```
node --version
npm --version
npx --version
```

### 5. Réinstallation de Node.js (si nécessaire)
1. Désinstallez Node.js via "Ajouter ou supprimer des programmes"
2. Téléchargez la dernière version LTS depuis https://nodejs.org/
3. Installez avec les options par défaut
4. Redémarrez votre ordinateur
5. Testez avec `node --version`

## Scripts créés pour vous aider

- `test-node.bat` - Diagnostic simple en batch
- `test-node.ps1` - Diagnostic détaillé en PowerShell  
- `lancer-app-web-simple.bat` - Version améliorée du lanceur
- `lancer-app-web.bat` - Version originale corrigée

## Test rapide
Pour tester si Node.js fonctionne, exécutez dans un terminal :
```
node -e "console.log('Node.js fonctionne!')"
```

Si cette commande affiche "Node.js fonctionne!", alors Node.js est correctement installé et le problème vient du script de lancement.
