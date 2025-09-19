// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuration transformer (sans forcer le profil par défaut qui casse le web)
// config.transformer reste par défaut pour éviter les conflits web

// Configuration pour inclure le polyfill Expo en premier
config.resolver = {
  ...config.resolver,
  platforms: ['native', 'android', 'ios', 'web'],
  // Exclure complètement expo-asset du bundle
  blockList: [
    /.*\/node_modules\/expo-asset\/.*/
  ],
};

// Serializer simplifié pour éviter les conflits web
// Le polyfill est déjà chargé via index.js, pas besoin de forcer l'inclusion

module.exports = config;
