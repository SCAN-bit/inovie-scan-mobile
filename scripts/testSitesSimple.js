// Script de test simple pour diagnostiquer le problème des sites
// À exécuter dans la console de l'app mobile

console.log('🔍 [TEST SITES] Démarrage du test simple...');

// Test 1: Vérifier la collection poles
console.log('📋 [TEST SITES] Test 1: Vérification des pôles...');
try {
  const polesSnapshot = await firebase.firestore().collection('poles').limit(3).get();
  console.log(`📊 [TEST SITES] Pôles trouvés: ${polesSnapshot.size}`);
  
  polesSnapshot.forEach((doc, index) => {
    const poleData = doc.data();
    console.log(`📍 [TEST SITES] Pôle ${index + 1}: ${poleData.nom} (ID: ${doc.id})`);
  });
} catch (error) {
  console.error('❌ [TEST SITES] Erreur pôles:', error);
}

// Test 2: Vérifier la collection sites
console.log('🏢 [TEST SITES] Test 2: Vérification des sites...');
try {
  const sitesSnapshot = await firebase.firestore().collection('sites').limit(5).get();
  console.log(`📊 [TEST SITES] Sites trouvés: ${sitesSnapshot.size}`);
  
  if (!sitesSnapshot.empty) {
    sitesSnapshot.forEach((doc, index) => {
      const siteData = doc.data();
      console.log(`🏢 [TEST SITES] Site ${index + 1}:`, {
        nom: siteData.nom,
        poleId: siteData.poleId,
        pole: siteData.pole,
        adresse: siteData.adresse
      });
    });
  }
} catch (error) {
  console.error('❌ [TEST SITES] Erreur sites:', error);
}

// Test 3: Vérifier la structure des collections
console.log('🔍 [TEST SITES] Test 3: Structure des collections...');
try {
  // Vérifier si la collection poles existe et a des documents
  const polesCount = await firebase.firestore().collection('poles').count().get();
  console.log(`📊 [TEST SITES] Nombre total de pôles: ${polesCount.data().count}`);
  
  // Vérifier si la collection sites existe et a des documents
  const sitesCount = await firebase.firestore().collection('sites').count().get();
  console.log(`📊 [TEST SITES] Nombre total de sites: ${sitesCount.data().count}`);
  
} catch (error) {
  console.error('❌ [TEST SITES] Erreur comptage:', error);
}

console.log('🔍 [TEST SITES] Test terminé.');
