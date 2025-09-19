// Polyfill expo-asset pour remplacer la dépendance npm
// Ce fichier remplace le module expo-asset manquant

const Asset = {
  downloadAsync: () => Promise.resolve(),
  loadAsync: () => Promise.resolve(),
  fromModule: () => Promise.resolve(),
  fromURI: () => Promise.resolve(),
  fromBundle: () => Promise.resolve()
};

export { Asset };
export default Asset;
