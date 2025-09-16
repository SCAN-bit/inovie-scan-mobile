// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuration pour résoudre les problèmes de bundle web
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Désactiver complètement Hermes pour éviter les conflits web
config.transformer = {
  ...config.transformer,
  unstable_transformProfile: 'default',
  unstable_disableES6Transforms: false,
};

// Forcer l'utilisation du moteur par défaut au lieu de Hermes
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => (path) => {
    return path.replace(__dirname, '').replace(/\\/g, '/');
  },
};

module.exports = config;
