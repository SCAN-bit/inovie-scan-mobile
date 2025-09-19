// Polyfill expo-modules-core global
// Force la création de registerWebModule avant tout autre chargement

// Créer l'objet expo-modules-core globalement
if (typeof globalThis['expo-modules-core'] === 'undefined') {
  globalThis['expo-modules-core'] = {};
}

// Fonctions principales d'expo-modules-core
const registerWebModule = (module) => {
  console.log('[expo-modules-core-polyfill] registerWebModule appelé avec:', module);
  return module;
};

const createWebModule = (config) => {
  console.log('[expo-modules-core-polyfill] createWebModule appelé avec:', config);
  return config;
};

const defineModule = (config) => {
  console.log('[expo-modules-core-polyfill] defineModule appelé avec:', config);
  return config;
};

// Assigner à l'objet global
globalThis['expo-modules-core'] = {
  registerWebModule,
  createWebModule,
  defineModule,
  default: {
    registerWebModule,
    createWebModule,
    defineModule
  }
};

// Intercepter les require pour expo-modules-core
if (typeof globalThis.require === 'function') {
  const originalRequire = globalThis.require;
  globalThis.require = function(id) {
    if (id.includes('expo-modules-core')) {
      console.log('[expo-modules-core-polyfill] Interception require:', id);
      return globalThis['expo-modules-core'];
    }
    return originalRequire(id);
  };
}

console.log('[expo-modules-core-polyfill] Polyfill global initialisé');

// Export pour module.exports
module.exports = {
  registerWebModule,
  createWebModule,
  defineModule
};
