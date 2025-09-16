# 🚀 Amélioration du Script de Build APK

## 📦 Nouveau système de nommage des APK

### Avant
- **Nom fixe** : `app-release.apk`
- **Pas de version** dans le nom
- **Difficile à identifier** les versions

### Après
- **Nom dynamique** : `inovie-scan-v1.0.6-build15.apk`
- **Version incluse** : `v1.0.6`
- **Build number** : `build15`
- **Facile à identifier** les versions

## 🔧 Fonctionnalités ajoutées

### 1. **Renommage automatique**
```batch
REM Créer le nom de fichier avec version et build
set "apk_name=inovie-scan-v%new_version%-build%build_number%.apk"
set "apk_source=android\app\build\outputs\apk\release\app-release.apk"
set "apk_dest=android\app\build\outputs\apk\release\%apk_name%"

REM Renommer l'APK
ren "%apk_source%" "%apk_name%"
```

### 2. **Lecture automatique des versions**
- **Version** : Lue depuis `app.json`
- **Build number** : Lue depuis `app.json`
- **Format** : `inovie-scan-v{version}-build{build}.apk`

### 3. **Archivage optionnel**
```batch
REM Créer un nom avec la date
set "archive_name=inovie-scan-v%new_version%-build%build_number%-%timestamp%.apk"
set "archive_path=archives\%archive_name%"
```

## 📁 Structure des fichiers générés

### Dossier de build
```
android/app/build/outputs/apk/release/
├── inovie-scan-v1.0.6-build15.apk  ← Nouveau nom
└── (ancien app-release.apk supprimé)
```

### Dossier d'archives (optionnel)
```
archives/
├── inovie-scan-v1.0.6-build15-2024-01-15_14-30-25.apk
├── inovie-scan-v1.0.7-build16-2024-01-16_09-15-42.apk
└── ...
```

## 🎯 Exemples de noms d'APK

### Nouvelle version
- **Input** : Version `1.0.6`, Build `15`
- **Output** : `inovie-scan-v1.0.6-build15.apk`

### Même version, nouveau build
- **Input** : Version `1.0.6`, Build `16`
- **Output** : `inovie-scan-v1.0.6-build16.apk`

### Avec archivage
- **Input** : Version `1.0.6`, Build `15`, Date `2024-01-15 14:30:25`
- **Output** : `inovie-scan-v1.0.6-build15-2024-01-15_14-30-25.apk`

## 🔄 Workflow amélioré

### 1. **Choix du type de mise à jour**
```
Choisissez le type de mise a jour :
  [1] NOUVELLE VERSION (ex: 1.0.5 vers 1.0.6)
  [2] MEME VERSION, NOUVEAU BUILD (ex: 1.0.5 build 14 vers 1.0.5 build 15)
```

### 2. **Build et renommage**
```
========================================
  RENOMMAGE APK AVEC VERSION
========================================
Renommage: app-release.apk -> inovie-scan-v1.0.6-build15.apk
APK renomme avec succes !
```

### 3. **Distribution Firebase**
```
Distribution vers Firebase App Distribution...
firebase appdistribution:distribute "android\app\build\outputs\apk\release\inovie-scan-v1.0.6-build15.apk"
```

### 4. **Archivage optionnel**
```
Voulez-vous copier l'APK vers le dossier d'archives ? (o/N):
Copie vers: archives\inovie-scan-v1.0.6-build15-2024-01-15_14-30-25.apk
APK archive avec succes !
```

## 📊 Avantages

### Pour le développement
- ✅ **Identification facile** des versions
- ✅ **Historique des builds** dans les archives
- ✅ **Pas de confusion** entre les versions
- ✅ **Traçabilité** des déploiements

### Pour la distribution
- ✅ **Nom explicite** pour les testeurs
- ✅ **Version visible** dans le nom de fichier
- ✅ **Build number** pour identifier les corrections
- ✅ **Archivage** pour la rétrocompatibilité

### Pour la maintenance
- ✅ **Organisation** des APK par version
- ✅ **Recherche facile** d'une version spécifique
- ✅ **Nettoyage** possible des anciennes versions
- ✅ **Documentation** automatique des builds

## 🚨 Points d'attention

### Gestion des erreurs
- Vérification de l'existence de l'APK source
- Gestion des erreurs de renommage
- Validation des versions lues

### Compatibilité
- Fonctionne avec les scripts PowerShell existants
- Compatible avec Firebase App Distribution
- Préserve la fonctionnalité d'archivage

### Performance
- Renommage instantané (pas de copie)
- Archivage optionnel (pas de surcharge)
- Pas d'impact sur le temps de build

---

**Note** : Cette amélioration facilite grandement la gestion des versions et l'identification des APK, particulièrement utile pour les tests et la distribution.
