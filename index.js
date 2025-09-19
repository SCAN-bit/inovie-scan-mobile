// Initialisation d'expo-modules-core en premier
import 'expo/build/Expo.fx';
import { registerRootComponent } from 'expo';
import App from './App';

// Log pour debugging
console.log('=== SCAN App Starting ===');

// Enregistrement du composant principal
registerRootComponent(App);
