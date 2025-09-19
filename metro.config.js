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
    'expo-asset': path.resolve(__dirname, 'expo-asset-polyfill.js')
  }
};

module.exports = config;
