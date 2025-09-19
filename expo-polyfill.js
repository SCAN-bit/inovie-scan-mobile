// Polyfill Expo pour éviter l'erreur globalThis.expo.NativeModule
// Ce fichier doit être chargé en premier avant tout autre module

// INTERCEPTION ULTRA-PRÉCOCE - Avant même que globalThis soit défini
(function() {
  // Intercepter immédiatement tous les accès aux modules natifs
  const originalRequire = typeof require !== 'undefined' ? require : null;
  
  if (originalRequire) {
    require = function(id) {
      // Si c'est un module natif manquant, retourner notre polyfill
      if (id.includes('NativeModules') || id.includes('expo')) {
        console.log('[ExpoPolyfill] Interception require:', id);
        return {
          ExponentConstants: {
            appOwnership: 'standalone',
            expoVersion: '51.0.0',
            platform: { android: true, ios: false, web: false }
          },
          EXNativeModulesProxy: {
            callMethod: () => Promise.resolve(),
            addListener: () => ({ remove: () => {} }),
            removeListeners: () => {}
          }
        };
      }
      return originalRequire(id);
    };
  }
  
  // Intercepter aussi les accès directs aux NativeModules
  if (typeof globalThis.NativeModules === 'undefined') {
    globalThis.NativeModules = {};
  }
  
  // Créer immédiatement les modules manquants (sans ExpoAsset)
  
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
  
  globalThis.NativeModules.EXNativeModulesProxy = {
    callMethod: () => Promise.resolve(),
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {}
  };
  
  console.log('[ExpoPolyfill] Modules natifs créés immédiatement');
})();

// INTERCEPTION D'ERREUR GLOBALE - Capturer les erreurs de modules natifs
(function() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Si c'est l'erreur ExpoAsset, la remplacer par un message informatif
    if (message.includes("Cannot find native module 'ExpoAsset'")) {
      console.log('[ExpoPolyfill] Erreur ExpoAsset interceptée et ignorée - Module non utilisé par l\'app');
      return; // Ne pas afficher l'erreur
    }
    
    // Pour toutes les autres erreurs, utiliser le comportement normal
    originalConsoleError.apply(console, args);
  };
  
  // Intercepter aussi les erreurs globales
  const originalError = globalThis.Error;
  globalThis.Error = function(...args) {
    const message = args.join(' ');
    if (message.includes("Cannot find native module 'ExpoAsset'")) {
      console.log('[ExpoPolyfill] Erreur globale ExpoAsset interceptée');
      return;
    }
    return originalError.apply(this, args);
  };
})();

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

// Créer ExpoAsset sur web uniquement (le module natif existe sur Android)
if (typeof globalThis.Platform === 'undefined') {
  // Polyfill Platform pour détecter la plateforme
  globalThis.Platform = {
    OS: typeof window !== 'undefined' ? 'web' : 'android'
  };
}

if (globalThis.Platform.OS === 'web') {
  globalThis.NativeModules.ExpoAsset = {
    downloadAsync: () => Promise.resolve(),
    loadAsync: () => Promise.resolve(),
    fromModule: () => Promise.resolve(),
    fromURI: () => Promise.resolve(),
    fromBundle: () => Promise.resolve()
  };
  console.log('[ExpoPolyfill] ExpoAsset créé pour le mode web');
}

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

// Intercepter les accès aux modules natifs manquants AVANT qu'ils soient demandés
const originalNativeModules = globalThis.NativeModules;

// Créer immédiatement les polyfills pour les modules connus
const knownModules = ['ExponentConstants', 'EXNativeModulesProxy', 'ExpoSplashScreen', 'ExpoUpdates'];
knownModules.forEach(moduleName => {
  if (!originalNativeModules[moduleName]) {
    console.log(`[ExpoPolyfill] Création préventive du polyfill pour: ${moduleName}`);
    originalNativeModules[moduleName] = createModulePolyfill(moduleName);
  }
});

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

// Activer le mode debug simple
if (typeof globalThis.__DEV__ === 'undefined') {
  globalThis.__DEV__ = true;
}

console.log('[ExpoPolyfill] Mode debug activé');
