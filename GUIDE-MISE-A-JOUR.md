# 🚀 Guide de Mise à Jour - Inovie Scan

## 📋 Vue d'ensemble

Ce projet propose **3 méthodes** pour mettre à jour l'application sans installer Firebase App Tester sur tous les téléphones.

## ⚡ Méthode 1 : Mises à jour OTA (Recommandée)

**Durée : 30 secondes**  
**Idéal pour :** Corrections de bugs, nouvelles fonctionnalités JavaScript

### Usage rapide :
```bat
# Double-clic sur le fichier
quick-update.bat
```

### Usage avec message personnalisé :
1. Lancez `update-app.bat`
2. Choisissez option **[1]**
3. Entrez un message de mise à jour
4. ✅ L'application se met à jour automatiquement au redémarrage

## 📦 Méthode 2 : Build APK + Distribution

**Durée : 15 minutes**  
**Idéal pour :** Nouvelles dépendances, permissions Android

### Options disponibles :

#### A) APK Simple
1. Lancez `update-app.bat`  
2. Choisissez option **[2]**
3. L'APK sera dans `APK/` et `C:\Users\Public\Downloads\InovieScan\`

#### B) APK + Serveur Web + QR Code  
1. Lancez `update-app.bat`
2. Choisissez option **[3]** 
3. Scannez le QR Code généré
4. Téléchargez l'APK directement sur le téléphone

#### C) Installation directe USB
1. Connectez le téléphone en USB (débogage activé)
2. Lancez `update-app.bat`
3. Choisissez option **[4]**
4. L'APK s'installe automatiquement

## 📱 Méthode 3 : Distribution par QR Code/Email

### QR Code uniquement :
```bat
generate-qr-download.bat
```
- Option [1] : Serveur web local + QR Code
- Option [2] : QR Code pour URL existante  
- Option [3] : Envoi par email

## 🔄 Workflows recommandés

### Pour le développement quotidien :
```bat
quick-update.bat  # 30 secondes
```

### Pour les versions importantes :
```bat
update-app.bat → Option [3]  # Build + QR Code
```

### Pour les tests en équipe :
1. `update-app.bat → Option [2]` (Build APK)
2. `generate-qr-download.bat → Option [1]` (QR Code)
3. Partagez le QR Code à l'équipe

## 🛠️ Configuration requise

- ✅ Docker Desktop installé
- ✅ Node.js + npm 
- ✅ EAS CLI configuré (`npm install -g @expo/eas-cli`)
- ✅ Python (pour serveur web) 
- ✅ ADB (optionnel, pour installation USB)

## 📂 Structure des fichiers

```
inovie-scan-mobile/
├── update-app.bat           # Script principal (4 options)
├── quick-update.bat         # Mise à jour OTA rapide  
├── generate-qr-download.bat # Générateur QR Code
├── APK/                     # APKs buildées avec timestamp
└── C:\Users\Public\Downloads\InovieScan\  # APK partagée
```

## 🚫 Plus besoin de :

- ❌ Firebase App Distribution
- ❌ Installer des apps de test sur tous les téléphones  
- ❌ Reconfigurer chaque appareil
- ❌ Gérer des comptes utilisateurs

## ⚠️ Notes importantes

1. **Expo Updates (OTA)** ne fonctionne que pour le code JavaScript
2. Pour les **nouvelles permissions** Android → Build APK complet requis
3. Le **QR Code** nécessite que le PC et le téléphone soient sur le même WiFi
4. **Sources inconnues** doit être activé sur Android pour installer l'APK

## 🎯 Résumé

| Changement | Méthode | Durée | Script |
|-----------|---------|-------|--------|
| Bug JavaScript | OTA | 30s | `quick-update.bat` |
| Nouvelle fonctionnalité | OTA | 30s | `quick-update.bat` |
| Permission Android | APK | 15min | `update-app.bat → [2]` |
| Distribution équipe | QR Code | 2min | `generate-qr-download.bat` |

🎉 **Votre workflow de mise à jour est maintenant optimisé !** 