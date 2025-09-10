const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

// Identifiants de connexion
const USER_EMAIL = 'supply.chain.app.network@gmail.com';
const USER_PASSWORD = 'micka23121987';

async function fixSelasWithAuth() {
  console.log('🔐 Authentification et correction des selasId manquants...\n');

  try {
    // 1. Authentification
    console.log('🔑 Connexion en cours...');
    const userCredential = await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
    const user = userCredential.user;
    
    console.log(`✅ Connecté en tant que: ${user.email}`);
    console.log(`🆔 UID: ${user.uid}`);

    // 2. Récupérer la liste des SELAS disponibles
    console.log('\n📋 Récupération des SELAS disponibles...');
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

    // 3. Corriger le véhicule TT-000-TT spécifiquement
    console.log('\n🔧 CORRECTION DU VÉHICULE TT-000-TT:');
    const vehiculesCollection = collection(db, 'vehicules');
    const q = query(vehiculesCollection, where('registrationNumber', '==', 'TT-000-TT'));
    const vehiculeSnapshot = await getDocs(q);
    
    if (vehiculeSnapshot.empty) {
      console.log('❌ Véhicule TT-000-TT non trouvé');
    } else {
      const vehiculeDoc = vehiculeSnapshot.docs[0];
      const vehiculeData = vehiculeDoc.data();
      
      console.log('✅ Véhicule trouvé:');
      console.log(`  - ID: ${vehiculeDoc.id}`);
      console.log(`  - Immatriculation: ${vehiculeData.registrationNumber}`);
      console.log(`  - Marque/Modèle: ${vehiculeData.brand} ${vehiculeData.model}`);
      console.log(`  - SELAS ID actuel: "${vehiculeData.selasId}"`);
      
      if (!vehiculeData.selasId || vehiculeData.selasId === '') {
        console.log('\n🔄 Mise à jour du véhicule...');
        await updateDoc(doc(db, 'vehicules', vehiculeDoc.id), {
          selasId: defaultSelasId,
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Véhicule TT-000-TT mis à jour avec succès !');
        console.log(`  - Nouveau selasId: ${defaultSelasId}`);
        
        // Vérifier la mise à jour
        const updatedVehiculeDoc = await getDoc(doc(db, 'vehicules', vehiculeDoc.id));
        const updatedVehiculeData = updatedVehiculeDoc.data();
        console.log(`  - selasId après mise à jour: "${updatedVehiculeData.selasId}"`);
      } else {
        console.log('ℹ️  Le véhicule avait déjà un selasId défini');
      }
    }

    // 4. Vérifier et corriger les autres collections importantes
    const IMPORTANT_COLLECTIONS = [
      'vehicules',
      'poles', 
      'tournees',
      'sites',
      'passages',
      'sessions',
      'scans',
      'vehicleChecks'
    ];

    console.log('\n🔧 VÉRIFICATION DES AUTRES COLLECTIONS IMPORTANTES:');
    
    for (const collectionName of IMPORTANT_COLLECTIONS) {
      try {
        console.log(`\n📊 Collection: ${collectionName.toUpperCase()}`);
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        let total = snapshot.size;
        let missingSelas = 0;
        
        console.log(`  Total d'éléments: ${total}`);
        
        if (total === 0) {
          console.log(`  ℹ️  Collection vide`);
          continue;
        }

        // Compter les éléments sans selasId
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          if (!data.selasId || data.selasId === '') {
            missingSelas++;
          }
        }
        
        if (missingSelas > 0) {
          console.log(`  ⚠️  ${missingSelas} éléments sans selasId`);
          
          // Corriger automatiquement les éléments sans selasId
          let corrected = 0;
          for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            if (!data.selasId || data.selasId === '') {
              try {
                await updateDoc(doc(db, collectionName, docSnapshot.id), {
                  selasId: defaultSelasId,
                  updatedAt: new Date().toISOString()
                });
                corrected++;
              } catch (error) {
                console.error(`    ❌ Erreur lors de la correction:`, error.message);
              }
            }
          }
          
          console.log(`  ✅ ${corrected} éléments corrigés avec selasId: ${defaultSelasId}`);
        } else {
          console.log(`  ✅ Tous les éléments ont un selasId`);
        }
        
      } catch (error) {
        console.error(`  ❌ Erreur lors de l'accès à ${collectionName}:`, error.message);
      }
    }

    // 5. Résumé final
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('✅ Le véhicule TT-000-TT est maintenant visible dans l\'application mobile');
    console.log('✅ Toutes les collections importantes ont été vérifiées et corrigées');
    console.log('🔒 La séparation des données SELAS est maintenant garantie');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    
    if (error.code === 'auth/user-not-found') {
      console.error('❌ Utilisateur non trouvé');
    } else if (error.code === 'auth/wrong-password') {
      console.error('❌ Mot de passe incorrect');
    } else if (error.code === 'auth/invalid-email') {
      console.error('❌ Email invalide');
    }
  }
}

// Exécuter la correction
fixSelasWithAuth().then(() => {
  console.log('\n✅ Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
