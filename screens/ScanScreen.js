import React, { useState, useEffect, useImperativeHandle, forwardRef, useLayoutEffect, useRef } from 'react';
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
  BackHandler,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from '../services/firebaseService';
import dateUtils from '../utils/dateUtils';
import CustomView from '../components/CustomView';
import TourneeProgress from '../components/TourneeProgress';
import ScanHistoryItem from '../components/ScanHistoryItem';
import dataWedgeService from '../services/dataWedgeService'; // Import du nouveau service DataWedge
import zebraDataWedgeService from '../services/zebraDataWedgeService'; // Nouveau service alternatif
import keystrokeDataWedgeService from '../services/keystrokeDataWedgeService'; // Service Keystroke pour Zebra
import offlineQueueService from '../services/offlineQueueService'; // Service queue hors-ligne
import NetInfo from '@react-native-community/netinfo'; // Détection connectivité
import Toast from '../components/Toast';
import { wp, hp, fp, sp, isSmallScreen, isLargeScreen } from '../utils/responsiveUtils';

// --- NOUVEAU SYSTÈME DATAWEDGE ---
// Utilisation du nouveau DataWedgeService pour une gestion simplifiée et automatique

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
  
  // État pour les toasts
  const [toast, setToast] = useState(null);
  const [selectedSelas, setSelectedSelas] = useState(null); // AJOUT: État pour la SELAS

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };


  
  // Références pour auto-focus des champs de saisie
  const siteInputRef = useRef(null);
  const colisInputRef = useRef(null);



  // Simplification de la gestion de l'état de la session
  // On récupère les objets complets depuis les paramètres de navigation
  const [currentTournee, setCurrentTournee] = useState(route.params?.tournee || null);
  const [currentVehicule, setCurrentVehicule] = useState(route.params?.vehicule || null);
  const [currentPole, setCurrentPole] = useState(route.params?.pole || null);

  // Les états dérivés sont maintenus pour l'affichage et la compatibilité
  const [currentTourneeName, setCurrentTourneeName] = useState(route.params?.tournee?.nom || "Tournée inconnue");
  const [currentVehiculeImmat, setCurrentVehiculeImmat] = useState(route.params?.vehicule?.immatriculation || "Véhicule inconnu");
  const [currentVehiculeId, setCurrentVehiculeId] = useState(route.params?.vehicule?.id || null);
  const [currentTourneeId, setCurrentTourneeId] = useState(route.params?.tournee?.id || null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Chargement...");
  
  // États pour la queue hors-ligne et connectivité
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // État pour gérer l'affichage du clavier
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Réduire les logs inutiles
  // AMÉLIORATION DU CONSOLE.LOG CUSTOM
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.log = (...args) => {
    const messageString = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    
    // FILTRER LES LOGS VERBEUX ET RÉPÉTITIFS
    const filteredMessages = [
      '[TourneeProgress]',
      '[loadHistoricalData]',
      'restaurés depuis la tournée',
      'sauvegardés pour la tournée',
      '[getTourneeWithSites] Site',
      'Site non trouvé avec l\'ID:',
      'Récupération de tous les scans',
      'SELAS ID récupéré du stockage local:',
      'scans trouvés au total',
      'Historique local filtré:',
      'Details complets reçus:',
      'visité = false',
      'Chargement des détails de la tournée:',
      'Récupération de la tournée',
      'RENDER démarré'
    ];
    
    // Ne pas afficher ces logs sauf s'ils contiennent ERROR ou WARN
    const shouldFilter = filteredMessages.some(filter => 
      messageString.includes(filter) && 
      !messageString.includes('ERROR') && 
      !messageString.includes('WARN') &&
      !messageString.includes('ERREUR')
    );
    
    if (!shouldFilter) {
      originalConsoleLog.apply(console, args);
    }
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

  // Code nettoyé - logs répétitifs supprimés

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
          setCurrentUserDisplayName(`${userProfile.prenom || ''} ${userProfile.nom || ''}`.trim() || userProfile.email || "Utilisateur");
          console.log(`[SessionInit] Nom utilisateur mis à jour: ${currentUserDisplayName}`);
        }

        // Si une session existe déjà dans Firestore, on met à jour les états avec ses données
        if (currentSession) {
          setCurrentTournee({ id: currentSession.tourneeId, nom: currentSession.tourneeName });
          setCurrentVehicule({ id: currentSession.vehiculeId, immatriculation: currentSession.immatriculation });
          setCurrentPole({ id: currentSession.poleId, nom: currentSession.poleName });
          setSelectedSelas({ id: currentSession.selasId, nom: currentSession.selasName });
        } else {
           // Si c'est une NOUVELLE session, on s'assure que les états sont bien définis depuis les route.params
           setCurrentTournee(route.params?.tournee || null);
           setCurrentVehicule(route.params?.vehicule || null);
           setCurrentPole(route.params?.pole || null);
           // Pour selas, on le récupère du profil car il n'est pas dans les params
           if (userProfile?.selasId) {
             setSelectedSelas({ id: userProfile.selasId, nom: userProfile.selasName || '' });
           }
        }

 // Garder ce log

        if (currentSession) {
 // NOUVEAU LOG
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
            // NOUVEAU: Mettre à jour l'ID du véhicule
            if (currentSession.vehicule.id) {
              setCurrentVehiculeId(currentSession.vehicule.id);
            } else {
              setCurrentVehiculeId(null); // S'assurer qu'il est null si non trouvé
            }

            let vehiculeDisplay = "Véhicule inconnu";
            if (currentSession.vehicule.registrationNumber && typeof currentSession.vehicule.registrationNumber === 'string' && currentSession.vehicule.registrationNumber.trim() !== '') {
              vehiculeDisplay = currentSession.vehicule.registrationNumber;
            }
            setCurrentVehiculeImmat(vehiculeDisplay);
          } else { 
            setCurrentVehiculeImmat("Véhicule inconnu"); 
            setCurrentVehiculeId(null); // S'assurer qu'il est null si l'objet vehicule est manquant
          }

          // Mettre à jour les informations du pôle
          if (currentSession.poleId && currentSession.poleName) {
            console.log(`[SessionInit] Pôle Info trouvé dans la session: ${currentSession.poleName}`);
            setPole({ id: currentSession.poleId, nom: currentSession.poleName });
          } else if (sessionData && sessionData.pole && sessionData.pole.id) {
            console.log(`[SessionInit] Pôle Info trouvé dans sessionData: ${sessionData.pole.nom}`);
            setPole(sessionData.pole);
          } else if (userProfile && userProfile.poleId) {
            // Fallback sur le profil utilisateur
            console.log(`[SessionInit] Pôle ID ${userProfile.poleId} récupéré depuis le profil.`);
            setPole({ id: userProfile.poleId, nom: userProfile.poleName || 'Pôle à définir' });
          } else {
            console.log(`[SessionInit] Pas d'info Pôle dans la session ou le profil.`);
            setPole(null); // Explicitly set to null if nothing is found
          }
          
           if (currentSession.selasId && currentSession.selasName) {
             console.log(`[SessionInit] SELAS Info trouvée dans la session: ${currentSession.selasName}`);
             setSelectedSelas({ id: currentSession.selasId, nom: currentSession.selasName });
           } else {
             console.log(`[SessionInit] Pas d'info SELAS dans la session, tentative de récupération depuis le profil.`);
             // Fallback sur le profil utilisateur si l'info n'est pas dans la session
             if (userProfile && userProfile.selasId) {
               // Idéalement, on aurait aussi le nom de la SELAS ici.
               // Pour l'instant, on suppose qu'on peut le récupérer plus tard si besoin.
               setSelectedSelas({ id: userProfile.selasId, nom: 'SEALS à définir' }); // Placeholder
               console.log(`[SessionInit] SELAS ID ${userProfile.selasId} récupéré depuis le profil.`);
             }
           }

        } else {
 // NOUVEAU LOG
          // Si pas de session, on utilise l'info du profil
          if (sessionData && sessionData.pole && sessionData.pole.id) {
            console.log(`[SessionInit] Pôle Info (nouvelle session) trouvé dans sessionData: ${sessionData.pole.nom}`);
            setPole(sessionData.pole);
          } else if (userProfile && userProfile.poleId) {
            console.log(`[SessionInit] Pôle ID ${userProfile.poleId} (depuis profil) utilisé pour la nouvelle session.`);
            setPole({ id: userProfile.poleId, nom: userProfile.poleName || 'Pôle à définir' });
          } else {
            setPole(null);
          }
          if (userProfile && userProfile.selasId) {
             console.log(`[SessionInit] SELAS ID ${userProfile.selasId} (depuis profil) utilisé pour la nouvelle session.`);
             setSelectedSelas({ id: userProfile.selasId, nom: 'SEALS à définir' });
          }
        }
      } catch (error) {
        console.error("[SessionInit] ERREUR lors de la récupération/traitement de la session:", error); // Modifié pour plus de clarté
      }

      // Charger les données historiques une fois l'ID de session défini
      await loadHistoricalData();
      // Forcer la mise à jour du suivi de tournée pour réafficher les coches SANS supprimer la persistance
      if (tourneeProgressRef.current?.loadTourneeDetails) {
        await tourneeProgressRef.current.loadTourneeDetails(false); // Changé de true à false pour préserver AsyncStorage
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
    
    // Charger l'historique des scans
    await loadHistoricalScans();
    await loadFirestoreScans();
    
    // Charger les paquets pris en charge seulement si on a un ID de tournée
    if (currentTourneeId) {
    await loadTakingCarePackages();
    } else {
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
      // Vérifier l'authentification en premier
      if (!await firebaseService.isAuthenticated()) {
        console.error('Utilisateur non authentifié, abandon du chargement Firestore');
        return;
      }

      // Récupérer l'ID de session actuel
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');

      // S'assurer que currentTourneeId est disponible pour le filtrage
      if (!currentTourneeId) {
        // Log uniquement une fois, pas à chaque appel
        // console.warn('[loadFirestoreScans] currentTourneeId est null, chargement de tous les scans disponibles.');
      }

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
          
          // MODIFICATION DU FILTRE DE STATUT ET TYPE - Permettre tous les codes-barres
          const isActualPackage = (scan.operationType === 'entree' || scan.operationType === 'sortie') &&
                                  (scan.status === 'en-cours' || scan.status === 'livré') &&
                                  scan.idColis;
          
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
                if (siteIdentifier) {
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
              
              // Récupérer les informations sur le site
              if (scan.site) {
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





  const processScannedData = async (data) => {
    console.log('Code scanné:', data);
    try {
      // Cas 1: Nous n'avons pas encore scanné de site
      if (!siteScanned) {
        const siteVerification = await firebaseService.verifySiteCode(data);

        if (siteVerification.site) {
          // Toujours enregistrer les infos du site et préparer pour les opérations si le site est valide
          setSiteCode(data);
          setSiteDetails(siteVerification.site);
          
          // 🚀 OPTIMISATION: Récupération du pôle simplifiée et mise en cache
          try {
            let sessionPole = null;
            
            // 1. Utiliser le pôle en cache s'il existe
            if (pole && pole.id) {
              sessionPole = pole;
            } 
            // 2. Récupération asynchrone en arrière-plan pour la prochaine fois
            else {
              // Ne pas bloquer l'interface - récupérer de manière asynchrone
              firebaseService.getCurrentSession().then(currentSession => {
                if (currentSession?.poleId) {
                  firebaseService.getPoleById(currentSession.poleId).then(poleDetails => {
                    if (poleDetails) {
                      const newPole = { id: poleDetails.id, nom: poleDetails.nom };
                      setPole(newPole);
                    }
                  });
                }
              }).catch(error => {
                console.warn('[processScannedData] ⚠️ Erreur récupération pôle en arrière-plan:', error.message);
              });
            }
          } catch (error) {
            console.warn('[processScannedData] ⚠️ Erreur récupération pôle:', error.message);
          }

          let occurrenceIndex = -1; // Initialiser à -1 (aucune occurrence non visitée trouvée par défaut)
          if (tourneeProgressRef.current?.getSitesWithStatus) {
            const sitesList = tourneeProgressRef.current.getSitesWithStatus();
            const siteNameToFind = siteVerification.site.nom || siteVerification.site.name;

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

            if (!currentSessionId) {
              console.error('[processScannedData] ID de session manquant avant markSiteVisitedInSession');
              showToast('ID de session manquant. Impossible de continuer.', 'error');
              // Réinitialiser pour permettre un nouveau scan de site si erreur critique
              setSiteScanned(false);
              setSiteDetails(null);
              setSiteCode('');
              setShowOperationTypeSelection(false);
              return;
            }
            
            const markSuccess = await firebaseService.markSiteVisitedInSession(currentSessionId, identifier, occurrenceIndex);
            
            if (markSuccess) {
              if (tourneeProgressRef.current?.markSiteAsVisitedLocally) {
                await tourneeProgressRef.current.markSiteAsVisitedLocally(identifier, occurrenceIndex);
              } else if (tourneeProgressRef.current?.loadTourneeDetails) {
                await tourneeProgressRef.current.loadTourneeDetails(true);
              }
            } else {
              showToast('Échec du marquage du site comme visité.', 'error');
              // Ne pas bloquer la suite, l'utilisateur peut vouloir faire des opérations quand même.
            }
          } else {
            // Aucune occurrence non visitée trouvée (occurrenceIndex === -1)
            // Cela signifie que toutes les instances de ce site dans la tournée sont déjà marquées comme visitées,
            // ou que la liste des sites n'était pas disponible.
            // On ne modifie pas les coches, mais on permet de continuer.
          }

          // Toujours permettre les opérations sur le site si le code site est valide
          setSiteScanned(true);
          setScanMode(''); 
          
          // Automatiquement afficher la sélection du type d'opération après validation du site
          setShowOperationTypeSelection(true);
          
          // Passage automatique sans popup - site validé
          
          return;

        } else { // siteVerification.site est null/undefined
          showToast('Code inconnu: aucun site correspondant.', 'warning');
           // Réinitialiser pour permettre un nouveau scan
          setSiteScanned(false);
          setSiteDetails(null);
          setSiteCode('');
          setShowOperationTypeSelection(false);
        }
      }
      
      // Cas 2: Site déjà scanné, nous scannons maintenant un contenant
      if (siteScanned && (scanMode === 'contenant' || scanMode === '')) {
        handleContenantScan(data);
        // Rester en mode scan contenant pour permettre les scans multiples
        setScanMode('contenant');
        return; // Sortir après traitement du contenant
      }
      
      // Cas 3: Site déjà scanné mais pas encore en mode contenant - proposer le choix
      if (siteScanned && !showOperationTypeSelection) {
        handleContenantScan(data);
        return;
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



  const handleManualScan = () => {
    if (manualCodeInput.trim().length > 0 && !isProcessingScan) {
      // Optimisation Zebra: Debouncing pour éviter les scans multiples
      const now = Date.now();
      if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
        return;
      }
      
      setLastScanTime(now);
      setIsProcessingScan(true);
      Keyboard.dismiss(); // Fermer le clavier
      
      // Nettoyer le timeout d'auto-validation s'il existe
      if (autoValidationTimeout) {
        clearTimeout(autoValidationTimeout);
        setAutoValidationTimeout(null);
      }
      
      processScannedData(manualCodeInput.trim()).finally(() => {
        setIsProcessingScan(false);
      });
      
      setManualCodeInput('');
    } else if (manualCodeInput.trim() === '') {
      showToast('Veuillez entrer un code valide.', 'warning');
    }
  };



  // Fonction pour afficher une boîte de dialogue pour saisir manuellement le code du site
  const showManualSiteInput = () => {
    if (!siteScanned) {
      setScanMode('site'); // Active le champ manuel uniquement
      showToast('Mode manuel activé. Saisissez le code site.', 'info');
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
    
    // Suppression de la popup - mode toast uniquement
    showToast(message, 'info');
  };

  const handleContenantScan = async (code) => {
    if (!siteScanned) {
      showToast('Veuillez d\'abord scanner un site.', 'warning');
      return;
    }

    // Vérifier si le code n'est pas vide
    if (!code || code.trim() === '') {
      showToast('Code invalide ou vide.', 'warning');
      return;
    }

    const trimmedCode = code.trim();

    try {
      // Vérifier si le colis n'a pas déjà été scanné
      const alreadyScanned = scannedContenants.some(contenant => 
        (contenant.idColis || contenant.code) === trimmedCode
      );
      
      if (alreadyScanned) {
        showToast(`Colis "${trimmedCode}" déjà scanné.`, 'warning');
        return;
      }

      // Mode dépôt (sortie) - vérifier que le colis est dans la liste des colis pris en charge
      if (operationType === 'sortie') {
        const isInTakingCare = takingCarePackages.some(pkg => (pkg.idColis || pkg.code) === trimmedCode);
        if (!isInTakingCare) {
          showToast("Colis non reconnu - pas en prise en charge.", 'warning');
          return;
        }
        
        // Retirer le colis de la liste des colis pris en charge
        setTakingCarePackages(takingCarePackages.filter(pkg => (pkg.idColis || pkg.code) !== trimmedCode));
      }

      // Obtenir la date actuelle au format approprié
      const currentDate = new Date();
      const currentDateISO = currentDate.toISOString();

      // Ajouter le contenant à la liste
      const newContenant = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        code: trimmedCode,
        idColis: trimmedCode,
        timeStamp: currentDate.toLocaleTimeString(),
        date: currentDate.toLocaleDateString(),
        scanDate: currentDateISO,
        site: siteCode,
        type: operationType, // Ajout du type d'opération (entrée/sortie)
      };
      
      setScannedContenants([newContenant, ...scannedContenants]);
      
      // Afficher une confirmation de scan réussi
      console.log(`✅ Colis "${trimmedCode}" scanné avec succès (${operationType})`);
      
      // Optionnel : Afficher une notification légère de succès
      // Vous pouvez commenter cette alerte si elle devient trop intrusive
      /*
      Alert.alert(
        'Scan réussi ✅',
        `Colis "${trimmedCode}" ajouté (${operationType === 'entree' ? 'Prise en charge' : 'Dépôt'})`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
      */
      
    } catch (error) {
      console.error('Erreur lors de la gestion du scan:', error);
              showToast('Erreur lors du scan du colis: ' + error.message, 'error');
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
      showToast('Aucun contenant scanné à transmettre.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // Vérifier la connectivité réseau d'abord
      const netState = await NetInfo.fetch();
      const isConnected = netState.isConnected;
      console.log(`[handleTransmit] 📶 Connectivité: ${isConnected ? 'En ligne' : 'Hors ligne'}`);
      
      console.log(`[handleTransmit] 📋 Traitement de ${scannedContenants.length} scan(s) pour le site: ${siteCode}`);

      // Récupérer l'ID de session actuel et l'ID utilisateur
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');
      const currentUserId = await firebaseService.getCurrentUserId();

      // NOUVELLE LOGIQUE DE TRAITEMENT
      for (const scan of scannedContenants) {
        const scanDate = scan.scanDate || new Date().toISOString();
        const scanType = scan.type || operationType; // 'entree' ou 'sortie'
        const currentScanCode = scan.idColis || scan.code;

        if (!currentScanCode) {
          console.warn('[handleTransmit] Scan ignoré: ID de colis manquant.');
          continue; // Ignore les scans sans ID
        }

        if (scanType === 'sortie') {
          // --- Logique de DÉPÔT (Mise à jour) ---
          console.log(`[handleTransmit] 🟡 Préparation de la mise à jour pour le colis: ${currentScanCode}`);
          const updateData = {
            status: 'livré',
            siteFin: siteDetails?.id || siteCode,
            siteFinName: siteDetails?.name || 'Inconnu',
            siteActuel: siteDetails?.id || siteCode,
            siteActuelName: siteDetails?.name || 'Inconnu',
            dateHeureFin: scanDate,
            dateArrivee: new Date(scanDate).toLocaleDateString(),
            heureArrivee: new Date(scanDate).toLocaleTimeString('fr-FR'),
            coursierLivraisonId: currentUserId,
            coursierLivraison: currentUserDisplayName,
          };

          // On appelle une nouvelle fonction dans le service pour gérer la mise à jour
          await firebaseService.updatePassageOnSortie(currentScanCode, updateData, isConnected);

        } else {
          // --- Logique de PRISE EN CHARGE (Création) ---
          console.log(`[handleTransmit] 🟢 Préparation de la création pour le colis: ${currentScanCode}`);
                    // Récupérer la session courante et le pôle à jour juste avant la création du passage
           let latestSession = null;
           let latestPole = null;
           let poleId = null;
           
           try {
             // 1. Récupérer la session
             latestSession = await firebaseService.getCurrentSession();
             
             // 2. Recherche du poleId dans différents emplacements
             if (latestSession) {
               if (latestSession.poleId) {
                 poleId = latestSession.poleId;
               } else if (latestSession.pole) {
                 if (typeof latestSession.pole === 'string') {
                   poleId = latestSession.pole;
                 } else if (latestSession.pole.id) {
                   poleId = latestSession.pole.id;
                 }
               } 
               
               if (!poleId && latestSession.vehicule) {
                 if (latestSession.vehicule.poleId) {
                   poleId = latestSession.vehicule.poleId;
                 } else if (latestSession.vehicule.pole && latestSession.vehicule.pole.id) {
                   poleId = latestSession.vehicule.pole.id;
                 }
               }
               
               if (!poleId && latestSession.tournee && latestSession.tournee.pole) {
                 // tournee.pole peut être un id ou un objet
                 if (typeof latestSession.tournee.pole === 'string') {
                   poleId = latestSession.tournee.pole;
                 } else if (latestSession.tournee.pole.id) {
                   poleId = latestSession.tournee.pole.id;
                 }
               }
             }
             
             // 3. Si on a un ID, on tente de récupérer les infos complètes du pôle
             if (poleId) {
               latestPole = await firebaseService.getPoleById(poleId);
               if (latestPole) {
               } else {
                 console.warn('[handleTransmit] Aucun détail trouvé pour le pôle ID:', poleId);
               }
             } else {
               console.warn('[handleTransmit] Aucun ID de pôle trouvé dans la session');
             }
             
           } catch (err) {
             console.error('[handleTransmit] Erreur lors de la récupération du pôle:', err);
           }
           
           // 4. Créer un pôle par défaut si non trouvé
           if (!latestPole || !latestPole.id) {
             console.warn('[handleTransmit] Aucun pôle valide trouvé, utilisation d\'un pôle par défaut');
             latestPole = {
               id: 'inconnu-' + Date.now(),
               nom: 'Pôle inconnu',
               description: 'Pôle non spécifié dans la session'
             };
             // On affiche un avertissement mais on continue la création du passage
             showToast("Attention: Aucun pôle spécifié, utilisation d'un pôle par défaut", 'warning');
           }
           const passageData = {
            idColis: currentScanCode,
            scanDate,
            operationType: scanType,
            status: 'en-cours', // Statut initial
            sessionId: currentSessionId,
            siteDepart: siteDetails?.id || siteCode,
            siteDepartName: siteDetails?.name || 'Inconnu',
            dateHeureDepart: scanDate,
            dateDepart: new Date(scanDate).toLocaleDateString(),
            heureDepart: new Date(scanDate).toLocaleTimeString('fr-FR'),
            siteFin: '', // Pas encore de site de fin
            siteFinName: '',
            dateHeureFin: '',
            coursierChargeantId: currentUserId,
            coursierCharg: currentUserDisplayName,
            tourneeId: currentTournee?.id || '',
            tourneeName: currentTournee?.nom || '',
            vehiculeId: currentVehicule?.id || '',
            immatriculation: currentVehicule?.immatriculation || '',
            poleId: latestPole.id,
            poleName: latestPole.nom || '',
            selasId: selectedSelas?.id || '',
          };
          
          if (sessionData.location) {
            passageData.location = {
              latitude: sessionData.location.coords.latitude,
              longitude: sessionData.location.coords.longitude,
              accuracy: sessionData.location.coords.accuracy,
            };
          }

          // On appelle une fonction de service pour ajouter le nouveau passage
          await firebaseService.addPassage(passageData, isConnected);
        }
      }


      // Après la transmission, vider la liste des scans en attente
      await updateLocalHistoryOptimized(scannedContenants);
      updateTakingCarePackagesOptimized(scannedContenants);
      resetScanInterfaceOptimized();

    } catch (error) {
      console.error('🚨 [handleTransmit] Erreur majeure lors de la transmission:', error);
      showToast("Erreur lors de la transmission: " + error.message, 'error');
    } finally {
      setLoading(false);
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
      // ACTION DIRECTE SANS POPUP
      await AsyncStorage.removeItem('scanHistory');
      setHistoricalScans([]);
      showToast('Historique effacé avec succès.', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'effacement de l\'historique:', error);
      showToast('Impossible d\'effacer l\'historique.', 'error');
    }
  };

  // Ajout d'une fonction pour effacer explicitement tous les scans de la session actuelle
  const clearCurrentSessionScans = async () => {
    try {
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');
      if (!currentSessionId) {
        showToast('Impossible de déterminer la session actuelle', 'error');
        return;
      }
      
      // ACTION DIRECTE SANS POPUP
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
        showToast('Historique réinitialisé avec succès', 'success');
      } catch (error) {
        setLoading(false);
        console.error('Erreur lors de la suppression des scans:', error);
        showToast(`Échec de la suppression: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Une erreur est survenue', 'error');
    }
  };

  // CORRECTION: Déconnexion unifiée compatible mobile/web
  const handleLogout = async () => {
    try {
      
      // Fonction de confirmation compatible mobile et web
      const showConfirmation = () => {
        return new Promise((resolve) => {
          if (Platform.OS === 'web') {
            // Sur web, utiliser window.confirm
            const confirmed = window.confirm('Voulez-vous vous déconnecter?');
            resolve(confirmed);
          } else {
            // Sur mobile, utiliser Alert.alert
            Alert.alert(
              'Déconnexion',
              'Voulez-vous vous déconnecter?',
              [
                { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Déconnecter', onPress: () => resolve(true) }
              ]
            );
          }
        });
      };
      
      const confirmLogout = await showConfirmation();
      
      if (confirmLogout) {
        try {
          setLoading(true);

          // OPTIMISATION: Rafraîchir TourneeProgress si disponible AVANT la déconnexion
          if (typeof updateTourneeProgress === 'function') {
            try {
              await updateTourneeProgress();
            } catch (error) {
            }
          }

          // Fermer la session Firebase
          await firebaseService.closeCurrentSession();
          await firebaseService.logout();
          console.log('✅ Déconnexion Firebase réussie');
          
          // OPTIMISATION: Ne supprimer que les données de session, pas l'historique
          await AsyncStorage.removeItem('userSessionActive');
          await AsyncStorage.removeItem('current_session_id');
          await AsyncStorage.removeItem('user_selas_id');
          await AsyncStorage.removeItem('userToken');
          
          // GARDER: scanHistory (historique des scans)
          // GARDER: Autres données utilisateur
          
          // Réinitialiser seulement les états de session courante
          setScannedContenants([]);
          setSiteScanned(false);
          setSiteCode('');
          
          setLoading(false);
          showToast('Déconnexion réussie', 'success');
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          });
        } catch (error) {
          setLoading(false);
          console.error('❌ Erreur lors de la déconnexion:', error);
          
          const errorMessage = 'Impossible de se déconnecter. Veuillez réessayer.';
          if (Platform.OS === 'web') {
            window.alert(errorMessage);
          } else {
            Alert.alert('Erreur', errorMessage);
          }
        }
      } else {
      }
    } catch (error) {
      console.error('[DEBUG] handleLogout: Erreur dans la fonction:', error);
    }
  };

  // --- DEBUT SECTION SCAN ZEBRA AMELIOREE ---
  // === NOUVEAU SYSTÈME DATAWEDGE SIMPLIFIÉ ===
  
  useEffect(() => {
    const initDataWedge = async () => {
      try {
        
        // Essayer d'abord le service DataWedge standard (Intents)
        try {
          await dataWedgeService.initialize();
          console.log('[ScanScreen] ✅ DataWedge standard initialisé avec succès');
          showToast('Scanner Zebra prêt (mode Intents)', 'success');
        } catch (dataWedgeError) {
          console.warn('[ScanScreen] ⚠️ DataWedge standard échoué, tentative Keystroke:', dataWedgeError.message);
          
          // Fallback vers le service Keystroke DataWedge
          try {
            await keystrokeDataWedgeService.initialize();
            console.log('[ScanScreen] ✅ DataWedge Keystroke initialisé avec succès');
            showToast('Scanner Zebra prêt (mode Keystroke)', 'success');
          } catch (keystrokeError) {
            console.error('[ScanScreen] ❌ ERREUR configuration Keystroke:', keystrokeError);
            showToast('Erreur configuration scanner. Utilisez la saisie manuelle.', 'warning');
          }
        }
        
      } catch (error) {
        console.error('[ScanScreen] ERREUR GÉNÉRALE d\'initialisation DataWedge:', error);
        showToast('Scanner DataWedge non disponible. Utilisez la saisie manuelle.', 'warning');
      }
    };
    
    // Initialiser seulement sur Android - PAS DE DÉPENDANCES
    if (Platform.OS === 'android') {
      initDataWedge();
    }
    
    // Nettoyage au démontage
    return () => {
      if (Platform.OS === 'android') {
      }
    };
  }, []); // AUCUNE DÉPENDANCE - Actif dès le chargement

  // === ÉCOUTEUR POUR LES ÉVÉNEMENTS KEYSTROKE DATAWEDGE ===
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    // Écouter les événements de clavier pour capturer les scans DataWedge
    const keyDownListener = DeviceEventEmitter.addListener('keyDownEvent', (event) => {
      console.log('🎯 Événement clavier détecté:', event);
      
      // Capturer les scans DataWedge qui arrivent comme des frappes de clavier
      if (event.keyCode && event.keyCode >= 0) {
        // Si c'est un caractère imprimable (pas une touche spéciale)
        if (event.keyCode >= 32 && event.keyCode <= 126) {
          console.log('📝 Caractère scanné détecté:', String.fromCharCode(event.keyCode));
          // Ne pas traiter ici, laisser le champ de saisie gérer
        }
        // Si c'est Enter (code 13), déclencher le traitement du scan
        else if (event.keyCode === 13) {
          console.log('✅ Enter détecté - déclenchement du traitement du scan');
          if (manualCodeInput && manualCodeInput.trim().length > 0) {
            processScannedData(manualCodeInput.trim());
            setManualCodeInput(''); // Vider le champ après traitement
          }
        }
      }
    });

    // Écouter les événements de saisie de texte pour capturer les scans complets
    const textInputListener = DeviceEventEmitter.addListener('onTextInput', (event) => {
      console.log('📝 Texte saisi détecté:', event.text);
      if (event.text && event.text.length > 0) {
        // Traiter le texte scanné
        processScannedData(event.text.trim());
      }
    });

    // Écouter les Intents DataWedge (pour le service standard)
    const intentListener = DeviceEventEmitter.addListener('com.inovie.scan.ACTION', (intent) => {
      console.log('📡 Intent DataWedge reçu:', intent);
      if (intent && intent.data) {
        console.log('📝 Données scannées via Intent:', intent.data);
        processScannedData(intent.data.trim());
      }
    });

    console.log('✅ Écouteurs DataWedge configurés (Keystroke + Intents)');

    // Nettoyage
    return () => {
      keyDownListener?.remove();
      textInputListener?.remove();
      intentListener?.remove();
    };
  }, []);

    // === NOUVEAU : INTERCEPTER LE BOUTON PHYSIQUE ZEBRA ===
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    
    
    // MÉTHODE 1: Événements clavier génériques
    const keyDownListener = DeviceEventEmitter.addListener('keyDownEvent', (event) => {
      // Codes possibles pour les boutons Zebra
      if (event.keyCode === 280 || event.keyCode === 27 || event.keyCode === 24 || event.keyCode === 25) {
        console.log('🎯 BOUTON ZEBRA DÉTECTÉ ! Déclenchement scan...');
        // Note: handlePhysicalScan a été supprimé car on utilise maintenant le mode Keystroke
      }
    });

    // MÉTHODE 2: Écouter TOUS les événements DeviceEventEmitter
    const allEventsListener = DeviceEventEmitter.addListener('*', (eventName, data) => {
      if (eventName && eventName.includes('key') || eventName.includes('scan') || eventName.includes('trigger')) {
        console.log(`📡 Événement capturé: ${eventName}`);
      }
    });

    // MÉTHODE 3: Écouter les événements DataWedge spécifiques
    const scanTriggerListener = DeviceEventEmitter.addListener('scan_trigger', (event) => {
      console.log('🔫 Trigger scan détecté !');
      // Note: handlePhysicalScan a été supprimé car on utilise maintenant le mode Keystroke
    });

    // MÉTHODE 4: Écouter les événements hardware
    const hardwareListener = DeviceEventEmitter.addListener('hardwareBackPress', (event) => {
      return false; // Laisser passer
    });

    console.log('✅ Tous les listeners configurés');

    // Nettoyage
    return () => {
      keyDownListener.remove();
      allEventsListener.remove();
      scanTriggerListener.remove();
      hardwareListener.remove();
    };
  }, []);

  // === FIN INTERCEPTION BOUTON PHYSIQUE ===

  // === AUTO-FOCUS SYSTÉMATIQUE POUR KEYSTROKE ===
  useEffect(() => {
    // Focus systématique du bon champ selon le contexte
    const ensureFocus = () => {
      if (!siteScanned && siteInputRef.current) {
        // Mode site : toujours focus sur le champ site
        siteInputRef.current.focus();
      } else if (siteScanned && !showOperationTypeSelection && colisInputRef.current) {
        // Mode colis : toujours focus sur le champ colis
        colisInputRef.current.focus();
      }
    };

    // Focus immédiat
    ensureFocus();

    // Re-focus systématique toutes les 500ms pour garantir le focus
    const focusInterval = setInterval(ensureFocus, 500);

    return () => clearInterval(focusInterval);
  }, [siteScanned, showOperationTypeSelection]);

  // Re-focus après chaque scan (quand le champ se vide)
  useEffect(() => {
    if (manualCodeInput === '') {
      const timer = setTimeout(() => {
        if (!siteScanned && siteInputRef.current) {
          siteInputRef.current.focus();
        } else if (siteScanned && colisInputRef.current) {
          colisInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [manualCodeInput, siteScanned]);

  // === FIN AUTO-FOCUS AUTOMATIQUE ===
  
  // === FIN NOUVEAU SYSTÈME DATAWEDGE ===

  // === GESTION CONNECTIVITÉ ET QUEUE HORS-LIGNE ===
  useEffect(() => {
    // Écouter les événements de la queue
    const unsubscribeQueue = offlineQueueService.addListener((event, data) => {
      switch (event) {
        case 'queued':
          showToast(`📱 ${data.count} scan(s) mis en queue (hors-ligne)`, 'info');
          setQueueSize(data.queueSize);
          break;
        case 'sent':
          showToast(`📤 ${data.count} scan(s) envoyés automatiquement`, 'success');
          break;
        case 'processed':
          if (data.success > 0) {
            showToast(`✅ ${data.success} scan(s) synchronisés`, 'success');
          }
          setQueueSize(data.remaining);
          break;
      }
    });

    // Écouter la connectivité réseau
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Récupérer la taille initiale de la queue
    const getInitialQueueSize = async () => {
      const size = await offlineQueueService.getQueueSize();
      setQueueSize(size);
    };
    getInitialQueueSize();

    // Nettoyage
    return () => {
      unsubscribeQueue();
      unsubscribeNet();
    };
  }, []);

  // === FIN GESTION CONNECTIVITÉ ===

  // Gérer l'activation/désactivation DataWedge lors de la navigation
  useFocusEffect(
    React.useCallback(() => {
      // En mode Keystroke, pas besoin de gestion spéciale focus/unfocus
      
      return () => {
      };
    }, [])
  );

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
      
      // ÉTAPE 1: Supprimer TOUTES les données persistantes AVANT de recharger
      const currentSessionIdForCleanup = currentSessionId || await AsyncStorage.getItem('current_session_id');
      const currentTourneeIdForCleanup = currentTourneeId;
      
      if (currentSessionIdForCleanup) {
        await AsyncStorage.removeItem(`visitedSiteIds_${currentSessionIdForCleanup}`);
        console.log(`[refreshTourneeData] AsyncStorage session supprimé: ${currentSessionIdForCleanup}`);
      }
      
      if (currentTourneeIdForCleanup) {
        await AsyncStorage.removeItem(`tourneeVisitedSites_${currentTourneeIdForCleanup}`);
        await firebaseService.resetTourneeProgress(currentTourneeIdForCleanup);
        console.log(`[refreshTourneeData] AsyncStorage et Firestore tournée réinitialisés: ${currentTourneeIdForCleanup}`);
      }
      
      // ÉTAPE 2: Récupérer la session actuelle
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
      
      // ÉTAPE 3: Mise à jour de l'historique et des paquets en cours
      await loadHistoricalData();
      
      // ÉTAPE 4: Actualiser le suivi de la tournée avec force reload
      if (currentSession?.tourneeId && tourneeProgressRef.current) {
        console.log(`[refreshTourneeData] Actualisation forcée du suivi de tournée pour ID: ${currentSession.tourneeId}`);
        // Utiliser un petit délai pour s'assurer que les suppressions AsyncStorage sont terminées
        setTimeout(() => {
          tourneeProgressRef.current.loadTourneeDetails(true);
        }, 100);
      }
      
      setLoading(false);
      console.log("Rafraîchissement et réinitialisation terminés avec succès");
      
      // Afficher un message à l'utilisateur
      showToast("La tournée a été complètement réinitialisée avec succès", 'success');
    } catch (error) {
      console.error("[refreshTourneeData] Erreur lors du rafraîchissement des données:", error);
      setLoading(false);
      showToast("Impossible de réinitialiser la tournée. Veuillez réessayer.", 'error');
    }
  };

  // Référence au composant TourneeProgress pour le rafraîchissement
  const tourneeProgressRef = React.useRef(null);

  // Effet pour gérer le retour du check véhicule final
  useEffect(() => {
    const handleReturnFromFinalCheck = async () => {
      if (route.params?.fromFinalCheck) {
        try {
          
          // Réinitialisation complète après le check final
          await refreshTourneeData();
          
          // Nettoyer le paramètre pour éviter les refresh répétés
          navigation.setParams({ fromFinalCheck: undefined });
          
          
        } catch (error) {
          console.error('[ScanScreen] Erreur lors du refresh après check véhicule final:', error);
          showToast("Check véhicule enregistré, mais erreur lors du refresh. Redémarrez l'app si nécessaire.", 'warning');
        }
      }
    };

    handleReturnFromFinalCheck();
  }, [route.params?.fromFinalCheck]);

  // Fonction pour gérer le check véhicule final
  const handleFinalVehicleCheck = async () => {
    try {
      // Récupérer les données de session actuelles
      const currentSession = await firebaseService.getCurrentSession();
      
      if (!currentSession) {
        showToast('Aucune session active trouvée', 'error');
        return;
      }

      // Naviguer vers l'écran CheckVehicule avec un indicateur que c'est un check final
      const sessionData = {
        tournee: currentSession.tournee,
        vehicule: currentSession.vehicule,
        pole: currentSession.pole || pole,
        isFinalCheck: true // Indicateur pour le check final
      };
      
      navigation.navigate('CheckVehicule', { 
        sessionData,
        isFromScanScreen: true // Indicateur pour le retour
      });
    } catch (error) {
      console.error('[handleFinalVehicleCheck] Erreur:', error);
      showToast('Impossible de démarrer le check véhicule final', 'error');
    }
  };

  // --- AJOUT: Nouvelle fonction handleConfirmVisitWithoutPackages ---
  const handleConfirmVisitWithoutPackages = async () => {
    console.log("Confirmation de visite sans colis déclenchée...");
    if (!siteDetails) {
      showToast("Impossible de confirmer la visite, détails du site manquants", 'error');
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
        siteName: siteName, // Ajouté pour correspondre aux champs attendus par addScans
        siteFin: siteName, // Ajouté pour les visites sans colis
        siteFinName: siteName, // Ajouté pour les visites sans colis
        sessionId: currentSessionId,
        operationType: 'visite_sans_colis', 
        status: 'pas_de_colis', // Modifié pour correspondre au format attendu
        statut: 'Pas de colis', // Modifié pour correspondre au format attendu
        type: 'visite_sans_colis', // Cohérence
        coursierCharg: coursierName,
        coursierChargeantId: userData?.uid,
        // ✅ CORRECTION: Ne pas définir poleId/poleName ici pour laisser le fallback dans addScans() fonctionner
        // poleId: pole?.id || '', // Supprimé: laisser addScans() gérer le fallback
        // poleName: pole?.nom || '' // Supprimé: laisser addScans() gérer le fallback
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
        showToast("Visite du site enregistrée (sans colis)", 'success');
      } else {
        throw new Error(result.error || "Échec de l'enregistrement de la visite");
      }

    } catch (error) {
      console.error("Erreur lors de la confirmation de la visite sans colis:", error);
      setLoading(false);
      showToast(`Impossible d'enregistrer la visite : ${error.message}`, 'error');
    }
  };
  // --- FIN AJOUT ---

  // Fonction pour gérer la sélection d'un site depuis le suivi de tournée
  const handleSiteSelection = (site) => {
    if (site && !siteScanned) {
      const siteName = site.nom || site.name;
      const siteId = site.id; // Stocker l'ID réel du site
      let siteIndex = site.index; // Récupérer l'index du site s'il est disponible
      
      // Si l'index n'est pas disponible directement, l'extraire de uniqueDisplayId
      if (siteIndex === null && site.uniqueDisplayId) {
        const parts = site.uniqueDisplayId.split('_');
        if (parts.length > 1) {
          siteIndex = parseInt(parts[parts.length - 1]);
          console.log(`[handleSiteSelection] Index extrait du site via uniqueDisplayId: ${siteIndex}`);
        }
      }
    
      // Stocker les détails du site sélectionné pour utilisation ultérieure
      setSiteDetails({
        id: siteId,
        name: siteName,
        nom: siteName
      });
      
      // Le code-barres à scanner reste sous forme lisible, mais on stocke l'ID séparément
      const siteCodeToUse = `SITE_${siteName}`;

      // ACTIVATION DIRECTE DU MODE MANUEL avec code pré-rempli
      console.log(`[handleSiteSelection] Code-barres: ${siteCodeToUse}, ID stocké: ${siteId}`);
      setScanMode('site');
      setManualCodeInput(siteCodeToUse);
      showToast(`Code site pré-rempli: ${siteCodeToUse}`, 'info');
    }
  };

  // Fonction pour effacer tous les colis en cours
  const handleClearAllInProgressScans = () => {
    // ACTION DIRECTE SANS POPUP
    const clearData = async () => {
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
        showToast("Tous les colis pris en charge ont été effacés", 'success');
      } catch (error) {
        setLoading(false);
        console.error("Erreur lors de l'effacement des colis:", error);
        showToast(`Impossible d'effacer les colis: ${error.message}`, 'error');
      }
    };
    
    clearData();
  };

  // Assurez-vous que l'historique n'est chargé qu'une seule fois
  useEffect(() => {
    if (!sessionHistoryLoaded) {
      loadHistoricalData();
    }
  }, [sessionHistoryLoaded]);

  // Effet pour gérer l'écouteur de scan
  // Ancien useEffect supprimé - remplacé par le nouveau système DataWedge

  // Fonction pour changer de tournée
  const handleChangeTournee = async () => {
    try {
      
      // Fermer la session actuelle
      await firebaseService.closeCurrentSession();
      
      // Navigation simple vers TourneeScreen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tournee' }]
      });
    } catch (error) {
      console.error('Erreur lors du changement de tournée:', error);
      showToast('Impossible de changer de tournée.', 'error');
    }
  };

  // Fonction pour changer de véhicule (même comportement que changer tournée)
  const handleChangeVehicule = async () => {
    try {
      
      // Fermer la session actuelle
      await firebaseService.closeCurrentSession();
      
      // Navigation simple vers TourneeScreen (même comportement que changer tournée)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tournee' }]
      });
    } catch (error) {
      console.error('Erreur lors du changement de véhicule:', error);
      showToast('Impossible de changer de véhicule.', 'error');
    }
  };

  // État pour gérer la validation automatique
  const [autoValidationTimeout, setAutoValidationTimeout] = useState(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  
  // Optimisations pour Zebra - État pour le debouncing
  const [lastScanTime, setLastScanTime] = useState(0);
  const SCAN_DEBOUNCE_MS = 100; // 100ms de délai minimum entre les scans

  // Fonction pour gérer le changement de texte avec DÉTECTION AUTOMATIQUE des scans Zebra
  const handleTextChange = (text) => {
    // Empêcher le traitement si un scan est déjà en cours
    if (isProcessingScan) {
      return;
    }

    // Optimisation Zebra: Debouncing pour éviter les scans multiples
    const now = Date.now();
    if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
      return;
    }

    setManualCodeInput(text);
    
    // Effacer le timeout précédent s'il existe (nettoyage)
    if (autoValidationTimeout) {
      clearTimeout(autoValidationTimeout);
      setAutoValidationTimeout(null);
    }
    
    // NOUVEAU: Détection automatique des scans Zebra via Keystroke
    // Méthode 1: Détection des caractères de fin (Enter, Tab, Retour chariot)
    if (text.includes('\n') || text.includes('\t') || text.includes('\r')) {
      // Nettoyer le code scanné (supprimer les caractères de contrôle)
      const cleanCode = text.replace(/[\n\t\r]/g, '').trim();
      
      if (cleanCode.length > 0) {
        setLastScanTime(now);
        setIsProcessingScan(true);
        
        // Traiter automatiquement le scan
        processScannedData(cleanCode).finally(() => {
          setIsProcessingScan(false);
        });
        
        // Vider le champ immédiatement
        setManualCodeInput('');
        return;
      }
    }
    
    // Méthode 2: Auto-validation par délai (si le texte fait plus de 6 caractères)
    // Les scanners Zebra saisissent rapidement, contrairement à la saisie manuelle
    if (text.length >= 6 && !autoValidationTimeout) {
      const timeout = setTimeout(() => {
        const currentText = text.trim();
        if (currentText.length > 0 && !isProcessingScan) {
          setLastScanTime(Date.now());
          setIsProcessingScan(true);
          
          processScannedData(currentText).finally(() => {
            setIsProcessingScan(false);
          });
          setManualCodeInput('');
        }
        setAutoValidationTimeout(null);
      }, 200); // Réduit à 200ms pour une meilleure réactivité sur Zebra
      
      setAutoValidationTimeout(timeout);
    }
    
    // Note: Pour la saisie manuelle, l'utilisateur doit toujours appuyer sur "Scanner"
  }; // handleTextChange



  // Nettoyer le timeout lors du démontage du composant
  useEffect(() => {
    return () => {
      if (autoValidationTimeout) {
        clearTimeout(autoValidationTimeout);
      }
    };
  }, [autoValidationTimeout]);


  // Fonction pour activer le scan de site - NOUVELLE VERSION SANS CHAMP
  const activateSiteScan = () => {
    
    // Pas besoin de setScanMode, le DataWedge est toujours actif
    // Simplement informer l'utilisateur que le scan est prêt
    if (!siteScanned) {
      showToast('Scanner prêt pour un site. Utilisez votre scanner Zebra.', 'info');
    } else {
      showToast('Site déjà scanné. Scannez des colis ou changez de site.', 'warning');
    }
  };

  // BOUTON TEST ZEBRA - Simule les scans pour tester l'application
  const testZebraScan = () => {
    const testCodes = [
      'SITE_123', // Code site
      'PKG_ABC123', // Code colis
      'PKG_DEF456', // Autre colis
      'SITE_TEST', // Autre site
      'PKG_XYZ789' // Autre colis
    ];
    
    const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
    console.log(`[TEST_ZEBRA] Simulation scan du code: ${randomCode}`);
    
    // Simuler l'événement DataWedge exactement comme un vrai scan
    processScannedData(randomCode);
    
    // Message adapté selon la plateforme
    const platformMsg = Platform.OS === 'web' 
      ? `Test web scan: ${randomCode}` 
      : `Test mobile scan: ${randomCode} (pour tester sans scanner Zebra)`;
    showToast(platformMsg, 'info');
  };

  // === FONCTIONS UTILITAIRES OPTIMISÉES ===
  
  // Mise à jour optimisée de l'historique local
  const updateLocalHistoryOptimized = async (scansToSubmit) => {
    try {
      const formattedScans = scansToSubmit.map(scan => ({
        idColis: scan.idColis,
        scanDate: scan.scanDate,
        operationType: scan.operationType,
        site: scan.siteDepart,
        siteName: scan.siteDepartName,
        tournee: scan.tourneeName,
        vehicule: scan.immatriculation,
        userId: scan.coursierChargeantId,
        userName: scan.coursierCharg,
        sessionId: scan.sessionId
      }));
      
      const existingHistory = await AsyncStorage.getItem('scanHistory') || '[]';
      const historyArray = JSON.parse(existingHistory);
      const updatedHistory = [...formattedScans, ...historyArray].slice(0, 100); // Limiter à 100
      
      await AsyncStorage.setItem('scanHistory', JSON.stringify(updatedHistory));
      setHistoricalScans(updatedHistory); // Mise à jour immédiate
      
      console.log(`[updateLocalHistory] ✅ ${formattedScans.length} scans ajoutés`);
    } catch (error) {
      console.error('[updateLocalHistory] ❌', error.message);
    }
  };

  // Mise à jour optimisée des paquets pris en charge
  const updateTakingCarePackagesOptimized = (scansToSubmit) => {
    if (operationType === 'entree') {
      setTakingCarePackages(prev => [...scansToSubmit, ...prev]);
    } else if (operationType === 'sortie') {
      const codesDeposited = scansToSubmit.map(scan => scan.idColis);
      setTakingCarePackages(prev => prev.filter(pkg => pkg.idColis && !codesDeposited.includes(pkg.idColis)));
    }
  };

  // Réinitialisation optimisée de l'interface
  const resetScanInterfaceOptimized = () => {
    resetScan();
    setShowOperationTypeSelection(false);
    setOperationType('entree');
  };








  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a4d94" translucent={false} />
      
      {/* DEBUG: Log pour vérifier le rendu */}
      
      {/* En-tête personnalisé compact */}
      <View style={styles.customHeader}>
        {/* Indicateur de connectivité permanent - GAUCHE */}
        <View style={[
          styles.connectivityIndicator, 
          isOnline ? styles.onlineIndicator : styles.offlineIndicator
        ]}>
          {isOnline ? (
            queueSize > 0 ? (
              // En ligne avec synchronisation
              <>
                <MaterialCommunityIcons name="sync" size={14} color="#007AFF" />
                <Text style={styles.queueSizeText}>{queueSize}</Text>
              </>
            ) : (
              // En ligne normal
              <MaterialCommunityIcons name="wifi" size={14} color="#28a745" />
            )
          ) : (
            // Hors ligne
            <>
              <MaterialCommunityIcons name="wifi-off" size={14} color="#ff9500" />
              {queueSize > 0 && (
                <Text style={styles.queueSizeText}>{queueSize}</Text>
              )}
            </>
          )}
        </View>
        
        {/* Espace vide à la place du titre */}
        <View style={styles.headerTitle}>
          {/* Titre supprimé - pas d'affichage */}
        </View>
        
        <View style={styles.headerButtons}>
          
          <TouchableOpacity onPress={() => navigation.setParams({ refresh: Date.now() })} style={styles.headerButton}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.setParams({ showHistory: true })} style={styles.headerButton}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('BigSacoche')} style={styles.headerButton}>
            <Ionicons name="briefcase-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Déplacement du bandeau dans le ScrollView pour qu'il ne soit plus fixe */}
      <View style={styles.sessionInfoContainer}>
        {/* NOUVEL AFFICHAGE pour le nom de l'utilisateur - DÉPLACÉ EN HAUT */}
        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="account" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          <Text style={styles.sessionInfoText}>Utilisateur: {currentUserDisplayName}</Text>
        </View>

        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          <Text style={styles.sessionInfoText}>Tournée: {currentTourneeName}</Text>
          <TouchableOpacity 
            onPress={() => {
              handleChangeTournee();
            }} 
            style={styles.changeButton}
          >
            <Text style={styles.changeButtonText}>Changer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sessionInfoRow}>
          <MaterialCommunityIcons name="truck" size={20} color="#1a4d94" style={styles.sessionInfoIcon} />
          <Text style={styles.sessionInfoText}>Véhicule: {currentVehiculeImmat}</Text>
          <TouchableOpacity 
            onPress={() => {
              handleChangeVehicule();
            }} 
            style={styles.changeButton}
          >
            <Text style={styles.changeButtonText}>Changer</Text>
          </TouchableOpacity>
        </View>
      </View>

        
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

                {/* Interface minimaliste pour scan colis */}
                <View style={styles.minimalScanContainer}>
                  <View style={styles.scanTitleRow}>
                    <MaterialCommunityIcons name="package-variant" size={16} color="#1a4d94" />
                    <Text style={styles.minimalScanTitle}>Scanner un code-barres de COLIS</Text>
                  </View>
                  <View style={styles.scanInputRow}>
                    <TextInput
                      ref={colisInputRef}
                      style={styles.minimalScanInput}
                      placeholder="Scanner un code colis..."
                      value={manualCodeInput}
                      onChangeText={handleTextChange}
                      onSubmitEditing={handleManualScan}
                      autoFocus={true}
                      blurOnSubmit={false}
                      editable={true}
                      returnKeyType="done"
                      showSoftInputOnFocus={isKeyboardVisible}
                    />
                    <TouchableOpacity 
                      style={[styles.validateButton, { backgroundColor: isKeyboardVisible ? '#e74c3c' : '#3498db', marginRight: 8 }]} 
                      onPress={() => {
                        if (isKeyboardVisible) {
                          // Masquer le clavier
                          Keyboard.dismiss();
                          setIsKeyboardVisible(false);
                        } else {
                          // Activer le clavier
                          setIsKeyboardVisible(true);
                          setTimeout(() => {
                            if (colisInputRef.current) {
                              colisInputRef.current.focus();
                            }
                          }, 100);
                        }
                      }}
                    >
                      <MaterialCommunityIcons 
                        name={isKeyboardVisible ? "keyboard-off" : "keyboard"} 
                        size={16} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.validateButton} 
                      onPress={handleManualScan}
                    >
                      <Text style={styles.validateButtonText}>✓</Text>
                    </TouchableOpacity>
                  </View>
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
                      keyExtractor={(item, index) => `${item.idColis || 'unknown'}-${item.timeStamp || index}`}
                      style={styles.scannedList}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      removeClippedSubviews={true}
                      initialNumToRender={15}
                      maxToRenderPerBatch={8}
                      windowSize={8}
                      updateCellsBatchingPeriod={50}
                      getItemLayout={(data, index) => ({
                        length: 60,
                        offset: 60 * index,
                        index,
                      })}
                    />
          </View>
        )}
        

              </>
            )}
          </>
        ) : (
          // Si aucun site n'a été scanné, afficher l'interface simplifiée pour Zebra
          <>
            {/* Interface minimaliste pour scan automatique */}
            <View style={styles.minimalScanContainer}>
              <View style={styles.scanTitleRow}>
                <MaterialCommunityIcons name="barcode" size={16} color="#1a4d94" />
                <Text style={styles.minimalScanTitle}>Scanner un code-barres SITE</Text>
              </View>
              <View style={styles.scanInputRow}>
                <TextInput
                  ref={siteInputRef}
                  style={styles.minimalScanInput}
                  placeholder="Scanner un code site..."
                  value={manualCodeInput}
                  onChangeText={handleTextChange}
                  onSubmitEditing={handleManualScan}
                  autoCapitalize="characters"
                  autoFocus={true}
                  blurOnSubmit={false}
                  editable={true}
                  returnKeyType="done"
                  showSoftInputOnFocus={isKeyboardVisible}
                />
                <TouchableOpacity 
                  style={[styles.validateButton, { backgroundColor: isKeyboardVisible ? '#e74c3c' : '#3498db', marginRight: 8 }]} 
                  onPress={() => {
                    if (isKeyboardVisible) {
                      // Masquer le clavier
                      Keyboard.dismiss();
                      setIsKeyboardVisible(false);
                    } else {
                      // Activer le clavier
                      setIsKeyboardVisible(true);
                      setTimeout(() => {
                        if (siteInputRef.current) {
                          siteInputRef.current.focus();
                        }
                      }, 100);
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name={isKeyboardVisible ? "keyboard-off" : "keyboard"} 
                    size={16} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.validateButton} 
                  onPress={handleManualScan}
                >
                  <Text style={styles.validateButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Suivi de tournée */}
            {currentTourneeId && currentSessionId && (
              <TourneeProgress
                ref={(ref) => {
                  tourneeProgressRef.current = ref;
                }}
                tourneeId={currentTourneeId}
                sessionId={currentSessionId}
                onSiteSelect={handleSiteSelection}
                onFinalVehicleCheck={handleFinalVehicleCheck}
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
                  <Text style={styles.takingCareCode}>{item.idColis || item.code}</Text>
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
              keyExtractor={(item, index) => `${item.idColis || 'unknown'}-${item.timeStamp || index}`}
              style={styles.takingCareList}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              removeClippedSubviews={true}
              initialNumToRender={15}
              maxToRenderPerBatch={8}
              windowSize={8}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 50,
                offset: 50 * index,
                index,
              })}
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
                keyExtractor={(item, index) => `${item.idColis || 'unknown'}-${item.timeStamp || index}`} 
                style={styles.historyList}
                contentContainerStyle={{ paddingBottom: 10 }}
                scrollEnabled={true}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={10}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
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

      {/* Toast pour les notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  customHeader: {
    height: hp(45),
    backgroundColor: '#1a4d94',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(12),
    elevation: 4,
    shadowOpacity: 0.3,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    color: '#fff',
    fontSize: fp(18),
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 6,
    marginLeft: 6,
  },
  connectivityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 24,
    justifyContent: 'center',
  },
  onlineIndicator: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
  },
  offlineIndicator: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  syncingIndicator: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  queueSizeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  testZebraButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  testZebraText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  diagnosticButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 4,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.5)',
  },
  diagnosticText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  zebraButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 3,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.5)',
  },
  zebraText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  testButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 3,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  logsButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 3,
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.5)',
  },
  logsText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  debugButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 3,
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.5)',
  },
  debugText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  logsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clearLogsButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearLogsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logsScrollView: {
    maxHeight: 200,
    padding: 12,
  },
  noLogsText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontStyle: 'italic',
    padding: 20,
  },
  logItem: {
    padding: 8,
    marginBottom: 4,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  logItemInfo: {
    backgroundColor: '#e8f4fd',
    borderLeftColor: '#3498db',
  },
  logItemSuccess: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#27ae60',
  },
  logItemError: {
    backgroundColor: '#fdf2f2',
    borderLeftColor: '#e74c3c',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  logMessage: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingTop: sp(8),
    paddingBottom: sp(15),
  },
  sessionInfoContainer: {
    backgroundColor: '#fff',
    padding: sp(12),
    marginBottom: sp(8),
    borderRadius: sp(8),
    marginHorizontal: sp(16),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(8),
  },
  sessionInfoIcon: {
    marginRight: sp(8),
  },
  sessionInfoText: {
    flex: 1,
    fontSize: fp(14),
    color: '#34495e',
  },
  changeButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Styles minimalistes pour interface scan
  minimalScanContainer: {
    backgroundColor: '#fff',
    padding: sp(12),
    marginHorizontal: sp(16),
    marginBottom: sp(8),
    borderRadius: sp(8),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  scanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(8),
    gap: sp(6),
  },
  minimalScanTitle: {
    fontSize: sp(14),
    fontWeight: '600',
    color: '#1a4d94',
  },
  scanInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
  },
  minimalScanInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#1a4d94',
    borderRadius: sp(6),
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    fontSize: sp(14),
    color: '#2c3e50',
    textAlign: 'center',
    fontWeight: '500',
    flex: 1,
  },
  validateButton: {
    backgroundColor: '#1a4d94',
    borderRadius: sp(6),
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    minWidth: sp(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: sp(16),
    fontWeight: '600',
  },
  cancelManualButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: sp(12),
    paddingVertical: sp(8),
    borderRadius: sp(6),
    marginLeft: sp(8),
  },
  cancelManualButtonText: {
    color: '#fff',
    fontSize: fp(12),
    fontWeight: 'bold',
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
    marginBottom: sp(16),
    backgroundColor: '#fff',
    borderRadius: sp(12),
    padding: sp(12),
    elevation: 2,
  },
  manualInput: {
    flex: 1,
    height: hp(44),
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: sp(8),
    paddingHorizontal: sp(12),
    marginRight: sp(12),
    fontSize: fp(16),
  },
  manualScanButton: {
    backgroundColor: '#3498db',
    padding: sp(12),
    borderRadius: sp(8),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp(80),
  },
  manualScanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fp(14),
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
  // AJOUT: Styles manquants pour la saisie manuelle
  manualInputContainer: {
    flexDirection: 'column',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  manualInput: {
    height: 40,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  manualButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manualValidateButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  manualValidateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // FIN AJOUT des styles manquants
  
  // Styles pour les boutons de diagnostic dans la section logs
  diagnosticButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  diagnosticBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  diagnosticBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  forceButton: {
    backgroundColor: '#e67e22', // Orange pour le forçage
  },
  keystrokeButton: {
    backgroundColor: '#9b59b6', // Violet pour Keystroke
  },
});