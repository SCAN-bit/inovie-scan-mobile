// Polyfill Expo ultra-agressif pour éviter les erreurs de modules natifs manquants
// Ce fichier doit être chargé en premier avant tout autre module

// Intercepter l'accès à globalThis.expo avant que les modules Expo ne soient chargés
const originalExpo = globalThis.expo;

// Créer un proxy pour intercepter tous les accès à globalThis.expo
const expoProxy = new Proxy({}, {
  get(target, prop) {
    console.log(`[ExpoPolyfill] Accès à globalThis.expo.${prop}`);
    
    // Si on accède à NativeModule, retourner notre polyfill
    if (prop === 'NativeModule') {
      return {
        addListener: function() { return { remove: function() {} }; },
        removeListeners: function() {},
        invoke: function() { return Promise.resolve(); },
        call: function() { return Promise.resolve(); },
        emit: function() {},
        getConstants: function() { return {}; },
        getConfig: function() { return {}; }
      };
    }
    
    // Si on accède à modules, retourner un objet vide
    if (prop === 'modules') {
      return {};
    }
    
    // Pour toutes les autres propriétés, retourner des fonctions vides
    if (typeof prop === 'string') {
      return function() { return Promise.resolve(); };
    }
    
    return undefined;
  },
  
  set(target, prop, value) {
    console.log(`[ExpoPolyfill] Définition de globalThis.expo.${prop}`);
    target[prop] = value;
    return true;
  }
});

// Remplacer globalThis.expo par notre proxy
globalThis.expo = expoProxy;

// Polyfill pour les modules natifs manquants
if (typeof globalThis.NativeModules === 'undefined') {
  globalThis.NativeModules = {};
}

// Ajouter les modules natifs Expo manquants
globalThis.NativeModules.EXNativeModulesProxy = {
  callMethod: function() { return Promise.resolve(); },
  addListener: function() { return { remove: function() {} }; },
  removeListeners: function() {}
};

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

globalThis.NativeModules.ExpoAsset = {
  downloadAsync: function() { return Promise.resolve(); },
  loadAsync: function() { return Promise.resolve(); },
  fromModule: function() { return Promise.resolve(); },
  fromURI: function() { return Promise.resolve(); },
  fromBundle: function() { return Promise.resolve(); }
};

// Polyfill pour React Native NativeModules
if (typeof globalThis.require === 'function') {
  const originalRequire = globalThis.require;
  globalThis.require = function(id) {
    if (id === 'react-native/Libraries/BatchedBridge/NativeModules') {
      return globalThis.NativeModules;
    }
    return originalRequire(id);
  };
}

console.log('[ExpoPolyfill] Proxy Expo + modules natifs initialisés');
