// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Forcer l'utilisation du moteur par défaut au lieu de Hermes pour éviter _interopRequireDefault
config.transformer = {
  ...config.transformer,
  unstable_transformProfile: 'default',
};

// Configuration pour inclure le polyfill Expo en premier
config.resolver = {
  ...config.resolver,
  platforms: ['native', 'android', 'ios', 'web'],
};

// Forcer l'inclusion du polyfill au début du bundle
config.serializer = {
  ...config.serializer,
  processModuleFilter: (module) => {
    // Inclure toujours notre polyfill
    if (module.path.includes('expo-polyfill.js')) {
      return true;
    }
    return config.serializer.processModuleFilter ? config.serializer.processModuleFilter(module) : true;
  },
};

module.exports = config;
