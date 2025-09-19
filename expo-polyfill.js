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

console.log('[ExpoPolyfill] Expo polyfill initialisé:', globalThis.expo);
