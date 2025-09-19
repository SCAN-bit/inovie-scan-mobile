// Polyfill Expo simple et sûr
// Ce fichier doit être chargé en premier avant tout autre module

// Initialisation de base
if (typeof globalThis === 'undefined') {
  globalThis = global || window || this;
}

// Initialisation d'Expo
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {};
}

// Polyfill pour NativeModule
if (typeof globalThis.expo.NativeModule === 'undefined') {
  globalThis.expo.NativeModule = {
    addListener: function() { return { remove: function() {} }; },
    removeListeners: function() {},
    invoke: function() { return Promise.resolve(); },
    call: function() { return Promise.resolve(); },
    emit: function() {}
  };
}

// Polyfill pour les modules natifs React Native
if (typeof globalThis.NativeModules === 'undefined') {
  globalThis.NativeModules = {};
}

// Polyfill ExpoAsset
globalThis.NativeModules.ExpoAsset = {
  downloadAsync: () => Promise.resolve(),
  loadAsync: () => Promise.resolve(),
  fromModule: () => Promise.resolve(),
  fromURI: () => Promise.resolve(),
  fromBundle: () => Promise.resolve()
};

// Polyfill ExponentConstants
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

// Polyfill EXNativeModulesProxy
globalThis.NativeModules.EXNativeModulesProxy = {
  callMethod: () => Promise.resolve(),
  addListener: () => ({ remove: () => {} }),
  removeListeners: () => {}
};

// Polyfill pour les constantes Expo
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

console.log('[ExpoPolyfill] Polyfill Expo initialisé avec succès');