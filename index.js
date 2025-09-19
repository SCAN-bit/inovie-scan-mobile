// FORCER le chargement du polyfill AVANT tout le reste
import './expo-polyfill';

// Attendre que le polyfill soit complètement chargé
setTimeout(() => {
  import('./App').then(({ default: App }) => {
    const { registerRootComponent } = require('expo');
    registerRootComponent(App);
  });
}, 0);
