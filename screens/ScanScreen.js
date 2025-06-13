import React, { useState, useEffect, useImperativeHandle, forwardRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Image,
  Keyboard,
  ScrollView,
  Platform,
  InteractionManager,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from '../services/firebaseService';
import dateUtils from '../utils/dateUtils';
import CustomView from '../components/CustomView';
import TourneeProgress from '../components/TourneeProgress';
import ScanHistoryItem from '../components/ScanHistoryItem';
import scannerService from '../services/scannerService'; // Import du nouveau service

// --- NOUVELLES IMPORTATIONS ---
// SUPPRIMÉ: L'import statique est remplacé par un require conditionnel
// import DataWedgeIntents from 'react-native-datawedge-intents';

// --- CHARGEMENT CONDITIONNEL DE DATAWEDGE ---
let DataWedgeIntents = null;
if (Platform.OS === 'android') {
  try {
    // On tente de charger la bibliothèque uniquement sur Android
    DataWedgeIntents = require('react-native-datawedge-intents');
  } catch (error) {
    // Si ça échoue (pas un appareil Zebra), on log l'erreur et on continue.
    // DataWedgeIntents restera `null`, ce qui désactivera les fonctionnalités de scan.
    console.log("Le module 'react-native-datawedge-intents' n'a pas pu être chargé. Fonctionnalités de scan Zebra désactivées.", error);
  }
}
// --- FIN DU CHARGEMENT CONDITIONNEL ---

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

export default function ScanScreen({ navigation, route }) {
  const sessionData = route.params?.sessionData || {}; // ✅ Sécurise `sessionData`

  // Déplacer la définition de resetScan AVANT useLayoutEffect
  const resetScan = () => {
    setScanMode('');
    setSiteScanned(false);
    setSiteCode('');
    setScannedContenants([]);
    setManualCodeInput('');
    setSiteDetails(null);
    // S'assurer que la sélection du type d'opération est masquée
    setShowOperationTypeSelection(false); 
    // Effacer les messages d'erreur potentiels
    setErrorMessage('');
  };

  // Personnalisation de l'en-tête pour le bouton retour
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            resetScan(); 
            navigation.goBack(); // AJOUTÉ: Navigation vers l'écran précédent
          }}
          style={{ marginLeft: 15, padding: 5 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" /> 
        </TouchableOpacity>
      ),
    });
  }, [navigation, resetScan]);

  // ✅ Vérifie si `sessionData.tournee` et `sessionData.vehicule` existent
  const tournee = sessionData.tournee ? sessionData.tournee.nom || "Tournée inconnue" : "Tournée inconnue";
  const vehicule = sessionData.vehicule ? sessionData.vehicule.immatriculation || "Véhicule inconnu" : "Véhicule inconnu";
  // ID de la tournée pour le suivi
  const tourneeId = sessionData.tournee ? sessionData.tournee.id : null;

  const [siteScanned, setSiteScanned] = useState(false);
  const [siteCode, setSiteCode] = useState('');
  const [scannedContenants, setScannedContenants] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historicalScans, setHistoricalScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [siteDetails, setSiteDetails] = useState(null);
  const [isReadyForScan, setIsReadyForScan] = useState(false);
  const [scanMode, setScanMode] = useState(''); // 'site' ou 'contenant'
  const [scanning, setScanning] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [pole, setPole] = useState(null);
  const [sessionHistoryLoaded, setSessionHistoryLoaded] = useState(false);
  const [operationType, setOperationType] = useState('entree'); // 'entree' ou 'sortie'
  const [showOperationTypeSelection, setShowOperationTypeSelection] = useState(false); // Nouvel état pour la page de sélection
  const [takingCarePackages, setTakingCarePackages] = useState([]); // Paquets pris en charge
  // Ajouter l'état pour l'ID de session courant
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // États pour les informations de session qui seront chargées
  const [currentTourneeName, setCurrentTourneeName] = useState(route.params?.tournee?.nom || route.params?.tourneeName || sessionData?.tournee?.nom || "Tournée inconnue");
  // Simplifier l'initialisation, la logique principale sera dans useEffect
  const [currentVehiculeImmat, setCurrentVehiculeImmat] = useState("Véhicule inconnu");
  const [currentVehiculeId, setCurrentVehiculeId] = useState(null); // NOUVEL ÉTAT pour l'ID du véhicule
  const [currentTourneeId, setCurrentTourneeId] = useState(route.params?.tourneeId || sessionData?.tournee?.id || null); // RÉINTRODUIT : ID de la tournée
  // NOUVEL ETAT pour le nom de l'utilisateur
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Chargement...");

  // Réduire les logs inutiles
  // AMÉLIORATION DU CONSOLE.LOG CUSTOM
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.log = (...args) => {
    const messageString = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    // Rétablir le filtre normal après confirmation, pour l'instant on laisse les DEBUG_SESSION passer.
    // if (messageString.includes('[TourneeProgress]') || messageString.includes('[loadHistoricalData]') || messageString.includes('restaurés depuis la tournée') || messageString.includes('sauvegardés pour la tournée')) {
    //   if (!messageString.includes('[DEBUG_SESSION]')) { 
    //     return; 
    //   }
    // }
    originalConsoleLog.apply(console, args);
  };
  console.info = (...args) => {
    originalConsoleInfo.apply(console, args);
  };
  console.warn = (...args) => {
    originalConsoleWarn.apply(console, args);
  };
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
  };
  // FIN AMÉLIORATION CONSOLE.LOG

  // Limiter les appels de log pour éviter les répétitions
  const logTourneeProgress = (message) => {
    if (!message.includes('restaurés depuis la tournée') && !message.includes('sauvegardés pour la tournée')) {
      console.log(message);
    }
  };

  // Remplacer les appels de console.log par logTourneeProgress
  logTourneeProgress(`[TourneeProgress] 1 sites visités restaurés depuis la tournée ${currentTourneeId}`);
  logTourneeProgress(`[TourneeProgress] 1 sites visités sauvegardés pour la tournée ${currentTourneeId}`);

  // Effet pour initialiser la session au démarrage OU récupérer la session passée
  useEffect(() => {
    const initializeOrUseExistingSession = async () => {
      let sessionIdFromParams = route.params?.sessionId;
      let sessionToUse = null;

      if (sessionIdFromParams) {
        console.log(`[SessionInit] Utilisation de l'ID de session depuis les paramètres: ${sessionIdFromParams}`);
        const storedSessionId = await AsyncStorage.getItem('current_session_id');
        if (storedSessionId !== sessionIdFromParams) {
          await AsyncStorage.setItem('current_session_id', sessionIdFromParams);
          console.log(`[SessionInit] AsyncStorage mis à jour avec l'ID des paramètres.`);
        }
        sessionToUse = sessionIdFromParams;
      } else {
        console.log("[SessionInit] Utilisation de l'ID de session depuis AsyncStorage");
        const storedSessionId = await AsyncStorage.getItem('current_session_id');
        if (storedSessionId) {
          console.log(`[SessionInit] ID de session trouvé dans AsyncStorage: ${storedSessionId}`);
          sessionToUse = storedSessionId;
        } else {
          console.log("[SessionInit] Aucun ID de session trouvé ; le scan est désactivé jusqu'à la création de la session");
          return;  // Sortir si pas de session initialisée
        }
      }

      // Mettre à jour l'état React avec l'ID de session final
      setCurrentSessionId(sessionToUse);
      console.log(`[SessionInit] État currentSessionId mis à jour: ${sessionToUse}`);
      // Marquer la session comme active pour charger l'historique Firestore ultérieurement
      await AsyncStorage.setItem('userSessionActive', 'true');

      // Récupérer les informations complètes de la session ET le nom de l'utilisateur
      try {
        const [currentSession, userProfile] = await Promise.all([
          firebaseService.getCurrentSession(),
          firebaseService.getUserProfile() // Récupérer le profil utilisateur
        ]);
        
        // Traiter le nom de l'utilisateur
        if (userProfile) {
          if (userProfile.prenom && userProfile.nom) {
            setCurrentUserDisplayName(`${userProfile.prenom} ${userProfile.nom}`);
          } else if (userProfile.email) {
            setCurrentUserDisplayName(userProfile.email);
          } else {
            setCurrentUserDisplayName("Utilisateur");
          }
          console.log(`[SessionInit] Nom utilisateur mis à jour: ${currentUserDisplayName}`);
        } else {
          const userData = await firebaseService.getCurrentUser();
          setCurrentUserDisplayName(userData?.email || "Utilisateur inconnu");
          console.log(`[SessionInit] Profil utilisateur non trouvé, fallback sur email: ${currentUserDisplayName}`);
        }

        console.log('[SessionInit] Contenu brut de currentSession:', JSON.stringify(currentSession)); // Garder ce log

        if (currentSession) {
          console.log('[SessionInit] currentSession EXISTE.'); // NOUVEAU LOG
          // Mettre à jour l'ID de la tournée - Essayer d'abord le champ direct, puis l'objet
          if (currentSession.tourneeId) {
            setCurrentTourneeId(currentSession.tourneeId);
            console.log(`[SessionInit] ID de tournée mis à jour depuis currentSession.tourneeId: ${currentSession.tourneeId}`);
          } else if (currentSession.tournee?.id) {
            setCurrentTourneeId(currentSession.tournee.id);
            console.log(`[SessionInit] ID de tournée mis à jour depuis currentSession.tournee.id: ${currentSession.tournee.id}`);
          } else {
            console.warn('[SessionInit] Aucun ID de tournée trouvé');
          }
          
          // Mettre à jour le nom de la tournée
          if (currentSession.tournee?.nom) {
            setCurrentTourneeName(currentSession.tournee.nom);
            console.log(`[SessionInit] Nom de tournée mis à jour: ${currentSession.tournee.nom}`);
          } else {
            console.warn('[SessionInit] Nom de tournée non trouvé');
          } 
          
          // Mettre à jour l'immatriculation du véhicule
          if (currentSession.vehicule) {
            console.info('[DEBUG_SESSION] Dans ScanScreen, avant évaluation vehicule.registrationNumber:');
            console.info('[DEBUG_SESSION] currentSession.vehicule (ScanScreen): ', currentSession.vehicule);
            // NOUVEAU: Mettre à jour l'ID du véhicule
            if (currentSession.vehicule.id) {
              setCurrentVehiculeId(currentSession.vehicule.id);
              console.info(`[DEBUG_SESSION] setCurrentVehiculeId appelé avec (ScanScreen): ${currentSession.vehicule.id}`);
            } else {
              setCurrentVehiculeId(null); // S'assurer qu'il est null si non trouvé
              console.info('[DEBUG_SESSION] currentSession.vehicule.id est MANQUANT (ScanScreen).');
            }

            let vehiculeDisplay = "Véhicule inconnu";
            if (currentSession.vehicule.registrationNumber && typeof currentSession.vehicule.registrationNumber === 'string' && currentSession.vehicule.registrationNumber.trim() !== '') {
              console.info('[DEBUG_SESSION] Utilisation de currentSession.vehicule.registrationNumber (ScanScreen):', currentSession.vehicule.registrationNumber);
              vehiculeDisplay = currentSession.vehicule.registrationNumber;
            } else {
              console.info('[DEBUG_SESSION] currentSession.vehicule.registrationNumber est MANQUANTE ou invalide (ScanScreen). Affichage: "Véhicule inconnu". Véhicule brut:', currentSession.vehicule);
            }
            setCurrentVehiculeImmat(vehiculeDisplay);
            console.info(`[DEBUG_SESSION] setCurrentVehiculeImmat appelée avec (ScanScreen): ${vehiculeDisplay}`);
          } else { 
            console.info('[DEBUG_SESSION] currentSession.vehicule est MANQUANT (ScanScreen).'); 
            setCurrentVehiculeImmat("Véhicule inconnu"); 
            setCurrentVehiculeId(null); // S'assurer qu'il est null si l'objet vehicule est manquant
          }

          // Mettre à jour les informations du pôle à partir de la session récupérée de Firestore
          // currentSession ici est la variable locale qui contient le résultat de firebaseService.getCurrentSession()
          // sessionData ici est le paramètre de la fonction initializeOrUseExistingSession (provenant de route.params)
          if (currentSession && currentSession.poleId) {
            const poleIdToUse = currentSession.poleId;
            let poleNameToUse = '';

            // Essayer de trouver poleName dans currentSession.vehicule
            if (currentSession.vehicule && currentSession.vehicule.poleId === poleIdToUse && currentSession.vehicule.poleName) {
                poleNameToUse = currentSession.vehicule.poleName;
            } else {
                console.warn(`[DEBUG_SESSION] poleName non trouvé dans currentSession.vehicule pour poleId: ${poleIdToUse}.`);
            }
            
            // Fallback sur sessionData (route.params) si le nom n'a pas été trouvé dans la session de Firestore
            // et que les ID correspondent.
            if (!poleNameToUse && sessionData && sessionData.pole && sessionData.pole.id === poleIdToUse && sessionData.pole.nom) {
                poleNameToUse = sessionData.pole.nom;
                console.info(`[DEBUG_SESSION] poleName trouvé dans sessionData.pole (route.params) pour poleId: ${poleIdToUse}`);
            }

            const poleObject = { id: poleIdToUse, nom: poleNameToUse || '' }; // Assurer que nom n'est pas undefined
            setPole(poleObject);
            if (poleNameToUse) {
                console.info(`[DEBUG_SESSION] Pôle mis à jour (ScanScreen): ID=${poleObject.id}, Nom=${poleObject.nom}`);
            } else {
                console.warn(`[DEBUG_SESSION] Pôle mis à jour avec ID ${poleObject.id} mais NOM NON TROUVÉ. L'objet pole sera { id: '${poleObject.id}', nom: '' }. (ScanScreen)`);
            }

          } else {
            // Si currentSession (la session fetchée) n'a pas poleId, vérifier les route.params (sessionData) comme fallback complet.
            if (sessionData && sessionData.pole && sessionData.pole.id && sessionData.pole.nom) {
                setPole(sessionData.pole); // Doit être un objet {id, nom}
                console.info(`[DEBUG_SESSION] Pôle mis à jour depuis sessionData.pole (route.params) car la session fetchée n'avait pas poleId (ScanScreen):`, sessionData.pole);
            } else {
                console.warn('[DEBUG_SESSION] Aucune information de pôle (ni poleId dans session fetchée, ni pole object complet dans route.params) trouvée. Pôle initialisé à null. (ScanScreen)');
                setPole(null); // Aucun pôle trouvé, mettre à null
            }
          }

        } else {
           console.info('[DEBUG_SESSION] currentSession est NULL ou UNDEFINED (ScanScreen).'); 
        }
      } catch (error) {
        console.error("[SessionInit] ERREUR lors de la récupération/traitement de la session:", error); // Modifié pour plus de clarté
      }

      // Charger les données historiques une fois l'ID de session défini
      await loadHistoricalData();
      // Forcer la mise à jour du suivi de tournée pour réafficher les coches
      if (tourneeProgressRef.current?.loadTourneeDetails) {
        await tourneeProgressRef.current.loadTourneeDetails(true);
      }
    };

    initializeOrUseExistingSession();
  }, [route.params?.sessionId]);

  // Effet pour détecter le paramètre refresh et rafraîchir les données
  useEffect(() => {
    if (route.params?.refresh) {
      console.log("Rafraîchissement déclenché par le bouton d'en-tête:", route.params.refresh);
      refreshTourneeData();
    }
  }, [route.params?.refresh]);

  // Surveiller les changements de route.params pour détecter quand le bouton d'historique est pressé
  useEffect(() => {
    if (route.params?.showHistory) {
      setShowHistoryModal(true);
      // Réinitialiser le paramètre pour éviter de rouvrir la modale si on navigue ailleurs puis revient
      navigation.setParams({ showHistory: false });
    }
  }, [route.params?.showHistory]);

  // Chargement des scans historiques au démarrage et récupération des paquets en cours
  useEffect(() => {
    loadHistoricalData();
  }, []);

  // Nouvel effet pour recharger les données quand currentTourneeId change
  useEffect(() => {
    if (currentTourneeId) {
      console.log(`[ScanScreen] currentTourneeId mis à jour: ${currentTourneeId}, rechargement des paquets en charge`);
      // Charger seulement les paquets, pas tout l'historique pour éviter la boucle
      loadTakingCarePackages();
    }
  }, [currentTourneeId]);

  // Fonction pour charger tous les données d'historique et de paquets en cours
  const loadHistoricalData = async () => {
    console.log('[loadHistoricalData] Début du chargement des données historiques');
    
    // Charger l'historique des scans
    await loadHistoricalScans();
    await loadFirestoreScans();
    
    // Charger les paquets pris en charge seulement si on a un ID de tournée
    if (currentTourneeId) {
      await loadTakingCarePackages();
    } else {
      console.log('[loadHistoricalData] Pas d\'ID de tournée, paquets non chargés');
    }
  };

  const loadHistoricalScans = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('scanHistory');
      if (jsonValue !== null) {
        const history = JSON.parse(jsonValue);
        
        // Récupérer l'ID de la tournée actuelle
        const currentSession = await firebaseService.getCurrentSession();
        const currentTourneeId = currentSession?.tournee?.id || sessionData?.tournee?.id || '';
        
        // Filtrer l'historique local
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Début de la journée
        
        const filteredHistory = history.filter(item => {
          // Convertir la date de l'item en objet Date
          let itemDate;
          try {
            itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
              // Si la date n'est pas valide, essayer un autre format
              const parts = item.date.split('/');
              if (parts.length === 3) {
                itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
              }
            }
          } catch (e) {
            // En cas d'erreur, considérer cet item comme non valide pour le filtre
            return false;
          }

          // S'assurer que nous avons une date valide
          if (!itemDate || isNaN(itemDate.getTime())) return false;
          
          itemDate.setHours(0, 0, 0, 0); // Normaliser à minuit
          
          // Vérifier la tournée
          const isSameTournee = !currentTourneeId || item.tourneeId === currentTourneeId;
          
          // MODIFICATION DU FILTRE DE STATUT ET TYPE
          // Assumons que 'item' a 'type' (équivalent à operationType) et 'status'
          const isActualPackage = (item.type === 'entree' || item.type === 'sortie') &&
                                  (item.status === 'en-cours' || item.status === 'livré') &&
                                  item.idColis && // ou item.code si idColis n'est pas encore standardisé dans l'historique AsyncStorage
                                  !(item.idColis || item.code || '').startsWith('VISITE_SITE_') &&
                                  !(item.idColis || item.code || '').startsWith('SITE_');

          return itemDate.getTime() === today.getTime() && isSameTournee && isActualPackage;
        });
        
        console.log(`Historique local filtré: ${filteredHistory.length} scans (jour + tournée + statut)`);
        
        // Consolider l'historique filtré avant de mettre à jour l'état
        const consolidatedHistory = consolidateAndSortScans([], filteredHistory);

        // Enrichir avec le nom complet du site depuis Firestore
        const enrichedHistory = await Promise.all(
          consolidatedHistory.map(async (scan) => {
            // Tenter de récupérer les détails du site en utilisant siteId ou code
            try {
              const siteIdentifier = scan.siteId || scan.code; // Utiliser ID ou code
              // Vérifier si l'identifiant est probablement un site avant d'appeler getSiteById
              if (siteIdentifier && 
                  !siteIdentifier.startsWith('TEST_CONTENANT_') && 
                  !siteIdentifier.match(/^[0-9]{13,}$/)) { 
                const siteInfo = await firebaseService.getSiteById(siteIdentifier);
                if (siteInfo) {
                  // Enrichir le scan avec les détails complets
                  return { 
                    ...scan, 
                    siteName: siteInfo.nom || siteInfo.name, // Ajouter le nom pour affichage facile
                    siteDetails: { ...siteInfo } 
                  };
                }
              }
            } catch (e) {
              console.warn(`[loadHistoricalScans] Erreur récupération détails site pour ${scan.code || scan.id}:`, e);
            }
            // Si non trouvé ou erreur, retourner le scan original
            return scan;
          })
        );
        
        // Mettre à jour l'état avec l'historique enrichi
        setHistoricalScans(enrichedHistory);
        setSessionHistoryLoaded(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const loadFirestoreScans = async () => {
    try {
      // On ne charge les scans Firestore que si la session est active
      const userSessionActive = await AsyncStorage.getItem('userSessionActive');
      if (userSessionActive !== 'true') {
        // Si aucune session active, on ne charge pas l'historique Firestore
        return;
      }

      // Récupérer l'ID de session actuel
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');
      console.log('Chargement des scans pour la session:', currentSessionId);

      // S'assurer que currentTourneeId est disponible pour le filtrage
      if (!currentTourneeId) {
        console.warn('[loadFirestoreScans] currentTourneeId est null, chargement de tous les scans disponibles.');
        // Ne pas s'arrêter, continuer avec tous les scans disponibles
      }
      console.log('[loadFirestoreScans] Chargement de l\'historique Firestore pour la tournée:', currentTourneeId);

      setLoading(true); // Afficher l'indicateur de chargement

      // Récupérer les scans filtrés par la tournée actuelle (ou tous si pas d'ID)
      const scans = currentTourneeId 
        ? await firebaseService.getScans(currentTourneeId)
        : await firebaseService.getAllScans();
      
      if (scans && scans.length > 0) {
        // Ne garder que les scans du jour (J0)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Début de la journée
        
        const filteredScans = scans.filter(scan => {
          // Convertir la date du scan en objet Date
          const scanDate = dateUtils.convertTimestampToDate(scan.scanDate || scan.createdAt);
          if (!scanDate) return false;
          
          // Récupérer juste la date (sans l'heure)
          const scanDateOnly = new Date(scanDate);
          scanDateOnly.setHours(0, 0, 0, 0);
          
          // Le filtrage par tournée est maintenant fait côté service, donc isSameTournee n'est plus nécessaire ici
          // const isSameTournee = !currentTourneeId || scan.tourneeId === currentTourneeId;
          
          // MODIFICATION DU FILTRE DE STATUT ET TYPE
          const isActualPackage = (scan.operationType === 'entree' || scan.operationType === 'sortie') &&
                                  (scan.status === 'en-cours' || scan.status === 'livré') &&
                                  scan.idColis && 
                                  !scan.idColis.startsWith('VISITE_SITE_') && 
                                  !scan.idColis.startsWith('SITE_');
          
          return scanDateOnly.getTime() === today.getTime() && isActualPackage; // isSameTournee retiré du retour
        });
        
        // Convertir les scans Firestore filtrés en format compatible avec l'historique local
        const formattedScans = filteredScans.map(scan => {
          // Déduire le statut si manquant, basé sur le type d'opération
          let status = scan.status;
          if (!status) {
            status = scan.operationType === 'sortie' ? 'livré' : 'en-cours';
          }
          
          return {
            id: scan.id || Date.now().toString(),
            // MODIFICATION ICI
            code: scan.idColis || scan.code, // Utiliser idColis en priorité
            idColis: scan.idColis,          // S'assurer que idColis est là
            // FIN MODIFICATION
            timeStamp: dateUtils.formatTime(scan.scanDate || scan.createdAt),
            date: dateUtils.formatDate(scan.scanDate || scan.createdAt),
            site: scan.site,
            fromFirestore: true,
            sessionId: scan.sessionId,
            // Utiliser le statut (corrigé si nécessaire)
            status: status, 
            // S'assurer que le type est aussi présent
            type: scan.operationType || (status === 'livré' ? 'sortie' : 'entree'), 
            tournee: scan.tournee || '',
            tourneeId: scan.tourneeId || '',
            scanDate: scan.scanDate ? dateUtils.convertTimestampToDate(scan.scanDate).toISOString() : (scan.createdAt ? dateUtils.convertTimestampToDate(scan.createdAt).toISOString() : new Date().toISOString()) // Garder une date ISO pour le tri
          };
        });
        
        // Consolider et trier
        const consolidatedScans = consolidateAndSortScans(historicalScans, formattedScans);
        // Enrichir avec le nom complet du site depuis Firestore
        const enrichedScans = await Promise.all(
          consolidatedScans.map(async (scan) => {
            try {
              // Tenter de récupérer les détails du site
              try {
                // Utiliser l'ID du site si disponible, sinon le code barre
                const siteIdentifier = scan.siteId || scan.code; // Assumer que siteId existe
                if (siteIdentifier && 
                    !siteIdentifier.startsWith('TEST_CONTENANT_') && 
                    !siteIdentifier.match(/^[0-9]{13,}$/)) {
                  // Utiliser une variable locale au lieu de réassigner l'état siteDetails
                  const siteInfo = await firebaseService.getSiteById(siteIdentifier); 
                  if (siteInfo) {
                    // Modifier l'objet scan directement
                    scan.siteName = siteInfo.nom || siteInfo.name; // Utiliser le nom du site s'il est trouvé
                    scan.siteDetails = siteInfo; // Ajouter les détails au scan
                  } else {
                     // Si siteInfo est null, indiquer le nom comme code
                     scan.siteName = scan.code; 
                  }
                } else {
                   scan.siteName = scan.code; // Fallback si aucun identifiant
                }
              } catch (siteError) {
                console.warn(`[loadFirestoreScans] Impossible de récupérer les détails du site pour l'identifiant ${scan.siteId || scan.code}:`, siteError);
                scan.siteName = scan.code; // Afficher le code si erreur
              }
              
              // Ne récupérer les informations sur le site que s'il ne s'agit pas d'un conteneur
              if (scan.site && 
                  !scan.site.startsWith('TEST_CONTENANT_') && 
                  !scan.site.match(/^[0-9]{13,}$/)) {
                const siteInfo = await firebaseService.getSiteById(scan.site);
                if (siteInfo) return { ...scan, siteDetails: { ...siteInfo } };
              }
            } catch (e) {
              console.error('Erreur récupération nom site Firestore:', e);
            }
            return scan;
          })
        );
        
        // Mettre à jour l'état avec l'historique enrichi
        setHistoricalScans(enrichedScans);
        setSessionHistoryLoaded(true);
        
        // Sauvegarder également dans AsyncStorage pour la persistance locale temporaire
        await AsyncStorage.setItem('scanHistory', JSON.stringify(enrichedScans));
      }
      
      setLoading(false); // Masquer l'indicateur de chargement
    } catch (error) {
      console.error('Erreur lors du chargement des scans depuis Firestore:', error);
      setLoading(false); // Masquer l'indicateur de chargement en cas d'erreur
    }
  };

  // --- AJOUTER CETTE FONCTION D'AIDE --- 
  // Fonction pour consolider et trier les scans
  const consolidateAndSortScans = (existingScans, newScans) => {
    const map = new Map();

    // Ajouter les scans existants à la map
    existingScans.forEach(scan => {
      // MODIFICATION ICI
      if (scan.idColis) map.set(scan.idColis, scan); // Utiliser idColis
      // FIN MODIFICATION
    });

    // Mettre à jour ou ajouter les nouveaux scans
    newScans.forEach(scan => {
      // MODIFICATION ICI
      if (scan.idColis) map.set(scan.idColis, scan); // Utiliser idColis
      // FIN MODIFICATION
    });

    // Convertir la map en tableau
    const consolidated = Array.from(map.values());

    // Trier
    consolidated.sort((a, b) => {
      const dateA = a.scanDate ? new Date(a.scanDate).getTime() : 0;
      const dateB = b.scanDate ? new Date(b.scanDate).getTime() : 0;
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
    });

    return consolidated;
  };
  // --- FIN DE L'AJOUT ---

  const loadTakingCarePackages = async () => {
    try {
      // S'assurer que currentTourneeId est disponible
      if (!currentTourneeId) {
        console.log('[loadTakingCarePackages] Pas d\'ID de tournée, nettoyage des paquets');
        setTakingCarePackages([]); // Vider les paquets si pas d'ID de tournée pour éviter la confusion
        return;
      }
      
      console.log(`[loadTakingCarePackages] Chargement des paquets pris en charge pour la tournée: ${currentTourneeId}`);
      const scansEnCours = await firebaseService.getScansEnCours(currentTourneeId);

      // Mapper pour s'assurer que 'code' et 'idColis' sont présents et cohérents
      const mappedScans = scansEnCours.map(s => ({
        ...s,
        code: s.idColis || s.code,
        idColis: s.idColis
      }));

      // Filtrer pour ne garder QUE les véritables colis en cours de prise en charge
      const filteredScans = mappedScans.filter(scan =>
        scan.operationType === 'entree' && // Doit être une opération d'entrée
        scan.status === 'en-cours' &&      // Doit être en cours
        scan.idColis && 
        !scan.idColis.startsWith('VISITE_') && 
        !scan.idColis.startsWith('SITE_') &&
        !scan.idColis.startsWith('TEST_') // Exclure les tests aussi
      );

      console.log(`✅ ${filteredScans.length} paquet(s) pris en charge trouvés`);
      setTakingCarePackages(filteredScans);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des paquets pris en charge:', error);
      setTakingCarePackages([]); // Vider en cas d'erreur
    }
  };

  // 🔹 Simulation d'un scan avec des sites valides
  const simulateScan = () => {
    if (scanMode === 'site') {
      // Sites de test qui seront reconnus comme valides
      const sitesDemoValides = [
        'SITE123',
        'SITE456',
        'SITE789',
        'LAB001',
        '12345'
      ];
      
      // Sélectionner un site aléatoire parmi les sites valides pour la démo
      return sitesDemoValides[Math.floor(Math.random() * sitesDemoValides.length)];
    } else {
      // Si on est en mode sortie (dépôt), on doit scanner un colis déjà pris en charge
      if (operationType === 'sortie') {
        // Si on est en mode sortie (dépôt), on doit scanner un colis déjà pris en charge
        if (takingCarePackages.length > 0) {
          // Sélectionner un colis aléatoire parmi les colis pris en charge
          const randomPackage = takingCarePackages[Math.floor(Math.random() * takingCarePackages.length)];
          // Prioriser idColis, puis code, puis une chaîne vide si aucun n'est défini
          return randomPackage.idColis || randomPackage.code || ''; 
        } else {
          // Aucun colis disponible pour le dépôt - cette condition est gérée en amont dans handleSimulatedScan
          return ''; 
        }
      } else {
        // Simuler un scan de contenant pour prise en charge
        // Utiliser un préfixe spécifique pour les tests afin de pouvoir les identifier facilement
        const testId = Date.now(); // Utiliser le timestamp actuel pour créer un ID unique
        return `TEST_CONTENANT_${testId}`;
      }
    }
  };

  // Modification pour les tests : fonction mock qui simule verifySiteCode
  const mockVerifySiteCode = async (siteCode) => {
    // Sites de test qui seront automatiquement validés
    const sitesDemoValides = {
      'SITE123': { nom: 'Site Test 1', adresse: '123 Rue Principale', ville: 'Paris', codePostal: '75001' },
      'SITE456': { nom: 'Site Test 2', adresse: '456 Avenue République', ville: 'Lyon', codePostal: '69001' },
      'SITE789': { nom: 'Site Test 3', adresse: '789 Boulevard des Tests', ville: 'Toulouse', codePostal: '31000' },
      '12345': { nom: 'Laboratoire Central', adresse: '12 Rue des Sciences', ville: 'Montpellier', codePostal: '34000' },
      'LAB001': { nom: 'Laboratoire Mobile', adresse: 'Zone Industrielle', ville: 'Bordeaux', codePostal: '33000' }
    };

    // Vérifier si le code scanné est dans notre liste de sites de test
    if (sitesDemoValides[siteCode]) {
      // Retourner une structure simulant la réponse de Firebase
      return {
        valid: true,
        site: {
          id: `mock_${siteCode}`,
          code: siteCode,
          nom: sitesDemoValides[siteCode].nom,
          adresse: sitesDemoValides[siteCode].adresse,
          ville: sitesDemoValides[siteCode].ville,
          codePostal: sitesDemoValides[siteCode].codePostal
        }
      };
    }

    // Si ce n'est pas un site de test, passer à la vérification normale dans Firebase
    return await firebaseService.verifySiteCode(siteCode);
  };

  const processScannedData = async (data) => {
    console.log('Code scanné:', data);
    try {
      // Cas 1: Nous n'avons pas encore scanné de site
      if (!siteScanned && scanMode === 'site') {
        console.log('[processScannedData] Mode: Scan de site. Données:', data);
        const siteVerification = await firebaseService.verifySiteCode(data);
        console.log('[processScannedData] Résultat de verifySiteCode:', JSON.stringify(siteVerification));

        if (siteVerification.site) {
          // Toujours enregistrer les infos du site et préparer pour les opérations si le site est valide
          setSiteCode(data);
          setSiteDetails(siteVerification.site);
          
          // Récupérer le pôle de la session courante
          console.log('[processScannedData] DÉBUT récupération du pôle depuis la session');
          try {
            // D'abord essayer de récupérer le pôle depuis la session courante
            const currentSession = await firebaseService.getCurrentSession();
            console.log('[processScannedData] Session courante:', currentSession ? 'trouvée' : 'non trouvée');
            
            let sessionPole = null;
            
            if (currentSession && currentSession.poleId) {
              console.log('[processScannedData] ID du pôle depuis la session:', currentSession.poleId);
              
              // Récupérer les détails du pôle par son ID
              const poleDetails = await firebaseService.getPoleById(currentSession.poleId);
              if (poleDetails) {
                sessionPole = {
                  id: poleDetails.id,
                  nom: poleDetails.nom
                };
                console.log('[processScannedData] ✅ Pôle récupéré depuis la session:', sessionPole);
              } else {
                console.log('[processScannedData] ❌ Impossible de récupérer les détails du pôle avec ID:', currentSession.poleId);
              }
            } else {
              console.log('[processScannedData] ⚠️ Pas d\'ID de pôle dans la session courante');
            }
            
            // Fallback: essayer de récupérer le pôle depuis le state local
            if (!sessionPole && pole && pole.id) {
              console.log('[processScannedData] 🔄 Fallback: utilisation du pôle depuis le state local:', pole);
              sessionPole = pole;
            }
            
            // Fallback: essayer de récupérer le pôle depuis le site
            if (!sessionPole) {
              console.log('[processScannedData] 🔄 Fallback: tentative de récupération du pôle depuis le site');
              const siteWithPole = await firebaseService.getSiteWithPole(siteVerification.site.id);
              if (siteWithPole && siteWithPole.pole) {
                sessionPole = siteWithPole.pole;
                console.log('[processScannedData] 📍 Pôle récupéré depuis le site:', sessionPole);
              }
            }
            
            if (sessionPole) {
              setPole(sessionPole);
              console.log('[processScannedData] 🏁 setPole appelé avec:', sessionPole);
            } else {
              console.log('[processScannedData] ❌ Aucun pôle trouvé (ni session, ni state, ni site)');
              setPole(null);
            }
          } catch (error) {
            console.error('[processScannedData] ❌ Erreur lors de la récupération du pôle:', error);
            setPole(null);
          }

          let occurrenceIndex = -1; // Initialiser à -1 (aucune occurrence non visitée trouvée par défaut)
          if (tourneeProgressRef.current?.getSitesWithStatus) {
            const sitesList = tourneeProgressRef.current.getSitesWithStatus();
            console.log('[processScannedData] sitesList depuis tourneeProgressRef:', JSON.stringify(sitesList.map(s => ({ id: s.id, name: s.name, visited: s.visited, uniqueDisplayId: s.uniqueDisplayId }))));
            const siteNameToFind = siteVerification.site.nom || siteVerification.site.name;
            console.log('[processScannedData] Nom du site à trouver:', siteNameToFind);

            // Trouver le premier site non visité avec ce nom
            occurrenceIndex = sitesList.findIndex(s => !s.visited && (s.name === siteNameToFind || s.nom === siteNameToFind));
            console.log(`[processScannedData] Occurrence index trouvée pour ${siteNameToFind}:`, occurrenceIndex);
          } else {
            console.warn('[processScannedData] tourneeProgressRef.current.getSitesWithStatus non disponible.');
            // Ne pas bloquer ici, permettre de scanner le site même si la liste de tournée n'est pas dispo pour le marquage.
            // L'utilisateur pourra toujours faire des opérations sur le site.
          }

          // Si une occurrence non visitée est trouvée, la marquer
          if (occurrenceIndex !== -1) {
            const identifier = siteVerification.site.id || (siteVerification.site.code || data);
            console.log('[processScannedData] Identifier pour markSiteVisitedInSession:', identifier);
            console.log('[processScannedData] currentSessionId avant appel:', currentSessionId);
            console.log('[processScannedData] occurrenceIndex avant appel:', occurrenceIndex);

            if (!currentSessionId) {
              console.error('[processScannedData] ID de session manquant avant markSiteVisitedInSession');
              Alert.alert('Erreur Critique', 'ID de session manquant. Impossible de continuer.');
              // Réinitialiser pour permettre un nouveau scan de site si erreur critique
              setSiteScanned(false);
              setSiteDetails(null);
              setSiteCode('');
              setShowOperationTypeSelection(false);
              return;
            }
            
            const markSuccess = await firebaseService.markSiteVisitedInSession(currentSessionId, identifier, occurrenceIndex);
            console.log('[processScannedData] Résultat de markSiteVisitedInSession:', markSuccess);
            
            if (markSuccess) {
              if (tourneeProgressRef.current?.markSiteAsVisitedLocally) {
                console.log('[processScannedData] Appel de markSiteAsVisitedLocally avec:', identifier, occurrenceIndex);
                await tourneeProgressRef.current.markSiteAsVisitedLocally(identifier, occurrenceIndex);
              } else if (tourneeProgressRef.current?.loadTourneeDetails) {
                console.log('[processScannedData] Appel de loadTourneeDetails(true) car markSiteAsVisitedLocally non dispo.');
                await tourneeProgressRef.current.loadTourneeDetails(true);
              }
            } else {
              Alert.alert('Erreur', 'Échec du marquage du site comme visité dans la session Firestore.');
              // Ne pas bloquer la suite, l'utilisateur peut vouloir faire des opérations quand même.
            }
          } else {
            // Aucune occurrence non visitée trouvée (occurrenceIndex === -1)
            // Cela signifie que toutes les instances de ce site dans la tournée sont déjà marquées comme visitées,
            // ou que la liste des sites n'était pas disponible.
            // On ne modifie pas les coches, mais on permet de continuer.
            console.log('[processScannedData] Aucune occurrence non visitée à marquer pour ce site. Passage aux opérations.');
          }

          // Toujours permettre les opérations sur le site si le code site est valide
          setSiteScanned(true);
          setScanMode(''); 
          setShowOperationTypeSelection(true);
          return;

        } else { // siteVerification.site est null/undefined
          console.log('[processScannedData] Aucun site valide retourné par verifySiteCode pour le code:', data);
          Alert.alert('Site Inconnu', 'Le code scanné ne correspond à aucun site connu.');
           // Réinitialiser pour permettre un nouveau scan
          setSiteScanned(false);
          setSiteDetails(null);
          setSiteCode('');
          setShowOperationTypeSelection(false);
        }
      }
      
      // Cas 2: Site déjà scanné, nous scannons maintenant un contenant
      if (siteScanned && scanMode === 'contenant') {
        console.log('[processScannedData] Mode: Scan de contenant. Données:', data);
        handleContenantScan(data);
        // Rester en mode scan contenant pour permettre les scans multiples
        setScanMode('contenant');
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du scan:', error);
      setErrorMessage('Erreur: ' + error.message); // Afficher l'erreur à l'utilisateur
      setScanMode(''); // Réinitialiser le mode scan
      // Optionnel: réinitialiser d'autres états si nécessaire
      setSiteScanned(false);
      setSiteDetails(null);
      setSiteCode('');
      setShowOperationTypeSelection(false);
    }
  };

  // Gérer la simulation d'un scan (pour le développement et les tests)
  const handleSimulatedScan = () => {
    // Vérifier si on est en mode sortie sans colis pris en charge
    if (scanMode === 'contenant' && operationType === 'sortie' && takingCarePackages.length === 0) {
      Alert.alert(
        "Aucun colis disponible",
        "Vous n'avez aucun colis en prise en charge à déposer.",
        [{ text: "OK" }]
      );
      return;
    }
    
    const fakeData = simulateScan();
    if (fakeData) {
      console.log(`Simulation de scan avec données: ${fakeData}`);
    processScannedData(fakeData);
    } else {
      console.error("Erreur lors de la simulation du scan: aucune donnée générée");
      Alert.alert(
        "Erreur",
        "Impossible de simuler un scan. Veuillez réessayer.",
        [{ text: "OK" }]
      );
    }
  };

  const handleManualScan = () => {
    if (manualCodeInput.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer un code valide');
      return;
    }
    
    processScannedData(manualCodeInput.trim());
    setManualCodeInput('');
  };

  const activateSiteScan = () => {
    setScanMode('site');
    setErrorMessage('');
    setIsReadyForScan(true);
    
    // Montrer une alerte avec plusieurs options pour scanner
    Alert.alert(
      "Scanner un site",
      "Comment souhaitez-vous scanner le site ?",
      [
        {
          text: "Scanner manuellement",
          onPress: () => showManualSiteInput()
        },
        {
          text: "Simuler scan",
          onPress: handleSimulatedScan
        },
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => setScanMode('')
        }
      ]
    );
  };

  // Fonction pour afficher une boîte de dialogue pour saisir manuellement le code du site
  const showManualSiteInput = () => {
    // Utiliser Alert.prompt sur iOS, mais sur Android, cette fonction n'existe pas
    // donc nous utilisons une méthode alternative
    if (Platform.OS === 'ios') {
      Alert.prompt(
        "Scanner site manuellement",
        "Entrez le code ou le nom du site",
        [
          { text: "Annuler", onPress: () => setScanMode(''), style: "cancel" },
          { 
            text: "Scanner", 
            onPress: (code) => {
              if (code && code.trim()) {
                processScannedData(code.trim());
              } else {
                setScanMode('');
                Alert.alert("Erreur", "Veuillez entrer un code de site valide");
              }
            }
          }
        ],
        "plain-text"
      );
    } else {
      // Sur Android, utiliser une solution simple avec TextInput
      Alert.alert(
        "Scanner site manuellement",
        "Entrez le code du site dans le champ de texte en haut de l'écran, puis appuyez sur Scanner",
        [
          { text: "OK" }
        ]
      );
      // Focus sur le champ de saisie manuelle
      // Note: ceci est une approche simplifiée, une solution plus robuste
      // utiliserait un modal personnalisé avec TextInput
      setManualCodeInput('');
      // On garde le mode scan actif pour que le bouton scanner manuel fonctionne
    }
  };

  // Afficher la page de sélection du type d'opération
  const showOperationSelection = () => {
    setShowOperationTypeSelection(true);
  };

  // Commencer le scan de contenant avec un type d'opération spécifique
  const startContenantScan = (type) => {
    setOperationType(type);
    setShowOperationTypeSelection(false);
    setScanMode('contenant');
    setErrorMessage('');
    setIsReadyForScan(true);
    
    // Message différent selon le type d'opération
    const message = type === 'entree' 
      ? "Veuillez scanner le code du contenant à prendre en charge" 
      : "Veuillez scanner le code du contenant à déposer";
    
    Alert.alert(
      type === 'entree' ? "Prise en charge" : "Dépôt",
      message,
      [{ text: "Annuler", onPress: () => setScanMode('') }]
    );
  };

  const handleContenantScan = async (code) => {
    if (!siteScanned) {
      Alert.alert('Erreur', 'Veuillez d\'abord scanner un site');
      return;
    }

    try {
      // Mode dépôt (sortie) - vérifier que le colis est dans la liste des colis pris en charge
      if (operationType === 'sortie') {
        // MODIFICATION ICI
        const isInTakingCare = takingCarePackages.some(pkg => (pkg.idColis || pkg.code) === code);
        // FIN MODIFICATION
        if (!isInTakingCare) {
          Alert.alert(
            "Colis non reconnu",
            "Ce colis ne fait pas partie des colis que vous avez en prise en charge.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // MODIFICATION ICI
        setTakingCarePackages(takingCarePackages.filter(pkg => (pkg.idColis || pkg.code) !== code));
        // FIN MODIFICATION
      }

      // Obtenir la date actuelle au format approprié
      const currentDate = new Date();
      const currentDateISO = currentDate.toISOString();

      // Ajouter le contenant à la liste
      const newContenant = {
        id: Date.now().toString(),
        code: code,
        idColis: code,
        timeStamp: currentDate.toLocaleTimeString(),
        date: currentDate.toLocaleDateString(),
        scanDate: currentDateISO,
        site: siteCode,
        type: operationType, // Ajout du type d'opération (entrée/sortie)
      };
      
      setScannedContenants([newContenant, ...scannedContenants]);
    } catch (error) {
      console.error('Erreur lors de la gestion du scan:', error);
      setScanMode('');
    }
  };

  const renderScannedItem = ({ item }) => (
    <View style={[styles.contenantItem, item.type === 'sortie' ? styles.contenantItemSortie : styles.contenantItemEntree]}>
      <View style={styles.contenantInfo}>
        <Text style={styles.contenantCode}>{item.idColis || item.code}</Text>
        <View style={styles.contenantTypeRow}>
          <View style={item.type === 'sortie' ? styles.typeTagSortie : styles.typeTagEntree}>
            <Text style={styles.typeTagText}>{item.type === 'sortie' ? 'Dépôt' : 'Prise en charge'}</Text>
          </View>
          <Text style={styles.contenantTime}>{item.timeStamp}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteContenantButton}
        onPress={() => removeScannedContenant(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );

  const removeScannedContenant = (id) => {
    setScannedContenants(scannedContenants.filter(contenant => contenant.id !== id));
  };

  const handleTransmit = async () => {
    if (scannedContenants.length === 0) {
      Alert.alert('Attention', 'Aucun contenant scanné à transmettre.');
      return;
    }

    setLoading(true);

    try {
      // Vérifier et afficher les données de la session pour le débogage
      console.log('Données de session:', JSON.stringify(sessionData, null, 2));
      console.log('Données de route:', JSON.stringify(route.params, null, 2));
      
      // Récupérer les données de la tournée et du véhicule avec plus de vérifications
      const tourneeName = sessionData.tournee?.nom || route.params?.tournee?.nom || '';
      const tourneeId = sessionData.tournee?.id || route.params?.tournee?.id || '';
      const vehiculeName = sessionData.vehicule?.immatriculation || route.params?.vehicule?.immatriculation || '';
      const vehiculeId = sessionData.vehicule?.id || route.params?.vehicule?.id || '';
      
      // Utiliser les détails du site validé s'ils sont disponibles
      let siteName, siteId, siteAdresse, siteCodePostal, siteVille;
      
      if (siteDetails) {
        // Utiliser les bonnes clés du siteDetails (nommage uniforme)
        siteName = siteDetails.name || siteCode;
        siteId = siteDetails.id || '';
        siteAdresse = siteDetails.address || '';
        siteCodePostal = siteDetails.codePostal || '';
        siteVille = siteDetails.city || '';
      } else {
        // Sinon on utilise ce qu'on a par défaut
        siteName = sessionData.tournee?.siteDepart || route.params?.tournee?.siteDepart || siteCode || 'Non spécifié';
        siteId = '';
      }
      
      console.log('Données récupérées pour les scans:', {
        tourneeName,
        tourneeId,
        vehiculeName,
        vehiculeId,
        siteName,
        siteId,
        siteCode
      });

      // Récupérer l'ID de session actuel
      const currentSessionId = await AsyncStorage.getItem('currentSessionId') || `session_${Date.now()}`;
      
      // Récupérer l'ID utilisateur une seule fois avant le map
      const currentUserId = await firebaseService.getCurrentUserId();

      // Préparer les scans avec tous les champs nécessaires
      const scansToSubmit = scannedContenants.map(scan => {
        const scanDate = scan.scanDate || new Date().toISOString();
        const scanType = scan.type || operationType; // Utilise le type du scan ou le type d'opération global

        // S'assurer que scan.code a une valeur valide (au moins une chaîne vide)
        const currentScanCode = scan.code === undefined || scan.code === null ? '' : scan.code;
        if (currentScanCode === '') {
            console.warn('[handleTransmit] Le code du contenant original (scan.code) est vide ou undefined. idColis sera une chaîne vide. Scan original:', scan);
        }

        // Log pour déboguer la valeur du pôle au moment de la transmission
        console.log('[handleTransmit] Valeur actuelle de pole:', JSON.stringify(pole, null, 2));
        
        // Rationalisation des champs pour l'objet scanItem
        let scanItem = {
          // Assurer que idColis est toujours une chaîne
          idColis: currentScanCode, 
          scanDate: scanDate,
          operationType: scanType, 
          sessionId: currentSessionId,
          
          siteDepart: siteDetails?.id || siteCode, 
          siteDepartName: siteDetails?.name || siteDetails?.nom || '',

          coursierChargeantId: currentUserId,
          coursierCharg: currentUserDisplayName,

          tourneeId: currentTourneeId || '',
          tourneeName: currentTourneeName || '', 

          vehiculeId: currentVehiculeId || '',
          immatriculation: currentVehiculeImmat || '', 

          poleId: pole?.id || '',
          poleName: pole?.nom || '',
        };
        
        // Gestion spécifique pour les opérations de sortie (dépôt de colis)
        if (scanType === 'sortie') {
          const currentDate = new Date();
          
          scanItem.siteFin = siteDetails?.id || siteCode; 
          scanItem.siteFinName = siteDetails?.name || siteDetails?.nom || '';
          scanItem.dateHeureFin = currentDate.toISOString();
          scanItem.dateArrivee = currentDate.toLocaleDateString(); 
          scanItem.heureArrivee = currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); 
          scanItem.coursierLivraison = currentUserDisplayName; 
        }
        
        if (siteDetails) {
          scanItem.siteDepartDetails = { 
            adresse: siteDetails.address || '',
            codePostal: siteDetails.codePostal || '',
            ville: siteDetails.city || ''
          };
        }

        if (sessionData.location) {
          scanItem.location = {
            latitude: sessionData.location.coords.latitude,
            longitude: sessionData.location.coords.longitude,
            accuracy: sessionData.location.coords.accuracy
          };
        }

        // Supprimer les champs potentiellement redondants ou anciens.
        // VEUILLEZ VÉRIFIER QUE LA LIGNE SUIVANTE EST BIEN DÉCOMMENTÉE ET PRÉSENTE :

        // Logs de débogage détaillés pour la propriété 'code'
        if (scanItem.hasOwnProperty('code')) {
            console.log(`[handleTransmit] AVANT delete: scanItem.code EXISTE. Valeur:`, scanItem.code);
        } else {
            console.log(`[handleTransmit] AVANT delete: scanItem.code N'EXISTE PAS.`);
        }

        delete scanItem.code; 

        if (scanItem.hasOwnProperty('code')) {
            console.error(`[handleTransmit] APRÈS delete: scanItem.code EXISTE TOUJOURS! Valeur:`, scanItem.code);
        } else {
            console.log(`[handleTransmit] APRÈS delete: scanItem.code a été supprimé ou n'existait pas.`);
        }
        // Pour un débogage plus fin si l'erreur persiste :
        // if (scanItem.hasOwnProperty('code')) {
        //     console.error("[handleTransmit] DEBUG: scanItem.code existe TOUJOURS après delete!", scanItem.code);
        // } else {
        //     console.log("[handleTransmit] DEBUG: scanItem.code supprimé ou n'existait pas.");
        // }

        return scanItem;
      });
      
      // Afficher les données qui seront transmises (gardez cette ligne active pour le débogage)
      console.log('Transmission des scans (après map et delete):', JSON.stringify(scansToSubmit, null, 2));
      
      // Envoyer les scans à Firebase
      const result = await firebaseService.addScans(scansToSubmit);
      console.log('Résultat de la transmission:', result);
      
      // Si la transmission réussit, mettre à jour l'historique local
      if (result.success) {
        // --- Logique de consolidation --- 
        const updatedScansMap = new Map();
        historicalScans.forEach(scan => {
          // Assurer qu'on a un code pour la clé de la map
          if (scan.idColis) { // MODIFIÉ: Utiliser idColis au lieu de scan.code
            updatedScansMap.set(scan.idColis, scan); // MODIFIÉ: Utiliser idColis
          }
        });
        scansToSubmit.forEach(scan => {
          if (scan.idColis) { // MODIFIÉ: Utiliser idColis au lieu de scan.code
            const originalScan = scannedContenants.find(s => s.code === scan.idColis); // MODIFIÉ: Comparer avec scan.idColis
            const scanForHistory = {
              ...scan,
              timeStamp: originalScan?.timeStamp || dateUtils.formatTime(scan.scanDate),
            };
            updatedScansMap.set(scan.idColis, scanForHistory); // MODIFIÉ: Utiliser idColis
          }
        });
        const newHistory = Array.from(updatedScansMap.values());
        newHistory.sort((a, b) => {
          const dateA = a.scanDate ? new Date(a.scanDate).getTime() : 0;
          const dateB = b.scanDate ? new Date(b.scanDate).getTime() : 0;
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateB - dateA;
        });
        // --- Fin de la logique de consolidation ---

        // Sauvegarder l'historique consolidé dans AsyncStorage
        await AsyncStorage.setItem('scanHistory', JSON.stringify(newHistory));
        
        // Mise à jour de l'état React DIFFÉRÉE après les interactions
        InteractionManager.runAfterInteractions(() => {
          setHistoricalScans(newHistory);
        });
        
        // Mettre à jour la liste des paquets pris en charge
        if (operationType === 'entree') {
          setTakingCarePackages([...scansToSubmit, ...takingCarePackages]);
        } else if (operationType === 'sortie') {
          const codesDeposited = scansToSubmit.map(scan => scan.idColis); // MODIFIÉ: Utiliser idColis
          setTakingCarePackages(takingCarePackages.filter(pkg => pkg.idColis && !codesDeposited.includes(pkg.idColis))); // MODIFIÉ: Utiliser idColis
        }
        
        // Réinitialiser complètement l'état pour revenir à l'écran de scan de site
        resetScan(); // Cette fonction réinitialise les états de base

        // S'assurer que tous les états sont correctement réinitialisés pour revenir à l'écran initial
        setShowOperationTypeSelection(false);
        setOperationType('entree'); // Réinitialiser à l'entrée de colis par défaut
        
        // Important: Désactiver le chargement AVANT l'alerte
        setLoading(false);
        
        // Afficher l'alerte de succès
        Alert.alert(
          'Succès',
          `${scansToSubmit.length} scan(s) transmis avec succès`,
          [{ text: 'OK' }]
        );
      } else {
        setLoading(false);
        throw new Error(result.error || 'Échec de la transmission');
      }
    } catch (error) {
      console.error('Erreur lors de la transmission:', error);
      setLoading(false);
      Alert.alert('Erreur', `Échec de la transmission: ${error.message}`);
    }
  };

  const navigateToHistory = () => {
    setShowHistoryModal(true);
  };

  // Fonction pour obtenir les détails de la session actuelle
  const getSessionDetails = async () => {
    try {
      const currentSession = await firebaseService.getCurrentSession();
      if (currentSession) {
        setSessionId(currentSession.id);
        setTournee(currentSession.tournee);
        setVehicule(currentSession.vehicule);
        setPole(currentSession.pole);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la session:", error);
    }
  };

  // Fonction pour effacer l'historique des scans
  const clearHistoricalScans = async () => {
    try {
      Alert.alert(
        'Effacer l\'historique',
        'Voulez-vous vraiment effacer tout l\'historique des scans?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Effacer',
            onPress: async () => {
              await AsyncStorage.removeItem('scanHistory');
              setHistoricalScans([]);
              Alert.alert('Succès', 'Historique effacé avec succès');
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de l\'effacement de l\'historique:', error);
      Alert.alert('Erreur', 'Impossible d\'effacer l\'historique');
    }
  };

  // Ajout d'une fonction pour effacer explicitement tous les scans de la session actuelle
  const clearCurrentSessionScans = async () => {
    try {
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');
      if (!currentSessionId) {
        Alert.alert('Erreur', 'Impossible de déterminer la session actuelle');
        return;
      }
      
      Alert.alert(
        'Réinitialiser l\'historique',
        'Cette action va supprimer tous les scans associés à votre session actuelle. Continuer?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Supprimer',
            onPress: async () => {
              try {
                // Supprimer les scans associés à la session actuelle
                setLoading(true);
                console.log(`Suppression des scans de la session ${currentSessionId}...`);
                
                // Fonction côté service qui devrait être implémentée
                // pour supprimer tous les scans de la session
                const result = await firebaseService.clearSessionScans(currentSessionId);
                
                // Supprimer l'historique local également
                await AsyncStorage.removeItem('scanHistory');
                setHistoricalScans([]);
                
                setLoading(false);
                Alert.alert('Succès', 'Historique réinitialisé avec succès');
              } catch (error) {
                setLoading(false);
                console.error('Erreur lors de la suppression des scans:', error);
                Alert.alert('Erreur', `Échec de la suppression: ${error.message}`);
              }
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  // Handler de déconnexion avec effacement complet de l'historique
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Déconnexion',
        'Voulez-vous vous déconnecter? L\'historique des scans sera effacé.',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Déconnecter',
            onPress: async () => {
              try {
                setLoading(true);
                console.log('Déconnexion en cours...');

                // Appeler la méthode de déconnexion de Firebase
                await firebaseService.logout();
                console.log('Déconnexion Firebase réussie');
                
                // Effacer toutes les données de session
                await AsyncStorage.removeItem('userSessionActive');
                await AsyncStorage.removeItem('current_session_id'); // Supprimer également l'ID de session
                await AsyncStorage.removeItem('scanHistory');
                await AsyncStorage.removeItem('user_selas_id');
                await AsyncStorage.removeItem('userToken'); // Ajout de la suppression du userToken
                
                // Réinitialiser les états
                setHistoricalScans([]);
                setScannedContenants([]);
                setSiteScanned(false);
                setSiteCode('');
                
                setLoading(false);
                
                // Rediriger vers l'écran de connexion
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }]
                });
              } catch (error) {
                setLoading(false);
                console.error('Erreur lors du processus de déconnexion:', error);
                Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // --- DEBUT SECTION SCAN ZEBRA MISE A JOUR ---
  // Effet pour enregistrer et nettoyer l'écouteur DataWedge
  useEffect(() => {
    // Variable pour garder une référence à l'écouteur
    let dataWedgeListener = null;
    
    // La vérification est maintenant plus robuste grâce au chargement conditionnel.
    // On vérifie simplement si le module a été chargé avec succès.
    if (!DataWedgeIntents) {
      console.log('Module DataWedge non disponible, initialisation du listener annulée.');
      return;
    }

    // Fonction pour enregistrer le Broadcast Receiver
    const registerBroadcastReceiver = () => {
      // Définir l'action de l'Intent que DataWedge doit envoyer (doit correspondre au profil DataWedge)
      // Remplacez 'com.votreapp.SCAN' par l'action configurée dans DataWedge sur le Zebra
      const INTENT_ACTION = 'com.inovie.scan.mobile.SCAN'; // ACTION A VERIFIER/CONFIGURER SUR LE ZEBRA
      const INTENT_CATEGORY = 'android.intent.category.DEFAULT';

      // S'assurer que DataWedge envoie bien l'Intent via startActivity ou broadcastIntent
      DataWedgeIntents.registerBroadcastReceiver({
        filterActions: [INTENT_ACTION],
        filterCategories: [INTENT_CATEGORY]
      });

      console.log(`DataWedge Listener enregistré pour l'action: ${INTENT_ACTION}`);
    };

    // Fonction qui sera appelée lorsqu'un scan DataWedge est reçu
    const broadcastReceiver = (intent) => {
      console.log('Intent DataWedge reçu:', intent);
      // Vérifier si l'intent contient les données scannées et si on est en mode scan
      // La clé exacte ('com.symbol.datawedge.data_string') peut varier selon la config DataWedge
      const scannedData = intent && intent['com.symbol.datawedge.data_string'];
      
      if (scannedData && typeof scannedData === 'string' && scannedData.trim() && scanMode) {
        console.log(`Scan DataWedge reçu et traité (${scanMode}): ${scannedData.trim()}`);
        // Traiter les données scannées
        processScannedData(scannedData.trim()); 
      } else {
        console.log('Intent DataWedge reçu mais non traité (pas de données ou pas en mode scan). ScanMode:', scanMode);
        }
      };
      
    // Enregistrer l'écouteur uniquement si on est prêt à scanner
    if (isReadyForScan) {
      console.log('Préparation de l\'écouteur DataWedge...');
      // --- AJOUT: La vérification Platform.OS et !DataWedgeIntents est déjà faite au début du useEffect ---
      registerBroadcastReceiver(); // Enregistrer le receiver auprès de DataWedge
        
      // Ajouter l'écouteur d'événements React Native
      dataWedgeListener = DeviceEventEmitter.addListener(
        'datawedge_broadcast_intent', // Nom de l'événement émis par react-native-datawedge-intents
        broadcastReceiver 
      );
      console.log('Écouteur DataWedge actif.');
      // --- FIN AJOUT ---
    } else {
      console.log('Non prêt pour le scan, écouteur DataWedge non activé.');
    }

    // Fonction de nettoyage exécutée lorsque le composant est démonté ou que les dépendances changent
      return () => {
      // --- AJOUT: Vérifier si l'écouteur a bien été créé avant de le supprimer ---
      if (dataWedgeListener) {
        console.log('Suppression de l\'écouteur DataWedge...');
        dataWedgeListener.remove();
        dataWedgeListener = null; // Réinitialiser la référence
        console.log('Écouteur DataWedge supprimé.');
      }
      // --- FIN AJOUT ---
      // Optionnel: Désenregistrer le broadcast receiver si nécessaire 
      // (souvent pas nécessaire si l'enregistrement est lié à l'action/catégorie)
      };

    // Dépendances du useEffect: ré-exécuter si l'état de préparation ou le mode de scan changent
  }, [isReadyForScan, scanMode, processScannedData]); // processScannedData ajouté aux dépendances
  // --- FIN SECTION SCAN ZEBRA MISE A JOUR ---

  // --- NOUVELLES IMPORTATIONS ---
  // L'importation de DataWedgeIntents est maintenant gérée de manière conditionnelle en haut du fichier.
  // --- FIN NOUVELLES IMPORTATIONS ---

  // Nouvelle fonction pour mettre à jour uniquement le suivi de tournée sans réinitialiser le site scanné
  const updateTourneeProgress = async () => {
    try {
      console.log("Mise à jour du suivi de tournée en cours...");

      // Utiliser l'ID de session de l'état
      if (!currentSessionId) {
        console.warn("[updateTourneeProgress] currentSessionId est null, impossible de rafraîchir TourneeProgress avec la session.");
        // Optionnel: recharger sans session ID si c'est géré dans TourneeProgress
        // await tourneeProgressRef.current.loadTourneeDetails(null, true);
        return; // Ou juste arrêter ici
      }
      console.log(`[updateTourneeProgress] Utilisation de Session ID depuis l'état: ${currentSessionId}`);

      // Si l'ID de la tournée est manquant, essayer de le récupérer depuis la session
      if (!currentTourneeId && currentSessionId) {
        try {
          console.log(`[updateTourneeProgress] Tentative de récupération de l'ID de tournée depuis la session ${currentSessionId}`);
          const sessionDoc = await firebaseService.getSessionById(currentSessionId);
          if (sessionDoc && sessionDoc.tourneeId) {
            console.log(`[updateTourneeProgress] ID de tournée trouvé dans la session: ${sessionDoc.tourneeId}`);
            setCurrentTourneeId(sessionDoc.tourneeId);
          }
        } catch (err) {
          console.error('[updateTourneeProgress] Erreur lors de la récupération de la session:', err);
        }
      }

      // Mettre à jour les informations complètes de la tournée et du véhicule
      try {
        console.log('[updateTourneeProgress] Récupération des informations complètes de la session');
        const currentSession = await firebaseService.getCurrentSession();
        
        if (currentSession) {
          // Mettre à jour l'ID de la tournée si disponible
          if (currentSession.tournee?.id) {
            setCurrentTourneeId(currentSession.tournee.id);
            console.log(`[updateTourneeProgress] ID de tournée mis à jour: ${currentSession.tournee.id}`);
          }
          
          // Mettre à jour le nom de la tournée si disponible
          if (currentSession.tournee?.nom) {
            setCurrentTourneeName(currentSession.tournee.nom);
            console.log(`[updateTourneeProgress] Nom de tournée mis à jour: ${currentSession.tournee.nom}`);
          }
          
          // Mettre à jour l'immatriculation du véhicule si disponible
          if (currentSession.vehicule) {
            // Utiliser l'immatriculation si disponible, sinon utiliser l'ID comme fallback
            const displayValue = currentSession.vehicule.immatriculation || `ID: ${currentSession.vehicule.id}`;
            setCurrentVehiculeImmat(displayValue);
            console.log(`[updateTourneeProgress] Immatriculation véhicule mise à jour: ${displayValue}`);
          }
        } else {
          console.warn('[updateTourneeProgress] Session actuelle non trouvée');
        }
      } catch (sessionErr) {
        console.error('[updateTourneeProgress] Erreur lors de la récupération des informations de session:', sessionErr);
      }

      // Rafraîchir l'historique des scans sans réinitialiser le site scanné
      await loadHistoricalData();
      
      // Mettre à jour le composant TourneeProgress sans réinitialiser les sites visités
      if (currentTourneeId && tourneeProgressRef.current) {
        console.log(`[updateTourneeProgress] Mise à jour du composant TourneeProgress pour la tournée: ${currentTourneeId}`);
        // Recharger les données de la tournée. SessionId est maintenant une prop, seul l'argument forceReload est nécessaire.
        await tourneeProgressRef.current.loadTourneeDetails(true); // Le sessionId est passé par prop
      } else {
        console.warn('[updateTourneeProgress] Impossible de mettre à jour la tournée: ID de tournée ou référence manquante', 
          { currentTourneeId, hasRef: !!tourneeProgressRef.current });
      }
      
      console.log("Mise à jour du suivi de tournée terminée avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du suivi de tournée:", error);
    }
  };

  // Fonction pour rafraîchir complètement les données de la tournée (réinitialisation)
  const refreshTourneeData = async () => {
    try {
      setLoading(true);
      console.log("[refreshTourneeData] Début du rafraîchissement complet des données...");
      
      // Réinitialiser la tournée complètement
      resetScan(); // Réinitialise le site et les contenants scannés
      setShowOperationTypeSelection(false); // Réinitialiser la sélection du type d'opération
      
      // Récupérer la session actuelle
      const currentSession = await firebaseService.getCurrentSession();
      
      if (currentSession) {
        console.log("[refreshTourneeData] Session récupérée:", {
          id: currentSession.id,
          tourneeId: currentSession.tourneeId,
          vehiculeId: currentSession.vehiculeId
        });
        
        // Mettre à jour l'ID de session courant
        setCurrentSessionId(currentSession.id);
        
        // Mettre à jour l'ID de tournée
        if (currentSession.tourneeId) {
          setCurrentTourneeId(currentSession.tourneeId);
        }
        
        // Mettre à jour les informations de tournée
        if (currentSession.tournee) {
          const tourneeName = currentSession.tournee.nom || "Tournée inconnue";
          console.log(`[refreshTourneeData] Mise à jour du nom de tournée: ${tourneeName}`);
          setCurrentTourneeName(tourneeName);
        }
        
        // Mettre à jour les informations de véhicule
        if (currentSession.vehicule) {
          // Utiliser en priorité le champ immatriculation qui a déjà été mappé par getVehiculeById
          const vehiculeImmat = currentSession.vehicule.immatriculation || "Véhicule inconnu";
          console.log(`[refreshTourneeData] Mise à jour de l'immatriculation du véhicule: ${vehiculeImmat}`);
          setCurrentVehiculeImmat(vehiculeImmat);
        }
      } else {
        console.warn("[refreshTourneeData] Aucune session active trouvée");
      }
      
      // Mise à jour de l'historique et des paquets en cours
      await loadHistoricalData();
      
      // Réinitialiser les sites visités dans Firestore
      if (currentTourneeId) {
        console.log(`[refreshTourneeData] Réinitialisation des sites visités pour la tournée: ${currentTourneeId}`);
        await firebaseService.resetTourneeProgress(currentTourneeId);
        // Supprimer la persistance locale des visites pour réinitialiser complètement
        await AsyncStorage.removeItem(`visitedSiteIds_${currentSessionId}`);
        await AsyncStorage.removeItem(`tourneeVisitedSites_${currentTourneeId}`);
        console.log(`[refreshTourneeData] Persistance locale des visites supprimée pour la session ${currentSessionId} et la tournée ${currentTourneeId}`);
      }
      
      // Actualiser le suivi de la tournée si un ID est disponible
      if (currentTourneeId && tourneeProgressRef.current) {
        console.log(`[refreshTourneeData] Actualisation forcée du suivi de tournée pour ID: ${currentTourneeId}`);
        await tourneeProgressRef.current.loadTourneeDetails(true);
      }
      
      setLoading(false);
      console.log("Rafraîchissement et réinitialisation terminés avec succès");
      
      // Afficher un message à l'utilisateur
      Alert.alert(
        "Succès",
        "La tournée a été complètement réinitialisée avec succès",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("[refreshTourneeData] Erreur lors du rafraîchissement des données:", error);
      setLoading(false);
      Alert.alert(
        "Erreur",
        "Impossible de réinitialiser la tournée. Veuillez réessayer.",
        [{ text: "OK" }]
      );
    }
  };

  // Référence au composant TourneeProgress pour le rafraîchissement
  const tourneeProgressRef = React.useRef(null);

  // --- AJOUT: Nouvelle fonction handleConfirmVisitWithoutPackages ---
  const handleConfirmVisitWithoutPackages = async () => {
    console.log("Confirmation de visite sans colis déclenchée...");
    if (!siteDetails) {
      Alert.alert("Erreur", "Impossible de confirmer la visite, détails du site manquants.");
      return;
    }

    // Déclaration des variables de contexte pour la visite sans colis
    const tourneeName = currentTourneeName;
    const tourneeId = currentTourneeId;
    const vehiculeName = currentVehiculeImmat;
    const vehiculeId = sessionData.vehicule?.id || route.params?.vehicule?.id || '';

    setLoading(true);

    try {
      // Définir nom et ID du site pour la visite sans colis
      const siteName = siteDetails.name || siteDetails.nom || siteCode;
      const siteId = siteDetails.id || '';
      // Définir le nom du coursier si disponible
      // const coursierName = sessionData.coursierCharg || route.params?.coursierCharg || ''; // Ancienne méthode
      console.log('[handleConfirmVisitWithoutPackages] Valeur de currentUserDisplayName:', currentUserDisplayName); // AJOUT DU CONSOLE.LOG
      const coursierName = currentUserDisplayName; // Utiliser l'état actuel du nom de l'utilisateur

      const userData = await firebaseService.getCurrentUser();

      // Préparer le scan spécial "visite_sans_colis"
      const visitScan = {
        code: siteDetails.code || siteCode,
        idColis: `VISITE_${siteDetails.code || siteName}`,
        scanDate: new Date().toISOString(),
        tourneeName: tourneeName, // MODIFIÉ: Utilisation de la clé tourneeName au lieu de tournee
        tourneeId: tourneeId,
        vehicule: vehiculeName,
        vehiculeId: vehiculeId,
        immatriculation: vehiculeName,
        site: siteName,
        siteId: siteId,
        siteCode: siteDetails.code || siteCode,
        siteDepart: siteName,
        siteDépart: siteName, // Champ existant avec accent
        siteDepartName: siteName || '', // MODIFIÉ: Assurer une chaîne vide par défaut
        sessionId: currentSessionId,
        operationType: 'visite_sans_colis', 
        status: 'pas_de_colis', // Le statut demandé
        statut: 'Pas de colis', // Pour affichage potentiel
        type: 'visite_sans_colis', // Cohérence
        coursierCharg: coursierName,
        coursierChargeantId: userData?.uid,
        poleId: pole?.id || '', // AJOUTÉ: ID du pôle depuis l'état pole
        poleName: pole?.nom || '' // AJOUTÉ: Nom du pôle depuis l'état pole
      };

      console.log("Envoi du scan 'visite_sans_colis' à Firestore:", JSON.stringify(visitScan, null, 2));

      // Envoyer ce scan unique à Firebase via addScans
      const result = await firebaseService.addScans([visitScan]);

      if (result.success) {
        console.log("Scan 'visite_sans_colis' enregistré avec succès.");
        // Réinitialiser l'état pour revenir à l'écran de scan de site
        resetScan();
        setShowOperationTypeSelection(false);
        setLoading(false);
        Alert.alert("Succès", "Visite du site enregistrée (sans colis).");
      } else {
        throw new Error(result.error || "Échec de l'enregistrement de la visite");
      }

    } catch (error) {
      console.error("Erreur lors de la confirmation de la visite sans colis:", error);
      setLoading(false);
      Alert.alert("Erreur", `Impossible d'enregistrer la visite : ${error.message}`);
    }
  };
  // --- FIN AJOUT ---

  // Fonction pour gérer la sélection d'un site depuis le suivi de tournée
  const handleSiteSelection = (site) => {
    console.log('[handleSiteSelection] Site reçu:', JSON.stringify(site)); // AJOUT POUR DÉBOGAGE
    const siteName = site.nom || site.name; // Support des deux formats
    if (site && siteName) {
      let siteIndex = null;
      // Nouvel ajout: déterminer l'index de la première occurrence non visitée
      if (tourneeProgressRef.current?.getSitesWithStatus) {
        const sitesList = tourneeProgressRef.current.getSitesWithStatus();
        const foundIndex = sitesList.findIndex(s =>
          !s.visited && (s.id === site.id || s.code === site.code || (s.nom || s.name) === siteName)
        );
        if (foundIndex >= 0) {
          siteIndex = foundIndex;
          console.log(`[handleSiteSelection] Index trouvé via getSitesWithStatus: ${siteIndex}`);
        } else {
          // Si tous les sites de ce nom sont déjà visités, NE PLUS alerter ET NE PLUS faire de return ici.
          // On permet de continuer pour que l'utilisateur puisse re-scanner le site pour d'autres opérations.
          // La logique de ne pas re-cocher est dans processScannedData.
          console.log('[handleSiteSelection] Toutes les occurrences de ce site sont déjà marquées comme visitées. On continue quand même.');
          // Alert.alert(
          //   'Site déjà visité',
          //   'Ce site a déjà été visité ou n\'est pas dans votre tournée.'
          // );
          // return; // SUPPRIMÉ LE RETURN
        }
      }
      // Fallback: extraire depuis uniqueDisplayId si aucun index trouvé
      if (siteIndex === null && site.uniqueDisplayId) {
        const parts = site.uniqueDisplayId.split('_');
        if (parts.length > 1) {
          siteIndex = parseInt(parts[parts.length - 1]);
          console.log(`[handleSiteSelection] Index extrait du site via uniqueDisplayId: ${siteIndex}`);
        }
      }
    
      // Générer le code-barre tel qu'il est configuré: préfixe "SITE_" + nom du site
      const siteCodeToUse = `SITE_${siteName}`;

      setScanMode('site'); // ACTIVER LE MODE SCAN SITE pour rendre le champ visible
      setManualCodeInput(siteCodeToUse); // Mettre à jour le champ de saisie manuelle

      // Simuler un scan de site
      Alert.alert(
        'Scanner ce site ?',
        `Voulez-vous scanner le site ${siteName} ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => {
              setManualCodeInput('');
              setScanMode(''); // RÉINITIALISER LE MODE SCAN SI ANNULATION
          }},
          { 
            text: 'Scanner', 
            onPress: async () => {
              console.log(`[handleSiteSelection] Confirmation du scan pour: ${siteCodeToUse}`);
              await processScannedData(siteCodeToUse);
              // processScannedData mettra scanMode à '' et siteScanned à true si le scan est réussi,
              // ce qui cachera le champ de saisie du site.
            } 
          }
        ]
      );
    }
  };

  // Fonction pour effacer tous les colis en cours
  const handleClearAllInProgressScans = () => {
    Alert.alert(
      "Effacer tous les colis",
      "Êtes-vous sûr de vouloir effacer tous les colis pris en charge ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Effacer", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Récupérer l'ID de session actuel
              const currentSessionId = await AsyncStorage.getItem('currentSessionId');
              if (!currentSessionId) {
                throw new Error("ID de session non disponible");
              }

              // Appeler le service pour effacer les scans en cours
              await firebaseService.clearInProgressScans(currentSessionId);
              
              // Vider le tableau local
              setTakingCarePackages([]);
              
              setLoading(false);
              Alert.alert("Succès", "Tous les colis pris en charge ont été effacés");
            } catch (error) {
              setLoading(false);
              console.error("Erreur lors de l'effacement des colis:", error);
              Alert.alert("Erreur", `Impossible d'effacer les colis: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Assurez-vous que l'historique n'est chargé qu'une seule fois
  useEffect(() => {
    if (!sessionHistoryLoaded) {
      loadHistoricalData();
    }
  }, [sessionHistoryLoaded]);

  // Effet pour gérer l'écouteur de scan
  useEffect(() => {
    // La fonction qui sera appelée par le service à chaque scan
    const handleScan = (scannedData) => {
      processScannedData(scannedData);
    };

    // Ajouter l'écouteur au service
    scannerService.addScanListener(handleScan);

    // Nettoyage : supprimer l'écouteur lorsque l'écran est démonté
    return () => {
      scannerService.removeScanListener(handleScan);
    };
  }, []); // Le tableau vide assure que l'effet s'exécute une seule fois

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sessionInfoContainer}>
        {/* NOUVEL AFFICHAGE pour le nom de l'utilisateur - DÉPLACÉ EN HAUT */}
        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="account" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          <Text style={styles.sessionInfoText}>Utilisateur: {currentUserDisplayName}</Text>
        </View>

        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          {/* Utiliser l'état pour l'affichage */}
          <Text style={styles.sessionInfoText}>Tournée: {currentTourneeName}</Text>
        </View>

        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="truck" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          {/* Utiliser l'état pour l'affichage */}
          <Text style={styles.sessionInfoText}>Véhicule: {currentVehiculeImmat}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {siteScanned ? (
          // Si le site a été scanné, afficher la section scan des contenants
          <>
            {/* Afficher le site scanné */}
            <View style={styles.scannedSiteContainer}>
              <View style={styles.scannedSiteHeader}>
                <Text style={styles.scannedSiteTitle}>Site scanné</Text>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={resetScan}
                >
                  <Text style={styles.resetButtonText}>Changer</Text>
                </TouchableOpacity>
          </View>
              <View style={styles.scannedSiteInfo}>
                <Text style={styles.scannedSiteCode}>{siteDetails?.name || siteCode}</Text>
                {siteDetails?.address && (
                  <Text style={styles.scannedSiteAddress}>{siteDetails.address}</Text>
                )}
                {siteDetails?.city && (
                  <Text style={styles.scannedSiteCity}>{siteDetails.city}</Text>
                )}
                <Text style={styles.scannedSiteDate}>
                  Scanné le {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}
                </Text>
              </View>
            </View>

            {/* Section des opérations */}
            {showOperationTypeSelection ? (
              // Afficher la sélection du type d'opération
              <View style={styles.operationTypeContainer}>
                <Text style={styles.operationTypeTitle}>Sélectionner le type d'opération</Text>
            
                <View style={styles.operationButtonRow}>
                  {/* Entrée de colis */}
                  <View style={styles.operationItemContainer}>
                    <MaterialCommunityIcons name="package-down" size={36} color={styles.entreeButtonIcon.color} style={styles.operationIcon} />
            <TouchableOpacity 
                      style={[styles.operationTextButton, styles.entreeButtonBackground]} // Utiliser un style pour le fond
              onPress={() => startContenantScan('entree')}
            >
                      <Text style={styles.operationTitleText}>Entrée de colis</Text>
                      <Text style={styles.operationDescText}>Scanner des colis à prendre en charge</Text>
            </TouchableOpacity>
                  </View>
            
                  {/* Sortie de colis */}
                  <View style={styles.operationItemContainer}>
                    <MaterialCommunityIcons name="package-up" size={36} color={styles.sortieButtonIcon.color} style={styles.operationIcon} />
            <TouchableOpacity 
                      style={[styles.operationTextButton, styles.sortieButtonBackground]} // Utiliser un style pour le fond
              onPress={() => startContenantScan('sortie')}
            >
                      <Text style={styles.operationTitleText}>Sortie de colis</Text>
                      <Text style={styles.operationDescText}>Scanner des colis à livrer</Text>
                </TouchableOpacity>
                  </View>

                  {/* Visite sans colis */}
                  <View style={styles.operationItemContainer}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={36} color={styles.noPackageButtonIcon.color} style={styles.operationIcon} />
                <TouchableOpacity 
                      style={[styles.operationTextButton, styles.noPackageButtonBackground]} // Utiliser un style pour le fond
                      onPress={handleConfirmVisitWithoutPackages}
                >
                      <Text style={styles.operationTitleText}>Visite sans colis</Text>
                      <Text style={styles.operationDescText}>Confirmer le passage sans scan</Text>
                </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // Si on a déjà choisi un type d'opération, afficher l'interface de scan
              <>
                {/* Titre de l'opération */}
                <View style={styles.operationHeader}>
                  <Text style={styles.operationTitle}>
                    {operationType === 'entree' ? 'Entrée de colis' : 'Livraison de colis'}
                </Text>
            <TouchableOpacity
                    style={styles.changeOperationButton}
                    onPress={showOperationSelection}
            >
                    <Text style={styles.changeOperationText}>Changer</Text>
            </TouchableOpacity>
          </View>

                {/* Formulaire de scan manuel */}
                <View style={styles.manualScanContainer}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Saisir un code manuellement..."
                    value={manualCodeInput}
                    onChangeText={setManualCodeInput}
                    onSubmitEditing={handleManualScan}
                  />
            <TouchableOpacity 
                    style={styles.manualScanButton}
                    onPress={handleManualScan}
            >
                    <Text style={styles.manualScanButtonText}>Scanner</Text>
            </TouchableOpacity>
          </View>

                {/* Liste des contenants scannés */}
                {scannedContenants.length > 0 && (
                  <View style={styles.scannedListContainer}>
                    <View style={styles.scannedListHeader}>
                      <Text style={styles.scannedListTitle}>
                        Contenants scannés ({scannedContenants.length})
                      </Text>
              <TouchableOpacity 
                        style={styles.transmitButton}
                        onPress={handleTransmit}
              >
                        <Text style={styles.transmitButtonText}>
                          <Ionicons name="cloud-upload-outline" size={16} /> Transmettre
                </Text>
              </TouchableOpacity>
                    </View>
                    <FlatList
                      data={scannedContenants}
                      renderItem={renderScannedItem}
                      keyExtractor={item => item.id}
                      style={styles.scannedList}
                    />
          </View>
        )}
        
                {/* Bouton pour simuler un scan */}
              <TouchableOpacity
                  style={styles.simulateScanButton}
                  onPress={handleSimulatedScan}
              >
                  <Text style={styles.simulateScanButtonText}>Simuler scan</Text>
              </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          // Si aucun site n'a été scanné, afficher le bouton scan site PUIS le composant suivi de tournée
          <>
              <TouchableOpacity 
              style={styles.scanSiteButton}
              onPress={activateSiteScan}
              >
              <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
              <Text style={styles.scanSiteButtonText}>Scan site</Text>
              </TouchableOpacity>
            
            {/* Champ de saisie de code qui apparaît si le mode scan est activé */}
            {scanMode === 'site' && (
              <View style={styles.scanModeInputContainer}>
                <TextInput
                  style={styles.scanModeInput}
                  placeholder="Entrez le code du site ici..."
                  value={manualCodeInput}
                  onChangeText={setManualCodeInput}
                  onSubmitEditing={handleManualScan}
                  // autoFocus={true} // TEMPORAIREMENT COMMENTÉ POUR TEST
                />
              <TouchableOpacity 
                  style={styles.scanModeButton}
                  onPress={handleManualScan}
              >
                  <Text style={styles.scanModeButtonText}>Scanner</Text>
              </TouchableOpacity>
              </View>
            )}
            
            {/* Suivi de tournée - placé APRÈS le bouton scan site */}
            {/* --- AJOUT LOG --- */}
            {console.log(`[ScanScreen Render] Vérification avant TourneeProgress: tourneeId = ${currentTourneeId}, currentSessionId = ${currentSessionId}`)}
            {/* --- FIN LOG --- */}
            {currentTourneeId && currentSessionId && (
              <TourneeProgress 
                tourneeId={currentTourneeId} // Utiliser l'état ici
                sessionId={currentSessionId} // Passer l'ID de session en prop
                onSiteSelect={handleSiteSelection}
                ref={ref => {
                  // Stocker la référence pour pouvoir appeler loadTourneeDetails
                  if (ref) {
                    tourneeProgressRef.current = ref;
                  }
                }}
              />
            )}
          </>
            )}

        {/* Message d'erreur */}
        {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        
        {/* S'il y a des paquets pris en charge, les afficher */}
        {takingCarePackages.length > 0 && (
          <View style={styles.takingCareContainer}>
            <View style={styles.takingCareHeader}>
              <Text style={styles.takingCareTitle}>
                Paquets pris en charge ({takingCarePackages.length})
              </Text>
                <TouchableOpacity
                style={styles.clearTakingCareButton}
                onPress={handleClearAllInProgressScans}
                >
                <Text style={styles.clearTakingCareText}>Tout effacer</Text>
                </TouchableOpacity>
              </View>
            <FlatList
              data={takingCarePackages}
              renderItem={({ item }) => (
                <View style={[
                  styles.takingCareItem, 
                  item.status === 'pas_de_colis' ? styles.takingCareItemNoPackage : null
                ]}>
                  {/* MODIFICATION ICI */}
                  <Text style={styles.takingCareCode}>{item.idColis || item.code}</Text>
                  {/* FIN MODIFICATION */}
                  <View style={styles.takingCareDetails}>
                    <Text style={styles.takingCareTime}>
                      {dateUtils.formatTime(item.scanDate || item.createdAt)}
                    </Text>
                    {item.status === 'pas_de_colis' && (
                      <Text style={styles.takingCareStatus}>Pas de colis</Text>
                    )}
                  </View>
                </View>
              )}
              keyExtractor={item => item.idColis || item.id || `fallback_${Math.random()}`}
              style={styles.takingCareList}
            />
          </View>
      )}
      </ScrollView>

      {/* Barre d'actions supplémentaires */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement en cours...</Text>
        </View>
      )}

      {/* Modal pour afficher l'historique des scans */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique des scans</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {historicalScans.length > 0 ? (
              <FlatList
                data={historicalScans}
                renderItem={({ item }) => <ScanHistoryItem item={item} />} 
                // MODIFICATION ICI pour la clé
                keyExtractor={(item) => item.idColis || item.id || `fallback-${Math.random()}`} 
                style={styles.historyList}
                contentContainerStyle={{ paddingBottom: 10 }}
                // Ajout d'optimisations FlatList
                initialNumToRender={10} // Rendre les 10 premiers items initialement
                maxToRenderPerBatch={5} // Rendre 5 items par batch ensuite
                windowSize={10} // Garder 10 fenêtres de rendu (5 avant, 5 après)
              />
            ) : (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="information-circle-outline" size={50} color="#95a5a6" />
                <Text style={styles.emptyHistoryText}>Aucun scan dans l'historique pour aujourd'hui</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.clearHistoryButton}
              onPress={clearHistoricalScans}
            >
              <Text style={styles.clearHistoryButtonText}>Effacer l'historique</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sessionInfoContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sessionInfoIcon: {
    marginRight: 5,
  },
  sessionInfoText: {
    fontSize: 14,
    color: '#34495e',
  },
  scanSiteButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scanSiteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  scannedSiteContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scannedSiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scannedSiteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resetButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scannedSiteInfo: {
    marginTop: 10,
  },
  scannedSiteCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scannedSiteAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  scannedSiteCity: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  scannedSiteDate: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 8,
    fontStyle: 'italic',
  },
  operationTypeContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Les styles de flexbox pour la ligne sont déplacés vers operationButtonRow
    // flexDirection: 'row', 
    // justifyContent: 'space-between', 
    // alignItems: 'stretch', 
  },
  operationTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  operationTypeButton: {
    flexDirection: 'column', 
    alignItems: 'center',
    borderRadius: 10,
    padding: 20, // Augmentation du padding
    elevation: 2,
    flex: 1, 
    marginHorizontal: 5, 
    justifyContent: 'center', 
  },
  entreeButton: {
    backgroundColor: '#2ecc71', // Vert émeraude
  },
  sortieButton: {
    backgroundColor: '#3498db', // Bleu vif
  },
  operationTypeText: {
    color: '#fff',
    fontSize: 15, // Légère augmentation
    fontWeight: 'bold',
    textAlign: 'center', 
    marginTop: 10, // Espace accru après l'icône
  },
  operationTypeDescription: {
    color: '#fff',
    fontSize: 12, // Légère réduction
    opacity: 0.9, // Légère transparence pour la hiérarchie
    textAlign: 'center', 
    marginTop: 5, 
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  changeOperationButton: {
    backgroundColor: '#3498db',
    padding: 6,
    borderRadius: 6,
  },
  changeOperationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manualScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  manualInput: {
    flex: 1,
    height: 40,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  manualScanButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualScanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  simulateScanButton: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  simulateScanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannedListContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    elevation: 3,
  },
  scannedListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  scannedListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  transmitButton: {
    backgroundColor: '#27ae60',
    padding: 8,
    borderRadius: 6,
  },
  transmitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scannedList: {
    maxHeight: 300,
  },
  errorText: {
    color: '#e74c3c',
    marginVertical: 10,
    textAlign: 'center',
  },
  takingCareContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    elevation: 3,
  },
  takingCareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  takingCareTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clearTakingCareButton: {
    backgroundColor: '#e74c3c',
    padding: 6,
    borderRadius: 6,
  },
  clearTakingCareText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  takingCareList: {
    maxHeight: 200,
  },
  takingCareItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  takingCareItemNoPackage: {
    borderLeftColor: '#f39c12', // Couleur différente pour les visites sans colis
  },
  takingCareDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  takingCareStatus: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
    marginTop: 2,
  },
  takingCareCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  takingCareTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  scanModeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  scanModeInput: {
    flex: 1,
    height: 40,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  scanModeButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanModeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  historyList: {
    flexGrow: 0,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  clearHistoryButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  clearHistoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noPackageButton: {
    backgroundColor: '#e67e22', // Orange
  },
  // NOUVEAU STYLE POUR LA RANGÉE DE BOUTONS
  operationButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch', // Pour que les boutons aient la même hauteur
    marginTop: 15, // Espace par rapport au titre
  },
  operationItemContainer: { 
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'column', // Assurer l'empilement vertical de l'icône et du bouton
    justifyContent: 'space-between', // Pour espacer l'icône et le bouton texte si souhaité
  },
  operationIcon: { 
    marginBottom: 8, 
  },
  operationTextButton: { 
    flexDirection: 'column', 
    alignItems: 'center', 
    borderRadius: 10,
    paddingVertical: 10, 
    paddingHorizontal: 5, 
    elevation: 2,
    width: '100%', 
    justifyContent: 'center',
    minHeight: 90, // Légère augmentation pour accommoder le texte plus long
    flexGrow: 1, // Permettre au bouton de grandir pour remplir l'espace
  },
  // Styles spécifiques pour les couleurs des icônes ET des fonds de bouton texte
  entreeButtonIcon: { color: '#e67e22' }, 
  entreeButtonBackground: { backgroundColor: '#e67e22' }, // Orange pour Entrée

  sortieButtonIcon: { color: '#2ecc71' }, 
  sortieButtonBackground: { backgroundColor: '#2ecc71' }, // Vert pour Sortie

  noPackageButtonIcon: { color: '#3498db' }, 
  noPackageButtonBackground: { backgroundColor: '#3498db' }, // Bleu pour Visite sans colis

  // ANCIENS styles pour les bordures (plus utilisés)
  // entreeButtonBorder: { borderColor: '#e67e22' }, 
  // sortieButtonBorder: { borderColor: '#2ecc71' }, 
  // noPackageButtonBorder: { borderColor: '#3498db' }, 

  operationTitleText: { 
    color: '#fff', // Texte blanc pour contraste sur fond coloré
    fontSize: 14, 
    fontWeight: 'bold',
    textAlign: 'center', 
    marginBottom: 5, // Ajouter un peu d'espace avant la description
  },
  operationDescText: { 
    color: '#fff', // Texte blanc
    fontSize: 12, 
    opacity: 0.9, // Légère opacité pour hiérarchie si souhaité sur fond blanc
    textAlign: 'center', 
    marginTop: 4, 
  },
});