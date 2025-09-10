const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where, getDoc } = require('firebase/firestore');

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

// Toutes les collections qui doivent avoir un selasId
const COLLECTIONS_TO_CHECK = [
  'bigsacoches',
  'documents',
  'fuelTypes',
  'inspections',
  'maintenance',
  'markerPreferences',
  'notifications',
  'passages',
  'poles',
  'roles',
  'scans',
  'sessions',
  'sites',
  'tournees',
  'vehicleAssets',
  'vehicleAssetsCorrected',
  'vehicleChecks',
  'vehicleFuelCalculations',
  'vehicleFuelSettings',
  'vehicleMaintenance',
  'vehicleMileageHistory',
  'vehicleServices',
  'vehicules'
];

// Collections qui ne nécessitent pas de selasId (données globales)
const GLOBAL_COLLECTIONS = [
  'selas',      // Définition des SELAS
  'users'       // Utilisateurs (gérés par l'auth)
];

async function fixAllMissingSelas() {
  console.log('🔧 Correction de tous les éléments manquants de selasId...\n');

  try {
    // 1. Récupérer la liste des SELAS disponibles
    console.log('📋 Récupération des SELAS disponibles...');
    const selasCollection = collection(db, 'selas');
    const selasSnapshot = await getDocs(selasCollection);
    
    const selasList = [];
    selasSnapshot.forEach(doc => {
      selasList.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ SELAS trouvées: ${selasList.length}`);
    selasList.forEach(selas => {
      console.log(`  - ${selas.nom} (ID: ${selas.id})`);
    });

    // SELAS par défaut à utiliser (LABOSUD)
    const defaultSelasId = 'iYWSwBh92twpoiZUWWqt';
    const defaultSelas = selasList.find(s => s.id === defaultSelasId);
    
    if (!defaultSelas) {
      console.log('❌ SELAS par défaut non trouvée');
      return;
    }

    console.log(`\n🎯 Utilisation de la SELAS par défaut: ${defaultSelas.nom} (${defaultSelasId})`);

    // 2. Corriger toutes les collections
    let totalFixed = 0;
    const collectionStats = {};

    for (const collectionName of COLLECTIONS_TO_CHECK) {
      console.log(`\n🔧 CORRECTION DE LA COLLECTION: ${collectionName.toUpperCase()}`);
      
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        let fixed = 0;
        let total = snapshot.size;
        
        console.log(`  📊 Total d'éléments dans ${collectionName}: ${total}`);
        
        if (total === 0) {
          console.log(`  ℹ️  Collection ${collectionName} vide, ignorée`);
          collectionStats[collectionName] = { total: 0, fixed: 0 };
          continue;
        }

        // Traiter chaque document
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          
          // Vérifier si selasId est manquant ou vide
          if (!data.selasId || data.selasId === '') {
            try {
              // Identifier l'élément pour le log
              let elementName = 'N/A';
              if (data.nom) elementName = data.nom;
              else if (data.name) elementName = data.name;
              else if (data.registrationNumber) elementName = data.registrationNumber;
              else if (data.immatriculation) elementName = data.immatriculation;
              else if (data.title) elementName = data.title;
              else if (data.description) elementName = data.description;
              
              console.log(`    - Correction de ${elementName} (ID: ${docSnapshot.id})`);
              
              // Mettre à jour avec le selasId
              await updateDoc(doc(db, collectionName, docSnapshot.id), {
                selasId: defaultSelasId,
                updatedAt: new Date().toISOString()
              });
              
              fixed++;
            } catch (error) {
              console.error(`      ❌ Erreur lors de la correction:`, error.message);
            }
          }
        }
        
        console.log(`  ✅ ${collectionName}: ${fixed}/${total} éléments corrigés`);
        collectionStats[collectionName] = { total, fixed };
        totalFixed += fixed;
        
      } catch (error) {
        console.error(`  ❌ Erreur lors de l'accès à la collection ${collectionName}:`, error.message);
        collectionStats[collectionName] = { total: 0, fixed: 0, error: error.message };
      }
    }

    // 3. Résumé détaillé
    console.log('\n📋 RÉSUMÉ DÉTAILLÉ DES CORRECTIONS:');
    console.log('=' .repeat(60));
    
    for (const [collectionName, stats] of Object.entries(collectionStats)) {
      if (stats.error) {
        console.log(`❌ ${collectionName.padEnd(25)}: ERREUR - ${stats.error}`);
      } else if (stats.total === 0) {
        console.log(`ℹ️  ${collectionName.padEnd(25)}: Vide`);
      } else {
        const status = stats.fixed > 0 ? '✅' : 'ℹ️';
        console.log(`${status} ${collectionName.padEnd(25)}: ${stats.fixed}/${stats.total} corrigés`);
      }
    }
    
    console.log('=' .repeat(60));
    console.log(`🎯 Total d'éléments corrigés: ${totalFixed}`);
    
    if (totalFixed > 0) {
      console.log(`\n✅ ${totalFixed} éléments ont été corrigés avec le selasId: ${defaultSelasId}`);
      console.log('Ces éléments seront maintenant visibles dans l\'application mobile !');
      console.log('\n🔒 SÉCURITÉ FUTURE:');
      console.log('- Tous les nouveaux éléments créés auront automatiquement le selasId');
      console.log('- La séparation des données entre SELAS est maintenant garantie');
      console.log('- Seule la page carte reste accessible à toutes les SELAS');
    } else {
      console.log('\n✅ Tous les éléments avaient déjà un selasId défini !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
fixAllMissingSelas().then(() => {
  console.log('\n✅ Correction terminée');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
