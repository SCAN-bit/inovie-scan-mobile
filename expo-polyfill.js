// Polyfill Expo ultra-agressif pour éviter l'erreur globalThis.expo.NativeModule
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
        // Ajouter d'autres méthodes communes si nécessaire
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

console.log('[ExpoPolyfill] Proxy Expo initialisé avec interception complète');
