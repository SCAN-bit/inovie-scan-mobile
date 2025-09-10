# 📞 Recherche Automatique de Numéros de Téléphone

## 🎯 Fonctionnalité

L'application mobile peut maintenant **rechercher automatiquement les numéros de téléphone** des sites dans la tournée et les afficher directement dans l'interface.

## 🔧 Comment ça fonctionne

### 1. **Recherche Automatique**
- Quand une tournée est chargée, l'application lance automatiquement la recherche des numéros
- La recherche se fait en arrière-plan avec un délai de 2 secondes entre chaque site
- Les numéros trouvés sont mis en cache pour éviter les recherches répétées

### 2. **Affichage Intelligent**
- **Prochain site** : Affiche le numéro s'il est trouvé, ou un bouton "Rechercher le numéro"
- **Liste des sites** : Chaque site affiche son numéro ou un bouton de recherche
- **États visuels** :
  - 🔄 "Recherche du numéro..." (en cours)
  - 📞 "01 23 45 67 89" (numéro trouvé, cliquable)
  - 📞 "Rechercher le numéro" (bouton pour lancer la recherche)

### 3. **Interaction**
- **Clic sur le numéro** : Ouvre l'application téléphone avec le numéro pré-rempli
- **Clic sur "Rechercher"** : Lance une nouvelle recherche pour ce site

## 🛠️ Configuration

### Mode Simulation (Actuel)
Par défaut, l'application utilise un mode simulation qui :
- Génère des numéros fictifs dans 30% des cas
- Simule les délais de recherche
- Permet de tester l'interface

### Mode Production (Google Places API)
Pour utiliser de vrais numéros, configurez l'API Google Places :

1. **Obtenir une clé API Google Places** :
   - Aller sur [Google Cloud Console](https://console.cloud.google.com/)
   - Activer l'API Places
   - Créer une clé API

2. **Configurer la clé** :
   ```javascript
   // Dans phoneSearchService.js, ligne 161
   const GOOGLE_PLACES_API_KEY = 'VOTRE_CLE_API_ICI';
   ```

3. **Activer les APIs nécessaires** :
   - Places API
   - Places API (New)

## 📱 Utilisation

### Dans TourneeProgress
1. **Chargement automatique** : Les numéros sont recherchés automatiquement
2. **Recherche manuelle** : Cliquer sur "Rechercher le numéro" pour forcer une recherche
3. **Appel direct** : Cliquer sur un numéro pour l'appeler

### Interface Utilisateur
- **Numéros trouvés** : Affichés en vert avec bordure
- **Recherche en cours** : Texte italique gris
- **Bouton recherche** : Bouton orange cliquable

## 🔍 Sources de Recherche

L'application essaie plusieurs sources dans l'ordre :

1. **Google Places API** (le plus fiable)
2. **Google Maps** (recherche web)
3. **Pages Jaunes** (annuaire français)
4. **Recherche web générique** (Google Search)

## 💾 Cache et Performance

- **Cache intelligent** : Les numéros sont mis en cache par site
- **Recherche unique** : Évite les recherches multiples pour le même site
- **Délai progressif** : 2 secondes entre chaque recherche pour éviter la surcharge

## 🚀 Améliorations Futures

### APIs Alternatives
- **OpenStreetMap Nominatim** (gratuit)
- **Here Places API**
- **Foursquare Places API**

### Fonctionnalités Avancées
- **Recherche par géolocalisation** (plus précise)
- **Validation des numéros** (vérifier si le numéro est valide)
- **Historique des appels** (intégration avec l'app téléphone)
- **Favoris** (marquer les numéros importants)

## 🐛 Dépannage

### Problèmes Courants

1. **Aucun numéro trouvé** :
   - Vérifier que le nom et l'adresse du site sont corrects
   - Essayer une recherche manuelle
   - Vérifier la connectivité internet

2. **Recherche lente** :
   - Normal, la recherche prend 1-3 secondes par site
   - Les numéros sont mis en cache après la première recherche

3. **Numéros incorrects** :
   - En mode simulation, les numéros sont fictifs
   - Configurer l'API Google Places pour de vrais numéros

### Logs de Debug
Les logs détaillés sont disponibles dans la console :
```
[PhoneSearch] Recherche du numéro pour: Nom du Site, Adresse, Ville
[PhoneSearch] ✅ Numéro trouvé: 01 23 45 67 89
[PhoneSearch] ❌ Aucun numéro trouvé
```

## 📋 Exemple d'Utilisation

```javascript
// Recherche manuelle d'un numéro
const phoneNumber = await PhoneSearchService.searchPhoneNumber({
  nom: "Restaurant Le Bistrot",
  adresse: "123 Rue de la Paix",
  ville: "Paris"
});

// Ouvrir l'app téléphone
PhoneSearchService.openPhoneApp(phoneNumber);

// Formater un numéro
const formatted = PhoneSearchService.formatPhoneNumber("0123456789");
// Résultat: "01 23 45 67 89"
```

## 🔒 Sécurité et Confidentialité

- **Pas de stockage permanent** : Les numéros ne sont pas sauvegardés en base
- **Cache temporaire** : Effacé à la fermeture de l'app
- **APIs tierces** : Respect des conditions d'utilisation des APIs utilisées
- **Données personnelles** : Aucune donnée personnelle n'est transmise

---

**Note** : Cette fonctionnalité améliore significativement l'expérience utilisateur en permettant d'appeler directement les sites depuis l'application, sans avoir à chercher manuellement les numéros.
