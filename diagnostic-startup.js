// Diagnostic complet au démarrage de l'application
// Ce fichier sera chargé en premier pour identifier TOUS les problèmes

console.log('=== DIAGNOSTIC COMPLET DÉMARRAGE ===');

// 1. Vérifier l'environnement global
console.log('1. Environnement global:');
console.log('- globalThis:', typeof globalThis);
console.log('- window:', typeof window);
console.log('- global:', typeof global);
console.log('- Platform:', typeof Platform);

// 2. Vérifier les modules Expo
console.log('2. Modules Expo:');
console.log('- globalThis.expo:', globalThis.expo);
console.log('- globalThis.NativeModules:', globalThis.NativeModules);

// 3. Vérifier React Native
console.log('3. React Native:');
console.log('- ReactNative:', typeof ReactNative);
console.log('- AppRegistry:', typeof AppRegistry);

// 4. Intercepter TOUTES les erreurs sans crasher
const originalErrorHandler = globalThis.Error;
globalThis.Error = function(message) {
  console.log('[DIAGNOSTIC ERROR]:', message);
  console.trace('[DIAGNOSTIC ERROR STACK]');
  return originalErrorHandler.call(this, message);
};

// 5. Intercepter les console.error
const originalConsoleError = console.error;
console.error = function(...args) {
  console.log('[DIAGNOSTIC CONSOLE ERROR]:', ...args);
  originalConsoleError.apply(console, args);
};

// 6. Intercepter les exceptions non gérées
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.log('[DIAGNOSTIC WINDOW ERROR]:', message, source, lineno, colno, error);
    return true; // Empêcher le crash
  };
}

// 7. Intercepter les promesses rejetées
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', function(event) {
    console.log('[DIAGNOSTIC UNHANDLED REJECTION]:', event.reason);
    event.preventDefault(); // Empêcher le crash
  });
}

// 8. Tester l'accès aux modules critiques
console.log('4. Test accès modules critiques:');
try {
  const ReactNative = require('react-native');
  console.log('- React Native chargé:', !!ReactNative);
  console.log('- AppRegistry disponible:', !!ReactNative.AppRegistry);
} catch (error) {
  console.log('- Erreur chargement React Native:', error.message);
}

try {
  const Expo = require('expo');
  console.log('- Expo chargé:', !!Expo);
} catch (error) {
  console.log('- Erreur chargement Expo:', error.message);
}

// 9. Activer le mode debug complet
globalThis.__DEV__ = true;
globalThis.__EXPO_DEBUG__ = true;

console.log('=== DIAGNOSTIC COMPLET TERMINÉ ===');
