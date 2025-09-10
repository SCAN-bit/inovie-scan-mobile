// Script pour ajouter automatiquement le selasId lors de la création de nouveaux éléments
// Ce script doit être exécuté dans l'application mobile

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp } = require('firebase/firestore');

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

// Fonction utilitaire pour enrichir les données avec selasId
function enrichWithSelasId(data, selasId) {
  return {
    ...data,
    selasId: selasId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

// Exemple d'utilisation dans l'application mobile :
// 
// 1. Pour créer un nouveau véhicule :
// const newVehicle = {
//   brand: 'Renault',
//   model: 'Kangoo',
//   registrationNumber: 'AB-123-CD',
//   type: 'Voiture',
//   status: 'En service'
// };
// 
// const enrichedVehicle = enrichWithSelasId(newVehicle, userSelasId);
// const docRef = await addDoc(collection(db, 'vehicules'), enrichedVehicle);
//
// 2. Pour créer un nouveau pôle :
// const newPole = {
//   nom: 'Nouveau Pôle',
//   description: 'Description du pôle'
// };
// 
// const enrichedPole = enrichWithSelasId(newPole, userSelasId);
// const docRef = await addDoc(collection(db, 'poles'), enrichedPole);
//
// 3. Pour créer une nouvelle tournée :
// const newTournee = {
//   nom: 'Nouvelle Tournée',
//   date: '2025-01-27'
// };
// 
// const enrichedTournee = enrichWithSelasId(newTournee, userSelasId);
// const docRef = await addDoc(collection(db, 'tournees'), enrichedTournee);
//
// 4. Pour créer un nouveau site :
// const newSite = {
//   nom: 'Nouveau Site',
//   adresse: '123 Rue Example'
// };
// 
// const enrichedSite = enrichWithSelasId(newSite, userSelasId);
// const docRef = await addDoc(collection(db, 'sites'), enrichedSite);

// Fonction pour mettre à jour un élément existant avec selasId
async function updateElementWithSelasId(collectionName, docId, selasId) {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      selasId: selasId,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ ${collectionName} ${docId} mis à jour avec selasId: ${selasId}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${collectionName} ${docId}:`, error);
  }
}

// Fonction pour créer un nouvel élément avec selasId
async function createElementWithSelasId(collectionName, data, selasId) {
  try {
    const enrichedData = enrichWithSelasId(data, selasId);
    const docRef = await addDoc(collection(db, collectionName), enrichedData);
    console.log(`✅ Nouveau ${collectionName} créé avec ID: ${docRef.id} et selasId: ${selasId}`);
    return docRef;
  } catch (error) {
    console.error(`❌ Erreur lors de la création du ${collectionName}:`, error);
    throw error;
  }
}

// Export des fonctions pour utilisation dans l'application
module.exports = {
  enrichWithSelasId,
  updateElementWithSelasId,
  createElementWithSelasId
};

console.log('📋 Script de gestion des selasId chargé !');
console.log('Utilisez les fonctions exportées pour créer/mettre à jour des éléments avec selasId automatique.');
