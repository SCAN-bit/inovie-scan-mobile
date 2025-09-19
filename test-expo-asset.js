// Test simple pour vérifier que le module ExpoAsset fonctionne
import { NativeModules } from 'react-native';

const testExpoAsset = () => {
  console.log('[TEST] Début du test ExpoAsset...');
  
  if (NativeModules.ExpoAsset) {
    console.log('[TEST] ✅ Module ExpoAsset trouvé !');
    
    // Test des méthodes
    NativeModules.ExpoAsset.fromURI('test://uri')
      .then(result => {
        console.log('[TEST] ✅ fromURI fonctionne:', result);
      })
      .catch(error => {
        console.log('[TEST] ❌ fromURI erreur:', error);
      });
      
    NativeModules.ExpoAsset.fromBundle('test-bundle')
      .then(result => {
        console.log('[TEST] ✅ fromBundle fonctionne:', result);
      })
      .catch(error => {
        console.log('[TEST] ❌ fromBundle erreur:', error);
      });
      
  } else {
    console.log('[TEST] ❌ Module ExpoAsset non trouvé !');
  }
};

export default testExpoAsset;
