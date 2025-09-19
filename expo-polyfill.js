// Polyfill Expo pour éviter l'erreur globalThis.expo.NativeModule
// Ce fichier doit être chargé en premier avant tout autre module

// Initialisation complète d'Expo pour les builds de production
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {};
}

// Polyfill pour NativeModule avec des méthodes de base
if (typeof globalThis.expo.NativeModule === 'undefined') {
  globalThis.expo.NativeModule = {
    // Méthodes communes qui pourraient être appelées
    addListener: function() { return { remove: function() {} }; },
    removeListeners: function() {},
    invoke: function() { return Promise.resolve(); },
    call: function() { return Promise.resolve(); },
    emit: function() {}
  };
}

// Polyfill pour les modules Expo manquants
if (typeof globalThis.expo.modules === 'undefined') {
  globalThis.expo.modules = {};
}

// Polyfill pour les constantes Expo communes
if (typeof globalThis.expo.Constants === 'undefined') {
  globalThis.expo.Constants = {
    appOwnership: 'standalone',
    expoVersion: '51.0.0',
    platform: { android: true, ios: false, web: false }
  };
}

// Polyfill pour Updates
if (typeof globalThis.expo.Updates === 'undefined') {
  globalThis.expo.Updates = {
    checkForUpdateAsync: () => Promise.resolve({ isAvailable: false }),
    fetchUpdateAsync: () => Promise.resolve({}),
    reloadAsync: () => Promise.resolve()
  };
}

// Polyfill pour SplashScreen
if (typeof globalThis.expo.SplashScreen === 'undefined') {
  globalThis.expo.SplashScreen = {
    hideAsync: () => Promise.resolve(),
    preventAutoHideAsync: () => Promise.resolve()
  };
}

// Polyfill pour Asset
if (typeof globalThis.expo.Asset === 'undefined') {
  globalThis.expo.Asset = {
    loadAsync: () => Promise.resolve(),
    downloadAsync: () => Promise.resolve(),
    fromModule: () => Promise.resolve(),
    fromURI: () => Promise.resolve(),
    fromBundle: () => Promise.resolve()
  };
}

// Polyfill pour les modules natifs React Native manquants
if (typeof globalThis.NativeModules === 'undefined') {
  globalThis.NativeModules = {};
}

// Ajouter ExpoAsset au NativeModules
globalThis.NativeModules.ExpoAsset = {
  downloadAsync: () => Promise.resolve(),
  loadAsync: () => Promise.resolve(),
  fromModule: () => Promise.resolve(),
  fromURI: () => Promise.resolve(),
  fromBundle: () => Promise.resolve()
};

// Ajouter ExponentConstants au NativeModules
globalThis.NativeModules.ExponentConstants = {
  appOwnership: 'standalone',
  expoVersion: '51.0.0',
  platform: { android: true, ios: false, web: false },
  getConstants: function() {
    return {
      appOwnership: 'standalone',
      expoVersion: '51.0.0',
      platform: { android: true, ios: false, web: false }
    };
  }
};

// Ajouter EXNativeModulesProxy au NativeModules
globalThis.NativeModules.EXNativeModulesProxy = {
  callMethod: () => Promise.resolve(),
  addListener: () => ({ remove: () => {} }),
  removeListeners: () => {}
};

// Polyfill "catch-all" pour TOUS les modules natifs manquants
const createModulePolyfill = (moduleName) => {
  console.log(`[ExpoPolyfill] Création polyfill pour module manquant: ${moduleName}`);
  return {
    // Méthodes communes pour tous les modules
    callMethod: () => Promise.resolve(),
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    invoke: () => Promise.resolve(),
    call: () => Promise.resolve(),
    emit: () => {},
    getConstants: () => ({}),
    getConfig: () => ({}),
    // Méthodes spécifiques Expo
    downloadAsync: () => Promise.resolve(),
    loadAsync: () => Promise.resolve(),
    fromModule: () => Promise.resolve(),
    fromURI: () => Promise.resolve(),
    fromBundle: () => Promise.resolve(),
    hideAsync: () => Promise.resolve(),
    preventAutoHideAsync: () => Promise.resolve(),
    checkForUpdateAsync: () => Promise.resolve({ isAvailable: false }),
    fetchUpdateAsync: () => Promise.resolve({}),
    reloadAsync: () => Promise.resolve()
  };
};

// Intercepter les accès aux modules natifs manquants
const originalNativeModules = globalThis.NativeModules;
globalThis.NativeModules = new Proxy(originalNativeModules, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    
    // Si le module n'existe pas, créer un polyfill
    console.log(`[ExpoPolyfill] Module natif manquant détecté: ${prop}`);
    target[prop] = createModulePolyfill(prop);
    return target[prop];
  }
});

// Intercepter les require de modules natifs
if (typeof globalThis.require === 'function') {
  const originalRequire = globalThis.require;
  globalThis.require = function(id) {
    // Log tous les require pour identifier les modules manquants
    console.log(`[ExpoPolyfill] Require appelé: ${id}`);
    
    try {
      return originalRequire(id);
    } catch (error) {
      console.log(`[ExpoPolyfill] Require échoué: ${id}`, error.message);
      
      // Si c'est un module natif, retourner notre polyfill
      if (id.includes('NativeModules') || id.includes('expo') || id.includes('Expo')) {
        return globalThis.NativeModules;
      }
      
      throw error;
    }
  };
}

console.log('[ExpoPolyfill] Expo polyfill initialisé:', globalThis.expo);

// Activer tous les logs de débogage au démarrage
console.log('[ExpoPolyfill] Activation des logs de débogage...');

// Intercepter toutes les erreurs pour les afficher sans crasher (éviter les boucles)
const originalConsoleError = console.error;
let consoleErrorCount = 0;
const MAX_CONSOLE_ERRORS = 5;

console.error = function(...args) {
  // Éviter les boucles infinies avec des erreurs répétitives
  const errorMessage = args.join(' ');
  if (errorMessage.includes('react-stack-top-frame') || errorMessage.includes('DIAGNOSTIC')) {
    consoleErrorCount++;
    if (consoleErrorCount > MAX_CONSOLE_ERRORS) {
      return; // Arrêter d'afficher les erreurs répétitives
    }
  }
  
  console.log('[ERROR INTERCEPTED]:', ...args);
  originalConsoleError.apply(console, args);
};

// Intercepter les erreurs globales
window.addEventListener('error', function(event) {
  console.log('[GLOBAL ERROR]:', event.error);
});

// Intercepter les promesses rejetées
window.addEventListener('unhandledrejection', function(event) {
  console.log('[UNHANDLED PROMISE REJECTION]:', event.reason);
});

// Activer les logs React Native
if (typeof globalThis.__DEV__ === 'undefined') {
  globalThis.__DEV__ = true;
}

// Activer les logs Expo
if (typeof globalThis.expo !== 'undefined' && globalThis.expo.Constants) {
  globalThis.expo.Constants.debugMode = true;
}

console.log('[ExpoPolyfill] Logs de débogage activés');
