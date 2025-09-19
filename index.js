// Charger les polyfills Expo en premier
import './expo-polyfill';
import './expo-modules-core-polyfill';

import { registerRootComponent } from 'expo';
import App from './App';

// Enregistrement direct de l'application
console.log('[Index] Enregistrement de l\'application...');
registerRootComponent(App);
console.log('[Index] Application enregistrée avec succès');
