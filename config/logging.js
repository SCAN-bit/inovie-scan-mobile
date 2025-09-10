// Configuration des logs pour l'application mobile
// Permet de contrôler le niveau de verbosité

const LOG_LEVELS = {
  ERROR: 0,    // Erreurs critiques uniquement
  WARN: 1,     // Avertissements et erreurs
  INFO: 2,     // Informations importantes
  DEBUG: 3,    // Debug détaillé
  VERBOSE: 4   // Tout afficher
};

// Niveau de log actuel (modifier ici pour changer le niveau)
const CURRENT_LOG_LEVEL = LOG_LEVELS.ERROR; // Seulement les erreurs critiques

// Fonction utilitaire pour logger
export const logger = {
  error: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  },
  
  verbose: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.VERBOSE) {
      console.log(`📝 [VERBOSE] ${message}`, ...args);
    }
  }
};

// Fonction pour changer le niveau de log dynamiquement
export const setLogLevel = (level) => {
  if (Object.values(LOG_LEVELS).includes(level)) {
    CURRENT_LOG_LEVEL = level;
    logger.info(`Niveau de log changé vers: ${level}`);
  } else {
    logger.error(`Niveau de log invalide: ${level}`);
  }
};

// Fonction pour obtenir le niveau de log actuel
export const getLogLevel = () => CURRENT_LOG_LEVEL;

// Fonction pour désactiver tous les logs
export const disableLogs = () => {
  CURRENT_LOG_LEVEL = -1;
  logger.info('Tous les logs désactivés');
};

// Fonction pour activer tous les logs
export const enableAllLogs = () => {
  CURRENT_LOG_LEVEL = LOG_LEVELS.VERBOSE;
  logger.info('Tous les logs activés');
};

export default logger;
