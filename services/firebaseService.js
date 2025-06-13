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
  serverTimestamp,
  orderBy,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Configuration Firebase - Mise à jour avec configuration valide
const firebaseConfig = {
  apiKey: "AIzaSyBWDncE18JG9yjPX4kxTbSB9wLPi2qcAOw",
  authDomain: "application-inovie-scan.firebaseapp.com",
  projectId: "application-inovie-scan",
  storageBucket: "application-inovie-scan.appspot.com",
  messagingSenderId: "703727839643",
  appId: "1:703727839643:web:f58c9241fb0d05a813593e"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
// Initialiser également firebase compat pour les anciennes API
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = getAuth(app);
const db = getFirestore(app);

// Clé pour le stockage local du token
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

const FirebaseService = {
  // Authentification
  login: async (email, password) => {
    try {
      console.log('Tentative de connexion avec:', email);
      
      // Vérifier d'abord si le compte est valide
      const auth = getAuth();
      console.log('Authentification initialisée');
      
      // Fermer toute session existante avant la connexion
      try {
        await FirebaseService.closeCurrentSession();
        console.log('Session précédente fermée automatiquement');
      } catch (sessionError) {
        console.log('Pas de session active à fermer ou erreur:', sessionError);
      }
      
      // Tentative de connexion
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connexion réussie, objet credential:', JSON.stringify({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        isAnonymous: userCredential.user.isAnonymous,
        emailVerified: userCredential.user.emailVerified
      }));
      
      const user = userCredential.user;
      
      // Stocker les informations utilisateur
      try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, user.uid);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
        email: user.email,
        uid: user.uid
      }));
        console.log('Informations utilisateur stockées avec succès');
      } catch (storageError) {
        console.error('Erreur lors du stockage des informations utilisateur:', storageError);
      }
      
      return user;
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
        userId: user.uid,
        email: user.email,
        selasId: finalSelasId,
        role: 'user', // Rôle par défaut
        createdAt: serverTimestamp()
      };
      
      // Enregistrer le profil dans Firestore
      await setDoc(doc(db, 'userProfiles', user.uid), userProfile);
      
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
      console.log('Donnees utilisateur récupérées depuis AsyncStorage:', userData);
      
      // Vérifier si l'utilisateur est toujours authentifié dans Firebase
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('Utilisateur actuel dans Firebase Auth:', currentUser ? 
                  `${currentUser.email} (${currentUser.uid})` : 'Aucun utilisateur connecté');
      
      if (!userData && !currentUser) {
        console.log('Aucune donnée utilisateur trouvée localement ni dans Firebase');
        return null;
      }
      
      // Si l'utilisateur est dans Firebase mais pas dans AsyncStorage, mettre à jour AsyncStorage
      if (currentUser && !userData) {
        console.log('Utilisateur Firebase trouvé mais pas dans AsyncStorage, mise à jour du stockage');
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
      console.log('Token d\'authentification trouvé dans AsyncStorage:', !!token);
      
      // Vérifier aussi dans Firebase
      const auth = getAuth();
      const isAuthInFirebase = !!auth.currentUser;
      console.log('Authentifié dans Firebase:', isAuthInFirebase);
      
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
      const selasId = await FirebaseService.getUserSelas();
      
      // Construire la requête avec filtres
      const scanCollection = collection(db, 'passages');
      let q;
      
      if (selasId) {
        // Si nous avons un selasId, filtre par selasId et userId
        q = query(
          scanCollection, 
          where('selasId', '==', selasId),
          where('userId', '==', userData.uid)
        );
      } else {
        // Sinon, filtre seulement par userId
        q = query(scanCollection, where('userId', '==', userData.uid));
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
        userId: userData.uid,
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
  getUserSelas: async () => {
    try {
      // D'abord vérifier si le selasId est stocké localement
      const selasId = await AsyncStorage.getItem('user_selas_id');
      if (selasId) {
        console.log('SELAS ID récupéré du stockage local:', selasId);
        return selasId;
      }
      
      // Sinon, essayer de le récupérer depuis Firestore
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Vérifier si l'utilisateur a un selasId dans sa collection userProfiles
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', userData.uid));
      
      if (userProfileDoc.exists() && userProfileDoc.data().selasId) {
        const selasId = userProfileDoc.data().selasId;
        // Stocker pour utilisation future
        await AsyncStorage.setItem('user_selas_id', selasId);
        console.log('SELAS ID récupéré du profil et stocké localement:', selasId);
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
          await updateDoc(doc(db, 'userProfiles', userData.uid), {
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

  // Récupérer toutes les SELAS disponibles
  getAllSelas: async () => {
    try {
      console.log('Récupération de toutes les SELAS...');
      
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
          active: selasData.active !== false, // Par défaut true si pas défini
          dateCreation: selasData.dateCreation,
          dateModification: selasData.dateModification,
          accesPages: selasData.accesPages || {},
          sitesAutorises: selasData.sitesAutorises || []
        });
      });
      
      console.log(`${selasList.length} SELAS récupérées:`, selasList.map(s => s.nom));
      return selasList;
    } catch (error) {
      console.error('Erreur lors de la récupération des SELAS:', error);
      throw error;
    }
  },
  
  // Ajouter des scans multiples à la collection 'passages'
  addScans: async (scansArray) => {
    console.log('addScans appelé avec:', JSON.stringify(scansArray, null, 2));
    try {
      const user = await FirebaseService.getCurrentUser();
      if (!user) {
        console.log('Utilisateur non connecté lors de l\'envoi des scans');
        return { success: false, error: 'Utilisateur non connecté' };
      }
      
      // Récupérer le profil utilisateur pour le nom
      const userProfile = await FirebaseService.getUserProfile();
      const userName = userProfile?.nom && userProfile?.prenom 
        ? `${userProfile.prenom} ${userProfile.nom}` 
        : user.email;
      
      // Récupérer la SELAS ID
      const selaId = await FirebaseService.getUserSelas();
      console.log('SELAS ID pour les scans:', selaId);
      
      // Récupérer la session active pour obtenir les informations de véhicule et tournée
      const sessionData = await FirebaseService.getCurrentSession();
      console.log('Session active récupérée:', sessionData ? 'Oui' : 'Non');
      
      // Formatage complet des données à envoyer
      const formattedScans = await Promise.all(scansArray.map(async scan => {
        // Utiliser les données de session si disponibles, sinon utiliser les données du scan
        let vehiculeName = sessionData?.vehicule?.immatriculation || scan.vehicule || '';
        const vehiculeId = sessionData?.vehicule?.id || scan.vehiculeId || '';
        const tourneeName = sessionData?.tournee?.nom || scan.tournee || '';
        const tourneeId = sessionData?.tournee?.id || scan.tourneeId || '';
        const siteName = sessionData?.tournee?.siteDepart || scan.site || scan.siteDepart || 'Non spécifié';
        
        // Récupérer les informations du pôle
        let poleId = '';
        let poleName = '';
        
        // D'abord essayer depuis les données du scan (qui peuvent venir du state local)
        if (scan.poleId && scan.poleName) {
          poleId = scan.poleId;
          poleName = scan.poleName;
          console.log('🎯 Pôle récupéré depuis les données du scan:', { poleId, poleName });
        }
        // Ensuite essayer depuis la session Firebase
        else if (sessionData?.poleId) {
          poleId = sessionData.poleId;
          console.log('🔍 ID du pôle trouvé dans la session:', poleId);
          
          // Récupérer le nom du pôle par son ID
          try {
            const poleDetails = await FirebaseService.getPoleById(poleId);
            if (poleDetails) {
              poleName = poleDetails.nom;
              console.log('✅ Nom du pôle récupéré:', poleName);
            } else {
              console.log('❌ Impossible de récupérer les détails du pôle');
            }
          } catch (poleError) {
            console.error('❌ Erreur lors de la récupération du pôle:', poleError);
          }
        }
        // Fallback: essayer les anciennes méthodes
        else {
          poleId = sessionData?.pole?.id || scan.poleId || '';
          poleName = sessionData?.pole?.nom || scan.pole || '';
        }
        
        console.log('Données de pôle utilisées:', { poleId, poleName });
        console.log('Source des données de pôle:', { 
          poleIdFromSession: sessionData?.poleId || sessionData?.pole?.id || 'Non disponible', 
          poleIdFromScan: scan.poleId || 'Non disponible',
          poleNameFromSession: sessionData?.pole?.nom || 'Non disponible',
          poleNameFromScan: scan.poleName || scan.pole || 'Non disponible'
        });
        
        // Si nous avons l'ID du véhicule mais pas son immatriculation, essayons de le récupérer
        if (vehiculeId && !vehiculeName) {
          try {
            console.log('Tentative de récupération des détails du véhicule depuis son ID:', vehiculeId);
            const vehiculeDetails = await FirebaseService.getVehiculeById(vehiculeId);
            if (vehiculeDetails && vehiculeDetails.immatriculation) {
              vehiculeName = vehiculeDetails.immatriculation;
              console.log('Immatriculation récupérée:', vehiculeName);
            }
          } catch (vehiculeError) {
            console.warn('Impossible de récupérer les détails du véhicule:', vehiculeError);
          }
        }
        
        console.log('Données utilisées pour le scan:', {
          vehiculeName,
          vehiculeId,
          tourneeName,
          tourneeId,
          siteName,
          poleId,
          poleName
        });
        
        const formattedScan = {
          idColis: scan.idColis || scan.code || '',
          scanDate: scan.scanDate || new Date().toISOString(),
          operationType: scan.operationType || 'entree',
          sessionId: scan.sessionId || '',
          coursierCharg: userName || user.email,
          coursierChargeantId: user.uid,
          dateHeureDepart: scan.scanDate || new Date().toISOString(),
          tournee: tourneeName,
          tourneeId: tourneeId,
          vehicule: vehiculeName,
          vehiculeId: vehiculeId,
          immatriculation: vehiculeName,
          site: siteName,
          siteDepart: siteName,
          siteDepartName: scan.siteDepartName || '',
          siteDépart: siteName,
          siteFin: scan.siteFin || 'Laboratoire Central',
          siteFinName: scan.siteFinName || '',
          selasId: selaId || null,
          poleId: poleId,
          poleName: poleName,
          location: scan.location || null,
          status: scan.operationType === 'sortie' ? 'livré' : 
                  scan.operationType === 'visite_sans_colis' ? 'visite-terminee' : 'en-cours', // Status basé sur le type d'opération
          userId: user.uid,
          createdAt: serverTimestamp()
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

        // IMPORTANT: S'assurer qu'aucun champ statut n'est présent (éviter les doublons)
        delete formattedScan.statut;

        return formattedScan;
      }));
      
      console.log('Données formatées pour Firestore:', JSON.stringify(formattedScans, null, 2));
      
      // Traiter chaque scan individuellement pour gérer les mises à jour
      const batch = writeBatch(db);
      let updatedCount = 0;
      let createdCount = 0;
      
      for (const formattedScan of formattedScans) {
        try {
          // Chercher si un passage existe déjà pour ce colis
          const passagesQuery = query(
            collection(db, 'passages'), 
            where('idColis', '==', formattedScan.idColis),
            where('selasId', '==', formattedScan.selasId)
          );
          const existingPassages = await getDocs(passagesQuery);
          
          if (!existingPassages.empty) {
            // Un passage existe déjà - le mettre à jour
            const existingDoc = existingPassages.docs[0];
            const existingData = existingDoc.data();
            
            console.log(`📝 Mise à jour du passage existant pour le colis ${formattedScan.idColis}`);
            
            // Préparer les données de mise à jour
            const updateData = {
              ...formattedScan,
              updatedAt: serverTimestamp()
            };
            
            // IMPORTANT: Supprimer explicitement le champ statut pour éviter les doublons
            delete updateData.statut;
            
            // Si c'est une sortie, mettre à jour les champs de livraison
            if (formattedScan.operationType === 'sortie') {
              updateData.status = 'livré';
              updateData.dateHeureFin = formattedScan.scanDate;
              updateData.siteFin = formattedScan.site;
              updateData.siteFinName = formattedScan.siteDepartName;
              updateData.coursierLivraison = formattedScan.coursierCharg;
              updateData.dateArrivee = new Date().toLocaleDateString('fr-FR');
              updateData.heureArrivee = new Date().toLocaleTimeString('fr-FR');
            }
            
            batch.update(doc(db, 'passages', existingDoc.id), updateData);
            updatedCount++;
          } else {
            // Aucun passage existant - créer un nouveau
            console.log(`➕ Création d'un nouveau passage pour le colis ${formattedScan.idColis}`);
            const newScanRef = doc(collection(db, 'passages'));
            batch.set(newScanRef, formattedScan);
            createdCount++;
          }
        } catch (error) {
          console.error(`❌ Erreur lors du traitement du colis ${formattedScan.idColis}:`, error);
        }
      }
      
      await batch.commit();
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
      const profileDoc = await getDoc(doc(db, 'userProfiles', userData.uid));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        
        // Si le profil n'a pas de selasId, essayer de le récupérer et mettre à jour le profil
        if (!profileData.selasId) {
          const selasId = await FirebaseService.getUserSelas();
          if (selasId) {
            // Mettre à jour le profil avec le selasId
            await updateDoc(doc(db, 'userProfiles', userData.uid), {
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
        const selasId = await FirebaseService.getUserSelas();
        
        const defaultProfile = {
          userId: userData.uid,
          email: userData.email,
          selasId: selasId, // Associer l'utilisateur à sa SELAS
          role: 'user', // Rôle par défaut
          createdAt: serverTimestamp()
        };
        
        // Créer le profil dans Firestore
        const profileRef = doc(db, 'userProfiles', userData.uid);
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
        const selasId = await FirebaseService.getUserSelas();
        if (selasId) {
          profileData.selasId = selasId;
        }
      }
      
      // Mettre à jour le profil dans Firestore
      const profileRef = doc(db, 'userProfiles', userData.uid);
      await updateDoc(profileRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      // Si un selasId est présent, le stocker localement
      if (profileData.selasId) {
        await AsyncStorage.setItem('user_selas_id', profileData.selasId);
      }
      
      return {
        userId: userData.uid,
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
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelas();
      console.log('SELAS ID pour filtrage des véhicules:', selasId);
      
      const vehiculesCollection = collection(db, 'vehicules');
      let querySnapshot;
      
      // Si nous avons un selasId, filtrer les véhicules par selasId
      if (selasId) {
        const q = query(vehiculesCollection, where('selasId', '==', selasId));
        querySnapshot = await getDocs(q);
        console.log(`Véhicules filtrés par SELAS ${selasId}: ${querySnapshot.size} trouvés`);
      } else {
        // Sinon, récupérer tous les véhicules
        querySnapshot = await getDocs(vehiculesCollection);
        console.log(`Tous les véhicules (pas de filtre SELAS): ${querySnapshot.size} trouvés`);
      }
      
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
      const selasId = await FirebaseService.getUserSelas().catch(() => "");
      
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
      const selasId = await FirebaseService.getUserSelas();
      
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
      const selasId = await FirebaseService.getUserSelas();
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
      const selasId = await FirebaseService.getUserSelas().catch(() => "");
      
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
      const selasId = await FirebaseService.getUserSelas();
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
        selasId: await FirebaseService.getUserSelas().catch(() => 'erreur')
      });
      throw error;
    }
  },
  
  // Fonction pour récupérer les véhicules filtrés par pôle
  getVehiculesByPole: async (poleId) => {
    try {
      console.log('Tentative de récupération des véhicules par pôle:', poleId);
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelas();
      
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
      const selasId = await FirebaseService.getUserSelas().catch(() => "");
      
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
      
      const sessionInfo = {
        userId: userData.uid,
        tourneeId: sessionData.tournee?.id,
        vehiculeId: sessionData.vehicule?.id,
        vehiculeCheck: sessionData.vehiculeCheck || null,
        startTime: serverTimestamp(),
        status: 'active'
      };
      
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
      
      // Mettre à jour la session comme terminée
      await updateDoc(doc(db, 'sessions', sessionId), {
        endTime: serverTimestamp(),
        status: 'completed'
      });
      
      // Supprimer la référence locale
      await AsyncStorage.removeItem('current_session_id');
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la fermeture de la session:', error);
      throw error;
    }
  },
  
  // Nouvelle fonction pour récupérer tous les utilisateurs de la même SELAS
  getUsersBySelasId: async () => {
    try {
      const userData = await FirebaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Récupérer le selasId de l'utilisateur actuel
      const selasId = await FirebaseService.getUserSelas();
      if (!selasId) {
        throw new Error('Aucune SELAS associée à cet utilisateur');
      }
      
      // Récupérer tous les utilisateurs de cette SELAS
      const userProfilesCollection = collection(db, 'userProfiles');
      const q = query(userProfilesCollection, where('selasId', '==', selasId));
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
      
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', userData.uid));
      if (!userProfileDoc.exists()) return false;
      
      const userRole = userProfileDoc.data().role;
      return userRole === 'admin' || userRole === 'superadmin';
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle administrateur:', error);
      return false;
    }
  },
  
  // Vérifie si un code de site existe dans Firestore
  verifySiteCode: async function(siteCode) {
    try {
      console.log(`Vérification du site: ${siteCode}`);
      
      if (!siteCode) {
        console.error("Code site manquant");
        return { valid: false, error: "Code site requis" };
      }

      const sitesRef = firebase.firestore().collection('sites');
      
      // 1. Essayer de trouver un site par son codeBarre exact
      console.log(`[verifySiteCode] Recherche par codeBarre: ${siteCode}`);
      const barcodeSnapshot = await sitesRef.where('codeBarre', '==', siteCode).get();
      
      if (!barcodeSnapshot.empty) {
        const siteData = barcodeSnapshot.docs[0].data();
        console.log(`[verifySiteCode] Site trouvé par codeBarre:`, siteData);
        return { 
          valid: true, 
          site: {
            id: barcodeSnapshot.docs[0].id,
            name: siteData.name || siteData.nom || "Site sans nom",
            address: siteData.address || siteData.adresse || "",
            city: siteData.city || siteData.ville || "",
            code: siteData.codeBarre || siteData.code || siteCode
          }
        };
      }

      // 2. Essayer de trouver un site par son code exact
      console.log(`[verifySiteCode] Recherche par code exact: ${siteCode}`);
      const siteSnapshot = await sitesRef.where('code', '==', siteCode).get();
      
      if (!siteSnapshot.empty) {
        const siteData = siteSnapshot.docs[0].data();
        console.log(`[verifySiteCode] Site trouvé par code exact:`, siteData);
        return { 
          valid: true, 
          site: {
            id: siteSnapshot.docs[0].id,
            name: siteData.name || siteData.nom || "Site sans nom",
            address: siteData.address || siteData.adresse || "",
            city: siteData.city || siteData.ville || "",
            code: siteData.codeBarre || siteData.code || siteCode
          }
        };
      }
      
      // 3. Essayer de chercher par ID (en enlevant le préfixe "SITE_" s'il existe)
      const siteId = siteCode.replace(/^SITE_?/i, '');
      console.log(`[verifySiteCode] Recherche par ID: ${siteId}`);
      const siteDoc = await sitesRef.doc(siteId).get();
      
      if (siteDoc.exists) {
        const siteData = siteDoc.data();
        console.log(`[verifySiteCode] Site trouvé par ID:`, siteData);
        return { 
          valid: true, 
          site: {
            id: siteDoc.id,
            name: siteData.name || siteData.nom || "Site sans nom",
            address: siteData.address || siteData.adresse || "",
            city: siteData.city || siteData.ville || "",
            code: siteData.codeBarre || siteData.code || siteCode
          }
        };
      }
      
      // 4. Recherche par nom (extraire la partie après "SITE_")
      const siteName = siteCode.replace(/^SITE_?/i, '');
      if (siteName && siteName !== siteCode) {
        console.log(`[verifySiteCode] Recherche par nom: ${siteName}`);
        
        // Recherche par nom exact
        const nameQuery = await sitesRef.where('name', '==', siteName).get();
        if (!nameQuery.empty) {
          const siteData = nameQuery.docs[0].data();
          console.log(`[verifySiteCode] Site trouvé par nom:`, siteData);
          return { 
            valid: true, 
            site: {
              id: nameQuery.docs[0].id,
              name: siteData.name || siteData.nom || "Site sans nom",
              address: siteData.address || siteData.adresse || "",
              city: siteData.city || siteData.ville || "",
              code: siteData.codeBarre || siteData.code || siteCode
            }
          };
        }
        
        // Recherche par nom (champ "nom" au lieu de "name")
        const nomQuery = await sitesRef.where('nom', '==', siteName).get();
        if (!nomQuery.empty) {
          const siteData = nomQuery.docs[0].data();
          console.log(`[verifySiteCode] Site trouvé par nom (champ 'nom'):`, siteData);
          return { 
            valid: true, 
            site: {
              id: nomQuery.docs[0].id,
              name: siteData.name || siteData.nom || "Site sans nom",
              address: siteData.address || siteData.adresse || "",
              city: siteData.city || siteData.ville || "",
              code: siteData.codeBarre || siteData.code || siteCode
            }
          };
        }
      }
      
      // 5. Recherche flexible - tous les sites pour débugger
      console.log(`[verifySiteCode] Recherche flexible - récupération de tous les sites pour debug`);
      const allSitesQuery = await sitesRef.limit(10).get();
      console.log(`[verifySiteCode] Nombre total de sites trouvés: ${allSitesQuery.size}`);
      
      allSitesQuery.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[verifySiteCode] Site ${index + 1}:`, {
          id: doc.id,
          code: data.code,
          codeBarre: data.codeBarre,
          name: data.name,
          nom: data.nom,
          address: data.address,
          adresse: data.adresse
        });
      });
      
      // 6. Recherche plus flexible par contenu partiel
      const searchTerms = [
        siteName.toLowerCase(),
        siteCode.toLowerCase(),
        siteCode.replace(/^SITE_?/i, '').toLowerCase()
      ];
      
      for (const term of searchTerms) {
        if (term && term.length > 2) {
          console.log(`[verifySiteCode] Recherche flexible avec terme: ${term}`);
          
          // Recherche dans les sites existants
          for (const doc of allSitesQuery.docs) {
            const data = doc.data();
            const siteName = (data.name || data.nom || '').toLowerCase();
            const siteCode = (data.code || '').toLowerCase();
            const codeBarreValue = (data.codeBarre || '').toLowerCase();
            
            if (siteName.includes(term) || siteCode.includes(term) || codeBarreValue.includes(term)) {
              console.log(`[verifySiteCode] Site trouvé par recherche flexible:`, data);
              return { 
                valid: true, 
                site: {
                  id: doc.id,
                  name: data.name || data.nom || "Site sans nom",
                  address: data.address || data.adresse || "",
                  city: data.city || data.ville || "",
                  code: data.codeBarre || data.code || siteCode
                }
              };
            }
          }
        }
      }
      
      console.log(`Aucun site trouvé avec le code: ${siteCode}`);
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
        console.log(`❌ [getSiteWithPole] Site non trouvé avec l'ID: ${siteId}`);
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
        userId: sessionResult.userId,
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
        console.log(`Site non trouvé avec l'ID: ${siteId}`);
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
      const userName = userProfile?.nom && userProfile?.prenom 
        ? `${userProfile.prenom} ${userProfile.nom}` 
        : user.email;
      
      const selaId = await FirebaseService.getUserSelas();
      
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
        pole: bigSacocheData.pole?.id || bigSacocheData.poleId || '',
        poleName: bigSacocheData.pole?.nom || bigSacocheData.poleName || '',
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
        pole: bigSacocheData.pole?.id || bigSacocheData.poleId || contenant.pole || '',
        poleName: bigSacocheData.pole?.nom || bigSacocheData.poleName || contenant.poleName || '',
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

  // Fonction pour récupérer une tournée avec ses sites et leur statut de visite
  getTourneeWithSites: async (tourneeId, sessionId) => {
    try {
      console.log(`Récupération de la tournée ${tourneeId} avec sites pour la session ${sessionId}`);
      
      // Récupérer les détails de la tournée
      const tourneeDoc = await getDoc(doc(db, 'tournees', tourneeId));
      if (!tourneeDoc.exists()) {
        throw new Error('Tournée non trouvée');
      }
      
      const tourneeData = tourneeDoc.data();
      
      // Récupérer les sites de la tournée
      let sitesWithStatus = [];
      if (tourneeData.sites && Array.isArray(tourneeData.sites)) {
        console.log(`[getTourneeWithSites] Traitement de ${tourneeData.sites.length} sites pour la tournée`);
        
        // Pour chaque site de la tournée, récupérer ses détails et vérifier s'il a été visité
        sitesWithStatus = await Promise.all(
          tourneeData.sites.map(async (siteRef, index) => {
            try {
              // Si c'est un objet avec id, utiliser directement l'id
              const siteId = siteRef.id || siteRef;
              console.log(`[getTourneeWithSites] Traitement du site ${index + 1}: ${siteId}`);
              
              // Récupérer les détails du site
              const siteDoc = await getDoc(doc(db, 'sites', siteId));
              const siteData = siteDoc.exists() ? siteDoc.data() : {};
              
              if (siteDoc.exists()) {
                console.log(`[getTourneeWithSites] Site ${siteId} trouvé:`, {
                  nom: siteData.nom || siteData.name,
                  adresse: siteData.adresse || siteData.address,
                  ville: siteData.ville || siteData.city,
                  roadbook: siteData.roadbook ? 'PRÉSENT' : 'ABSENT',
                  roadbookKeys: siteData.roadbook ? Object.keys(siteData.roadbook) : 'N/A'
                });
              } else {
                console.warn(`[getTourneeWithSites] Site ${siteId} non trouvé dans la collection sites`);
              }
              
              // Vérifier si le site a été visité dans cette session
              let visited = false;
              if (sessionId) {
                try {
                  // Récupérer les données de session pour vérifier les visites
                  const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
                  if (sessionDoc.exists()) {
                    const sessionData = sessionDoc.data();
                    const visitedSiteIdentifiers = sessionData.visitedSiteIdentifiers || [];
                    
                    // Vérifier si ce site (avec cet index) a été visité
                    const uniqueVisitId = `${siteId}_${index}`;
                    visited = visitedSiteIdentifiers.includes(uniqueVisitId);
                    
                    console.log(`[getTourneeWithSites] Site ${siteId} (index ${index}): visité = ${visited}`);
                  }
                } catch (sessionError) {
                  console.warn(`[getTourneeWithSites] Erreur lors de la vérification des visites pour le site ${siteId}:`, sessionError);
                  visited = false;
                }
              }
              
              const siteWithStatus = {
                id: siteId,
                nom: siteData.nom || siteData.name || `Site ${index + 1}`,
                name: siteData.nom || siteData.name || `Site ${index + 1}`, // Alias pour compatibilité
                adresse: siteData.adresse || siteData.address || '',
                address: siteData.adresse || siteData.address || '', // Alias pour compatibilité
                ville: siteData.ville || siteData.city || '',
                city: siteData.ville || siteData.city || '', // Alias pour compatibilité
                ordre: siteRef.ordre || index + 1,
                heureArrivee: siteRef.heureArrivee,
                visited: visited,
                uniqueDisplayId: `${siteId}_${index}`, // Pour le système de suivi local
                roadbook: siteData.roadbook || null // Ajouter les données roadbook
              };
              
              console.log(`[getTourneeWithSites] Site formaté:`, siteWithStatus);
              return siteWithStatus;
              
            } catch (error) {
              console.warn(`Erreur lors de la récupération du site ${siteRef.id || siteRef}:`, error);
              return {
                id: siteRef.id || siteRef,
                nom: `Site ${index + 1}`,
                adresse: '',
                ville: '',
                ordre: siteRef.ordre || index + 1,
                heureArrivee: siteRef.heureArrivee,
                visited: false,
                uniqueDisplayId: `${siteRef.id || siteRef}_${index}`
              };
            }
          })
        );
      } else {
        console.warn('[getTourneeWithSites] Aucun site trouvé dans tourneeData.sites');
      }
      
      const result = {
        id: tourneeDoc.id,
        nom: tourneeData.nom,
        sites: tourneeData.sites,
        sitesWithStatus: sitesWithStatus,
        ...tourneeData
      };
      
      console.log(`[getTourneeWithSites] Résultat final:`, {
        id: result.id,
        nom: result.nom,
        sitesCount: result.sitesWithStatus.length,
        sampleSites: result.sitesWithStatus.slice(0, 2) // Montrer 2 premiers sites
      });
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération de la tournée avec sites:', error);
      throw error;
    }
  },

  // Fonction pour récupérer les scans en cours pour une tournée
  getScansEnCours: async (tourneeId) => {
    try {
      console.log(`Récupération des scans en cours pour la tournée ${tourneeId}`);
      
      // Récupérer le selasId associé à l'utilisateur
      const selasId = await FirebaseService.getUserSelas();
      
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
      const selasId = await FirebaseService.getUserSelas();
      
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
      
      console.log(`${allScans.length} scans trouvés au total`);
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
        visitedSiteIdentifiers: sessionData.visitedSiteIdentifiers?.length || 0
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
  }
};

export default FirebaseService; 