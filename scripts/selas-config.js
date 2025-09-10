// Configuration SELAS pour garantir la séparation des données
// Ce fichier définit les règles pour toutes les collections

const SELAS_CONFIG = {
  // Collections qui DOIVENT avoir un selasId (données séparées par SELAS)
  REQUIRED_SELAS_COLLECTIONS: [
    'bigsacoches',
    'documents',
    'fuelTypes',
    'inspections',
    'maintenance',
    'markerPreferences',
    'notifications',
    'passages',
    'poles',
    'roles',
    'scans',
    'sessions',
    'sites',
    'tournees',
    'vehicleAssets',
    'vehicleAssetsCorrected',
    'vehicleChecks',
    'vehicleFuelCalculations',
    'vehicleFuelSettings',
    'vehicleMaintenance',
    'vehicleMileageHistory',
    'vehicleServices',
    'vehicules'
  ],

  // Collections qui NE nécessitent PAS de selasId (données globales)
  GLOBAL_COLLECTIONS: [
    'selas',      // Définition des SELAS
    'users'       // Utilisateurs (gérés par l'auth)
  ],

  // Collections futures qui devront automatiquement avoir un selasId
  FUTURE_COLLECTIONS_RULES: {
    // Règle générale : toute nouvelle collection doit avoir un selasId
    // SAUF si elle est explicitement listée dans GLOBAL_COLLECTIONS
    
    // Exemples de collections futures qui devront avoir un selasId :
    'futureCollection1': 'REQUIRED',
    'futureCollection2': 'REQUIRED',
    'futureCollection3': 'REQUIRED'
  },

  // Validation des données avant insertion
  VALIDATION_RULES: {
    // Vérifier que le selasId est présent et valide
    validateSelasId: (data, collectionName) => {
      if (SELAS_CONFIG.REQUIRED_SELAS_COLLECTIONS.includes(collectionName)) {
        if (!data.selasId || data.selasId === '') {
          throw new Error(`Collection ${collectionName} nécessite un selasId valide`);
        }
        return true;
      }
      return true; // Collection globale, pas de validation
    },

    // Enrichir automatiquement les données avec selasId
    enrichWithSelasId: (data, selasId, collectionName) => {
      if (SELAS_CONFIG.REQUIRED_SELAS_COLLECTIONS.includes(collectionName)) {
        return {
          ...data,
          selasId: selasId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return data; // Collection globale, pas d'enrichissement
    }
  },

  // Messages d'erreur standardisés
  ERROR_MESSAGES: {
    MISSING_SELAS_ID: 'Ce champ est obligatoire pour la séparation des données SELAS',
    INVALID_SELAS_ID: 'L\'identifiant SELAS fourni n\'est pas valide',
    COLLECTION_REQUIRES_SELAS: 'Cette collection nécessite un selasId pour la sécurité des données'
  },

  // Fonctions utilitaires
  UTILS: {
    // Vérifier si une collection nécessite un selasId
    requiresSelasId: (collectionName) => {
      return SELAS_CONFIG.REQUIRED_SELAS_COLLECTIONS.includes(collectionName);
    },

    // Obtenir la liste de toutes les collections
    getAllCollections: () => {
      return [
        ...SELAS_CONFIG.REQUIRED_SELAS_COLLECTIONS,
        ...SELAS_CONFIG.GLOBAL_COLLECTIONS
      ];
    },

    // Vérifier la cohérence des données
    validateDataConsistency: (data, collectionName) => {
      if (SELAS_CONFIG.requiresSelasId(collectionName)) {
        if (!data.selasId) {
          return {
            valid: false,
            error: `Collection ${collectionName} nécessite un selasId`,
            field: 'selasId'
          };
        }
      }
      return { valid: true };
    }
  }
};

// Export pour utilisation dans d'autres scripts
module.exports = SELAS_CONFIG;

// Affichage de la configuration
console.log('🔒 Configuration SELAS chargée !');
console.log(`📋 Collections nécessitant un selasId: ${SELAS_CONFIG.REQUIRED_SELAS_COLLECTIONS.length}`);
console.log(`🌐 Collections globales: ${SELAS_CONFIG.GLOBAL_COLLECTIONS.length}`);
console.log('\n📝 RÈGLES IMPORTANTES:');
console.log('- Toute nouvelle collection DOIT avoir un selasId sauf si elle est globale');
console.log('- La séparation des données entre SELAS est OBLIGATOIRE');
console.log('- Seule la page carte reste accessible à toutes les SELAS');
console.log('- Utilisez les fonctions de validation avant toute insertion');
