// Solution directe : initialisation expo-modules-core inline
console.log('🔧 Initialisation forcée expo-modules-core...');

// 1. Créer globalThis.expo si nécessaire
if (typeof globalThis.expo === 'undefined') {
  console.log('📦 Création globalThis.expo...');
  globalThis.expo = {
    NativeModule: {}
  };
}

// 2. Forcer l'initialisation des modules
try {
  require('expo-modules-core');
  console.log('✅ expo-modules-core importé');
} catch (error) {
  console.log('⚠️ Fallback expo-modules-core:', error.message);
}

// 3. Import Expo standard
import { registerRootComponent } from 'expo';
import App from './App';

// Log pour debugging
console.log('=== SCAN App Starting ===');

// Enregistrement du composant principal
registerRootComponent(App);
