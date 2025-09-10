const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

// Configuration Firebase - SCAN
const firebaseConfig = {
  apiKey: "AIzaSyBCcN9z5oixLmS_abShJFTkjn3LJGrBHlY",
  authDomain: "scan-70156.firebaseapp.com",
  projectId: "scan-70156",
  storageBucket: "scan-70156.firebasestorage.app",
  messagingSenderId: "566648702832",
  appId: "1:566648702832:web:1564201ed1a93b056531b5"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMissingSelasIds() {
  console.log('🔍 Vérification des données manquantes de selasId...\n');

  try {
    // 1. Vérifier les véhicules
    console.log('📊 VÉHICULES:');
    const vehiculesCollection = collection(db, 'vehicules');
    const vehiculesSnapshot = await getDocs(vehiculesCollection);
    
    let vehiculesWithoutSelas = [];
    let vehiculesWithSelas = [];
    
    vehiculesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.selasId) {
        vehiculesWithoutSelas.push({ id: doc.id, ...data });
      } else {
        vehiculesWithSelas.push({ id: doc.id, selasId: data.selasId, ...data });
      }
    });
    
    console.log(`✅ Véhicules avec selasId: ${vehiculesWithSelas.length}`);
    console.log(`❌ Véhicules SANS selasId: ${vehiculesWithoutSelas.length}`);
    
    if (vehiculesWithoutSelas.length > 0) {
      console.log('\n🚨 Véhicules sans selasId:');
      vehiculesWithoutSelas.forEach(v => {
        console.log(`  - ${v.registrationNumber || v.immatriculation || 'N/A'} (ID: ${v.id})`);
      });
    }

    // 2. Vérifier les pôles
    console.log('\n📊 PÔLES:');
    const polesCollection = collection(db, 'poles');
    const polesSnapshot = await getDocs(polesCollection);
    
    let polesWithoutSelas = [];
    let polesWithSelas = [];
    
    polesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.selasId) {
        polesWithoutSelas.push({ id: doc.id, ...data });
      } else {
        polesWithSelas.push({ id: doc.id, selasId: data.selasId, ...data });
      }
    });
    
    console.log(`✅ Pôles avec selasId: ${polesWithSelas.length}`);
    console.log(`❌ Pôles SANS selasId: ${polesWithoutSelas.length}`);
    
    if (polesWithoutSelas.length > 0) {
      console.log('\n🚨 Pôles sans selasId:');
      polesWithoutSelas.forEach(p => {
        console.log(`  - ${p.nom || 'N/A'} (ID: ${p.id})`);
      });
    }

    // 3. Vérifier les tournées
    console.log('\n📊 TOURNÉES:');
    const tourneesCollection = collection(db, 'tournees');
    const tourneesSnapshot = await getDocs(tourneesCollection);
    
    let tourneesWithoutSelas = [];
    let tourneesWithSelas = [];
    
    tourneesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.selasId) {
        tourneesWithoutSelas.push({ id: doc.id, ...data });
      } else {
        tourneesWithSelas.push({ id: doc.id, selasId: data.selasId, ...data });
      }
    });
    
    console.log(`✅ Tournées avec selasId: ${tourneesWithSelas.length}`);
    console.log(`❌ Tournées SANS selasId: ${tourneesWithoutSelas.length}`);
    
    if (tourneesWithoutSelas.length > 0) {
      console.log('\n🚨 Tournées sans selasId:');
      tourneesWithoutSelas.forEach(t => {
        console.log(`  - ${t.nom || 'N/A'} (ID: ${t.id})`);
      });
    }

    // 4. Vérifier les sites
    console.log('\n📊 SITES:');
    const sitesCollection = collection(db, 'sites');
    const sitesSnapshot = await getDocs(sitesCollection);
    
    let sitesWithoutSelas = [];
    let sitesWithSelas = [];
    
    sitesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.selasId) {
        sitesWithoutSelas.push({ id: doc.id, ...data });
      } else {
        sitesWithSelas.push({ id: doc.id, selasId: data.selasId, ...data });
      }
    });
    
    console.log(`✅ Sites avec selasId: ${sitesWithSelas.length}`);
    console.log(`❌ Sites SANS selasId: ${sitesWithoutSelas.length}`);
    
    if (sitesWithoutSelas.length > 0) {
      console.log('\n🚨 Sites sans selasId:');
      sitesWithoutSelas.forEach(s => {
        console.log(`  - ${s.nom || 'N/A'} (ID: ${s.id})`);
      });
    }

    // 5. Récupérer la liste des SELAS disponibles
    console.log('\n📊 SELAS DISPONIBLES:');
    const selasCollection = collection(db, 'selas');
    const selasSnapshot = await getDocs(selasCollection);
    
    const selasList = [];
    selasSnapshot.forEach(doc => {
      selasList.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📋 SELAS trouvées: ${selasList.length}`);
    selasList.forEach(selas => {
      console.log(`  - ${selas.nom} (ID: ${selas.id})`);
    });

    // 6. Résumé
    console.log('\n📋 RÉSUMÉ:');
    console.log(`Total véhicules: ${vehiculesSnapshot.size}`);
    console.log(`Total pôles: ${polesSnapshot.size}`);
    console.log(`Total tournées: ${tourneesSnapshot.size}`);
    console.log(`Total sites: ${sitesSnapshot.size}`);
    console.log(`Total SELAS: ${selasSnapshot.size}`);
    
    const totalWithoutSelas = vehiculesWithoutSelas.length + polesWithoutSelas.length + 
                             tourneesWithoutSelas.length + sitesWithoutSelas.length;
    
    if (totalWithoutSelas > 0) {
      console.log(`\n🚨 ATTENTION: ${totalWithoutSelas} éléments n'ont pas de selasId !`);
      console.log('Ces éléments ne seront pas visibles dans l\'application mobile.');
    } else {
      console.log('\n✅ Toutes les données ont un selasId défini !');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter la vérification
checkMissingSelasIds().then(() => {
  console.log('\n✅ Vérification terminée');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
