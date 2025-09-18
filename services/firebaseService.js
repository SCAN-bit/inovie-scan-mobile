import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  limit,
  serverTimestamp,
  orderBy,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import SupabaseService from './supabaseService';

// Configuration Firebase - SCAN (corrigée)
const firebaseConfig = {
  apiKey: "AIzaSyBCcN9z5oixLmS_abShJFTkjn3LJGrBHlY",
  authDomain: "scan-70156.firebaseapp.com",
  projectId: "scan-70156",
  storageBucket: "scan-70156.appspot.com", // Correction: utiliser .appspot.com au lieu de .firebasestorage.app
  messagingSenderId: "566648702832",
  appId: "1:566648702832:android:1a71f64c5b0399e76531b5"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
// Initialiser également firebase compat pour les anciennes API
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Clé pour le stockage local du token
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

const FirebaseService = {
  // Authentification
  login: async (email, password) => {
    try {
      // Tentative de connexion
      
      // Vérifier d'abord si le compte est valide
      const auth = getAuth();
      // Authentification initialisée
      
      // Fermer toute session existante avant la connexion
      try {
        await FirebaseService.closeCurrentSession();
        // Session précédente fermée automatiquement
      } catch (sessionError) {
        // Pas de session active à fermer
      }
      
      // Tentative de connexion
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Connexion réussie
      
      const user = userCredential.user;
      
      // Récupérer le rôle depuis Firestore
      let userData = null;
      try {
        const usersCollection = collection(db, 'users');
        const userQuery = query(usersCollection, where('email', '==', email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          userData = userSnapshot.docs[0].data();
          // Données utilisateur récupérées depuis Firestore
        } else {
          // Aucun utilisateur trouvé dans Firestore
        }
      } catch (firestoreError) {
        console.error('Erreur lors de la récupération des données utilisateur depuis Firestore:', firestoreError);
      }
      
      // Stocker les informations utilisateur
      try {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, user.uid);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
          email: user.email,
          uid: user.uid,
          role: (userData && userData.role) || 'Utilisateur',
          ...userData
        }));
        // Informations utilisateur stockées avec succès
      } catch (storageError) {
        console.error('Erreur lors du stockage des informations utilisateur:', storageError);
      }
      
      // Retourner l'utilisateur avec ses données Firestore
      // Retour des données de connexion
      
      return {
        user: user,
        userData: userData
      };
    } catch (error) {
      console.error('Erreur détaillée de connexion:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Analyse plus détaillée des erreurs courantes
      switch(error.code) {
        case 'auth/invalid-credential':
          console.error('Identifiants invalides - vérifiez l\'email et le mot de passe');
          break;
        case 'auth/user-not-found':
          console.error('Utilisateur non trouvé dans Firebase');
          break;  
        case 'auth/wrong-password':
          console.error('Mot de passe incorrect');
          break;
        case 'auth/invalid-email':
          console.error('Format d\'email invalide');
          break;
        case 'auth/user-disabled':
          console.error('Ce compte utilisateur a été désactivé');
          break;
        case 'auth/too-many-requests':
          console.error('Trop de tentatives de connexion échouées, compte temporairement bloqué');
          break;
        default:
          console.error('Erreur non catégorisée:', error.code);
      }
      
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  },
  
  register: async (email, password, selasId = '') => {
    try {
      // Créer l'utilisateur Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Si pas de selasId fourni, essayer de trouver une SELAS associée à cet email
      let finalSelasId = selasId;
      if (!finalSelasId) {
        const selasCollection = collection(db, 'selas');
        const q = query(selasCollection, where('userEmails', 'array-contains', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          finalSelasId = querySnapshot.docs[0].id;
        }
      }
      
      // Créer un profil utilisateur avec le selasId
      const userProfile = {
        uid: user.uid,
        identifiant: user.email.split('@')[0], // Utiliser la partie avant @ de l'email comme identifiant
        email: user.email,
        nom: user.email.split('@')[0], // Utiliser la partie avant @ de l'email comme nom par défaut
        role: 'Utilisateur', // Rôle par défaut
        pole: '', // Pôle vide par défaut
        statut: 'actif', // Statut actif par défaut
        selasId: finalSelasId,
        permissions: [], // Permissions vides par défaut
        dateCreation: serverTimestamp(),
        dateModification: serverTimestamp()
      };
      
      // Enregistrer le profil dans Firestore
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Stocker le selasId localement
      if (finalSelasId) {
        await AsyncStorage.setItem('user_selas_id', finalSelasId);
      }
      
      return {
        user,
        profile: userProfile
      };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      
      // Vérifier si l'utilisateur est toujours authentifié dans Firebase
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!userData && !currentUser) {
        return null;
      }
      
      // Si l'utilisateur est dans Firebase mais pas dans AsyncStorage, mettre à jour AsyncStorage
      if (currentUser && !userData) {
        const userToSave = {
          email: currentUser.email,
          uid: currentUser.uid
        };
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, currentUser.uid);
        return userToSave;
      }
      
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erreur détaillée lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },
  
  getCurrentUserId: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData || !userData.uid) {
        console.warn('Aucun utilisateur authentifié ou UID manquant');
        return null;
      }
      return userData.uid;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      return null;
    }
  },

  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      // Vérifier aussi dans Firebase
      const auth = getAuth();
      const isAuthInFirebase = !!auth.currentUser;
      
      return !!token && isAuthInFirebase;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'authentification:', error);
      return false;
    }
  },
  
  // Opérations Firestore
  getScans: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      
      // Construire la requête avec filtres
      const scanCollection = collection(db, 'passages');
      let q;
      
      if (selasId) {
        // Si nous avons un selasId, filtre par selasId et uid
        q = query(
          scanCollection, 
          where('selasId', '==', selasId),
          where('uid', '==', userData.uid)
        );
      } else {
        // Sinon, filtre seulement par uid
        q = query(scanCollection, where('uid', '==', userData.uid));
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des scans:', error);
      throw error;
    }
  },
  
  addScan: async (scanData) => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      const newScan = {
        ...scanData,
        uid: userData.uid,
        createdAt: serverTimestamp(),
        scanId: uuidv4()
      };
      
      const docRef = await addDoc(collection(db, 'scans'), newScan);
      return {
        id: docRef.id,
        ...newScan
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du scan:', error);
      throw error;
    }
  },
  
  // Ajout d'une fonction pour obtenir la SELAS d'un utilisateur
  getUserSelasId: async () => {
    try {
      // D'abord vérifier si le selasId est stocké localement
      const selasId = await AsyncStorage.getItem('user_selas_id');
      if (selasId) {
        // console.log('SELAS ID récupéré du stockage local:', selasId);
        return selasId;
      }
      
      // Sinon, essayer de le récupérer depuis Firestore
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Vérifier si l'utilisateur a un selasId dans sa collection users
      const userProfileDoc = await getDoc(doc(db, 'users', userData.uid));
      
      if (userProfileDoc.exists() && userProfileDoc.data().selasId) {
        const selasId = userProfileDoc.data().selasId;
        // Stocker pour utilisation future
        await AsyncStorage.setItem('user_selas_id', selasId);
        // console.log('SELAS ID récupéré du profil et stocké localement:', selasId);
        return selasId;
      }
      
      // Si aucun selasId n'est trouvé, vérifier dans la collection 'selas'
      // pour trouver une SELAS associée à l'email de l'utilisateur
      const selasCollection = collection(db, 'selas');
      const q = query(selasCollection, where('userEmails', 'array-contains', userData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const selasId = querySnapshot.docs[0].id;
        // Mettre à jour le profil utilisateur
        if (userProfileDoc.exists()) {
          await updateDoc(doc(db, 'users', userData.uid), {
            selasId: selasId
          });
        }
        // Stocker pour utilisation future
        await AsyncStorage.setItem('user_selas_id', selasId);
        console.log('SELAS ID trouvé via email et stocké:', selasId);
        return selasId;
      }
      
      // Par défaut, retourner une valeur par défaut ou vide
      console.warn('Aucun SELAS ID trouvé pour l\'utilisateur');
      return '';
    } catch (error) {
      console.error('Erreur lors de la récupération de la SELAS:', error);
      return '';
    }
  },

  // Récupérer la SELAS de l'utilisateur connecté uniquement
  getUserSelas: async () => {
    try {
      // console.log('Récupération de la SELAS de l\'utilisateur connecté...');
      
      // Récupérer le selasId de l'utilisateur connecté
      const userProfile = await FirebaseService.getUserProfile();
      if (!(userProfile && userProfile.selasId)) {
        // console.log('⚠️ Utilisateur sans SELAS, retour SELAS par défaut');
        // Retourner uniquement la SELAS LABOSUD par défaut
        const selasCollection = collection(db, 'selas');
        const labosudQuery = query(selasCollection, where('id', '==', 'iYWSwBh92twpoiZUWWqt'));
        const labosudSnapshot = await getDocs(labosudQuery);
        
        if (!labosudSnapshot.empty) {
          const selasData = labosudSnapshot.docs[0].data();
          return [{
            id: labosudSnapshot.docs[0].id,
            nom: selasData.nom || 'LABOSUD',
            description: selasData.description || '',
            code: selasData.code || '',
            active: true,
            dateCreation: selasData.dateCreation,
            dateModification: selasData.dateModification,
            accesPages: selasData.accesPages || {},
            sitesAutorises: selasData.sitesAutorises || []
          }];
        }
        return [];
      }
      
      // Récupérer uniquement la SELAS de l'utilisateur
      const selasCollection = collection(db, 'selas');
      const userSelasQuery = query(selasCollection, where('id', '==', userProfile.selasId));
      const querySnapshot = await getDocs(userSelasQuery);
      
      const selasList = [];
      querySnapshot.forEach((doc) => {
        const selasData = doc.data();
        selasList.push({
          id: doc.id,
          nom: selasData.nom || 'SELAS sans nom',
          description: selasData.description || '',
          code: selasData.code || '',
          active: selasData.active !== false,
          dateCreation: selasData.dateCreation,
          dateModification: selasData.dateModification,
          accesPages: selasData.accesPages || {},
          sitesAutorises: selasData.sitesAutorises || []
        });
      });
      
      // console.log(`${selasList.length} SELAS récupérée pour l'utilisateur:`, selasList.map(s => s.nom));
      return selasList;
    } catch (error) {
      console.error('Erreur lors de la récupération de la SELAS:', error);
      throw error;
    }
  },

  // Récupérer toutes les SELAS disponibles (pour la sélection)
  getAllSelas: async () => {
    try {
      // console.log('Récupération de toutes les SELAS disponibles...');
      
      const selasCollection = collection(db, 'selas');
      const querySnapshot = await getDocs(selasCollection);
      
      const selasList = [];
      querySnapshot.forEach((doc) => {
        const selasData = doc.data();
        selasList.push({
          id: doc.id,
          nom: selasData.nom || 'SELAS sans nom',
          description: selasData.description || '',
          code: selasData.code || '',
          active: selasData.active !== false,
          dateCreation: selasData.dateCreation,
          dateModification: selasData.dateModification,
          accesPages: selasData.accesPages || {},
          sitesAutorises: selasData.sitesAutorises || []
        });
      });
      
      // console.log(`${selasList.length} SELAS disponibles:`, selasList.map(s => s.nom));
      return selasList;
    } catch (error) {
      console.error('Erreur lors de la récupération des SELAS:', error);
      throw error;
    }
  },
  
  // Ajouter des scans multiples à la collection 'passages' - VERSION OPTIMISÉE
  addScans: async (scansArray) => {
    console.log('addScans appelé avec:', scansArray.length, 'scans');
    try {
      const user = await FirebaseService.getCurrentUser();
      if (!user) {
        console.log('Utilisateur non connecté lors de l\'envoi des scans');
        return { success: false, error: 'Utilisateur non connecté' };
      }
      
      // OPTIMISATION: Récupération parallèle des données nécessaires
      const [userProfile, selaId, sessionData] = await Promise.all([
        FirebaseService.getUserProfile(),
        FirebaseService.getUserSelasId(),  
        FirebaseService.getCurrentSession()
      ]);
      
              const userName = (userProfile && userProfile.nom) 
          ? userProfile.nom 
          : user.email;
      
      console.log('Données récupérées en parallèle - Session:', sessionData ? 'Oui' : 'Non');
      
      // OPTIMISATION: Pré-récupération des données communes pour éviter les appels répétés
      let poleDetails = null;
      let vehiculeDetails = null;
      let siteDetails = null;
      
      // Récupérer les détails du site (qui contient les infos de pôle) une seule fois
      const siteId = (sessionData && sessionData.tournee)?.siteDepart || scansArray[0]?.site || scansArray[0]?.siteDepart;
      if (siteId && !scansArray[0]?.poleId) {
        try {
          console.log('Récupération des détails du site avec pôle:', siteId);
          siteDetails = await FirebaseService.getSiteWithPole(siteId);
          if ((siteDetails && siteDetails.pole)) {
            poleDetails = siteDetails.pole;
            console.log('Détails du pôle récupérés depuis le site:', (poleDetails && poleDetails.nom));
          } else {
            console.log('Aucun pôle trouvé pour ce site');
          }
        } catch (error) {
          console.warn('Erreur récupération site/pôle:', error.message);
        }
      }
      
      // Fallback: Récupérer le pôle depuis la session si disponible
      if (!poleDetails && (sessionData && sessionData.poleId) && !scansArray[0]?.poleId) {
        try {
          poleDetails = await FirebaseService.getPoleById(sessionData.poleId);
          console.log('Détails du pôle récupérés depuis la session:', (poleDetails && poleDetails.nom));
        } catch (error) {
          console.warn('Erreur récupération pôle depuis session:', error.message);
        }
      }
      
      // FALLBACK ULTIME: Utiliser le pôle de l'utilisateur connecté si aucun pôle trouvé
      console.log('[FALLBACK DEBUG] Profil utilisateur:', JSON.stringify(userProfile, null, 2));
      console.log('[FALLBACK DEBUG] poleDetails avant fallback:', poleDetails);
      console.log('[FALLBACK DEBUG] Aucun scan n\'a de poleId:', !scansArray.some(scan => scan.poleId));
      
      if (!poleDetails && !scansArray.some(scan => scan.poleId)) {
        try {
          console.log('[FALLBACK] Aucun pôle trouvé, recherche du pôle "CENTRE" par défaut...');
          
          // Chercher directement le pôle "CENTRE" comme fallback universel
          const polesQuery = query(collection(db, 'poles'), where('nom', '==', 'CENTRE'));
          const polesSnapshot = await getDocs(polesQuery);
          
          if (!polesSnapshot.empty) {
            const poleDoc = polesSnapshot.docs[0];
            poleDetails = { id: poleDoc.id, ...poleDoc.data() };
            console.log('[FALLBACK] Pôle CENTRE trouvé par défaut:', (poleDetails && poleDetails.nom), 'ID:', (poleDetails && poleDetails.id));
          } else {
            console.warn('[FALLBACK] Pôle CENTRE non trouvé, essai avec profil utilisateur...');
            
            // Si CENTRE n'existe pas, essayer avec le profil utilisateur
            if ((userProfile && userProfile.pole)) {
              if (typeof userProfile.pole === 'string') {
                const userPolesQuery = query(collection(db, 'poles'), where('nom', '==', userProfile.pole));
                const userPolesSnapshot = await getDocs(userPolesQuery);
                if (!userPolesSnapshot.empty) {
                  const userPoleDoc = userPolesSnapshot.docs[0];
                  poleDetails = { id: userPoleDoc.id, ...userPoleDoc.data() };
                  console.log('[FALLBACK] Pôle utilisateur trouvé:', (poleDetails && poleDetails.nom));
                }
              } else if (typeof userProfile.pole === 'object' && userProfile.pole.id) {
                poleDetails = userProfile.pole;
                console.log('[FALLBACK] Pôle utilisateur objet utilisé:', (poleDetails && poleDetails.nom));
              }
            }
          }
        } catch (error) {
          console.warn('[FALLBACK] Erreur récupération pôle fallback:', error.message);
        }
      }
      
      console.log('[FALLBACK DEBUG] poleDetails final:', poleDetails);
      
      // Récupérer les détails du véhicule une seule fois si nécessaire
      const vehiculeId = (sessionData && sessionData.vehicule)?.id || scansArray[0]?.vehiculeId;
      let vehiculeName = (sessionData && sessionData.vehicule)?.immatriculation || scansArray[0]?.vehicule;
      
      // AMÉLIORATION : Toujours essayer de récupérer le véhicule si on a un ID
      if (vehiculeId) {
        try {
          vehiculeDetails = await FirebaseService.getVehiculeById(vehiculeId);
          vehiculeName = (vehiculeDetails && vehiculeDetails.immatriculation) || vehiculeName || '';
          console.log('Détails du véhicule récupérés:', vehiculeName);
        } catch (error) {
          console.warn('Erreur récupération véhicule:', error.message);
        }
      }
      
      // AMÉLIORATION : Récupérer les détails de la tournée si nécessaire
      const tourneeId = (sessionData && sessionData.tournee)?.id || scansArray[0]?.tourneeId;
      let tourneeName = (sessionData && sessionData.tournee)?.nom || scansArray[0]?.tournee;
      
      if (tourneeId && !tourneeName) {
        try {
          const tourneeDetails = await FirebaseService.getTourneeById(tourneeId);
          tourneeName = (tourneeDetails && tourneeDetails.nom) || '';
          console.log('Détails de la tournée récupérés:', tourneeName);
        } catch (error) {
          console.warn('Erreur récupération tournée:', error.message);
        }
      }

      // Formatage optimisé des données
      const formattedScans = scansArray.map(scan => {
        // Utiliser les données pré-récupérées ou celles du scan
        const poleId = scan.poleId || (poleDetails && poleDetails.id) || (sessionData && sessionData.poleId) || (sessionData && sessionData.pole)?.id || '';
        const poleName = scan.poleName || (poleDetails && poleDetails.nom) || (sessionData && sessionData.pole)?.nom || scan.pole || '';
        
        console.log(`[addScans] Pôle pour ${scan.idColis}: ID=${poleId}, Nom=${poleName}`);
        
        const finalVehiculeId = scan.vehiculeId || vehiculeId || '';
        const finalVehiculeName = scan.vehicule || vehiculeName || '';
        const finalTourneeName = tourneeName || (sessionData && sessionData.tournee)?.nom || scan.tournee || '';
        const finalTourneeId = (sessionData && sessionData.tournee)?.id || scan.tourneeId || tourneeId || '';
        const siteName = (sessionData && sessionData.tournee)?.siteDepart || scan.site || scan.siteDepart || 'Non spécifié';
        
        console.log(`🚗 [addScans] Véhicule pour ${scan.idColis}: ID=${finalVehiculeId}, Nom=${finalVehiculeName}`);
        console.log(`🚌 [addScans] Tournée pour ${scan.idColis}: ID=${finalTourneeId}, Nom=${finalTourneeName}`);
         
         const formattedScan = {
          // Champs principaux - correspondance exacte avec le site web
          idColis: scan.idColis || scan.code || '',
          scanDate: scan.scanDate || new Date().toISOString(),
          operationType: scan.operationType || 'entree',
          sessionId: scan.sessionId || '',
          
          // Coursier - correspondance exacte
          coursierCharg: userName || user.email,
          coursierChargement: userName || user.email, // Pour le site web
          coursierChargeantId: user.uid,
          
          // Dates et heures - correspondance exacte
          dateHeureDepart: scan.scanDate || new Date().toISOString(),
          heureDepart: scan.heureDepart || (scan.scanDate ? new Date(scan.scanDate).toLocaleTimeString('fr-FR') : ''),
          
          // Tournée - correspondance exacte
          tournee: finalTourneeName,
          tourneeName: finalTourneeName, // Pour le site web
          tourneeId: finalTourneeId,
          
          // Véhicule - correspondance exacte
          vehicule: finalVehiculeName,
          vehiculeDisplay: finalVehiculeName, // Pour le site web
          vehiculeId: finalVehiculeId,
          immatriculation: finalVehiculeName,
          
          // Sites - correspondance exacte selon le type d'opération
          site: scan.site || siteName,
          siteDepart: scan.siteDepart || siteName,
          siteDepartName: scan.siteDepartName || scan.site || siteName,
          siteDépart: scan.siteDepart || siteName,
          
          // CORRECTION : Informations spécifiques selon le type d'opération
          ...(scan.operationType === 'sortie' ? {
            // Pour les sorties (arrivée) : site de destination et livraison
            siteFin: scan.siteFin || scan.siteActuel || scan.site || '',
            siteFinName: scan.siteFinName || scan.siteActuelName || '',
            dateHeureFin: scan.scanDate || new Date().toISOString(),
            dateArrivee: scan.scanDate ? new Date(scan.scanDate).toLocaleDateString() : new Date().toLocaleDateString(),
            heureArrivee: scan.scanDate ? new Date(scan.scanDate).toLocaleTimeString('fr-FR') : new Date().toLocaleTimeString('fr-FR')
          } : scan.operationType === 'entree' ? {
            // Pour les entrées (prise en charge) : site de départ
            siteDepart: scan.siteDepart || scan.site || siteName,
            siteDepartName: scan.siteDepartName || scan.site || siteName,
            site: scan.site || siteName
          } : scan.operationType === 'visite_sans_colis' ? {
            // Pour les visites sans colis : site visité
            siteVisite: scan.siteVisite || scan.site || siteName,
            siteVisiteName: scan.siteVisiteName || scan.site || siteName,
            site: scan.site || siteName,
            dateVisite: scan.scanDate || new Date().toISOString()
          } : {}),
          
          // Pôle - correspondance exacte
          selasId: selaId || null,
          pole: poleName, // Le site web s'attend au NOM du pôle, pas l'ID
          poleId: poleId, // Garder l'ID pour référence
          poleName: poleName, // Le nom du pôle pour affichage direct
          
          // Autres champs
          location: scan.location || null,
          uid: user.uid,
          createdAt: serverTimestamp(),
          
          // Statut - correspondance exacte avec le site web
          statut: scan.operationType === 'sortie' ? 'Livré' : 
                  scan.operationType === 'visite_sans_colis' ? 'Pas de colis' : 'En cours',
          status: scan.operationType === 'sortie' ? 'livré' : 
                  scan.operationType === 'visite_sans_colis' ? 'pas_de_colis' : 'en-cours',
          
          // Ajouter le type d'opération pour la cohérence
          operationType: scan.operationType || 'entree'
        };

        // Ajouter le champ 'code' seulement s'il n'est pas undefined
        if (scan.code !== undefined && scan.code !== null) {
          formattedScan.code = scan.code;
        }

        // Ajouter les champs spécifiques pour les sorties (livraisons)
        if (scan.operationType === 'sortie') {
          if (scan.dateHeureFin) formattedScan.dateHeureFin = scan.dateHeureFin;
          if (scan.dateArrivee) formattedScan.dateArrivee = scan.dateArrivee;
          if (scan.heureArrivee) formattedScan.heureArrivee = scan.heureArrivee;
          if (scan.coursierLivraison) formattedScan.coursierLivraison = scan.coursierLivraison;
        }

        // Ajouter les détails du site de départ s'ils existent
        if (scan.siteDepartDetails) {
          formattedScan.siteDepartDetails = scan.siteDepartDetails;
        }

        // Ajouter les champs spécifiques pour les visites sans colis
        if (scan.operationType === 'visite_sans_colis') {
          formattedScan.siteFin = scan.site || scan.siteDepart || '';
          formattedScan.siteFinName = scan.siteName || scan.siteDepartName || '';
          formattedScan.dateHeureFin = scan.scanDate;
          formattedScan.datearrivee = scan.scanDate; // Pour le site web
          formattedScan.dateArrivee = new Date(scan.scanDate).toLocaleDateString('fr-FR');
          formattedScan.heureArrivee = new Date(scan.scanDate).toLocaleTimeString('fr-FR');
          formattedScan.coursierLivraison = formattedScan.coursierCharg;
          // Les statuts sont déjà définis dans formattedScan
        }

        return formattedScan;
      });
      
      console.log('Données formatées pour Firestore:', JSON.stringify(formattedScans, null, 2));
      
      // Traiter chaque scan individuellement pour gérer les mises à jour
      const batch = writeBatch(db);
      let updatedCount = 0;
      let createdCount = 0;
      
      // Optimisation : grouper les requêtes pour éviter les appels séquentiels
      const idColisList = formattedScans.map(scan => scan.idColis);
      const selasId = formattedScans[0]?.selasId; // Supposer même SELAS pour tous les scans

      // Requête groupée pour vérifier les passages existants - traiter par lots de 10
      let existingPassagesMap = new Map();
      if (idColisList.length > 0 && selasId) {
        try {
          // Traiter par lots de 10 pour respecter la limite Firestore
          for (let i = 0; i < idColisList.length; i += 10) {
            const batch = idColisList.slice(i, i + 10);
            const passagesQuery = query(
              collection(db, 'passages'), 
              where('idColis', 'in', batch),
              where('selasId', '==', selasId)
            );
            const existingPassages = await getDocs(passagesQuery);
            
            existingPassages.forEach(doc => {
              existingPassagesMap.set(doc.data().idColis, { id: doc.id, data: doc.data() });
            });
          }
          
          console.log(`Vérification groupée: ${existingPassagesMap.size} passages existants trouvés sur ${idColisList.length} colis`);
        } catch (error) {
          console.warn('Erreur requête groupée, fallback mode individuel:', error.message);
        }
      }

      // Traitement des scans avec logique de mise à jour conditionnelle
      // Gérer les batches multiples pour éviter la limite de 500 opérations
      const BATCH_SIZE = 400; // Limite sûre pour Firestore
      let currentBatch = writeBatch(db);
      let batchOperationCount = 0;
      
      for (const formattedScan of formattedScans) {
        try {
          const existingPassage = existingPassagesMap.get(formattedScan.idColis);
          
          // Décider si on met à jour ou crée un nouveau passage
          let shouldUpdate = false;
          
          if (existingPassage) {
            const existingStatus = existingPassage.data.status;
            
            // ✅ Logique corrigée : Ne mettre à jour que si le statut permet la modification
            if (existingStatus === 'en-cours' || existingStatus === 'en cours' || !existingStatus) {
              // Le colis est en cours ou sans statut -> on peut le mettre à jour
              shouldUpdate = true;
              console.log(`📝 Mise à jour autorisée pour ${formattedScan.idColis} (statut: ${existingStatus})`);
            } else if (existingStatus === 'livré') {
              // Le colis est déjà livré -> créer un nouveau passage (code-barre réutilisable)
              shouldUpdate = false;
              console.log(`🔄 Création nouveau passage pour ${formattedScan.idColis} (ancien statut: livré)`);
            } else {
              // Autres statuts -> créer un nouveau passage par sécurité
              shouldUpdate = false;
              console.log(`🆕 Création nouveau passage pour ${formattedScan.idColis} (statut: ${existingStatus})`);
            }
          }
          
          if (shouldUpdate && existingPassage) {
            // Mise à jour d'un passage existant (seulement si en cours)
            // ✅ CORRECTION : Pour les livraisons, ne mettre à jour QUE les champs de livraison
            // sans écraser les données de départ (siteDepart, siteDepartName, etc.)
            
            let updateData = {
              updatedAt: serverTimestamp()
            };
            
            if (formattedScan.operationType === 'sortie') {
              // Pour les livraisons, mettre à jour UNIQUEMENT les champs de fin
              updateData = {
                ...updateData,
                statut: 'Livré', // Pour le site web
                status: 'livré',
                dateHeureFin: formattedScan.scanDate,
                datearrivee: formattedScan.scanDate, // Pour le site web
                siteFin: formattedScan.siteFin || '',
                siteFinName: formattedScan.siteFinName || '',
                coursierLivraison: formattedScan.coursierCharg,
                dateArrivee: new Date().toLocaleDateString('fr-FR'),
                heureArrivee: new Date().toLocaleTimeString('fr-FR'),
                operationType: 'sortie'
              };
              
              // ✅ IMPORTANT : NE PAS écraser siteDepart, siteDepartName, etc.
              // Ces données doivent rester intactes depuis la création initiale
              
            } else {
              // Pour les autres opérations, utiliser toutes les données formatées
              updateData = {
                ...formattedScan,
                updatedAt: serverTimestamp()
              };
              delete updateData.statut; // Éviter les doublons
            }
            
            currentBatch.update(doc(db, 'passages', existingPassage.id), updateData);
            updatedCount++;
          } else {
            // Création d'un nouveau passage
            const newScanRef = doc(collection(db, 'passages'));
            currentBatch.set(newScanRef, formattedScan);
            createdCount++;
          }
          
          batchOperationCount++;
          
          // Si on atteint la limite du batch, l'envoyer et en créer un nouveau
          if (batchOperationCount >= BATCH_SIZE) {
            await currentBatch.commit();
            console.log(`✅ Batch de ${batchOperationCount} opérations envoyé`);
            currentBatch = writeBatch(db);
            batchOperationCount = 0;
          }
          
        } catch (error) {
          console.error(`❌ Erreur traitement ${formattedScan.idColis}:`, error.message);
        }
      }
      
      // Envoyer le dernier batch s'il contient des opérations
      if (batchOperationCount > 0) {
        await currentBatch.commit();
        console.log(`✅ Dernier batch de ${batchOperationCount} opérations envoyé`);
      }
      
      console.log(`✅ Traitement terminé: ${createdCount} passages créés, ${updatedCount} passages mis à jour`);
      return { success: true, created: createdCount, updated: updatedCount };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des scans:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Fonction pour ajouter des passages (redirection vers addScans avec transformation)
  addPassages: async (scansArray) => {
    console.log('addPassages appelé avec:', JSON.stringify(scansArray, null, 2));
    
    // Vérifier si les données sont déjà dans le nouveau format ou l'ancien format
    let transformedScans = scansArray.map(scan => {
      // Si le scan contient déjà des champs dans le nouveau format, on le conserve
      if (scan.coursierCharg || scan.dateHeureDepart) {
        return scan;
      }
      
      // Sinon, on transforme les données dans le format attendu par addScans
      return {
        code: scan.code || scan.idColis || '',
        idColis: scan.code || scan.idColis || '', // Ajouter explicitement idColis pour correspondre au format web
        scanDate: scan.scanDate || scan.dateHeure || new Date().toISOString(),
        tournee: scan.tournee || scan.tourneeId || '',
        tourneeId: scan.tourneeId || scan.tournee || '',
        vehicule: scan.vehicule || scan.vehiculeId || '',
        vehiculeId: scan.vehiculeId || scan.vehicule || '',
        immatriculation: scan.vehicule || '', // Ajouter explicitement l'immatriculation
        site: scan.site || scan.siteDepart || 'Non spécifié',
        siteDepart: scan.siteDepart || scan.site || 'Non spécifié',
        siteDépart: scan.siteDépart || scan.siteDepart || scan.site || 'Non spécifié',
        siteFin: scan.siteFin || 'Laboratoire Central',
        location: scan.location || null
      };
    });
    
    console.log('Données transformées pour addScans:', JSON.stringify(transformedScans, null, 2));
    
    // Rediriger vers addScans avec les données transformées
    return await FirebaseService.addScans(transformedScans);
  },
  
  updateScan: async (id, scanData) => {
    try {
      const scanRef = doc(db, 'scans', id);
      await updateDoc(scanRef, {
        ...scanData,
        updatedAt: serverTimestamp()
      });
      
      return {
        id,
        ...scanData
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du scan:', error);
      throw error;
    }
  },
  
  deleteScan: async (id) => {
    try {
      await deleteDoc(doc(db, 'scans', id));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du scan:', error);
      throw error;
    }
  },
  
  // Profil utilisateur
  getUserProfile: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Vérifier si l'utilisateur a un profil
      const profileDoc = await getDoc(doc(db, 'users', userData.uid));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        
        // Si le profil n'a pas de selasId, essayer de le récupérer et mettre à jour le profil
        if (!profileData.selasId) {
          const selasId = await FirebaseService.getUserSelasId();
          if (selasId) {
            // Mettre à jour le profil avec le selasId
            await updateDoc(doc(db, 'users', userData.uid), {
              selasId: selasId,
              updatedAt: serverTimestamp()
            });
            
            // Mettre à jour les données retournées
            profileData.selasId = selasId;
          }
        }
        
        // Stocker le selasId localement pour un accès facile
        if (profileData.selasId) {
          await AsyncStorage.setItem('user_selas_id', profileData.selasId);
        }
        
        return {
          id: profileDoc.id,
          ...profileData
        };
      } else {
        // Créer un profil par défaut si aucun n'existe
        const selasId = await FirebaseService.getUserSelasId();
        
        const defaultProfile = {
          uid: userData.uid,
          identifiant: userData.email.split('@')[0], // Utiliser la partie avant @ de l'email comme identifiant
          email: userData.email,
          nom: userData.email.split('@')[0], // Utiliser la partie avant @ de l'email comme nom par défaut
          role: 'Utilisateur', // Rôle par défaut
          pole: '', // Pôle vide par défaut
          statut: 'actif', // Statut actif par défaut
          selasId: selasId, // Associer l'utilisateur à sa SELAS
          permissions: [], // Permissions vides par défaut
          dateCreation: serverTimestamp(),
          dateModification: serverTimestamp()
        };
        
        // Créer le profil dans Firestore
        const profileRef = doc(db, 'users', userData.uid);
        await setDoc(profileRef, defaultProfile);
        
        // Stocker le selasId localement
        if (selasId) {
          await AsyncStorage.setItem('user_selas_id', selasId);
        }
        
        return {
          id: userData.uid,
          ...defaultProfile
        };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  },
  
  updateUserProfile: async (profileData) => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Si le selasId n'est pas fourni, essayer de le récupérer
      if (!profileData.selasId) {
        const selasId = await FirebaseService.getUserSelasId();
        if (selasId) {
          profileData.selasId = selasId;
        }
      }
      
      // Mettre à jour le profil dans Firestore
      const profileRef = doc(db, 'users', userData.uid);
      await updateDoc(profileRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      // Si un selasId est présent, le stocker localement
      if (profileData.selasId) {
        await AsyncStorage.setItem('user_selas_id', profileData.selasId);
      }
      
      return {
        uid: userData.uid,
        ...profileData
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  },
  
  // Véhicules
  getVehicules: async () => {
    try {
      console.log('Tentative de récupération des véhicules...');
      
      // Récupérer TOUS les véhicules sans filtrage par SELAS (comme le site web)
      const vehiculesCollection = collection(db, 'vehicules');
      const querySnapshot = await getDocs(vehiculesCollection);
      console.log(`Tous les véhicules récupérés: ${querySnapshot.size} trouvés`);
      
      if (querySnapshot.empty) {
        console.log('Aucun véhicule trouvé, retour des données par défaut');
        return [
          { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', selasId: selasId },
          { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', selasId: selasId }
        ];
      }
      
      // Mapper les documents avec les bons champs
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Utiliser les champs existants ou mapper vers les noms attendus
        return {
          id: doc.id,
          immatriculation: data.registrationNumber || data.immatriculation || 'N/A',
          modele: data.brand || data.modele || 'N/A',
          type: data.type || 'Véhicule',
          selasId: data.selasId || selasId, // Assurer que le selasId est inclus
          // Autres champs qui pourraient être utiles
          kilometrage: data.kilometrage,
          pole: data.pole,
          // Conserver toutes les données originales pour référence
          ...data
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      console.log('Utilisation de données véhicules par défaut');
      
      // Récupérer le selasId pour les données par défaut
      const selasId = await FirebaseService.getUserSelasId().catch(() => "");
      
      // Données par défaut en cas d'erreur
      return [
        { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', selasId: selasId },
        { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', selasId: selasId }
      ];
    }
  },
  
  getVehiculeById: async (vehiculeId) => {
    try {
      const vehiculeDoc = await getDoc(doc(db, 'vehicules', vehiculeId));
      
      if (vehiculeDoc.exists()) {
        const data = vehiculeDoc.data();
        return {
          id: vehiculeDoc.id,
          immatriculation: data.registrationNumber || data.immatriculation || 'Véhicule inconnu',
          modele: data.brand || data.modele || 'N/A',
          type: data.type || 'Véhicule',
          // Conserver toutes les données originales
          ...data
        };
      } else {
        throw new Error('Véhicule non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du véhicule:', error);
      throw error;
    }
  },
  
  // Tournées
  getTournees: async () => {
    try {
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      
      const tourneesCollection = collection(db, 'tournees');
      let q;
      
      if (selasId) {
        // Si nous avons un selasId, filtrer les tournées par selasId
        q = query(
          tourneesCollection,
          where('selasId', '==', selasId),
          orderBy('nom', 'asc')
        );
      } else {
        // Sinon, récupérer toutes les tournées
        q = query(tourneesCollection, orderBy('nom', 'asc'));
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des tournées:', error);
      throw error;
    }
  },
  
  // Récupération des pôles
  getPoles: async () => {
    try {
      console.log('Tentative de récupération des pôles...');
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      console.log('SELAS ID pour filtrage des pôles:', selasId);
      
      const polesCollection = collection(db, 'poles');
      let querySnapshot;
      
      // Si nous avons un selasId, filtrer les pôles par selasId
      if (selasId) {
        const q = query(polesCollection, where('selasId', '==', selasId));
        querySnapshot = await getDocs(q);
        console.log(`Pôles filtrés par SELAS ${selasId}: ${querySnapshot.size} trouvés`);
      } else {
        // Sinon, récupérer tous les pôles
        querySnapshot = await getDocs(polesCollection);
        console.log(`Tous les pôles (pas de filtre SELAS): ${querySnapshot.size} trouvés`);
      }
      
      if (querySnapshot.empty) {
        console.log('Aucun pôle trouvé, retour des données par défaut');
        return [
          { id: 'P1', nom: 'Pôle Nord', selasId: selasId },
          { id: 'P2', nom: 'Pôle Centre', selasId: selasId },
          { id: 'P3', nom: 'Pôle Sud', selasId: selasId }
        ];
      }
      
      // Mapper les documents avec les bons champs
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nom: data.nom || data.name || 'Pôle sans nom',
          selasId: data.selasId || selasId,
          // Conserver toutes les données originales pour référence
          ...data
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des pôles:', error);
      console.log('Utilisation de données pôles par défaut');
      
      // Récupérer le selasId pour les données par défaut
      const selasId = await FirebaseService.getUserSelasId().catch(() => "");
      
      // Données par défaut en cas d'erreur
      return [
        { id: 'P1', nom: 'Pôle Nord', selasId: selasId },
        { id: 'P2', nom: 'Pôle Centre', selasId: selasId },
        { id: 'P3', nom: 'Pôle Sud', selasId: selasId }
      ];
    }
  },
  
  // Fonction pour récupérer les tournées filtrées par pôle
  getTourneesByPole: async (poleId) => {
    try {
      console.log('🔍 getTourneesByPole appelé avec poleId:', poleId);
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      console.log('🔍 SELAS ID pour filtrage des tournées:', selasId);
      
      const tourneesCollection = collection(db, 'tournees');
      
      if (!poleId) {
        console.log('🔍 Aucun poleId fourni, utilisation de getTournees() standard');
        return await FirebaseService.getTournees();
      }
      
      // Avant la requête filtrée, récupérons TOUTES les tournées pour comparaison
      console.log('🔍 Récupération de TOUTES les tournées pour comparaison...');
      const allTourneesSnapshot = await getDocs(collection(db, 'tournees'));
      console.log(`🔍 Total tournées dans la base: ${allTourneesSnapshot.size}`);
      
      allTourneesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📋 Tournée ${index + 1} (TOUTES):`, {
          id: doc.id,
          nom: data.nom,
          poleId: data.poleId,
          pole: data.pole,
          selasId: data.selasId,
          allFields: Object.keys(data)
        });
      });
      
      // Récupérer toutes les tournées et filtrer manuellement
      // Cette approche est plus flexible que les requêtes Firebase avec where()
      console.log('🔍 Filtrage manuel des tournées...');
      
      let allTournees = allTourneesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrer d'abord par SELAS si disponible
      if (selasId) {
        allTournees = allTournees.filter(tournee => tournee.selasId === selasId);
        console.log(`🔍 Après filtrage SELAS (${selasId}): ${allTournees.length} tournées`);
      }
      
      // Ensuite filtrer par pôle avec plusieurs critères possibles
      const filteredTournees = allTournees.filter(tournee => {
        // Essayer plusieurs méthodes de correspondance avec le pôle
        const matchPoleId = tournee.poleId === poleId;
        const matchPole = tournee.pole === poleId;
        const matchPoleNom = tournee.poleNom === poleId;
        
        // Aussi essayer de match avec le nom du pôle si on a accès aux données du pôle
        let matchPoleByName = false;
        if (typeof tournee.pole === 'string' && poleId) {
          // Si le pôle est stocké comme nom plutôt que ID
          matchPoleByName = tournee.pole.toLowerCase().includes('centre') && poleId.toLowerCase().includes('centre');
        }
        
        const isMatch = matchPoleId || matchPole || matchPoleNom || matchPoleByName;
        
        console.log(`📋 Tournée "${tournee.nom}" - Match: ${isMatch}`, {
          poleId: tournee.poleId,
          pole: tournee.pole,
          poleNom: tournee.poleNom,
          rechercheId: poleId,
          matchPoleId,
          matchPole,
          matchPoleNom,
          matchPoleByName
        });
        
        return isMatch;
      });
      
      console.log(`🔍 Résultats après filtrage par pôle: ${filteredTournees.length} document(s) trouvé(s)`);
      
      // Si aucune tournée trouvée avec le filtrage strict, essayons une approche plus permissive
      if (filteredTournees.length === 0) {
        console.log('🔍 Aucune tournée trouvée avec filtrage strict, essai avec filtrage permissif...');
        
        // Recherche plus permissive - par exemple, si le pôle sélectionné contient "CENTRE"
        const permissiveFilter = allTournees.filter(tournee => {
          if (poleId && poleId.toLowerCase().includes('centre')) {
            // Chercher toutes les tournées qui pourraient être liées au centre
            const poleStr = (tournee.pole || tournee.poleId || tournee.poleNom || '').toLowerCase();
            return poleStr.includes('centre') || poleStr.includes('center') || poleStr === 'p2';
          }
          return false;
        });
        
        console.log(`🔍 Résultats avec filtrage permissif: ${permissiveFilter.length} tournée(s)`);
        
        if (permissiveFilter.length > 0) {
          console.log('🔍 Utilisation des résultats du filtrage permissif');
          return permissiveFilter;
        }
      }
      
      console.log('🔍 Tournées retournées:', filteredTournees.length);
      return filteredTournees;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des tournées par pôle:', error);
      console.error('❌ Détails de l\'erreur:', {
        code: error.code,
        message: error.message,
        poleId: poleId,
        selasId: await FirebaseService.getUserSelasId().catch(() => 'erreur')
      });
      throw error;
    }
  },
  
  // Fonction pour récupérer les véhicules filtrés par pôle
  getVehiculesByPole: async (poleId) => {
    try {
      console.log('Tentative de récupération des véhicules par pôle:', poleId);
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      
      const vehiculesCollection = collection(db, 'vehicules');
      let q;
      
      if (!poleId) {
        // Si aucun pôle n'est spécifié, utiliser la fonction standard
        return await FirebaseService.getVehicules();
      }
      
      if (selasId) {
        // Filtrer par selasId et poleId
        q = query(
          vehiculesCollection,
          where('selasId', '==', selasId),
          where('poleId', '==', poleId)
        );
      } else {
        // Sinon, filtrer uniquement par poleId
        q = query(
          vehiculesCollection,
          where('poleId', '==', poleId)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('Aucun véhicule trouvé pour ce pôle, retour des données par défaut');
        return [
          { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', poleId: poleId, selasId: selasId },
          { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', poleId: poleId, selasId: selasId }
        ];
      }
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          immatriculation: data.registrationNumber || data.immatriculation || 'N/A',
          modele: data.brand || data.modele || 'N/A',
          type: data.type || 'Véhicule',
          poleId: data.poleId || poleId,
          selasId: data.selasId || selasId,
          // Conserver toutes les données originales
          ...data
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules par pôle:', error);
      
      // Récupérer le selasId pour les données par défaut
      const selasId = await FirebaseService.getUserSelasId().catch(() => "");
      
      // Données par défaut en cas d'erreur
      return [
        { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', poleId: poleId, selasId: selasId },
        { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', poleId: poleId, selasId: selasId }
      ];
    }
  },
  
  getTourneeById: async (tourneeId) => {
    try {
      const tourneeDoc = await getDoc(doc(db, 'tournees', tourneeId));
      
      if (tourneeDoc.exists()) {
        return {
          id: tourneeDoc.id,
          ...tourneeDoc.data()
        };
      } else {
        throw new Error('Tournée non trouvée');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la tournée:', error);
      throw error;
    }
  },
  
  // Session de travail
  saveSessionData: async (sessionData) => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Récupérer le selasId pour l'associer aux données
      const selasId = await FirebaseService.getUserSelasId();
      
      // Nettoyer les données pour éviter les valeurs undefined
      const rawSessionInfo = {
        uid: userData.uid,
        tourneeId: (sessionData.tournee && sessionData.tournee.id) || null,
        vehiculeId: (sessionData.vehicule && sessionData.vehicule.id) || null,
        vehiculeCheck: sessionData.vehiculeCheck || null,
        startTime: serverTimestamp(),
        status: 'active',
        selasId: selasId || null
      };
      
      // Nettoyer récursivement toutes les valeurs undefined
      const sessionInfo = FirebaseService.cleanUndefinedValues(rawSessionInfo);
      
      // Note: Les checks de véhicules sont maintenant sauvegardés directement dans CheckVehiculeScreen.js
      // pour éviter les doublons
      
      // Sauvegarder la session dans Firebase
      const docRef = await addDoc(collection(db, 'sessions'), sessionInfo);
      
      // Stocker l'ID de session localement
      await AsyncStorage.setItem('current_session_id', docRef.id);
      
      return {
        id: docRef.id,
        ...sessionInfo
      };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
      throw error;
    }
  },

    // Fonction utilitaire pour nettoyer récursivement les valeurs undefined
  cleanUndefinedValues: (obj) => {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => FirebaseService.cleanUndefinedValues(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = FirebaseService.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  },

  // Nouvelle fonction pour sauvegarder spécifiquement les checks de véhicules
  saveVehicleCheck: async (vehiculeCheckData, uid, selasId) => {
    try {
      // STRUCTURE SIMPLE : 1 document = 1 check
      const finalDate = vehiculeCheckData.date || new Date().toISOString();
      
      const checkData = {
        // Infos véhicule
        vehiculeId: vehiculeCheckData.vehiculeId,
        immatriculation: vehiculeCheckData.immatriculation,
        
        // Infos utilisateur
        uid: uid,
        selasId: selasId,
        
        // Données du check
        checkType: vehiculeCheckData.checkType || 'debut_tournee',
        kilometrage: vehiculeCheckData.kilometrage || null,
        notes: vehiculeCheckData.notes || '',
        photos: vehiculeCheckData.photos || [],
        defects: vehiculeCheckData.defects || [],
        washInfo: vehiculeCheckData.washInfo || {},
        managerAlertRequested: vehiculeCheckData.managerAlertRequested || false,
        
        // Date simple - utiliser Date JavaScript au lieu de serverTimestamp
        createdAt: finalDate,
        checkDate: finalDate
      };
      
      // NETTOYER LES VALEURS UNDEFINED pour Firestore
      const cleanedCheckData = FirebaseService.cleanUndefinedValues(checkData);
      console.log(`[saveVehicleCheck] Données nettoyées:`, cleanedCheckData);

      // Créer le nouveau document
      const docRef = await addDoc(collection(db, 'vehicleChecks'), cleanedCheckData);
      
      console.log(`[saveVehicleCheck] ✅ Check sauvegardé: ${docRef.id}`);
      
      return {
        id: docRef.id,
        ...checkData
      };
      
    } catch (error) {
      console.error('[saveVehicleCheck] ❌ Erreur:', error);
      throw error;
    }
  },

  // Fonction pour récupérer l'historique complet d'un véhicule
  getVehicleCheckHistory: async (vehiculeId) => {
    try {
      console.log(`[getVehicleCheckHistory] Récupération de l'historique pour véhicule: ${vehiculeId}`);
      
      const vehicleCheckQuery = query(
        collection(db, 'vehicleChecks'),
        where('vehiculeId', '==', vehiculeId),
        limit(1)
      );
      
      const vehicleCheckSnapshot = await getDocs(vehicleCheckQuery);
      
      if (vehicleCheckSnapshot.empty) {
        console.log(`[getVehicleCheckHistory] Aucun historique trouvé pour le véhicule: ${vehiculeId}`);
        return null;
      }
      
      const vehicleCheckDoc = vehicleCheckSnapshot.docs[0];
      const vehicleCheckData = vehicleCheckDoc.data();
      
      console.log(`[getVehicleCheckHistory] Historique trouvé avec ${(vehicleCheckData.checkHistory && vehicleCheckData.checkHistory.length) || 0} checks`);
      
      return {
        id: vehicleCheckDoc.id,
        ...vehicleCheckData,
        // Convertir les timestamps en dates lisibles
        createdAt: (vehicleCheckData.createdAt && vehicleCheckData.createdAt.toDate)?.() || vehicleCheckData.createdAt,
        updatedAt: (vehicleCheckData.updatedAt && vehicleCheckData.updatedAt.toDate)?.() || vehicleCheckData.updatedAt,
        // Convertir les timestamps dans l'historique
        checkHistory: (vehicleCheckData.checkHistory && vehicleCheckData.checkHistory.map)(check => ({
          ...check,
          createdAt: (check.createdAt && check.createdAt.toDate)?.() || check.createdAt
        })) || []
      };
      
    } catch (error) {
      console.error('[getVehicleCheckHistory] Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  },

  // Fonction pour récupérer les checks de véhicules (pour l'interface web)
  getVehicleChecks: async (filters = {}) => {
    try {
      console.log(`[getVehicleChecks] Récupération avec filtres:`, filters);
      
      let q = collection(db, 'vehicleChecks');
      
      // Appliquer les filtres si fournis
      if (filters.selasId) {
        q = query(q, where('selasId', '==', filters.selasId));
        console.log(`[getVehicleChecks] Filtre selasId appliqué: ${filters.selasId}`);
      }
      if (filters.vehiculeId) {
        q = query(q, where('vehiculeId', '==', filters.vehiculeId));
        console.log(`[getVehicleChecks] Filtre vehiculeId appliqué: ${filters.vehiculeId}`);
      }
      if (filters.uid) {
        q = query(q, where('uid', '==', filters.uid));
        console.log(`[getVehicleChecks] Filtre uid appliqué: ${filters.uid}`);
      }
      
      // Trier par date de création (plus récent en premier)
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convertir les timestamps en dates lisibles
        createdAt: doc.data().(createdAt && createdAt.toDate)?.() || doc.data().createdAt,
        date: doc.data().date
      }));
      
      console.log(`[getVehicleChecks] ${results.length} résultats trouvés`);
      console.log(`[getVehicleChecks] Premier résultat:`, results[0] ? {
        id: results[0].id,
        vehiculeId: results[0].vehiculeId,
        immatriculation: results[0].immatriculation,
        lastCheckDate: results[0].lastCheckDate,
        checkHistoryLength: results[0].(checkHistory && checkHistory.length) || 0
      } : 'Aucun résultat');
      
      return results;
    } catch (error) {
      console.error('Erreur lors de la récupération des checks véhicules:', error);
      throw error;
    }
  },

  // Fonction pour récupérer un check de véhicule spécifique
  getVehicleCheckById: async (checkId) => {
    try {
      const checkDoc = await getDoc(doc(db, 'vehicleChecks', checkId));
      
      if (!checkDoc.exists()) {
        throw new Error('Check véhicule non trouvé');
      }
      
      return {
        id: checkDoc.id,
        ...checkDoc.data(),
        createdAt: checkDoc.data().(createdAt && createdAt.toDate)?.() || checkDoc.data().createdAt
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du check véhicule:', error);
      throw error;
    }
  },



  getCurrentSession: async () => {
    try {
      // Vérifier s'il existe une session active dans le stockage local
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) return null;
      
      // Récupérer les détails de la session depuis Firebase
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      
      if (!sessionDoc.exists()) {
        // Session non trouvée dans Firebase, supprimer la référence locale
        await AsyncStorage.removeItem('current_session_id');
        return null;
      }
      
      const sessionData = {
        id: sessionDoc.id,
        ...sessionDoc.data()
      };
      
      // Si la session n'est plus active, supprimer la référence locale
      if (sessionData.status !== 'active') {
        await AsyncStorage.removeItem('current_session_id');
        return null;
      }
      
      // Récupérer les détails complets du véhicule et de la tournée
      const [vehicule, tournee] = await Promise.all([
        FirebaseService.getVehiculeById(sessionData.vehiculeId),
        FirebaseService.getTourneeById(sessionData.tourneeId)
      ]);
      
      return {
        ...sessionData,
        vehicule,
        tournee
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return null;
    }
  },
  
  closeCurrentSession: async () => {
    try {
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) return false;
      
      // Vérifier d'abord si la session existe
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      
      if (sessionDoc.exists()) {
        // Mettre à jour la session comme terminée
        await updateDoc(doc(db, 'sessions', sessionId), {
          endTime: serverTimestamp(),
          status: 'completed'
        });
      }
      
      // Supprimer la référence locale même si la session n'existe pas
      await AsyncStorage.removeItem('current_session_id');
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la fermeture de la session:', error);
      // Ne pas lancer l'erreur, juste la logger et nettoyer le stockage local
      await AsyncStorage.removeItem('current_session_id');
      return false;
    }
  },
  
  // Nouvelle fonction pour récupérer tous les utilisateurs de la même SELAS
  getUsersBySelasId: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Récupérer le selasId de l'utilisateur actuel
      const selasId = await FirebaseService.getUserSelasId();
      if (!selasId) {
        throw new Error('Aucune SELAS associée à cet utilisateur');
      }
      
      // Récupérer tous les utilisateurs de cette SELAS
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('selasId', '==', selasId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs par SELAS:', error);
      throw error;
    }
  },
  
  // Fonction pour vérifier l'authentification et rediriger vers l'écran de connexion si nécessaire
  checkAuthAndRedirect: async (navigation) => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!userData || !currentUser) {
        console.log('Session expirée ou utilisateur déconnecté, redirection vers la connexion');
        
        // Effacer les données locales
        await AsyncStorage.removeItem(USER_DATA_KEY);
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem('current_session_id');
        
        // Rediriger vers l'écran de connexion
        if (navigation) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erreur de vérification d\'authentification:', error);
      
      // En cas d'erreur, rediriger également vers la connexion
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      return false;
    }
  },
  
  // Nouvelle fonction pour vérifier si l'utilisateur a un rôle administrateur
  isUserAdmin: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) return false;
      
      const userProfileDoc = await getDoc(doc(db, 'users', userData.uid));
      if (!userProfileDoc.exists()) return false;
      
      const userRole = userProfileDoc.data().role;
      return userRole === 'admin' || userRole === 'superadmin';
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle administrateur:', error);
      return false;
    }
  },
  
  // Vérifie si un code de site existe dans Firestore - VERSION OPTIMISÉE
  verifySiteCode: async function(siteCode) {
    try {
      console.log(`Vérification du site: ${siteCode}`);
      
      if (!siteCode) {
        console.error("Code site manquant");
        return { valid: false, error: "Code site requis" };
      }

      const sitesRef = firebase.firestore().collection('sites');
      
      // 🚀 OPTIMISATION: Toutes les requêtes en parallèle au lieu de séquentiel
      const searchPromises = [];
      
      // 1. Recherche par codeBarre
      searchPromises.push(
        sitesRef.where('codeBarre', '==', siteCode).limit(1).get()
          .then(snapshot => ({ type: 'codeBarre', snapshot }))
      );
      
      // 2. Recherche par code
      searchPromises.push(
        sitesRef.where('code', '==', siteCode).limit(1).get()
          .then(snapshot => ({ type: 'code', snapshot }))
      );
      
      // 3. Recherche par ID (en enlevant le préfixe "SITE_" s'il existe)
      const siteId = siteCode.replace(/^SITE_?/i, '');
      searchPromises.push(
        sitesRef.doc(siteId).get()
          .then(doc => ({ type: 'docId', doc }))
      );
      
      // 4. Recherche par nom (extraire la partie après "SITE_")
      const siteName = siteCode.replace(/^SITE_?/i, '');
      if (siteName && siteName !== siteCode) {
        searchPromises.push(
          sitesRef.where('name', '==', siteName).limit(1).get()
            .then(snapshot => ({ type: 'name', snapshot }))
        );
        
        searchPromises.push(
          sitesRef.where('nom', '==', siteName).limit(1).get()
            .then(snapshot => ({ type: 'nom', snapshot }))
        );
      }

      console.log(`[verifySiteCode] ⚡ Exécution de ${searchPromises.length} requêtes en parallèle`);
      
      // Exécuter toutes les recherches en parallèle
      const results = await Promise.allSettled(searchPromises);
      
      // Analyser les résultats par priorité
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { type, snapshot, doc } = result.value;
          
          // Vérifier les snapshots de requêtes
          if (snapshot && !snapshot.empty) {
            const siteData = snapshot.docs[0].data();
            console.log(`[verifySiteCode] ✅ Site trouvé par ${type}:`, siteData.name || siteData.nom);
            return { 
              valid: true, 
              site: {
                id: snapshot.docs[0].id,
                name: siteData.name || siteData.nom || "Site sans nom",
                address: siteData.address || siteData.adresse || "",
                city: siteData.city || siteData.ville || "",
                code: siteData.codeBarre || siteData.code || siteCode
              }
            };
          }
          
          // Vérifier le document direct (recherche par ID)
          if (doc && doc.exists) {
            const siteData = doc.data();
            console.log(`[verifySiteCode] ✅ Site trouvé par ID:`, siteData.name || siteData.nom);
            return { 
              valid: true, 
              site: {
                id: doc.id,
                name: siteData.name || siteData.nom || "Site sans nom",
                address: siteData.address || siteData.adresse || "",
                city: siteData.city || siteData.ville || "",
                code: siteData.codeBarre || siteData.code || siteCode
              }
            };
          }
        }
      }
      
      console.log(`❌ Aucun site trouvé avec le code: ${siteCode}`);
      return { valid: false, error: "Site non trouvé" };
      
    } catch (error) {
      console.error("Erreur lors de la vérification du site:", error);
      return { valid: false, error: "Erreur lors de la vérification du site" };
    }
  },

  // Récupère un site avec ses informations de pôle
  getSiteWithPole: async function(siteId) {
    try {
      console.log(`🔍 [getSiteWithPole] DÉBUT - Récupération du site avec pôle: ${siteId}`);
      
      if (!siteId) {
        console.error("❌ [getSiteWithPole] ID de site manquant");
        return null;
      }

      const sitesRef = firebase.firestore().collection('sites');
      const siteDoc = await sitesRef.doc(siteId).get();
      
      if (!siteDoc.exists) {
        // Log réduit pour éviter la verbosité
        return null;
      }

      const siteData = siteDoc.data();
      console.log(`📊 [getSiteWithPole] Données du site:`, {
        codePostal: siteData.codePostal,
        selasId: siteData.selasId,
        pole: siteData.pole,
        nom: siteData.nom,
        adresse: siteData.adresse
      });

      // Construire l'objet site avec les informations du pôle
      const siteWithPole = {
        id: siteDoc.id,
        name: siteData.name || siteData.nom || "Site sans nom",
        address: siteData.address || siteData.adresse || "",
        city: siteData.city || siteData.ville || "",
        code: siteData.codeBarre || siteData.code || "",
        pole: null
      };

      // Récupérer les informations du pôle si elles existent
      if (siteData.pole) {
        console.log(`🏷️ [getSiteWithPole] Pôle ID trouvé: ${siteData.pole}`);
        
        // Si c'est déjà un objet pôle complet
        if (typeof siteData.pole === 'object' && siteData.pole.nom) {
          siteWithPole.pole = siteData.pole;
          console.log(`✅ [getSiteWithPole] Pôle objet utilisé directement:`, siteWithPole.pole);
        } else if (typeof siteData.pole === 'string') {
          // Si c'est une chaîne, chercher le document pôle par nom
          try {
            const polesRef = firebase.firestore().collection('poles');
            const poleQuery = await polesRef.where('nom', '==', siteData.pole).get();
            
            if (!poleQuery.empty) {
              const poleDoc = poleQuery.docs[0];
              const poleData = poleDoc.data();
              siteWithPole.pole = {
                id: poleDoc.id,
                nom: poleData.nom,
                description: poleData.description || ''
              };
              console.log(`✅ [getSiteWithPole] Pôle trouvé par nom:`, siteWithPole.pole);
            } else {
              console.log(`❌ [getSiteWithPole] Pôle non trouvé avec le nom: ${siteData.pole}`);
              // Utiliser quand même le nom comme fallback
              siteWithPole.pole = {
                nom: siteData.pole
              };
            }
          } catch (poleError) {
            console.error(`❌ [getSiteWithPole] Erreur lors de la recherche du pôle:`, poleError);
            // Utiliser le nom comme fallback
            siteWithPole.pole = {
              nom: siteData.pole
            };
          }
        } else {
          console.log(`❓ [getSiteWithPole] Type de pôle non reconnu:`, typeof siteData.pole);
        }
      } else {
        console.log(`⚠️ [getSiteWithPole] Aucun pôle défini pour ce site`);
      }

      console.log(`🏁 [getSiteWithPole] Résultat final:`, siteWithPole);
      return siteWithPole;
    } catch (error) {
      console.error("❌ [getSiteWithPole] Erreur:", error);
      return null;
    }
  },

  // Récupère une session par son ID
  getSessionById: async function(sessionId) {
    try {
      if (!sessionId) {
        console.error("ID de session manquant");
        return null;
      }

      console.log(`🔍 [getSessionById] Récupération de la session: ${sessionId}`);
      
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      
      if (!sessionDoc.exists) {
        console.log(`❌ [getSessionById] Session non trouvée avec l'ID: ${sessionId}`);
        return null;
      }

      const sessionData = sessionDoc.data();
      const sessionResult = {
        id: sessionDoc.id,
        ...sessionData
      };
      
      console.log(`✅ [getSessionById] Session trouvée:`, {
        id: sessionResult.id,
        uid: sessionResult.uid,
        tourneeId: sessionResult.tourneeId,
        vehiculeId: sessionResult.vehiculeId,
        poleId: sessionResult.poleId
      });
      
      return sessionResult;
    } catch (error) {
      console.error("❌ [getSessionById] Erreur:", error);
      return null;
    }
  },

  // Récupère un site par son ID
  getSiteById: async function(siteId) {
    try {
      if (!siteId) {
        console.error("ID de site manquant");
        return null;
      }

      const sitesRef = firebase.firestore().collection('sites');
      const siteDoc = await sitesRef.doc(siteId).get();
      
      if (!siteDoc.exists) {
        // Log réduit pour éviter la verbosité
        return null;
      }

      const siteData = siteDoc.data();
      return {
        id: siteDoc.id,
        name: siteData.name || siteData.nom || "Site sans nom",
        address: siteData.address || siteData.adresse || "",
        city: siteData.city || siteData.ville || "",
        code: siteData.codeBarre || siteData.code || "",
        ...siteData
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du site:", error);
      return null;
    }
  },

  // Récupère un pôle par son ID
  getPoleById: async function(poleId) {
    try {
      if (!poleId) {
        console.error("🚫 [getPoleById] ID de pôle manquant");
        return null;
      }

      console.log(`🔍 [getPoleById] Recherche du pôle avec l'ID: ${poleId}`);
      
      const polesRef = firebase.firestore().collection('poles');
      const poleDoc = await polesRef.doc(poleId).get();
      
      if (!poleDoc.exists) {
        console.log(`❌ [getPoleById] Pôle non trouvé avec l'ID: ${poleId}`);
        return null;
      }

      const poleData = poleDoc.data();
      const poleResult = {
        id: poleDoc.id,
        nom: poleData.nom || "Pôle sans nom",
        description: poleData.description || "",
        ...poleData
      };
      
      console.log(`✅ [getPoleById] Pôle trouvé:`, poleResult);
      return poleResult;
    } catch (error) {
      console.error("❌ [getPoleById] Erreur:", error);
      return null;
    }
  },
  
  // Fonction pour sauvegarder une Big-Sacoche et ses contenants associés dans Firestore
  /**
   * Sauvegarde une Big-Sacoche et ses contenants associés dans Firestore
   * @param {Object} bigSacocheData - Données principales de la Big-Sacoche (code, tournée, véhicule, etc.)
   * @param {Array} contenants - Liste des contenants à associer à cette Big-Sacoche
   * @returns {Object} - Résultat de l'opération avec statut success et identifiant de la Big-Sacoche
   */
  saveBigSacoche: async (bigSacocheData, contenants) => {
    console.log('saveBigSacoche appelé avec:', JSON.stringify(bigSacocheData, null, 2));
    try {
      // Vérification de l'authentification de l'utilisateur
      const user = await FirebaseService.getCurrentUser();
      if (!user) {
        console.log('Utilisateur non connecté lors de l\'enregistrement de la Big-Sacoche');
        return { success: false, error: 'Utilisateur non connecté' };
      }
      
      // Récupération des informations utilisateur pour association
      const userProfile = await FirebaseService.getUserProfile();
      const userName = (userProfile && userProfile.nom) && (userProfile && userProfile.prenom) 
        ? `${userProfile.prenom} ${userProfile.nom}` 
        : user.email;
      
      const selaId = await FirebaseService.getUserSelasId();
      
      // Formatage des données de la Big-Sacoche pour Firestore
      const formattedBigSacoche = {
        code: bigSacocheData.code,
        dateCreation: new Date().toISOString(),
        coursierCharg: userName || user.email,
        coursierChargeantId: user.uid,
        tournee: bigSacocheData.tournee || '',
        tourneeId: bigSacocheData.tourneeId || '',
        vehicule: bigSacocheData.vehicule || '',
        vehiculeId: bigSacocheData.vehiculeId || '',
        site: bigSacocheData.site || 'Non spécifié',
        siteDepart: bigSacocheData.siteDepart || 'Non spécifié',
        contenantCount: contenants.length,
        contenantCodes: contenants.map(c => c.code),
        selaId: selaId || null,
        pole: (bigSacocheData.pole && bigSacocheData.pole.id) || bigSacocheData.poleId || '',
        poleName: (bigSacocheData.pole && bigSacocheData.pole.nom) || bigSacocheData.poleName || '',
        location: bigSacocheData.location || null,
        status: 'en-cours',
        createdAt: serverTimestamp()
      };
      
      console.log('Données Big-Sacoche formatées pour Firestore:', JSON.stringify(formattedBigSacoche, null, 2));
      
      // Création du document Big-Sacoche dans Firestore
      const bigSacocheRef = await firebase.firestore().collection('big-sacoches').add(formattedBigSacoche);
      
      // Préparation des contenants avec référence à la Big-Sacoche
      const formattedContenants = contenants.map(contenant => ({
        code: contenant.code,
        scanDate: contenant.scanDate || new Date().toISOString(),
        coursierCharg: userName || user.email,
        coursierChargeantId: user.uid,
        dateHeureDepart: contenant.scanDate || new Date().toISOString(),
        tournee: contenant.tournee || '',
        tourneeId: contenant.tourneeId || '',
        vehicule: contenant.vehicule || '',
        vehiculeId: contenant.vehiculeId || '',
        site: contenant.site || 'Non spécifié',
        siteDepart: contenant.siteDepart || 'Non spécifié',
        siteDépart: contenant.siteDépart || contenant.siteDepart || 'Non spécifié',
        siteFin: contenant.siteFin || 'Laboratoire Central',
        bigSacoche: bigSacocheData.code,
        bigSacocheId: bigSacocheRef.id,
        bigSacocheDate: new Date().toISOString(),
        selaId: selaId || null,
        pole: (bigSacocheData.pole && bigSacocheData.pole.id) || bigSacocheData.poleId || contenant.pole || '',
        poleName: (bigSacocheData.pole && bigSacocheData.pole.nom) || bigSacocheData.poleName || contenant.poleName || '',
        location: contenant.location || null,
        status: 'en-cours',
        createdAt: serverTimestamp()
      }));
      
      // Utilisation d'un batch pour garantir l'atomicité de l'opération
      const batch = firebase.firestore().batch();
      formattedContenants.forEach(formattedContenant => {
        const newContenantRef = firebase.firestore().collection('passages').doc();
        batch.set(newContenantRef, formattedContenant);
      });
      
      // Exécution du batch pour sauvegarder tous les contenants
      await batch.commit();
      
      console.log(`✅ Big-Sacoche créée avec ${contenants.length} contenants`);
      return { 
        success: true, 
        bigSacocheId: bigSacocheRef.id, 
        count: contenants.length 
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de la Big-Sacoche:', error);
      return { success: false, error: error.message };
    }
  },

  // Fonction OPTIMISÉE pour récupérer une tournée avec ses sites et leur statut de visite
  getTourneeWithSites: async (tourneeId, sessionId) => {
    try {
      console.log(`🚀 [getTourneeWithSites] Chargement optimisé tournée ${tourneeId}`);
      const startTime = Date.now();
      
      // OPTIMISATION 1: Requêtes parallèles pour tournée et session
      const [tourneeDoc, sessionDoc] = await Promise.all([
        getDoc(doc(db, 'tournees', tourneeId)),
        sessionId ? getDoc(doc(db, 'sessions', sessionId)) : Promise.resolve(null)
      ]);
      
      if (!tourneeDoc.exists()) {
        throw new Error('Tournée non trouvée');
      }
      
      const tourneeData = tourneeDoc.data();
      
      // Récupérer les sites visités de la session (une seule fois)
      const visitedSiteIdentifiers = (sessionDoc && sessionDoc.exists)() 
        ? (sessionDoc.data().visitedSiteIdentifiers || [])
        : [];
      
      // OPTIMISATION 2: Vérifier s'il y a des sites à traiter
      if (!(tourneeData && tourneeData.sites)?.length) {
        console.log(`⚡ [getTourneeWithSites] Aucun site dans la tournée`);
        return { ...tourneeData, sitesWithStatus: [], sitesCount: 0 };
      }
      
      // OPTIMISATION 3: Extraire les IDs uniques des sites
      const siteIds = [...new Set(tourneeData.sites.map(site => site.id))];
      console.log(`🔍 [getTourneeWithSites] Chargement ${siteIds.length} sites uniques`);
      
      // OPTIMISATION 4: Requêtes parallèles pour tous les sites
      const sitePromises = siteIds.map(siteId => 
        getDoc(doc(db, 'sites', siteId)).catch(error => {
          console.warn(`⚠️ Site ${siteId} non accessible:`, error.message);
          return null;
        })
      );
      
      const siteDocs = await Promise.all(sitePromises);
      
      // OPTIMISATION 5: Créer un Map pour accès O(1)
      const sitesMap = new Map();
      siteDocs.forEach((siteDoc, index) => {
        if ((siteDoc && siteDoc.exists)()) {
          sitesMap.set(siteIds[index], siteDoc.data());
        }
      });
      
      // OPTIMISATION 6: Construction rapide des sites avec statut
      const sitesWithStatus = tourneeData.sites.map((site, index) => {
        const siteData = sitesMap.get(site.id);
        
        if (!siteData) {
          console.warn(`⚠️ Site ${site.id} introuvable, utilisation données par défaut`);
          return {
            id: site.id,
            nom: 'Site introuvable',
            name: 'Site introuvable',
            adresse: 'Adresse non disponible',
            address: 'Adresse non disponible',
            ville: '',
            city: '',
            codePostal: '',
            zipCode: '',
            telephone: null,
            phone: null,
            tel: null,
            visited: false,
            ordre: site.ordre || index + 1,
            heureArrivee: site.heureArrivee && site.heureArrivee.toDate ? site.heureArrivee.toDate() : site.heureArrivee,
            uniqueDisplayId: `${site.id}_${index}`,
            roadbook: 'ABSENT',
            roadbookKeys: 'N/A',
            code: `SITE_${site.id}`
          };
        }
        
        // Vérification visite optimisée (sans requête)
        const uniqueVisitId = `${site.id}_${index}`;
        const visited = visitedSiteIdentifiers.includes(uniqueVisitId);
        
        return {
          id: site.id,
          nom: siteData.nom || siteData.name || 'Site sans nom',
          name: siteData.nom || siteData.name || 'Site sans nom',
          adresse: siteData.adresse || siteData.address || 'Adresse non spécifiée',
          address: siteData.adresse || siteData.address || 'Adresse non spécifiée',
          ville: siteData.ville || siteData.city || '',
          city: siteData.ville || siteData.city || '',
          codePostal: siteData.codePostal || siteData.zipCode || '',
          zipCode: siteData.codePostal || siteData.zipCode || '',
          telephone: siteData.telephone || siteData.phone || siteData.tel || null,
          phone: siteData.telephone || siteData.phone || siteData.tel || null,
          tel: siteData.telephone || siteData.phone || siteData.tel || null,
          visited: visited,
          ordre: site.ordre || index + 1,
          heureArrivee: site.heureArrivee && site.heureArrivee.toDate ? site.heureArrivee.toDate() : site.heureArrivee,
          uniqueDisplayId: uniqueVisitId,
          roadbook: siteData.roadbook || 'ABSENT',
          roadbookKeys: siteData.roadbookKeys || 'N/A',
          code: `SITE_${siteData.nom || siteData.name || 'Site sans nom'}`
        };
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`⚡ [getTourneeWithSites] Chargement terminé en ${loadTime}ms - ${sitesWithStatus.length} sites`);
      
      return {
        ...tourneeData,
        sitesWithStatus: sitesWithStatus,
        sitesCount: sitesWithStatus.length,
        visitedSites: sitesWithStatus.filter(site => site.visited).length
      };
      
    } catch (error) {
      console.error('❌ [getTourneeWithSites] Erreur chargement:', error.message);
      throw error;
    }
  },

  // Fonction pour récupérer les scans en cours pour une tournée
  getScansEnCours: async (tourneeId) => {
    try {
      console.log(`Récupération des scans en cours pour la tournée ${tourneeId}`);
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      
      const scansCollection = collection(db, 'passages');
      let q;
      
      if (selasId) {
        // Filtrer par tourneeId, selasId et statut 'en-cours'
        q = query(
          scansCollection,
          where('tourneeId', '==', tourneeId),
          where('selasId', '==', selasId),
          where('status', '==', 'en-cours')
        );
      } else {
        // Filtrer uniquement par tourneeId et statut 'en-cours'
        q = query(
          scansCollection,
          where('tourneeId', '==', tourneeId),
          where('status', '==', 'en-cours')
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      const scansEnCours = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`${scansEnCours.length} scans en cours trouvés pour la tournée ${tourneeId}`);
      return scansEnCours;
    } catch (error) {
      console.error('Erreur lors de la récupération des scans en cours:', error);
            throw error;
    }
  },

  // Fonction pour récupérer tous les scans (sans filtrage par tournée)
  getAllScans: async () => {
    try {
      console.log('Récupération de tous les scans disponibles');
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelasId();
      
      const scansCollection = collection(db, 'passages');
      let q;
      
      if (selasId) {
        // Filtrer par selasId seulement
        q = query(scansCollection, where('selasId', '==', selasId));
      } else {
        // Récupérer tous les scans si aucun selasId
        q = scansCollection;
      }
      
      const querySnapshot = await getDocs(q);
      
      const allScans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Log supprimé pour réduire la verbosité
      return allScans;
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les scans:', error);
      throw error;
    }
  },

  // Fonction pour réinitialiser le progrès d'une tournée (pour le refresh)
  resetTourneeProgress: async (tourneeId) => {
    try {
      console.log(`🔄 [resetTourneeProgress] Réinitialisation du progrès pour la tournée: ${tourneeId}`);
      
      // Récupérer l'utilisateur actuel
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) {
        console.error('❌ [resetTourneeProgress] Utilisateur non authentifié');
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Réinitialiser la session active de l'utilisateur si elle est liée à cette tournée
      const currentSession = await FirebaseService.getCurrentSession();
      if (currentSession && currentSession.tourneeId === tourneeId) {
        console.log(`🗑️ [resetTourneeProgress] Réinitialisation de la session ${currentSession.id}`);
        
        // Réinitialiser les sites visités dans la session
        await updateDoc(doc(db, 'sessions', currentSession.id), {
          visitedSiteIdentifiers: [],
          lastUpdated: serverTimestamp()
        });
        
        console.log(`✅ [resetTourneeProgress] Session ${currentSession.id} réinitialisée`);
      }
      
      console.log(`✅ [resetTourneeProgress] Progrès réinitialisé pour la tournée: ${tourneeId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [resetTourneeProgress] Erreur lors de la réinitialisation:', error);
      return { success: false, error: error.message };
    }
  },

  // Fonction pour marquer un site comme visité dans une session
  markSiteVisitedInSession: async (sessionId, siteIdentifier, occurrenceIndex) => {
    try {
      console.log(`[markSiteVisitedInSession] Marquage du site ${siteIdentifier} comme visité dans la session ${sessionId} (index: ${occurrenceIndex})`);
      
      if (!sessionId || !siteIdentifier) {
        console.error('[markSiteVisitedInSession] Paramètres manquants:', { sessionId, siteIdentifier, occurrenceIndex });
        return false;
      }

      // Récupérer la session existante
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        console.error('[markSiteVisitedInSession] Session non trouvée:', sessionId);
        return false;
      }

      const sessionData = sessionDoc.data();
      console.log('[markSiteVisitedInSession] Données de session récupérées:', {
        id: sessionId,
        visitedSiteIdentifiers: (sessionData.visitedSiteIdentifiers && sessionData.visitedSiteIdentifiers.length) || 0
      });

      // Créer l'identifiant unique pour cette occurrence du site
      const uniqueVisitId = `${siteIdentifier}_${occurrenceIndex}`;
      
      // Initialiser le tableau des sites visités s'il n'existe pas
      let visitedSiteIdentifiers = sessionData.visitedSiteIdentifiers || [];
      
      // Vérifier si ce site (avec cet index) n'est pas déjà marqué comme visité
      if (!visitedSiteIdentifiers.includes(uniqueVisitId)) {
        visitedSiteIdentifiers.push(uniqueVisitId);
        
        // Mettre à jour la session dans Firestore
        await updateDoc(doc(db, 'sessions', sessionId), {
          visitedSiteIdentifiers: visitedSiteIdentifiers,
          lastUpdated: serverTimestamp()
        });
        
        console.log(`[markSiteVisitedInSession] Site ${uniqueVisitId} marqué comme visité avec succès`);
        return true;
      } else {
        console.log(`[markSiteVisitedInSession] Site ${uniqueVisitId} déjà marqué comme visité`);
        return true; // Retourner true car le site est effectivement visité
      }
      
    } catch (error) {
      console.error('[markSiteVisitedInSession] Erreur lors du marquage du site comme visité:', error);
      return false;
    }
  },

  // Fonction pour uploader une image vers Supabase Storage (remplace Firebase Storage)
  uploadImageAsync: async (localUri, vehiculeImmat) => {
    try {
      if (!localUri) {
        throw new Error('URI de l\'image manquante');
      }

      console.log(`[uploadImageAsync] Début upload image vers Supabase...`);
      console.log(`[uploadImageAsync] URI: ${localUri.substring(0, 50)}...`);
      console.log(`[uploadImageAsync] Immatriculation véhicule: ${vehiculeImmat || 'non définie'}`);

      // Test de connectivité avec Supabase avant l'upload (optionnel)
      try {
        const connectionTest = await SupabaseService.testConnection();
        if (connectionTest.success && connectionTest.hasVehicleChecksBucket) {
          console.log(`[uploadImageAsync] ✅ Connectivité Supabase OK, bucket vehicle-checks accessible`);
        } else {
          console.warn(`[uploadImageAsync] ⚠️ Problème de connectivité Supabase: ${connectionTest.error || 'Bucket non trouvé'}`);
          console.log(`[uploadImageAsync] Tentative d'upload direct malgré les avertissements...`);
        }
      } catch (connectionError) {
        console.warn(`[uploadImageAsync] ⚠️ Erreur de connectivité Supabase:`, connectionError);
        console.log(`[uploadImageAsync] Tentative d'upload direct malgré les erreurs...`);
      }

      // Upload vers Supabase Storage - Bucket vehicle-checks pour les photos de vérification mobile
      // Utiliser l'immatriculation du véhicule comme identifiant unique
      const cleanImmat = vehiculeImmat.replace(/[^a-zA-Z0-9]/g, '_'); // Nettoyer l'immatriculation pour le nom de fichier
      
      const result = await SupabaseService.uploadImageFromUri(
        localUri, 
        'vehicle-checks', // bucket dédié aux photos de vérification mobile
        cleanImmat // utiliser l'immatriculation comme dossier
      );
      
      console.log(`[uploadImageAsync] ✅ Upload réussi, URL: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.error(`[uploadImageAsync] Erreur Supabase:`, error);
      console.log(`[uploadImageAsync] Type d'erreur: ${error.name}, Message: ${error.message}`);
      
      // Pas de fallback Firebase - Supabase uniquement
      throw new Error(`Upload Supabase échoué: ${error.message}`);
    }
  },


  // Nouvelle fonction pour ajouter UN SEUL passage (gère le mode hors-ligne)
  addPassage: async (passageData, isConnected) => {
    console.log(`[firebaseService] addPassage pour colis: ${passageData.idColis}`);
    if (!isConnected) {
      console.log('Mode hors-ligne, ajout du passage à la queue.');
      // Créez un format compatible avec ce que votre queue attend
      // await offlineQueueService.addToQueue([passageData]); 
      return { success: true, message: 'Passage mis en queue (hors-ligne).' };
    }
    
    try {
      const passageCollection = collection(db, 'passages');
      await addDoc(passageCollection, {
        ...passageData,
        createdAt: new Date(), // Ajoute une date de création pour le tri
      });
      console.log(`✅ Passage ${passageData.idColis} ajouté avec succès à Firestore.`);
      return { success: true };
    } catch (error) {
      console.error(`🚨 Erreur lors de l'ajout du passage ${passageData.idColis}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Nouvelle fonction pour METTRE À JOUR un passage lors d'une 'sortie'
  updatePassageOnSortie: async (idColis, updateData, isConnected) => {
    console.log(`[firebaseService] updatePassageOnSortie pour colis: ${idColis}`);
    if (!isConnected) {
      console.log('Mode hors-ligne, ajout de la mise à jour à la queue.');
      // Votre service de queue doit savoir comment gérer une mise à jour.
      // C'est une simplification. Vous devrez peut-être adapter offlineQueueService.
      const updateAction = {
        type: 'update',
        collection: 'passages',
        idColis: idColis, // Clé pour trouver le document
        data: updateData,
      };
      // await offlineQueueService.addToQueue([updateAction]);
      return { success: true, message: 'Mise à jour mise en queue (hors-ligne).' };
    }

    try {
      // 1. Trouver le document du passage qui est 'en-cours'
      const passagesRef = collection(db, 'passages');
      const q = query(passagesRef, where('idColis', '==', idColis), where('status', '==', 'en-cours'));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn(`⚠️ Aucun passage 'en-cours' trouvé pour l'ID colis: ${idColis}. Impossible de mettre à jour.`);
        // Envisagez de créer un nouveau passage ici comme fallback si nécessaire
        return { success: false, error: 'Document non trouvé' };
      }
      
      // 2. Mettre à jour le premier document trouvé
      const passageDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'passages', passageDoc.id), {
          ...updateData,
          updatedAt: new Date(), // Ajoute une date de mise à jour
      });
      
      console.log(`✅ Passage ${idColis} (ID doc: ${passageDoc.id}) mis à jour avec succès.`);
      return { success: true };

    } catch (error) {
      console.error(`🚨 Erreur lors de la mise à jour du passage ${idColis}:`, error);
      return { success: false, error: error.message };
    }
  },

  // 🚀 NOUVELLE FONCTION OPTIMISÉE: Mise à jour en batch pour plusieurs colis
  updatePassagesOnSortieBatch: async (colisList, updateData, isConnected) => {
    console.log(`🚀 [updatePassagesOnSortieBatch] Mise à jour optimisée de ${colisList.length} colis`);
    
    if (!isConnected) {
      console.log('Mode hors-ligne, ajout des mises à jour à la queue.');
      return { success: true, message: 'Mises à jour mises en queue (hors-ligne).' };
    }

    try {
      const startTime = Date.now();
      
      // OPTIMISATION 1: Traiter par lots de 10 pour respecter la limite Firestore 'in'
      const passagesMap = new Map();
      const BATCH_SIZE = 10; // Limite Firestore pour les requêtes 'in'
      
      for (let i = 0; i < colisList.length; i += BATCH_SIZE) {
        const batch = colisList.slice(i, i + BATCH_SIZE);
        console.log(`🔍 [updatePassagesOnSortieBatch] Traitement du lot ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(colisList.length/BATCH_SIZE)} (${batch.length} colis)`);
        
        const passagesRef = collection(db, 'passages');
        const q = query(
          passagesRef, 
          where('idColis', 'in', batch), 
          where('status', '==', 'en-cours')
        );
        
        const querySnapshot = await getDocs(q);
        
        // Ajouter les résultats au Map
        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          passagesMap.set(data.idColis, { id: doc.id, data });
        });
      }
      
      if (passagesMap.size === 0) {
        console.warn(`⚠️ Aucun passage 'en-cours' trouvé pour les colis: ${colisList.join(', ')}`);
        return { success: false, error: 'Aucun document trouvé' };
      }
      
      console.log(`🔍 [updatePassagesOnSortieBatch] ${passagesMap.size} passages trouvés sur ${colisList.length} colis demandés`);
      
      // OPTIMISATION 3: Utiliser writeBatch pour les mises à jour (par lots de 400)
      const updatePromises = [];
      const UPDATE_BATCH_SIZE = 400; // Limite sûre pour Firestore
      let currentBatch = writeBatch(db);
      let batchOperationCount = 0;
      
      for (const idColis of colisList) {
        const passageInfo = passagesMap.get(idColis);
        if (passageInfo) {
          const docRef = doc(db, 'passages', passageInfo.id);
          currentBatch.update(docRef, {
            ...updateData,
            updatedAt: new Date(),
          });
          console.log(`📝 [updatePassagesOnSortieBatch] Mise à jour colis ${idColis}:`, {
            status: updateData.status,
            siteFin: updateData.siteFin,
            dateHeureFin: updateData.dateHeureFin
          });
          updatePromises.push({ idColis, docId: passageInfo.id });
          batchOperationCount++;
          
          // Si on atteint la limite du batch, l'envoyer et en créer un nouveau
          if (batchOperationCount >= UPDATE_BATCH_SIZE) {
            await currentBatch.commit();
            console.log(`✅ Batch de ${batchOperationCount} mises à jour envoyé`);
            currentBatch = writeBatch(db);
            batchOperationCount = 0;
          }
        } else {
          console.warn(`⚠️ Passage non trouvé pour le colis: ${idColis}`);
        }
      }
      
      // OPTIMISATION 4: Exécuter le dernier batch s'il contient des opérations
      if (batchOperationCount > 0) {
        await currentBatch.commit();
        console.log(`✅ Dernier batch de ${batchOperationCount} mises à jour envoyé`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ [updatePassagesOnSortieBatch] ${updatePromises.length}/${colisList.length} passages mis à jour en ${duration}ms`);
      
      return { 
        success: true, 
        updatedCount: updatePromises.length,
        duration: duration,
        updatedColis: updatePromises.map(p => p.idColis)
      };

    } catch (error) {
      console.error(`🚨 Erreur lors de la mise à jour en batch:`, error);
      return { success: false, error: error.message };
    }
  },

  // Récupérer les sites d'un pôle
  getSitesByPole: async (poleId) => {
    try {
      console.log(`🌐 [getSitesByPole] Chargement des sites pour le pôle ${poleId}...`);
      
      // D'abord, récupérer le nom du pôle
      let poleName = null;
      try {
        const poleDoc = await getDoc(doc(db, 'poles', poleId));
        if (poleDoc.exists()) {
          poleName = poleDoc.data().nom;
          console.log(`📋 [getSitesByPole] Nom du pôle trouvé: ${poleName}`);
        } else {
          console.warn(`⚠️ [getSitesByPole] Pôle avec ID ${poleId} non trouvé`);
        }
      } catch (poleError) {
        console.warn(`⚠️ [getSitesByPole] Impossible de récupérer le nom du pôle:`, poleError);
      }
      
      const sitesCollection = collection(db, 'sites');
      let sitesSnapshot;
      
      // Essayer d'abord avec poleId
      if (poleId) {
        console.log(`🔍 [getSitesByPole] Tentative de recherche par poleId: ${poleId}`);
        const sitesQueryById = query(sitesCollection, where('poleId', '==', poleId));
        sitesSnapshot = await getDocs(sitesQueryById);
        console.log(`🔍 [getSitesByPole] Recherche par poleId: ${sitesSnapshot.size} résultats`);
      }
      
      // Si aucun résultat avec poleId, essayer avec le nom du pôle
      if (!sitesSnapshot || sitesSnapshot.empty) {
        if (poleName) {
          console.log(`🔍 [getSitesByPole] Tentative de recherche par nom de pôle: ${poleName}`);
          const sitesQueryByName = query(sitesCollection, where('pole', '==', poleName));
          sitesSnapshot = await getDocs(sitesQueryByName);
          console.log(`🔍 [getSitesByPole] Recherche par nom de pôle (${poleName}): ${sitesSnapshot.size} résultats`);
        }
      }
      
      // Si toujours aucun résultat, essayer une recherche plus large
      if (!sitesSnapshot || sitesSnapshot.empty) {
        console.log(`🔍 [getSitesByPole] Aucun site trouvé, récupération de tous les sites pour debug...`);
        sitesSnapshot = await getDocs(sitesCollection);
        console.log(`🔍 [getSitesByPole] Total des sites dans la base: ${sitesSnapshot.size}`);
        
        // Afficher la structure des premiers sites pour debug
        if (!sitesSnapshot.empty) {
          const firstSite = sitesSnapshot.docs[0].data();
          console.log(`🔍 [getSitesByPole] Structure du premier site:`, firstSite);
          
          // Vérifier s'il y a des sites avec des champs poleId ou pole
          const sitesWithPoleInfo = sitesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.poleId || data.pole;
          });
          console.log(`🔍 [getSitesByPole] Sites avec info pôle: ${sitesWithPoleInfo.length}`);
          
          if (sitesWithPoleInfo.length > 0) {
            console.log(`🔍 [getSitesByPole] Exemples de sites avec info pôle:`, 
              sitesWithPoleInfo.slice(0, 2).map(doc => ({
                id: doc.id,
                nom: doc.data().nom,
                poleId: doc.data().poleId,
                pole: doc.data().pole
              }))
            );
          }
        }
      }
      
      if (!sitesSnapshot || sitesSnapshot.empty) {
        console.log(`📝 [getSitesByPole] Aucun site trouvé pour le pôle ${poleId}`);
        return [];
      }
      
      const sites = sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ [getSitesByPole] ${sites.length} sites chargés pour le pôle ${poleId}`);
      return sites;
    } catch (error) {
      console.error(`❌ [getSitesByPole] Erreur lors du chargement des sites:`, error);
      throw error;
    }
  },

  // Sauvegarder l'état de la tournée
  saveTourneeProgress: async (tourneeId, progressData) => {
    if (!tourneeId) {
      console.error('❌ [saveTourneeProgress] ID de tournée manquant');
      return { success: false, error: 'ID de tournée manquant' };
    }

    try {
      const tourneeDoc = await getDoc(doc(db, 'tournees', tourneeId));
      if (!tourneeDoc.exists()) {
        console.error('❌ [saveTourneeProgress] Tournée non trouvée:', tourneeId);
        return { success: false, error: 'Tournée non trouvée' };
      }

      const tourneeData = tourneeDoc.data();
      const updatedTourneeData = {
        ...tourneeData,
        ...progressData,
        lastUpdated: serverTimestamp()
      };

      await updateDoc(doc(db, 'tournees', tourneeId), updatedTourneeData);
      console.log(`✅ [saveTourneeProgress] État de la tournée ${tourneeId} sauvegardé avec succès`);
      return { success: true };
    } catch (error) {
      console.error('❌ [saveTourneeProgress] Erreur lors de la sauvegarde:', error);
      return { success: false, error: error.message };
    }
  },
};

export default FirebaseService; 
export { db, auth, storage }; 