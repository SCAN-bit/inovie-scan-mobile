# Build APK via GitHub Actions

## 🚀 Nouveau système de build automatique

Ce système utilise **GitHub Actions** pour build l'APK automatiquement, évitant les problèmes de Gradle local.

## 📋 Prérequis

1. **GitHub CLI** installé :
   ```bash
   winget install --id GitHub.cli
   ```

2. **Authentification GitHub** :
   ```bash
   gh auth login
   ```

## 🛠️ Utilisation

### Option 1 : Script automatique (Recommandé)
```bash
.\build-github.bat
```

### Option 2 : Manuel via GitHub
1. Aller sur : https://github.com/SCAN-bit/inovie-scan-mobile/actions
2. Cliquer sur "Build APK and Release"
3. Cliquer sur "Run workflow"
4. Choisir le type de mise à jour
5. Ajouter les notes de release
6. Cliquer sur "Run workflow"

## 📱 Types de mise à jour

### 1. Nouvelle version
- Incrémente la version (ex: 1.0.6 → 1.0.7)
- Reset le build number à 1
- Crée un nouveau tag Git

### 2. Même version, nouveau build
- Garde la même version
- Incrémente le build number (ex: build 14 → build 15)
- Pas de nouveau tag Git

## 🔄 Processus automatique

1. **Déclenchement** : Le script lance le workflow GitHub Actions
2. **Build** : GitHub Actions build l'APK avec Gradle 8.7
3. **Release** : Création automatique d'un release GitHub
4. **APK** : Upload automatique de l'APK dans le release
5. **OTA** : Les utilisateurs peuvent mettre à jour via l'app

## 📦 Résultat

- **APK** : Disponible dans GitHub Releases
- **Tag** : Créé automatiquement (ex: v1.0.7)
- **Release** : Avec notes et APK téléchargeable
- **OTA** : Compatible avec le système de mise à jour de l'app

## 🔗 Liens utiles

- **Actions** : https://github.com/SCAN-bit/inovie-scan-mobile/actions
- **Releases** : https://github.com/SCAN-bit/inovie-scan-mobile/releases
- **Workflow** : `.github/workflows/build-and-release.yml`

## ✅ Avantages

- ✅ Pas de problèmes Gradle local
- ✅ Build dans un environnement propre
- ✅ Automatisation complète
- ✅ Compatible avec les mises à jour OTA
- ✅ Historique des builds
- ✅ Notifications automatiques

## 🆘 Dépannage

### Erreur "GitHub CLI not found"
```bash
winget install --id GitHub.cli
```

### Erreur "Not authenticated"
```bash
gh auth login
```

### Erreur "Not a git repository"
```bash
git init
git remote add origin https://github.com/SCAN-bit/inovie-scan-mobile.git
```

## 📝 Notes

- Le build prend environ 5-10 minutes
- Vous recevrez une notification email quand c'est prêt
- L'APK est automatiquement signé pour la production
- Compatible avec Expo SDK 52.0 et React Native 0.75.4
