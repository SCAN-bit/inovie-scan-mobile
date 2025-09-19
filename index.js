import { registerRootComponent } from 'expo';

import App from './App';

// Initialisation d'Expo pour éviter l'erreur globalThis.expo.NativeModule
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {
    NativeModule: {},
    modules: {}
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
