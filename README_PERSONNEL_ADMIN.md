# 🚗 Interface HORS COURSIER - inovie SCAN Mobile

## 📱 Vue d'ensemble

L'interface **HORS COURSIER** est une version simplifiée de l'application mobile inovie SCAN, spécialement conçue pour le personnel qui utilise occasionnellement les véhicules de la flotte sans faire de tournées.

## 🎯 Objectifs

- **Simplifier l'utilisation** : Interface épurée sans les fonctionnalités complexes des tournées
- **Focus sur l'essentiel** : Véhicules + Checks + Navigation
- **Workflow guidé** : Processus en 5 étapes claires
- **Accès restreint** : Masquer les fonctionnalités non nécessaires

## 🔄 Workflow en 5 étapes

### 1. **Sélection du Pôle** 🏢
- Choix du pôle d'affectation
- Détermine les véhicules et sites disponibles

### 2. **Sélection du Véhicule** 🚗
- Liste des véhicules du pôle sélectionné
- Recherche par immatriculation ou modèle
- Sélection via modale avec filtrage

### 3. **Check Véhicule** ✅
- Vérification de l'état du véhicule
- Prise de photos
- Saisie du kilométrage
- Validation des lavages
- Signalement d'alertes si nécessaire

### 4. **Sélection du Site** 📍
- Liste des sites du pôle
- Recherche par nom ou adresse
- Sélection pour la destination

### 5. **Navigation et Roadbook** 🗺️
- Accès à Google Maps
- Consultation du roadbook du site
- Informations de navigation

## 🚪 Accès et Authentification

### Rôles autorisés :
- `HORS COURSIER`

### Redirection automatique :
- **HORS COURSIER** → `PersonnelAdminScreen`
- **Autres rôles** → `TourneeScreen` (interface normale)

## 🛠️ Composants techniques

### Écrans principaux :
- `PersonnelAdminScreen.js` - Écran principal avec workflow
- `PersonnelAdminHeader.js` - En-tête personnalisé
- `CheckVehiculeScreen.js` - Modifié pour gérer le retour

### Navigation :
- `AppNavigator.js` - Ajout de la route `PersonnelAdmin`
- `LoginScreen.js` - Détection du rôle et redirection

### Services utilisés :
- `FirebaseService` - Authentification et données
- `AsyncStorage` - Stockage local des préférences

## 🔧 Fonctionnalités clés

### ✅ Conservées :
- Sélection de pôle
- Gestion des véhicules
- Check véhicule complet
- Accès aux sites
- Google Maps
- Roadbook

### ❌ Masquées :
- Gestion des tournées
- Suivi des passages
- Gestion des sites
- Interface complexe

## 📱 Interface utilisateur

### Design :
- **Couleur principale** : `#1a4d94` (bleu SCAN)
- **Indicateur de progression** : 5 étapes visuelles
- **Modales** : Sélection véhicules et sites
- **Recherche** : Filtrage en temps réel

### Responsive :
- Adaptation aux différentes tailles d'écran
- Support des appareils Zebra
- Interface tactile optimisée

## 🚀 Utilisation

### Connexion :
1. Sélectionner la SELAS
2. Saisir email/mot de passe
3. Redirection automatique selon le rôle

### Workflow :
1. **Pôle** → Choisir le pôle d'affectation
2. **Véhicule** → Sélectionner le véhicule à utiliser
3. **Check** → Effectuer la vérification préalable
4. **Site** → Choisir la destination
5. **Navigation** → Accéder aux outils de navigation

## 🔒 Sécurité

- **Authentification Firebase** obligatoire
- **Vérification des rôles** côté client et serveur
- **Session sécurisée** avec AsyncStorage
- **Déconnexion automatique** en cas d'inactivité

## 🐛 Dépannage

### Problèmes courants :
- **Rôle non reconnu** : Vérifier la configuration Firestore
- **Véhicules non chargés** : Vérifier la sélection du pôle
- **Check non sauvegardé** : Vérifier la connexion Firebase

### Logs de debug :
- Console React Native
- Firebase Console
- AsyncStorage inspection

## 📋 TODO / Améliorations futures

- [ ] Intégration complète du roadbook
- [ ] Historique des checks effectués
- [ ] Notifications push pour les alertes
- [ ] Mode hors ligne
- [ ] Synchronisation automatique des données

## 🤝 Contribution

Pour modifier ou améliorer l'interface Personnel Administratif :

1. **Fork** du projet
2. **Branch** dédiée : `feature/personnel-admin`
3. **Tests** sur appareils Zebra
4. **Pull Request** avec description détaillée

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025-01-23  
**Maintenu par** : Équipe inovie SCAN
