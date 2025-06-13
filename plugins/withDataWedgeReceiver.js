const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDataWedgeReceiver(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults;
    
    // Ajouter le receiver DataWedge avec l'attribut exported
    const application = androidManifest.manifest.application[0];
    
    // Créer le receiver pour DataWedge
    const dataWedgeReceiver = {
      $: {
        'android:name': 'com.darryncampbell.rndatawedgeintents.DWReceiver',
        'android:exported': 'true',
        'android:enabled': 'true'
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'com.symbol.datawedge.api.ACTION_RESULT' } },
            { $: { 'android:name': 'com.symbol.datawedge.api.NOTIFICATION_ACTION' } }
          ],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } }
          ]
        }
      ]
    };
    
    // Ajouter le receiver s'il n'existe pas déjà
    if (!application.receiver) {
      application.receiver = [];
    }
    
    const existingReceiver = application.receiver.find(receiver => 
      receiver.$['android:name'] === 'com.darryncampbell.rndatawedgeintents.DWReceiver'
    );
    
    if (!existingReceiver) {
      application.receiver.push(dataWedgeReceiver);
      console.log('✅ DataWedge receiver ajouté avec android:exported="true"');
    } else {
      // Mettre à jour le receiver existant
      existingReceiver.$['android:exported'] = 'true';
      console.log('✅ DataWedge receiver mis à jour avec android:exported="true"');
    }
    
    return config;
  });
}; 