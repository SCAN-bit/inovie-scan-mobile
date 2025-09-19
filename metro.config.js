// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuration resolver avec alias pour expo-asset
config.resolver = {
  ...config.resolver,
  platforms: ['native', 'android', 'ios', 'web'],
  alias: {
    'expo-asset': path.resolve(__dirname, 'expo-asset-polyfill.js'),
    'expo-modules-core/build/web': path.resolve(__dirname, 'node_modules/expo-modules-core/build/web/index.js')
  }
};

module.exports = config;
