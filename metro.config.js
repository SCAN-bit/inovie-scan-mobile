// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Forcer l'utilisation du moteur par défaut au lieu de Hermes pour éviter _interopRequireDefault
config.transformer = {
  ...config.transformer,
  unstable_transformProfile: 'default',
};

module.exports = config;
