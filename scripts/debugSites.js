// Script de debug pour diagnostiquer le problème des sites
// À exécuter dans la console de l'app mobile

console.log('🔍 [DEBUG SITES] Démarrage du diagnostic...');

// 1. Vérifier la collection poles
console.log('📋 [DEBUG SITES] Vérification de la collection poles...');
try {
  const polesSnapshot = await firebase.firestore().collection('poles').get();
  console.log(`📊 [DEBUG SITES] Nombre de pôles: ${polesSnapshot.size}`);
  
  polesSnapshot.forEach(doc => {
    const poleData = doc.data();
    console.log(`📍 [DEBUG SITES] Pôle: ${poleData.nom} (ID: ${doc.id})`);
  });
} catch (error) {
  console.error('❌ [DEBUG SITES] Erreur lors de la récupération des pôles:', error);
}

// 2. Vérifier la collection sites
console.log('🏢 [DEBUG SITES] Vérification de la collection sites...');
try {
  const sitesSnapshot = await firebase.firestore().collection('sites').get();
  console.log(`📊 [DEBUG SITES] Nombre de sites: ${sitesSnapshot.size}`);
  
  if (!sitesSnapshot.empty) {
    console.log('🔍 [DEBUG SITES] Structure des premiers sites:');
    sitesSnapshot.docs.slice(0, 3).forEach((doc, index) => {
      const siteData = doc.data();
      console.log(`🏢 [DEBUG SITES] Site ${index + 1}:`, {
        id: doc.id,
        nom: siteData.nom,
        poleId: siteData.poleId,
        pole: siteData.pole,
        adresse: siteData.adresse,
        ville: siteData.ville
      });
    });
  }
} catch (error) {
  console.error('❌ [DEBUG SITES] Erreur lors de la récupération des sites:', error);
}

// 3. Tester la fonction getSitesByPole avec un pôle spécifique
console.log('🧪 [DEBUG SITES] Test de getSitesByPole...');
try {
  // Prendre le premier pôle disponible
  const firstPoleSnapshot = await firebase.firestore().collection('poles').limit(1).get();
  if (!firstPoleSnapshot.empty) {
    const firstPole = firstPoleSnapshot.docs[0];
    const poleId = firstPole.id;
    const poleData = firstPole.data();
    
    console.log(`🧪 [DEBUG SITES] Test avec le pôle: ${poleData.nom} (ID: ${poleId})`);
    
    // Appeler la fonction getSitesByPole
    const sites = await FirebaseService.getSitesByPole(poleId);
    console.log(`🧪 [DEBUG SITES] Résultat de getSitesByPole:`, sites);
  }
} catch (error) {
  console.error('❌ [DEBUG SITES] Erreur lors du test de getSitesByPole:', error);
}

console.log('🔍 [DEBUG SITES] Diagnostic terminé.');
