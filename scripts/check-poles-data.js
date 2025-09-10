const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Configuration Firebase - SCAN
const firebaseConfig = {
  apiKey: "AIzaSyBCcN9z5oixLmS_abShJFTkjn3LJGrBHlY",
  authDomain: "scan-70156.firebaseapp.com",
  projectId: "scan-70156",
  storageBucket: "scan-70156.firebasestorage.app",
  messagingSenderId: "566648702832",
  appId: "1:566648702832:android:1a71f64c5b0399e76531b5"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPolesData() {
  try {
    console.log('🔍 Vérification des données des pôles...\n');
    
    const polesCollection = collection(db, 'poles');
    const querySnapshot = await getDocs(polesCollection);
    
    console.log(`📊 Total des pôles trouvés: ${querySnapshot.size}\n`);
    
    if (querySnapshot.empty) {
      console.log('❌ Aucun pôle trouvé dans la collection');
      return;
    }
    
    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`📍 Pôle ${index + 1} (ID: ${doc.id}):`);
      console.log(`   - Nom: "${data.nom || data.name || 'N/A'}"`);
      console.log(`   - SELAS ID: ${data.selasId || 'N/A'}`);
      console.log(`   - Tous les champs:`, Object.keys(data));
      console.log(`   - Données complètes:`, JSON.stringify(data, null, 2));
      console.log('');
    });
    
    // Vérifier spécifiquement les pôles avec "EST" ou "HNE"
    console.log('🔍 Recherche spécifique des pôles EST/HNE...\n');
    
    const estPoles = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      const nom = (data.nom || data.name || '').toUpperCase();
      return nom.includes('EST') || nom.includes('HNE');
    });
    
    if (estPoles.length > 0) {
      console.log(`🎯 Pôles contenant EST ou HNE: ${estPoles.length}`);
      estPoles.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}, Nom: "${data.nom || data.name}"`);
      });
    } else {
      console.log('❌ Aucun pôle contenant EST ou HNE trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des pôles:', error);
  }
}

// Exécuter la vérification
checkPolesData().then(() => {
  console.log('✅ Vérification terminée');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
