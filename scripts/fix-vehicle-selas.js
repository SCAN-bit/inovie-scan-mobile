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

async function fixVehicleSelas() {
  console.log('🔧 Correction du selasId du véhicule TT-000-TT...\n');

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

    // 2. Trouver le véhicule TT-000-TT
    console.log('\n🔍 Recherche du véhicule TT-000-TT...');
    const vehiculesCollection = collection(db, 'vehicules');
    const q = query(vehiculesCollection, where('registrationNumber', '==', 'TT-000-TT'));
    const vehiculeSnapshot = await getDocs(q);
    
    if (vehiculeSnapshot.empty) {
      console.log('❌ Véhicule TT-000-TT non trouvé');
      return;
    }
    
    const vehiculeDoc = vehiculeSnapshot.docs[0];
    const vehiculeData = vehiculeDoc.data();
    
    console.log('✅ Véhicule trouvé:');
    console.log(`  - ID: ${vehiculeDoc.id}`);
    console.log(`  - Immatriculation: ${vehiculeData.registrationNumber}`);
    console.log(`  - Marque/Modèle: ${vehiculeData.brand} ${vehiculeData.model}`);
    console.log(`  - Pôle ID: ${vehiculeData.poleId}`);
    console.log(`  - SELAS ID actuel: "${vehiculeData.selasId}"`);
    
    // 3. Déterminer la SELAS à assigner
    let selasIdToAssign = '';
    
    // Option 1: Utiliser la SELAS de l'utilisateur connecté (iYWSwBh92twpoiZUWWqt)
    const userSelasId = 'iYWSwBh92twpoiZUWWqt';
    const userSelas = selasList.find(s => s.id === userSelasId);
    
    if (userSelas) {
      selasIdToAssign = userSelasId;
      console.log(`\n🎯 Assignation de la SELAS de l'utilisateur: ${userSelas.nom} (${userSelasId})`);
    } else {
      // Option 2: Utiliser la première SELAS disponible
      selasIdToAssign = selasList[0]?.id;
      if (selasIdToAssign) {
        const firstSelas = selasList[0];
        console.log(`\n🎯 Assignation de la première SELAS disponible: ${firstSelas.nom} (${selasIdToAssign})`);
      }
    }
    
    if (!selasIdToAssign) {
      console.log('❌ Aucune SELAS disponible pour l\'assignation');
      return;
    }
    
    // 4. Mettre à jour le véhicule
    console.log('\n🔄 Mise à jour du véhicule...');
    await updateDoc(doc(db, 'vehicules', vehiculeDoc.id), {
      selasId: selasIdToAssign,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Véhicule mis à jour avec succès !');
    console.log(`  - Nouveau selasId: ${selasIdToAssign}`);
    
    // 5. Vérifier la mise à jour
    console.log('\n🔍 Vérification de la mise à jour...');
    const updatedVehiculeDoc = await getDoc(doc(db, 'vehicules', vehiculeDoc.id));
    const updatedVehiculeData = updatedVehiculeDoc.data();
    
    console.log(`  - selasId après mise à jour: "${updatedVehiculeData.selasId}"`);
    
    if (updatedVehiculeData.selasId === selasIdToAssign) {
      console.log('✅ Mise à jour confirmée ! Le véhicule TT-000-TT sera maintenant visible dans l\'application mobile.');
    } else {
      console.log('❌ Problème lors de la mise à jour');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
fixVehicleSelas().then(() => {
  console.log('\n✅ Correction terminée');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
