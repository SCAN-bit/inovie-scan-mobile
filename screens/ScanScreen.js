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
  AppState,
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
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from '../components/Toast';
import { wp, hp, fp, sp, isSmallScreen, isLargeScreen } from '../utils/responsiveUtils';

// --- NOUVEAU SYSTÈME DATAWEDGE ---
// Utilisation du nouveau DataWedgeService pour une gestion simplifiée et automatique

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

export default function ScanScreen({ navigation, route }) {
  const sessionData = (route.params && route.params.sessionData) || {}; // Sécurise sessionData

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

  // Vérifie si sessionData.tournee et sessionData.vehicule existent
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
  const reloadTimeoutRef = useRef(null);



  // Simplification de la gestion de l'état de la session
  // On récupère les objets complets depuis les paramètres de navigation
  const [currentTournee, setCurrentTournee] = useState((route.params && route.params.tournee) || null);
  const [currentVehicule, setCurrentVehicule] = useState((route.params && route.params.vehicule) || null);
  const [currentPole, setCurrentPole] = useState((route.params && route.params.pole) || null);

  // Les états dérivés sont maintenus pour l'affichage et la compatibilité
  const [currentTourneeName, setCurrentTourneeName] = useState((route.params && route.params.tournee && route.params.tournee.nom) || "Tournée inconnue");
  const [currentVehiculeImmat, setCurrentVehiculeImmat] = useState((route.params && route.params.vehicule && route.params.vehicule.immatriculation) || "Véhicule inconnu");
  const [currentVehiculeId, setCurrentVehiculeId] = useState((route.params && route.params.vehicule && route.params.vehicule.id) || null);
  const [currentTourneeId, setCurrentTourneeId] = useState((route.params && route.params.tournee && route.params.tournee.id) || null);
  
  // Rechargement des colis quand currentTourneeId change
  useEffect(() => {
    // console.log(`🎯 [ScanScreen] currentTourneeId mis à jour: ${currentTourneeId}`);
    
    // CORRECTION: Rechargement intelligent quand la tournée change
    if (currentTourneeId) {
      addDebugLog(`[ScanScreen] Tournée changée: ${currentTourneeId} - Rechargement des colis`, 'info');
      // Délai pour éviter les conflits avec l'affichage immédiat
      setTimeout(() => {
        // Vérifier si on vient de scanner un colis récemment
        const hasRecentScans = scannedContenants.length > 0;
        if (hasRecentScans) {
          addDebugLog(`[ScanScreen] Rechargement différé - colis récents détectés`, 'info');
          // Attendre plus longtemps si on a des colis récents
          setTimeout(() => {
            loadTakingCarePackages(true);
          }, 3000); // 3 secondes supplémentaires
        } else {
          loadTakingCarePackages(true);
        }
      }, 1000); // 1 seconde de délai pour éviter les conflits
    }
  }, [currentTourneeId]);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Chargement...");
  
  // États pour la queue hors-ligne et connectivité
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // État pour gérer l'affichage du clavier
  // Sur web, activer le clavier par défaut pour permettre les tests de codes-barres
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(Platform.OS === 'web');

  // État pour gérer les problèmes après retour d'arrière-plan
  const [isAppActive, setIsAppActive] = useState(true);

  // SUPPRIMÉ: Système de console.log custom pour améliorer les performances

  // Code nettoyé - logs répétitifs supprimés

  // Effet pour initialiser la session au démarrage OU récupérer la session passée
  useEffect(() => {
    const initializeOrUseExistingSession = async () => {
      let sessionIdFromParams = (route.params && route.params.sessionId);
      let sessionToUse = null;

      if (sessionIdFromParams) {
        // Session ID depuis paramètres
        const storedSessionId = await AsyncStorage.getItem('current_session_id');
        if (storedSessionId !== sessionIdFromParams) {
          await AsyncStorage.setItem('current_session_id', sessionIdFromParams);
        }
        sessionToUse = sessionIdFromParams;
      } else {
        const storedSessionId = await AsyncStorage.getItem('current_session_id');
        if (storedSessionId) {
          sessionToUse = storedSessionId;
        } else {
          return;  // Sortir si pas de session initialisée
        }
      }

      // Mettre à jour l'état React avec l'ID de session final
      setCurrentSessionId(sessionToUse);
      // Marquer la session comme active pour charger l'historique Firestore ultérieurement
      await AsyncStorage.setItem('userSessionActive', 'true');

      // Récupérer les informations complètes de la session ET le nom de l'utilisateur
      try {
        // PROTECTION: Timeout pour éviter les blocages
        const sessionPromise = firebaseService.getCurrentSession();
        const profilePromise = firebaseService.getUserProfile();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout chargement session')), 3000)
        );
        
        const [currentSession, userProfile] = await Promise.race([
          Promise.all([sessionPromise, profilePromise]),
          timeoutPromise
        ]);
        
        // Traiter le nom de l'utilisateur
        if (userProfile) {
          setCurrentUserDisplayName(`${userProfile.prenom || ''} ${userProfile.nom || ''}`.trim() || userProfile.email || "Utilisateur");
        }

        // Si une session existe déjà dans Firestore, on met à jour les états avec ses données
        if (currentSession) {
          setCurrentTournee({ id: currentSession.tourneeId, nom: currentSession.tourneeName });
          setCurrentVehicule({ id: currentSession.vehiculeId, immatriculation: currentSession.immatriculation });
          setCurrentPole({ id: currentSession.poleId, nom: currentSession.poleName });
          setSelectedSelas({ id: currentSession.selasId, nom: currentSession.selasName });
        } else {
           // Si c'est une NOUVELLE session, on s'assure que les états sont bien définis depuis les route.params
           setCurrentTournee((route.params && route.params.tournee) || null);
           setCurrentVehicule((route.params && route.params.vehicule) || null);
           setCurrentPole((route.params && route.params.pole) || null);
           // Pour selas, on le récupère du profil car il n'est pas dans les params
           if ((userProfile && userProfile.selasId)) {
             setSelectedSelas({ id: userProfile.selasId, nom: userProfile.selasName || '' });
           }
        }

 // Garder ce log

        if (currentSession) {
 // NOUVEAU LOG
          // Mettre à jour l'ID de la tournée - Essayer d'abord le champ direct, puis l'objet
          if (currentSession.tourneeId) {
            setCurrentTourneeId(currentSession.tourneeId);
          } else if ((currentSession.tournee && currentSession.tournee.id)) {
            setCurrentTourneeId(currentSession.tournee.id);
          }
          
          // Mettre à jour le nom de la tournée
          if ((currentSession.tournee && currentSession.tournee.nom)) {
            setCurrentTourneeName(currentSession.tournee.nom);
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
            setPole({ id: currentSession.poleId, nom: currentSession.poleName });
          } else if (sessionData && sessionData.pole && sessionData.pole.id) {
            setPole(sessionData.pole);
          } else if (userProfile && userProfile.poleId) {
            // Fallback sur le profil utilisateur
            setPole({ id: userProfile.poleId, nom: userProfile.poleName || 'Pôle à définir' });
          } else {
            setPole(null); // Explicitly set to null if nothing is found
          }
          
           if (currentSession.selasId && currentSession.selasName) {
             setSelectedSelas({ id: currentSession.selasId, nom: currentSession.selasName });
           } else {
             // Fallback sur le profil utilisateur si l'info n'est pas dans la session
             if (userProfile && userProfile.selasId) {
               setSelectedSelas({ id: userProfile.selasId, nom: 'SEALS à définir' }); // Placeholder
             }
           }

        } else {
 // NOUVEAU LOG
          // Si pas de session, on utilise l'info du profil
          if (sessionData && sessionData.pole && sessionData.pole.id) {
            setPole(sessionData.pole);
          } else if (userProfile && userProfile.poleId) {
            setPole({ id: userProfile.poleId, nom: userProfile.poleName || 'Pôle à définir' });
          } else {
            setPole(null);
          }
          if (userProfile && userProfile.selasId) {
             setSelectedSelas({ id: userProfile.selasId, nom: 'SEALS à définir' });
          }
        }
      } catch (error) {
        if (error.message === 'Timeout chargement session') {
          console.warn("[SessionInit] Timeout chargement session - continuer sans les données Firebase");
        } else {
          console.error("[SessionInit] ERREUR lors de la récupération/traitement de la session:", error);
        }
      }

      // Charger les données historiques une fois l'ID de session défini
      await loadHistoricalData();
      
      // Forcer la mise à jour du suivi de tournée pour réafficher les coches SANS supprimer la persistance
      if ((tourneeProgressRef.current && tourneeProgressRef.current.loadTourneeDetails)) {
        await tourneeProgressRef.current.loadTourneeDetails(false); // Changé de true à false pour préserver AsyncStorage
      }
    };

    initializeOrUseExistingSession();
  }, [(route.params && route.params.sessionId)]);

  // Effet pour détecter le paramètre refresh et rafraîchir les données
  useEffect(() => {
    if ((route.params && route.params.refresh)) {
      refreshTourneeData();
    }
  }, [(route.params && route.params.refresh)]);

  // Surveiller les changements de route.params pour détecter quand le bouton d'historique est pressé
  useEffect(() => {
    if ((route.params && route.params.showHistory)) {
      setShowHistoryModal(true);
      // Réinitialiser le paramètre pour éviter de rouvrir la modale si on navigue ailleurs puis revient
      navigation.setParams({ showHistory: false });
    }
  }, [(route.params && route.params.showHistory)]);

  // Chargement des scans historiques au démarrage et récupération des paquets en cours
  useEffect(() => {
    loadHistoricalData();
  }, []);

  // SUPPRIMÉ: Plus d'appel automatique sur changement de tournée
  // L'utilisateur devra recharger manuellement si nécessaire

  // Fonction pour charger tous les données d'historique et de paquets en cours
  const loadHistoricalData = async () => {
    try {
      addDebugLog(`[loadHistoricalData] Début chargement des données historiques`, 'info');
      
      // OPTIMISATION: Chargement en parallèle
      const promises = [
        loadHistoricalScans(),
        loadFirestoreScans(),
        loadTakingCarePackages(false) // CORRECTION: Restaurer le chargement automatique des colis
      ];
      
      await Promise.all(promises);
      addDebugLog(`[loadHistoricalData] Chargement des données historiques terminé`, 'info');
      
    } catch (error) {
      console.error('Erreur lors du chargement des données historiques:', error);
      addDebugLog(`[loadHistoricalData] ERREUR: ${error.message}`, 'error');
    }
  };

  const loadHistoricalScans = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('scanHistory');
      if (jsonValue !== null) {
        const history = JSON.parse(jsonValue);
        
        // Récupérer l'ID de la tournée actuelle
        const currentSession = await firebaseService.getCurrentSession();
        const currentTourneeId = (currentSession && currentSession.tournee && currentSession.tournee.id) || (sessionData && sessionData.tournee && sessionData.tournee.id) || '';
        
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
        
        // Historique local filtré
        
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

  // SOLUTION DÉFINITIVE: Système de chargement unique et contrôlé
  const packagesLoadingState = useRef({
    isLoading: false,
    lastLoadTime: 0,
    pendingCall: null
  });

  const loadTakingCarePackages = async (forceReload = false) => {
    const state = packagesLoadingState.current;
    const now = Date.now();
    
    // PROTECTION ABSOLUE: Un seul chargement à la fois
    if (state.isLoading && !forceReload) {
      addDebugLog(`[loadTakingCarePackages] BLOCAGE - Chargement déjà en cours`, 'info');
      return;
    }
    
    // PROTECTION ABSOLUE: Debouncing strict
    const timeSinceLastLoad = now - state.lastLoadTime;
    const MIN_INTERVAL = forceReload ? 0 : 5000; // 5 secondes minimum
    
    if (timeSinceLastLoad < MIN_INTERVAL && !forceReload) {
      addDebugLog(`[loadTakingCarePackages] BLOCAGE - Trop fréquent (${timeSinceLastLoad}ms < ${MIN_INTERVAL}ms)`, 'info');
      return;
    }
    
    // MARQUER COMME EN COURS IMMÉDIATEMENT
    state.isLoading = true;
    state.lastLoadTime = now;
    
    addDebugLog(`[loadTakingCarePackages] CHARGEMENT AUTORISÉ - Début`, 'info');
    
    try {
      await loadTakingCarePackagesInternal();
    } catch (error) {
      addDebugLog(`[loadTakingCarePackages] ERREUR: ${error.message}`, 'error');
    } finally {
      // LIBÉRER IMMÉDIATEMENT
      state.isLoading = false;
      addDebugLog(`[loadTakingCarePackages] CHARGEMENT TERMINÉ`, 'info');
    }
  };

  const loadTakingCarePackagesInternal = async () => {
    try {
      addDebugLog(`[loadTakingCarePackagesInternal] Début chargement pour tournée: ${currentTourneeId}`, 'info');
      // console.log(`🔍 [loadTakingCarePackagesInternal] Début chargement pour tournée: ${currentTourneeId}`);
      
      // S'assurer que currentTourneeId est disponible
      if (!currentTourneeId) {
        addDebugLog(`[loadTakingCarePackagesInternal] ERREUR - Pas d'ID de tournée`, 'error');
        setTakingCarePackages([]); // Vider les paquets si pas d'ID de tournée pour éviter la confusion
        return;
      }
      
      // PROTECTION: Vérifier que l'application n'est pas en freeze
      if (isProcessingScan) {
        addDebugLog(`[loadTakingCarePackagesInternal] Chargement annulé - scan en cours`, 'info');
        return;
      }
      
      // PROTECTION ANTI-FREEZE: Plus besoin de setIsLoadingPackages (géré par le wrapper)
      
      // OPTIMISATION HAUTE PERFORMANCE: Chargement direct sans restrictions
      
      // OPTIMISATION HAUTE PERFORMANCE: Cache réduit pour données fraîches
      const cacheKey = `takingCarePackages_${currentTourneeId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      const cacheTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);
      const cacheTime = Date.now();
      const cacheAge = cacheTimestamp ? cacheTime - parseInt(cacheTimestamp) : Infinity;
      const maxCacheAge = 30000; // 30 secondes pour appareils lents comme Zebra TC26
      
      if (cachedData && cacheAge < maxCacheAge) {
        const cachedPackages = JSON.parse(cachedData);
        setTakingCarePackages(cachedPackages);
        return;
      }
      
      // PROTECTION ANTI-FREEZE: Timeout augmenté pour appareils lents
      const scansPromise = firebaseService.getScansEnCours(currentTourneeId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout getScansEnCours')), 10000) // 10 secondes pour Zebra TC26
      );
      
      const scansEnCours = await Promise.race([scansPromise, timeoutPromise]);

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

      // CORRECTION: Fusion intelligente pour préserver les modifications locales récentes
      const currentPackages = takingCarePackages;
      const recentlyModifiedCodes = new Set();
      
      // Identifier les colis qui ont été modifiés récemment (dans les 2 dernières minutes)
      const twoMinutesAgo = Date.now() - 120000; // Réduit à 2 minutes pour éviter les conflits
      currentPackages.forEach(pkg => {
        const pkgTimestamp = new Date(pkg.scanDate || pkg.dateHeure || 0).getTime();
        if (pkgTimestamp > twoMinutesAgo) {
          recentlyModifiedCodes.add(pkg.idColis || pkg.code);
          addDebugLog(`[loadTakingCarePackagesInternal] Colis récemment modifié identifié: ${pkg.idColis || pkg.code} (${Math.round((Date.now() - pkgTimestamp) / 1000)}s)`, 'info');
        }
      });

      // CORRECTION: Fusion intelligente - préserver les modifications locales récentes
      const mergedPackages = [...filteredScans];
      
      // Ajouter les colis récemment modifiés qui ne sont pas dans Firebase OU qui diffèrent
      currentPackages.forEach(pkg => {
        const pkgCode = pkg.idColis || pkg.code;
        if (recentlyModifiedCodes.has(pkgCode)) {
          const firebasePkg = mergedPackages.find(fp => (fp.idColis || fp.code) === pkgCode);
          if (!firebasePkg) {
            // Colis ajouté localement mais pas encore dans Firebase
            mergedPackages.push(pkg);
            addDebugLog(`[loadTakingCarePackagesInternal] Colis local préservé: ${pkgCode}`, 'info');
          } else {
            // Colis existe dans Firebase - vérifier si la version locale est plus récente
            const localTimestamp = new Date(pkg.scanDate || pkg.dateHeure || 0).getTime();
            const firebaseTimestamp = new Date(firebasePkg.scanDate || firebasePkg.dateHeure || 0).getTime();
            if (localTimestamp > firebaseTimestamp) {
              // Version locale plus récente - remplacer
              const index = mergedPackages.findIndex(fp => (fp.idColis || fp.code) === pkgCode);
              mergedPackages[index] = pkg;
              addDebugLog(`[loadTakingCarePackagesInternal] Colis local plus récent appliqué: ${pkgCode}`, 'info');
            }
          }
        }
      });

      // Paquets pris en charge trouvés
      addDebugLog(`[loadTakingCarePackagesInternal] Firebase: ${filteredScans.length}, Locaux: ${recentlyModifiedCodes.size}, Fusionnés: ${mergedPackages.length}`, 'info');
      console.log(`📦 ${mergedPackages.length} colis trouvés:`, mergedPackages.map(s => s.idColis));
      setTakingCarePackages(mergedPackages);
      
      // OPTIMISATION: Mettre en cache les résultats fusionnés
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(mergedPackages));
        await AsyncStorage.setItem(`${cacheKey}_timestamp`, cacheTime.toString());
        addDebugLog(`[loadTakingCarePackagesInternal] Cache mis à jour avec succès (${mergedPackages.length} colis)`, 'info');
      } catch (cacheError) {
        addDebugLog(`[loadTakingCarePackagesInternal] ERREUR cache: ${cacheError.message}`, 'error');
        console.warn('Erreur lors de la mise en cache:', cacheError);
      }
      
      addDebugLog(`[loadTakingCarePackagesInternal] FIN chargement - Succès`, 'info');
      
    } catch (error) {
      console.error('Erreur lors du chargement des paquets pris en charge:', error);
      setTakingCarePackages([]); // Vider en cas d'erreur
    }
  };





  const processScannedData = async (data) => {
    addDebugLog(`[processScannedData] Début - Code: ${data}`, 'info');
    
    // VALIDATION: Vérifier que le code n'est pas vide ou invalide
    if (!data || data.trim().length === 0) {
      addDebugLog('[processScannedData] ERREUR - Code vide', 'error');
      return;
    }
    
    // Nettoyer le code (supprimer espaces et caractères spéciaux)
    const cleanData = data.trim();
    if (cleanData.length < 3) {
      addDebugLog(`[processScannedData] ERREUR - Code trop court: ${cleanData}`, 'error');
      return;
    }
    
    // Code scanné traité
    
    // PROTECTION: Debouncing renforcé contre les scans multiples
    const now = Date.now();
    if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
      addDebugLog(`[processScannedData] Scan trop rapide ignoré: ${cleanData}`, 'info');
      // Scan trop rapide ignoré
      return;
    }
    
    setLastScanTime(now);
    setIsProcessingScan(true);
    
    // OPTIMISATION: Feedback immédiat pour l'utilisateur
    showToast(`Scan: ${cleanData}`, 'info');
    
    try {
      // Cas 1: Nous n'avons pas encore scanné de site
      if (!siteScanned) {
        // PROTECTION ANTI-FREEZE: Timeout sur l'appel Firebase
        const siteVerificationPromise = firebaseService.verifySiteCode(cleanData);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout verifySiteCode')), 5000)
        );
        
        const siteVerification = await Promise.race([siteVerificationPromise, timeoutPromise]);

        if (siteVerification.site) {
          // Toujours enregistrer les infos du site et préparer pour les opérations si le site est valide
          setSiteCode(cleanData);
          setSiteDetails(siteVerification.site);
          
          // OPTIMISATION: Récupération du pôle simplifiée et mise en cache
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
                if ((currentSession && currentSession.poleId)) {
                  firebaseService.getPoleById(currentSession.poleId).then(poleDetails => {
                    if (poleDetails) {
                      const newPole = { id: poleDetails.id, nom: poleDetails.nom };
                      setPole(newPole);
                    }
                  });
                }
              }).catch(error => {
                console.warn('[processScannedData] Erreur récupération pôle en arrière-plan:', error.message);
              });
            }
          } catch (error) {
            console.warn('[processScannedData] Erreur récupération pôle:', error.message);
          }

          let occurrenceIndex = -1; // Initialiser à -1 (aucune occurrence non visitée trouvée par défaut)
          if ((tourneeProgressRef.current && tourneeProgressRef.current.getSitesWithStatus)) {
            const sitesList = tourneeProgressRef.current.getSitesWithStatus();
            const siteNameToFind = siteVerification.site.nom || siteVerification.site.name;

            // Trouver le premier site non visité avec ce nom
            occurrenceIndex = sitesList.findIndex(s => !s.visited && (s.name === siteNameToFind || s.nom === siteNameToFind));
            // Occurrence index trouvée
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
            
            // PROTECTION: Timeout sur le marquage du site
            const markPromise = firebaseService.markSiteVisitedInSession(currentSessionId, identifier, occurrenceIndex);
            const markTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout markSiteVisitedInSession')), 3000)
            );
            
            try {
              const markSuccess = await Promise.race([markPromise, markTimeoutPromise]);
              
              if (markSuccess) {
                if ((tourneeProgressRef.current && tourneeProgressRef.current.markSiteAsVisitedLocally)) {
                  await tourneeProgressRef.current.markSiteAsVisitedLocally(identifier, occurrenceIndex);
                } else if ((tourneeProgressRef.current && tourneeProgressRef.current.loadTourneeDetails)) {
                  // PROTECTION: Timeout sur loadTourneeDetails
                  const loadPromise = tourneeProgressRef.current.loadTourneeDetails(true);
                  const loadTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout loadTourneeDetails')), 2000)
                  );
                  
                  try {
                    await Promise.race([loadPromise, loadTimeoutPromise]);
                  } catch (loadError) {
                    console.warn('[processScannedData] Timeout loadTourneeDetails - ignoré:', loadError.message);
                  }
                }
              } else {
                showToast('Échec du marquage du site comme visité.', 'error');
              }
            } catch (markError) {
              if (markError.message === 'Timeout markSiteVisitedInSession') {
                console.warn('[processScannedData] Timeout markSiteVisitedInSession - ignoré');
              } else {
                showToast('Erreur marquage site: ' + markError.message, 'error');
              }
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
        handleContenantScan(cleanData);
        // Rester en mode scan contenant pour permettre les scans multiples
        setScanMode('contenant');
        return; // Sortir après traitement du contenant
      }
      
      // Cas 3: Site déjà scanné mais pas encore en mode contenant - proposer le choix
      if (siteScanned && !showOperationTypeSelection) {
        handleContenantScan(cleanData);
        return;
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du scan:', error);
      showToast('Erreur lors du traitement: ' + error.message, 'error');
      // CORRECTION: Réinitialiser les états en cas d'erreur pour éviter les blocages
      setScanMode('');
      setErrorMessage('');
      setSiteScanned(false);
      setSiteDetails(null);
      setSiteCode('');
      setShowOperationTypeSelection(false);
    } finally {
      // CORRECTION: Toujours réinitialiser l'état de traitement
      setIsProcessingScan(false);
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
    
    // OPTIMISATION HAUTE PERFORMANCE: Chargement immédiat pour le mode unifié
    // Charger les colis pris en charge pour permettre la détection automatique
    if (type === 'unified') {
      // Nettoyer les timeouts précédents
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      
      // CORRECTION: Chargement intelligent en mode unifié
      addDebugLog(`[setOperationType] Mode unifié activé - Chargement des colis`, 'info');
      // Délai pour éviter les conflits avec l'affichage immédiat
      setTimeout(() => {
        loadTakingCarePackages(false);
      }, 500); // 500ms de délai pour éviter les conflits
    }
    setIsReadyForScan(true);
    
    // Message pour le mode unifié
    const message = type === 'unified' 
      ? "Mode haute performance - Scanner les colis (prise en charge ou dépôt)" 
      : type === 'entree' 
      ? "Mode haute performance - Scanner les colis à prendre en charge" 
      : "Mode haute performance - Scanner les colis à déposer";
    
    // Message de performance
    showToast(message, 'info');
  };

  const handleContenantScan = async (code) => {
    addDebugLog(`[handleContenantScan] Début - Code: ${code}`, 'info');
    
    if (!siteScanned) {
      addDebugLog('[handleContenantScan] ERREUR - Site non scanné', 'error');
      showToast('Veuillez d\'abord scanner un site.', 'warning');
      return;
    }

    // Vérifier si le code n'est pas vide
    if (!code || code.trim() === '') {
      addDebugLog('[handleContenantScan] ERREUR - Code vide', 'error');
      showToast('Code invalide ou vide.', 'warning');
      return;
    }

    const trimmedCode = code.trim();
    addDebugLog(`[handleContenantScan] Code nettoyé: ${trimmedCode}`, 'info');

    try {
      // CORRECTION: Protection uniquement pour les colis déjà scannés dans cette session
      const alreadyScanned = scannedContenants.some(contenant => 
        (contenant.idColis || contenant.code) === trimmedCode
      );
      
      if (alreadyScanned) {
        showToast(`Colis "${trimmedCode}" déjà scanné dans cette session.`, 'warning');
        return;
      }
      
      // CORRECTION: Pas de protection sur takingCarePackages pour permettre le dépôt
      // Les colis dans takingCarePackages peuvent être déposés (c'est le but du dépôt)
      
      // CORRECTION: Suppression de la protection "récemment transmis" pour permettre le rescan
      // Cette protection empêchait le rescan de colis déposés
      // if (recentlyTransmitted.has(trimmedCode)) {
      //   showToast(`Colis "${trimmedCode}" récemment transmis. Attendez quelques secondes.`, 'warning');
      //   return;
      // }

      // Mode unifié - détection automatique du type d'opération
      let detectedOperationType = 'entree'; // Par défaut : prise en charge
      
      if (operationType === 'unified') {
        addDebugLog(`[handleContenantScan] Mode unifié - Vérification détection`, 'info');
        
        // GESTION CYCLES: Vérifier dans les deux sources (Firebase + cycle actuel)
        const isInTakingCare = takingCarePackages.some(pkg => (pkg.idColis || pkg.code) === trimmedCode);
        const isInCurrentCycle = currentCyclePackages.has(trimmedCode);
        
        addDebugLog(`[handleContenantScan] Détection - Firebase: ${isInTakingCare}, Cycle: ${isInCurrentCycle}`, 'info');
        
        if (isInTakingCare || isInCurrentCycle) {
          // Le colis est déjà en prise en charge -> c'est un dépôt
          detectedOperationType = 'sortie';
          addDebugLog(`[handleContenantScan] DÉTECTION SORTIE - ${trimmedCode}`, 'info');
          
          // CORRECTION: Ne pas faire la mise à jour ici, elle sera faite plus tard
          // pour éviter la double mise à jour qui cause les conflits
          
          addDebugLog(`[handleContenantScan] Colis ${trimmedCode} détecté comme dépôt`, 'info');
          // Colis détecté comme dépôt
        } else {
          // Le colis n'est pas en prise en charge -> c'est une prise en charge
          detectedOperationType = 'entree';
          addDebugLog(`[handleContenantScan] DÉTECTION ENTREE - ${trimmedCode}`, 'info');
          
          // Ajouter le colis au cycle actuel
          setCurrentCyclePackages(prev => {
            const newSet = new Set(prev);
            newSet.add(trimmedCode);
            return newSet;
          });
          
          addDebugLog(`[handleContenantScan] Colis ${trimmedCode} ajouté au cycle`, 'info');
          // Colis détecté comme prise en charge
        }
      } else if (operationType === 'sortie') {
        // Mode sortie classique - vérifier que le colis est dans la liste des colis pris en charge
        const isInTakingCare = takingCarePackages.some(pkg => (pkg.idColis || pkg.code) === trimmedCode);
        if (!isInTakingCare) {
          showToast("Colis non reconnu - pas en prise en charge.", 'warning');
          return;
        }
        
        // CORRECTION: Ne pas faire la mise à jour ici, elle sera faite plus tard
        // pour éviter la double mise à jour qui cause les conflits
        
        detectedOperationType = 'sortie';
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
        type: detectedOperationType, // Utiliser le type d'opération détecté automatiquement
        operationType: detectedOperationType, // Ajout pour compatibilité avec le service Firebase
      };
      
      addDebugLog(`[handleContenantScan] Ajout colis à la liste: ${trimmedCode} (${detectedOperationType})`, 'info');
      
      // CORRECTION: Mise à jour immédiate de la liste selon le type d'opération
      if (detectedOperationType === 'entree') {
        // Ajouter le colis à la liste de prise en charge
        const newPackage = {
          idColis: trimmedCode,
          code: trimmedCode,
          scanDate: new Date().toISOString(),
          status: 'en-cours',
          operationType: 'entree',
          site: (siteDetails && siteDetails.name) || siteCode,
          siteDepart: (siteDetails && siteDetails.name) || siteCode,
          tournee: currentTourneeName,
          tourneeId: currentTourneeId,
          vehicule: currentVehiculeImmat,
          vehiculeId: (sessionData.vehicule && sessionData.vehicule.id)
        };
        
        setTakingCarePackages(prev => {
          const newPackages = [newPackage, ...prev];
          addDebugLog(`[handleContenantScan] Colis ${trimmedCode} ajouté IMMÉDIATEMENT - Total: ${newPackages.length}`, 'info');
          return newPackages;
        });
      } else if (detectedOperationType === 'sortie') {
        // Retirer le colis de la liste de prise en charge
        setTakingCarePackages(prev => {
          const filteredPackages = prev.filter(pkg => {
            const pkgCode = pkg.idColis || pkg.code;
            return pkgCode !== trimmedCode;
          });
          addDebugLog(`[handleContenantScan] Colis ${trimmedCode} retiré IMMÉDIATEMENT - Restant: ${filteredPackages.length}`, 'info');
          return filteredPackages;
        });
        
        // CORRECTION: Retirer aussi du cycle actuel pour le mode unifié
        if (operationType === 'unified') {
          setCurrentCyclePackages(prev => {
            const newSet = new Set(prev);
            newSet.delete(trimmedCode);
            addDebugLog(`[handleContenantScan] Colis ${trimmedCode} retiré du cycle actuel`, 'info');
            return newSet;
          });
        }
      }
      
      // PROTECTION: Vérifier que l'état est cohérent avant la mise à jour
      if (!siteDetails || !siteCode) {
        addDebugLog(`[handleContenantScan] ERREUR - État incohérent: siteDetails=${!!siteDetails}, siteCode=${siteCode}`, 'error');
        showToast('Erreur: Site non défini', 'error');
        return;
      }

      safeSetState(
        setScannedContenants,
        (prev) => [newContenant, ...prev],
        `Ajout colis ${trimmedCode}`
      );
      
      // Afficher une confirmation de scan réussi avec le type détecté
      const operationLabel = detectedOperationType === 'entree' ? 'prise en charge' : 'dépôt';
      addDebugLog(`[handleContenantScan] Scan réussi: ${trimmedCode} (${operationLabel})`, 'info');
      // Colis scanné avec succès
      
      // Optionnel : Afficher une notification légère de succès
      // Vous pouvez commenter cette alerte si elle devient trop intrusive
      /*
      Alert.alert(
        'Scan réussi',
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
        <View style={styles.contenantHeaderRow}>
          <Text style={styles.contenantCode}>{item.idColis || item.code}</Text>
          <View style={item.type === 'sortie' ? styles.typeTagSortie : styles.typeTagEntree}>
            <Ionicons 
              name={item.type === 'sortie' ? 'arrow-down-circle' : 'arrow-up-circle'} 
              size={14} 
              color="#fff" 
              style={styles.typeTagIcon}
            />
            <Text style={styles.typeTagText}>{item.type === 'sortie' ? 'Dépôt' : 'Prise en charge'}</Text>
          </View>
        </View>
        <Text style={styles.contenantTime}>{item.timeStamp}</Text>
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

  // Fonction pour naviguer vers ScanScreen
  const handleGoToTournee = () => {
    // Navigation vers ScanScreen
    
    // Réinitialiser l'interface de scan
    resetScanInterfaceOptimized();
    
    // Naviguer vers ScanScreen avec les données de session actuelles
    navigation.navigate('Scan', {
      sessionData: {
        tournee: {
          id: currentTourneeId,
          nom: currentTourneeName
        },
        vehicule: {
          id: currentVehiculeId,
          immatriculation: currentVehiculeImmat
        },
        pole: {
          id: (currentPole && currentPole.id),
          nom: (currentPole && currentPole.nom)
        },
        sessionId: currentSessionId
      }
    });
    
    showToast('Retour vers l\'écran de scan', 'success');
  };

  const handleTransmit = async () => {
    addDebugLog(`[handleTransmit] Début - ${scannedContenants.length} colis`, 'info');
    addDebugLog(`[handleTransmit] État initial: siteScanned=${siteScanned}, scanMode=${scanMode}, operationType=${operationType}`, 'info');
    
    if (scannedContenants.length === 0) {
      addDebugLog('[handleTransmit] ERREUR - Aucun colis à transmettre', 'error');
      showToast('Aucun contenant scanné à transmettre.', 'warning');
      return;
    }

    // PROTECTION: Vérifier si une transmission est déjà en cours
    if (loading) {
      return;
    }

    // Fermer le clavier avant la transmission pour éviter les conflits
    Keyboard.dismiss();
    setIsKeyboardVisible(false);

    // SUPPRESSION DES LIMITATIONS ARTIFICIELLES - Performance optimale

    setLoading(true);

    // Timeout de sécurité pour éviter le blocage indéfini
    const timeoutId = setTimeout(() => {
      // Timeout de sécurité - Déblocage forcé
      setLoading(false);
      showToast('Transmission interrompue (timeout)', 'warning');
    }, 30000); // 30 secondes max

    try {
      // Vérifier la connectivité réseau d'abord
      const netState = await NetInfo.fetch();
      const isConnected = netState.isConnected;
      const connectionQuality = getConnectionQuality(netState);
      // Connectivité vérifiée

      // SIMPLIFICATION: Queue offline seulement si pas de connexion
      if (!isConnected) {
        addDebugLog(`[handleTransmit] Hors ligne - Queue de ${scannedContenants.length} scans`, 'info');
        // Hors ligne - Mise en queue
        
        // Préparer les données pour la queue avec toutes les informations nécessaires
        const queueData = scannedContenants.map(scan => ({
          ...scan,
          queuedAt: Date.now(),
          siteCode: siteCode,
          operationType: operationType,
          // Ajouter les informations de site selon le type d'opération
          ...(operationType === 'sortie' ? {
            // Pour les sorties (arrivée) : site de destination
            siteFin: (siteDetails && siteDetails.id) || siteCode,
            siteFinName: (siteDetails && siteDetails.name) || 'Inconnu',
            siteActuel: (siteDetails && siteDetails.id) || siteCode,
            siteActuelName: (siteDetails && siteDetails.name) || 'Inconnu'
          } : operationType === 'entree' ? {
            // Pour les entrées (prise en charge) : site de départ
            siteDepart: (siteDetails && siteDetails.id) || siteCode,
            siteDepartName: (siteDetails && siteDetails.name) || 'Inconnu',
            site: (siteDetails && siteDetails.id) || siteCode
          } : operationType === 'visite_sans_colis' ? {
            // Pour les visites sans colis : site visité
            siteVisite: (siteDetails && siteDetails.id) || siteCode,
            siteVisiteName: (siteDetails && siteDetails.name) || 'Inconnu',
            site: (siteDetails && siteDetails.id) || siteCode
          } : {})
        }));
        
        // Ajouter à la queue hors-ligne
        await offlineQueueService.addToQueue(queueData);
        
        // Vider la liste des scans scannés
        setScannedContenants([]);
        resetScanInterfaceOptimized();
        
        showToast(`${scannedContenants.length} colis mis en attente (hors ligne)`, 'warning');
        clearTimeout(timeoutId); // Annuler le timeout
        setLoading(false); // Débloquer l'interface
        return; // Sortir de la fonction sans bloquer
      }

      // SIMPLIFICATION: Transmission directe si connecté
      addDebugLog(`[handleTransmit] Transmission directe - Connexion active`, 'info');

      // Récupérer l'ID de session actuel et l'ID utilisateur
      addDebugLog(`[handleTransmit] Récupération session et utilisateur...`, 'info');
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');
      const currentUserId = await firebaseService.getCurrentUserId();
      addDebugLog(`[handleTransmit] Session: ${currentSessionId}, User: ${currentUserId}`, 'info');

      // OPTIMISATION: Préparer toutes les données en une seule fois
      let latestSession = null;
      let latestPole = null;
      let poleId = null;
      
      // Récupérer la session et le pôle une seule fois pour tous les colis
      try {
        latestSession = await firebaseService.getCurrentSession();
        
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
            if (typeof latestSession.tournee.pole === 'string') {
              poleId = latestSession.tournee.pole;
            } else if (latestSession.tournee.pole.id) {
              poleId = latestSession.tournee.pole.id;
            }
          }
        }
        
        if (poleId) {
          latestPole = await firebaseService.getPoleById(poleId);
        }
        
        if (!latestPole || !latestPole.id) {
          latestPole = {
            id: 'inconnu-' + Date.now(),
            nom: 'Pôle inconnu',
            description: 'Pôle non spécifié dans la session'
          };
        }
      } catch (err) {
        console.error('[handleTransmit] Erreur lors de la récupération du pôle:', err);
        latestPole = {
          id: 'inconnu-' + Date.now(),
          nom: 'Pôle inconnu',
          description: 'Pôle non spécifié dans la session'
        };
      }


      // OPTIMISATION UNIFIÉE: Traitement en batch pour TOUS les types d'opérations
      
      let successCount = 0; // Déclarer successCount au niveau de la fonction
      
      try {
        // Préparer les données pour addPassages (qui gère tous les types)
        const passageData = scannedContenants.map(scan => {
          const scanDate = scan.scanDate || new Date().toISOString();
          // Utiliser le type détecté automatiquement (scan.type ou scan.operationType)
          const scanType = scan.operationType || scan.type || operationType;
          const currentScanCode = scan.idColis || scan.code;
          
          // Type détecté pour le colis

          return {
            idColis: currentScanCode,
            code: currentScanCode, // Pour compatibilité
            scanDate,
            operationType: scanType,
            status: scanType === 'sortie' ? 'livré' : 
                    scanType === 'visite_sans_colis' ? 'pas_de_colis' : 'en-cours',
            sessionId: currentSessionId,
            
            // Informations de site selon le type
            ...(scanType === 'sortie' ? {
              // Pour les sorties : site de destination
              siteFin: (siteDetails && siteDetails.id) || siteCode,
              siteFinName: (siteDetails && siteDetails.name) || 'Inconnu',
              siteActuel: (siteDetails && siteDetails.id) || siteCode,
              siteActuelName: (siteDetails && siteDetails.name) || 'Inconnu',
              dateHeureFin: scanDate,
              dateArrivee: new Date(scanDate).toLocaleDateString(),
              heureArrivee: new Date(scanDate).toLocaleTimeString('fr-FR'),
              coursierLivraisonId: currentUserId,
              coursierLivraison: currentUserDisplayName,
            } : {
              // Pour les entrées et visites : site de départ
              siteDepart: (siteDetails && siteDetails.id) || siteCode,
              siteDepartName: (siteDetails && siteDetails.name) || 'Inconnu',
              site: (siteDetails && siteDetails.id) || siteCode,
              dateHeureDepart: scanDate,
              dateDepart: new Date(scanDate).toLocaleDateString(),
              heureDepart: new Date(scanDate).toLocaleTimeString('fr-FR'),
              coursierChargeantId: currentUserId,
              coursierCharg: currentUserDisplayName,
            }),
            
            // Informations communes
            tourneeId: (currentTournee && currentTournee.id) || '',
            tourneeName: (currentTournee && currentTournee.nom) || '',
            vehiculeId: (currentVehicule && currentVehicule.id) || '',
            immatriculation: (currentVehicule && currentVehicule.immatriculation) || '',
            poleId: latestPole.id,
            poleName: latestPole.nom || '',
            selasId: (selectedSelas && selectedSelas.id) || '',
            
            // Location si disponible
            ...(sessionData.location && {
              location: {
                latitude: sessionData.location.coords.latitude,
                longitude: sessionData.location.coords.longitude,
                accuracy: sessionData.location.coords.accuracy,
              }
            })
          };
        });

        // Séparer les colis par type d'opération détecté
        const entreeScans = scannedContenants.filter(scan => (scan.operationType || scan.type) === 'entree');
        const sortieScans = scannedContenants.filter(scan => (scan.operationType || scan.type) === 'sortie');
        
        // Traitement séparé par type
        
        let batchResult = { success: true, created: 0, updated: 0 };
        
        // Traiter les colis de sortie (dépôts) - mettre à jour les passages existants
        if (sortieScans.length > 0) {
          const colisList = sortieScans.map(scan => scan.idColis || scan.code).filter(code => code);
          const updateData = {
            status: 'livré',
            siteFin: (siteDetails && siteDetails.id) || siteCode,
            siteFinName: (siteDetails && siteDetails.name) || 'Inconnu',
            siteActuel: (siteDetails && siteDetails.id) || siteCode,
            siteActuelName: (siteDetails && siteDetails.name) || 'Inconnu',
            dateHeureFin: new Date().toISOString(),
            dateArrivee: new Date().toLocaleDateString(),
            heureArrivee: new Date().toLocaleTimeString('fr-FR'),
            coursierLivraisonId: currentUserId,
            coursierLivraison: currentUserDisplayName,
          };
          const sortieResult = await firebaseService.updatePassagesOnSortieBatch(colisList, updateData, isConnected);
          if (sortieResult.success) {
            batchResult.updated += sortieResult.updated || 0;
          } else {
            throw new Error(`Erreur mise à jour sorties: ${sortieResult.error}`);
          }
        }
        
        // Traiter les colis d'entrée (prise en charge) - créer de nouveaux passages
        if (entreeScans.length > 0) {
          const entreePassageData = passageData.filter(passage => 
            entreeScans.some(scan => (scan.idColis || scan.code) === passage.idColis)
          );
          const entreeResult = await firebaseService.addPassages(entreePassageData);
          if (entreeResult.success) {
            batchResult.created += entreeResult.created || 0;
          } else {
            throw new Error(`Erreur création entrées: ${entreeResult.error}`);
          }
        }
        
        if (batchResult.success) {
          // Batch réussi
          
          // Créer les résultats individuels pour compatibilité
          const results = scannedContenants.map(scan => ({
            success: true, // Si le batch a réussi, tous les colis ont réussi
            scanCode: scan.idColis || scan.code
          }));

          // Calculer le nombre de succès
          successCount = results.filter(result => result.success).length;
        } else {
          throw new Error(batchResult.error || 'Échec du traitement batch');
        }
      } catch (error) {
        console.error('🚨 [handleTransmit] Erreur batch, fallback vers traitement individuel:', error);
        // Fallback vers le traitement individuel en cas d'erreur batch
        // (le code de fallback sera ajouté ici si nécessaire)
        throw error;
      }

      // Après la transmission, vider la liste des scans en attente
      await updateLocalHistoryOptimized(scannedContenants);
      
      // CORRECTION: Pas besoin de mise à jour car les colis sont déjà affichés immédiatement
      // Les colis ont été ajoutés lors du scan via handleContenantScan
      addDebugLog(`[handleTransmit] Colis déjà affichés immédiatement lors du scan - pas de mise à jour nécessaire`, 'info');
      
      // CORRECTION: Pas de rechargement automatique après transmission pour éviter les conflits
      // Le rechargement se fera naturellement lors du prochain scan ou changement de tournée
      
      // CORRECTION: Suppression du marquage "récemment transmis" pour permettre le rescan
      // Cette fonctionnalité empêchait le rescan de colis déposés
      // const transmittedCodes = scannedContenants.map(scan => scan.idColis || scan.code);
      // addDebugLog(`[handleTransmit] Marquage ${transmittedCodes.length} colis comme récemment transmis`, 'info');
      // 
      // setRecentlyTransmitted(prev => {
      //   const newSet = new Set(prev);
      //   transmittedCodes.forEach(code => newSet.add(code));
      //   return newSet;
      // });
      // 
      // // Nettoyer la liste des colis récemment transmis après 30 secondes
      // setTimeout(() => {
      //   addDebugLog(`[handleTransmit] Nettoyage des colis récemment transmis après 30s`, 'info');
      //   setRecentlyTransmitted(prev => {
      //     const newSet = new Set(prev);
      //     transmittedCodes.forEach(code => newSet.delete(code));
      //     return newSet;
      //   });
      // }, 30000); // 30 secondes
      
      // Vider la liste des colis scannés mais garder l'interface active
      setScannedContenants([]);
      
      // Ne plus réinitialiser automatiquement - l'utilisateur peut continuer à scanner
      
      // Protection supplémentaire : réinitialisation différée pour les cas problématiques
      // Ne plus réinitialiser automatiquement l'interface - l'utilisateur reste sur la page
      
      // CORRECTION: Mettre à jour le suivi de tournée après transmission
      try {
        await updateTourneeProgress();
        // Suivi de tournée mis à jour
        
        // Protection supplémentaire: forcer le rechargement du composant TourneeProgress
        if ((tourneeProgressRef.current && tourneeProgressRef.current.loadTourneeDetails)) {
          setTimeout(() => {
            tourneeProgressRef.current.loadTourneeDetails(true);
            // Rechargement forcé du composant TourneeProgress
          }, 1000);
        }
      } catch (error) {
        console.warn('[handleTransmit] Erreur lors de la mise à jour du suivi de tournée:', error);
      }
      
      // CORRECTION: Pas de rechargement automatique après transmission pour éviter les conflits
      // Le colis est déjà affiché immédiatement via updateTakingCarePackagesOptimized
      addDebugLog(`[handleTransmit] Pas de rechargement automatique - colis déjà affiché`, 'info');

      // Enregistrer le timestamp de la transmission pour le monitoring des quotas
      addDebugLog(`[handleTransmit] Enregistrement timestamp transmission...`, 'info');
      await recordTransmissionTime();
      addDebugLog(`[handleTransmit] Timestamp transmission enregistré`, 'info');

      // Afficher un message de succès
      addDebugLog(`[handleTransmit] Affichage message succès...`, 'info');
      if (successCount === scannedContenants.length) {
        showToast(`${successCount} colis transmis avec succès`, 'success');
      } else {
        showToast(`${successCount}/${scannedContenants.length} colis transmis`, 'warning');
      }
      
      addDebugLog(`[handleTransmit] FIN handleTransmit - Succès complet`, 'info');

    } catch (error) {
      console.error('🚨 [handleTransmit] Erreur majeure lors de la transmission:', error);
      
      // GESTION SPÉCIFIQUE DES ERREURS FIREBASE FREE TIER
      let errorMessage = "Erreur lors de la transmission: " + error.message;
      
      if (error.message.includes('quota') || error.message.includes('Quota')) {
        errorMessage = "Limitation Firebase atteinte (quota). Réessayez plus tard ou contactez l'administrateur.";
        console.warn('QUOTA FIREBASE DÉPASSÉ - Passage en mode hors ligne recommandé');
      } else if (error.message.includes('too many') || error.message.includes('concurrent')) {
        errorMessage = "Trop de connexions simultanées. Réduisez le nombre de colis ou réessayez plus tard.";
        console.warn('CONNEXIONS SIMULTANÉES FIREBASE DÉPASSÉES');
      } else if (error.message.includes('rate limit') || error.message.includes('Rate')) {
        errorMessage = "Limite de fréquence atteinte. Attendez quelques secondes avant de réessayer.";
        console.warn('RATE LIMIT FIREBASE ATTEINT');
      } else if (error.message.includes('permission') || error.message.includes('Permission')) {
        errorMessage = "Problème de permissions Firebase. Vérifiez votre connexion.";
        console.warn('ERREUR DE PERMISSIONS FIREBASE');
      }
      
      showToast(errorMessage, 'error');
      
      // CORRECTION: Réinitialiser les états en cas d'erreur pour éviter les blocages
      resetScanInterfaceOptimized();
      setIsProcessingScan(false);
    } finally {
      clearTimeout(timeoutId); // Annuler le timeout
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
          console.log('Déconnexion Firebase réussie');
          
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
          console.error('Erreur lors de la déconnexion:', error);
          
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
          console.log('[ScanScreen] DataWedge standard initialisé avec succès');
          showToast('Scanner Zebra prêt (mode Intents)', 'success');
        } catch (dataWedgeError) {
          console.warn('[ScanScreen] DataWedge standard échoué, tentative Keystroke:', dataWedgeError.message);
          
          // Fallback vers le service Keystroke DataWedge
          try {
            await keystrokeDataWedgeService.initialize();
            console.log('[ScanScreen] DataWedge Keystroke initialisé avec succès');
            showToast('Scanner Zebra prêt (mode Keystroke)', 'success');
          } catch (keystrokeError) {
            console.error('[ScanScreen] ERREUR configuration Keystroke:', keystrokeError);
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

  // === ÉCOUTEUR OPTIMISÉ POUR LES ÉVÉNEMENTS KEYSTROKE DATAWEDGE ===
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    // OPTIMISATION: Throttling des scans pour éviter la saturation DataWedge
    let lastScanTime = 0;
    const SCAN_THROTTLE_MS = 100; // Max 1 scan toutes les 100ms (réactivité maximale)
    let scanQueue = [];
    let isProcessingQueue = false;

    const processScanQueue = async () => {
      if (isProcessingQueue || scanQueue.length === 0) return;
      
      isProcessingQueue = true;
      const data = scanQueue.shift();
      
      try {
        console.log('[ScanScreen] Traitement scan optimisé:', data);
        await processScannedData(data);
      } catch (error) {
        console.error('[ScanScreen] Erreur traitement scan:', error);
      } finally {
        isProcessingQueue = false;
        
        // Traiter le prochain scan dans la queue après un court délai
        if (scanQueue.length > 0) {
          setTimeout(processScanQueue, 50);
        }
      }
    };

    const handleScanData = (data, source) => {
      const now = Date.now();
      
      // OPTIMISATION: Throttling pour éviter la saturation
      if (now - lastScanTime < SCAN_THROTTLE_MS) {
        console.log(`[ScanScreen] Scan throttlé (${source}), ajouté à la queue:`, data);
        scanQueue.push(data);
        return;
      }
      
      lastScanTime = now;
      console.log(`[ScanScreen] Scan traité immédiatement (${source}):`, data);
      
      // Traitement immédiat pour le premier scan, queue pour les suivants
      if (scanQueue.length === 0) {
        processScannedData(data);
      } else {
        scanQueue.push(data);
        processScanQueue();
      }
    };
    
    // Écouter les événements de clavier pour capturer les scans DataWedge
    const keyDownListener = DeviceEventEmitter.addListener('keyDownEvent', (event) => {
      console.log('Événement clavier détecté:', event);
      
      // Capturer les scans DataWedge qui arrivent comme des frappes de clavier
      if (event.keyCode && event.keyCode >= 0) {
        // Si c'est un caractère imprimable (pas une touche spéciale)
        if (event.keyCode >= 32 && event.keyCode <= 126) {
          console.log('Caractère scanné détecté:', String.fromCharCode(event.keyCode));
          // Ne pas traiter ici, laisser le champ de saisie gérer
        }
        // Si c'est Enter (code 13), déclencher le traitement du scan
        else if (event.keyCode === 13) {
          console.log('Enter détecté - déclenchement du traitement du scan');
          if (manualCodeInput && manualCodeInput.trim().length > 0) {
            handleScanData(manualCodeInput.trim(), 'Keystroke');
            setManualCodeInput(''); // Vider le champ après traitement
          }
        }
      }
    });

    // Écouter les événements de saisie de texte pour capturer les scans complets
    const textInputListener = DeviceEventEmitter.addListener('onTextInput', (event) => {
      console.log('📝 Texte saisi détecté:', event.text);
      if (event.text && event.text.length > 0) {
        // Traiter le texte scanné avec throttling
        handleScanData(event.text.trim(), 'TextInput');
      }
    });

    // Écouter les Intents DataWedge (pour le service standard)
    const intentListener = DeviceEventEmitter.addListener('com.inovie.scan.ACTION', (intent) => {
      console.log('Intent DataWedge reçu:', intent);
      if (intent && intent.data) {
        console.log('Données scannées via Intent:', intent.data);
        // Traiter avec throttling
        handleScanData(intent.data.trim(), 'Intent');
      }
    });

    console.log('Écouteurs DataWedge optimisés configurés (Keystroke + Intents + Throttling)');

    // Nettoyage
    return () => {
      (keyDownListener && keyDownListener.remove)();
      (textInputListener && textInputListener.remove)();
      (intentListener && intentListener.remove)();
      // Nettoyer la queue au démontage
      scanQueue = [];
      isProcessingQueue = false;
    };
  }, []);

    // === NOUVEAU : INTERCEPTER LE BOUTON PHYSIQUE ZEBRA ===
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    
    
    // MÉTHODE 1: Événements clavier génériques
    const keyDownListener = DeviceEventEmitter.addListener('keyDownEvent', (event) => {
      // Codes possibles pour les boutons Zebra
      if (event.keyCode === 280 || event.keyCode === 27 || event.keyCode === 24 || event.keyCode === 25) {
        console.log('BOUTON ZEBRA DÉTECTÉ ! Déclenchement scan...');
        // Note: handlePhysicalScan a été supprimé car on utilise maintenant le mode Keystroke
      }
    });

    // MÉTHODE 2: Écouter TOUS les événements DeviceEventEmitter
    const allEventsListener = DeviceEventEmitter.addListener('*', (eventName, data) => {
      if (eventName && eventName.includes('key') || eventName.includes('scan') || eventName.includes('trigger')) {
        console.log(`Événement capturé: ${eventName}`);
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

    console.log('Tous les listeners configurés');

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

  // === GESTION DES ÉVÉNEMENTS APPSTATE POUR CORRIGER LES BUGS ===
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        setIsAppActive(true);
        
        // Si l'application revient en avant-plan, seulement recharger les données si nécessaire
        // Ne plus réinitialiser automatiquement l'interface pour éviter les sorties intempestives
        console.log('[AppState] Application revenue au premier plan - rechargement des données uniquement');
        
        // Recharger seulement les données sans réinitialiser l'interface
        // SUPPRIMÉ: Plus de rechargement automatique au retour d'arrière-plan
        // L'utilisateur devra recharger manuellement si nécessaire
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsAppActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [scannedContenants.length, loading]);
  
  // === FIN NOUVEAU SYSTÈME DATAWEDGE ===

  // SIMPLIFICATION: Fonction basique de connectivité
  const getConnectionQuality = (state) => {
    return state.isConnected ? 'connected' : 'offline';
  };

  // === GESTION CONNECTIVITÉ ET QUEUE HORS-LIGNE ===
  useEffect(() => {
    // Écouter les événements de la queue
    const unsubscribeQueue = offlineQueueService.addListener((event, data) => {
      switch (event) {
        case 'queued':
          showToast(`${data.count} scan(s) mis en queue (hors-ligne)`, 'info');
          setQueueSize(data.queueSize);
          break;
        case 'sent':
          showToast(`${data.count} scan(s) envoyés automatiquement`, 'success');
          break;
        case 'processed':
          if (data.success > 0) {
            showToast(`${data.success} scan(s) synchronisés`, 'success');
          }
          setQueueSize(data.remaining);
          break;
      }
    });

    // Écouter la connectivité réseau avec optimisation
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // OPTIMISATION: Détection de la qualité de connexion
      const connectionQuality = getConnectionQuality(state);
      console.log(`Qualité de connexion: ${connectionQuality}`);
      
      if (state.isConnected) {
        console.log('Connexion rétablie');
        
        // SIMPLIFICATION: Synchronisation immédiate si connecté
        offlineQueueService.processQueue();
      } else {
        console.log('Connexion perdue - mode hors-ligne activé');
      }
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
    // PROTECTION: Éviter les appels multiples simultanés
    if (isUpdatingTourneeProgress) {
      console.log('[updateTourneeProgress] Mise à jour déjà en cours, ignoré');
      return;
    }
    
    setIsUpdatingTourneeProgress(true);
    
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
          if ((currentSession.tournee && currentSession.tournee.id)) {
            setCurrentTourneeId(currentSession.tournee.id);
            console.log(`[updateTourneeProgress] ID de tournée mis à jour: ${currentSession.tournee.id}`);
          }
          
          // Mettre à jour le nom de la tournée si disponible
          if ((currentSession.tournee && currentSession.tournee.nom)) {
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

      // CORRECTION: Ne pas recharger automatiquement les colis pour éviter les conflits
      // avec les mises à jour locales après transmission
      const promises = [
        loadHistoricalScans(),
        loadFirestoreScans()
        // loadTakingCarePackages(false) // Désactivé pour éviter les conflits
      ];
      
      await Promise.all(promises);
      addDebugLog(`[updateTourneeProgress] Chargement historique sans rechargement des colis`, 'info');
      
      // Mettre à jour le composant TourneeProgress sans réinitialiser les sites visités
      if (currentTourneeId && tourneeProgressRef.current) {
        console.log(`[updateTourneeProgress] Mise à jour du composant TourneeProgress pour la tournée: ${currentTourneeId}`);
        // Recharger les données de la tournée. SessionId est maintenant une prop, seul l'argument forceReload est nécessaire.
        await tourneeProgressRef.current.loadTourneeDetails(true); // Le sessionId est passé par prop
      } else {
        // CORRECTION: Ne pas considérer cela comme une erreur critique
        console.log('[updateTourneeProgress] TourneeProgress non disponible - normal si pas monté', 
          { currentTourneeId, hasRef: !!tourneeProgressRef.current });
        // Continuer sans bloquer - la mise à jour se fera au prochain montage du composant
      }
      
      console.log("Mise à jour du suivi de tournée terminée avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du suivi de tournée:", error);
    } finally {
      setIsUpdatingTourneeProgress(false);
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
      if ((currentSession && currentSession.tourneeId) && tourneeProgressRef.current) {
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
      if ((route.params && route.params.fromFinalCheck)) {
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
  }, [(route.params && route.params.fromFinalCheck)]);

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
    const vehiculeId = (sessionData.vehicule && sessionData.vehicule.id) || (route.params && route.params.vehicule && route.params.vehicule.id) || '';

    setLoading(true);

    try {
      // Définir nom et ID du site pour la visite sans colis
      const siteName = siteDetails.name || siteDetails.nom || siteCode;
      const siteId = siteDetails.id || '';
      // Définir le nom du coursier si disponible
      // const coursierName = sessionData.coursierCharg || (route.params && route.params.coursierCharg) || ''; // Ancienne méthode
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
        coursierChargeantId: (userData && userData.uid),
        // CORRECTION: Ne pas définir poleId/poleName ici pour laisser le fallback dans addScans() fonctionner
        // poleId: (pole && pole.id) || '', // Supprimé: laisser addScans() gérer le fallback
        // poleName: (pole && pole.nom) || '' // Supprimé: laisser addScans() gérer le fallback
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
  const SCAN_DEBOUNCE_MS = 50; // 50ms de délai minimum entre les scans (réactivité maximale)
  
  // PROTECTION: État pour tracker les colis récemment transmis
  const [recentlyTransmitted, setRecentlyTransmitted] = useState(new Set());
  
  // GESTION CYCLES: État pour tracker les colis du cycle actuel (entrée/sortie)
  const [currentCyclePackages, setCurrentCyclePackages] = useState(new Set());
  
  // SYSTÈME DE LOGS PERSISTANT: Pour debug même en cas de freeze
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const maxLogs = 50; // Limiter le nombre de logs pour éviter les fuites mémoire
  
  // PROTECTION: Éviter les appels multiples à updateTourneeProgress
  const [isUpdatingTourneeProgress, setIsUpdatingTourneeProgress] = useState(false);
  
  // PROTECTION: Éviter la saturation des logs
  const lastLogTimeRef = useRef(0);
  const LOG_THROTTLE_MS = 100; // Minimum 100ms entre les logs
  
  // PROTECTION: Éviter les mises à jour d'état trop rapides
  const lastStateUpdateRef = useRef(0);
  const STATE_UPDATE_THROTTLE_MS = 50; // Minimum 50ms entre les mises à jour d'état
  
  // Fonction wrapper pour les mises à jour d'état critiques
  const safeSetState = (setter, value, context = '') => {
    const now = Date.now();
    
    if (now - lastStateUpdateRef.current < STATE_UPDATE_THROTTLE_MS) {
      addDebugLog(`[safeSetState] Mise à jour throttlée: ${context}`, 'info');
      setTimeout(() => {
        setter(value);
        addDebugLog(`[safeSetState] Mise à jour différée exécutée: ${context}`, 'info');
      }, STATE_UPDATE_THROTTLE_MS);
      return;
    }
    
    lastStateUpdateRef.current = now;
    addDebugLog(`[safeSetState] Mise à jour immédiate: ${context}`, 'info');
    setter(value);
  };
  
  // Fonction pour ajouter un log persistant
  const addDebugLog = (message, type = 'info') => {
    const now = Date.now();
    
    // PROTECTION: Throttling des logs pour éviter la saturation
    if (now - lastLogTimeRef.current < LOG_THROTTLE_MS && type !== 'error' && type !== 'freeze') {
      return; // Ignorer les logs non-critiques trop fréquents
    }
    
    lastLogTimeRef.current = now;
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Clé unique robuste
      timestamp,
      message,
      type
    };
    
    setDebugLogs(prev => {
      const newLogs = [logEntry, ...prev];
      return newLogs.slice(0, maxLogs); // Garder seulement les derniers logs
    });
    
    // SUPPRIMÉ: Ouverture automatique des logs
    // Les logs ne s'ouvrent plus automatiquement, seulement sur demande manuelle
  };
  
  // DÉTECTION DE FREEZE: Timer pour détecter les blocages
  useEffect(() => {
    let freezeTimer = null;
    let lastActivityTime = Date.now();
    
    const startFreezeDetection = () => {
      freezeTimer = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        addDebugLog(`[FREEZE DETECTED] Application bloquée depuis ${timeSinceLastActivity}ms`, 'freeze');
        addDebugLog(`[FREEZE DETECTED] État: siteScanned=${siteScanned}, scanMode=${scanMode}, isProcessingScan=${isProcessingScan}`, 'freeze');
        addDebugLog(`[FREEZE DETECTED] Colis scannés: ${scannedContenants.length}, Cycle: ${currentCyclePackages.size}`, 'freeze');
      }, 8000); // Réduit à 8 secondes pour détecter plus rapidement
    };
    
    const resetFreezeDetection = () => {
      lastActivityTime = Date.now();
      if (freezeTimer) {
        clearTimeout(freezeTimer);
      }
      startFreezeDetection();
    };
    
    // Démarrer la détection
    startFreezeDetection();
    
    // Réinitialiser à chaque interaction utilisateur
    const handleUserInteraction = () => {
      resetFreezeDetection();
    };
    
    // Écouter les interactions
    if (document && document.addEventListener) {
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
    }
    
    return () => {
      if (freezeTimer) {
        clearTimeout(freezeTimer);
      }
      if (document && document.removeEventListener) {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
  }, [siteScanned, scanMode, isProcessingScan, scannedContenants.length, currentCyclePackages.size]);

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

    // Sur le web, permettre la saisie manuelle sans vider le champ
    if (Platform.OS === 'web') {
      setManualCodeInput(text);
      return;
    }

    // Sur mobile : si le clavier est activé, permettre la saisie manuelle
    if (isKeyboardVisible) {
      setManualCodeInput(text);
      return;
    }

    // CORRECTION: Vider le champ immédiatement pour éviter l'accumulation des codes (mobile uniquement, clavier désactivé)
    setManualCodeInput('');
    
    // Effacer le timeout précédent s'il existe (nettoyage)
    if (autoValidationTimeout) {
      clearTimeout(autoValidationTimeout);
      setAutoValidationTimeout(null);
    }
    
    // NOUVEAU: Détection automatique des scans Zebra via Keystroke
    // Méthode 1: Détection des caractères de fin (Enter, Tab, Retour chariot)
    if (text.includes('\n') || text.includes('\t') || text.includes('\r')) {
      // FILTRE ANTI-DOUBLE SCAN: Séparer les codes multiples
      const potentialCodes = text.split(/[\n\t\r]+/).filter(code => code.trim().length > 0);
      
      if (potentialCodes.length > 1) {
        addDebugLog(`[handleTextChange] DOUBLE SCAN DÉTECTÉ: ${potentialCodes.length} codes trouvés`, 'error');
        addDebugLog(`[handleTextChange] Codes: ${potentialCodes.join(', ')}`, 'error');
        
        // Prendre seulement le premier code valide
        const firstValidCode = potentialCodes.find(code => code.trim().length > 3);
        if (firstValidCode) {
          addDebugLog(`[handleTextChange] Traitement du premier code: ${firstValidCode.trim()}`, 'info');
          setLastScanTime(now);
          setIsProcessingScan(true);
          
          processScannedData(firstValidCode.trim()).finally(() => {
            setIsProcessingScan(false);
          });
          return;
        }
      }
      
      // Nettoyer le code scanné (supprimer les caractères de contrôle)
      const cleanCode = text.replace(/[\n\t\r]/g, '').trim();
      
      if (cleanCode.length > 0) {
        addDebugLog(`[handleTextChange] Scan détecté: ${cleanCode}`, 'info');
        setLastScanTime(now);
        setIsProcessingScan(true);
        
        // Traiter automatiquement le scan
        processScannedData(cleanCode).finally(() => {
          setIsProcessingScan(false);
        });
        
        return;
      }
    }
    
    // Méthode 2: Auto-validation par délai (si le texte fait plus de 6 caractères)
    // Les scanners Zebra saisissent rapidement, contrairement à la saisie manuelle
    if (text.length >= 6 && !autoValidationTimeout) {
      const timeout = setTimeout(() => {
        const currentText = text.trim();
        
        // FILTRE ANTI-DOUBLE SCAN: Vérifier s'il y a plusieurs codes dans le texte
        const potentialCodes = currentText.split(/\s+/).filter(code => code.length > 3);
        
        if (potentialCodes.length > 1) {
          addDebugLog(`[handleTextChange] DOUBLE SCAN AUTO-DÉTECTÉ: ${potentialCodes.length} codes`, 'error');
          addDebugLog(`[handleTextChange] Codes: ${potentialCodes.join(', ')}`, 'error');
          
          // Prendre seulement le premier code valide
          const firstValidCode = potentialCodes.find(code => code.length > 3);
          if (firstValidCode && !isProcessingScan) {
            addDebugLog(`[handleTextChange] Traitement auto du premier code: ${firstValidCode}`, 'info');
            setLastScanTime(Date.now());
            setIsProcessingScan(true);
            
            processScannedData(firstValidCode).finally(() => {
              setIsProcessingScan(false);
            });
          }
        } else if (currentText.length > 0 && !isProcessingScan) {
          // Code unique - traitement normal
          addDebugLog(`[handleTextChange] Scan auto détecté: ${currentText}`, 'info');
          setLastScanTime(Date.now());
          setIsProcessingScan(true);
          
          processScannedData(currentText).finally(() => {
            setIsProcessingScan(false);
          });
        }
        setAutoValidationTimeout(null);
      }, 100); // Réduit à 100ms pour une meilleure réactivité sur Zebra
      
      setAutoValidationTimeout(timeout);
    }
    
    // Note: Pour la saisie manuelle, l'utilisateur doit toujours appuyer sur "Scanner"
  }; // handleTextChange



  // Nettoyer les timeouts lors du démontage du composant
  useEffect(() => {
    return () => {
      if (autoValidationTimeout) {
        clearTimeout(autoValidationTimeout);
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
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
      
      console.log(`[updateLocalHistory] ${formattedScans.length} scans ajoutés`);
    } catch (error) {
      console.error('[updateLocalHistory]', error.message);
    }
  };

  // Mise à jour optimisée des paquets pris en charge
  const updateTakingCarePackagesOptimized = (scansToSubmit) => {
    try {
      addDebugLog(`[updateTakingCarePackagesOptimized] Début mise à jour avec ${scansToSubmit.length} scans`, 'info');
      
      // Séparer les colis par type d'opération détecté
      const entreeScans = scansToSubmit.filter(scan => (scan.operationType || scan.type) === 'entree');
      const sortieScans = scansToSubmit.filter(scan => (scan.operationType || scan.type) === 'sortie');
      
      addDebugLog(`[updateTakingCarePackagesOptimized] Entrée: ${entreeScans.length}, Sortie: ${sortieScans.length}`, 'info');
      
      // Ajouter les colis de prise en charge IMMÉDIATEMENT
      if (entreeScans.length > 0) {
        setTakingCarePackages(prev => {
          // CORRECTION: Ajouter avec timestamp actuel pour marquer comme récent
          const enrichedScans = entreeScans.map(scan => ({
            ...scan,
            scanDate: new Date().toISOString(), // Timestamp actuel pour marquer comme récent
            status: 'en-cours', // Statut explicite
            operationType: 'entree' // Type d'opération explicite
          }));
          
          const newPackages = [...enrichedScans, ...prev];
          addDebugLog(`[updateTakingCarePackagesOptimized] ${entreeScans.length} colis ajoutés IMMÉDIATEMENT - Total: ${newPackages.length}`, 'info');
          return newPackages;
        });
      }
      
      // Retirer les colis déposés
      if (sortieScans.length > 0) {
        const codesDeposited = sortieScans.map(scan => scan.idColis || scan.code);
        setTakingCarePackages(prev => {
          const filteredPackages = prev.filter(pkg => {
            const pkgCode = pkg.idColis || pkg.code;
            return !codesDeposited.includes(pkgCode);
          });
          addDebugLog(`[updateTakingCarePackagesOptimized] ${sortieScans.length} colis retirés - Restant: ${filteredPackages.length}`, 'info');
          return filteredPackages;
        });
        
        // OPTIMISATION: Nettoyer le cache des paquets pris en charge
        if (currentTourneeId) {
          const cacheKey = `takingCarePackages_${currentTourneeId}`;
          AsyncStorage.removeItem(cacheKey).catch(err => 
            console.warn('Erreur suppression cache paquets:', err)
          );
        }
      }
      
      addDebugLog(`[updateTakingCarePackagesOptimized] Mise à jour terminée avec succès`, 'info');
    } catch (error) {
      addDebugLog(`[updateTakingCarePackagesOptimized] ERREUR: ${error.message}`, 'error');
      console.error('Erreur lors de la mise à jour des paquets pris en charge:', error);
    }
  };

  // GESTION CYCLES: Réinitialiser le cycle actuel
  const resetCurrentCycle = () => {
    setCurrentCyclePackages(new Set());
    // SUPPRIMÉ: Log de réinitialisation du cycle
  };

  // Réinitialisation optimisée de l'interface
  const resetScanInterfaceOptimized = () => {
    // Réinitialiser tous les états critiques
    resetScan();
    resetCurrentCycle(); // Réinitialiser le cycle actuel
    setShowOperationTypeSelection(false);
    setOperationType('entree');
    
    // Réinitialiser les états de traitement pour éviter les blocages
    setIsProcessingScan(false);
    // SUPPRIMÉ: setLoading(false) - Ne pas gérer loading ici pour éviter les conflits
    
    // Réinitialiser le champ de saisie manuelle
    setManualCodeInput('');
    
    // SUPPRIMÉ: Plus de rechargement automatique après saisie manuelle
    // L'utilisateur devra recharger manuellement si nécessaire
  };


  // SUPPRESSION DU MONITORING LIMITATIF - Mode haute performance activé
  // Plus de limitations artificielles, performance maximale

  // Fonction pour enregistrer le timestamp de la dernière transmission
  const recordTransmissionTime = async () => {
    try {
      await AsyncStorage.setItem('lastTransmissionTime', Date.now().toString());
    } catch (error) {
      console.warn('Erreur lors de l\'enregistrement du timestamp de transmission:', error);
    }
  };








  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a4d94" translucent={false} />
      
      
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
          <TouchableOpacity onPress={() => setShowDebugLogs(true)} style={styles.headerButton}>
            <Ionicons name="bug-outline" size={22} color="#ff6b6b" />
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
                <Text style={styles.scannedSiteCode}>{(siteDetails && siteDetails.name) || siteCode}</Text>
                {(siteDetails && siteDetails.address) && (
                  <Text style={styles.scannedSiteAddress}>{siteDetails.address}</Text>
                )}
                {(siteDetails && siteDetails.city) && (
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
                  {/* Scan de colis (fusionné entrée/sortie) */}
                  <View style={styles.operationItemContainer}>
                    <MaterialCommunityIcons name="package-variant" size={36} color={styles.entreeButtonIcon.color} style={styles.operationIcon} />
            <TouchableOpacity 
                      style={[styles.operationTextButton, styles.entreeButtonBackground]} // Utiliser un style pour le fond
              onPress={() => startContenantScan('unified')}
            >
                      <Text style={styles.operationTitleText}>Scan de colis</Text>
                      <Text style={styles.operationDescText}>Scanner des colis à prendre en charge ou à déposer</Text>
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
                    {operationType === 'unified' ? 'Scan de colis' : 
                     operationType === 'entree' ? 'Entrée de colis' : 'Livraison de colis'}
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
                      showSoftInputOnFocus={Platform.OS === 'web' ? true : isKeyboardVisible}
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

                {/* Boutons d'action - toujours visibles */}
                <View style={styles.actionButtonsContainer}>
                  {scannedContenants.length > 0 && (
                    <TouchableOpacity 
                      style={[styles.transmitButton, loading && { opacity: 0.6 }]}
                      onPress={handleTransmit}
                      disabled={loading}
                    >
                      <Text style={styles.transmitButtonText}>
                        <Ionicons name="cloud-upload-outline" size={16} /> Transmettre
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.goToTourneeButton}
                    onPress={handleGoToTournee}
                  >
                    <Text style={styles.goToTourneeButtonText}>
                      <Ionicons name="arrow-forward-outline" size={16} /> Partir
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Liste des contenants scannés */}
                {scannedContenants.length > 0 && (
                  <View style={styles.scannedListContainer}>
                    <View style={styles.scannedListHeader}>
                      <Text style={styles.scannedListTitle}>
                        Contenants scannés ({scannedContenants.length})
                      </Text>
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
                  showSoftInputOnFocus={Platform.OS === 'web' ? true : isKeyboardVisible}
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

      {/* Modal de logs de debug */}
      {showDebugLogs && (
        <Modal
          visible={showDebugLogs}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowDebugLogs(false)}
        >
          <View style={styles.debugLogsContainer}>
            <View style={styles.debugLogsHeader}>
              <Text style={styles.debugLogsTitle}>Logs de Debug</Text>
              <TouchableOpacity 
                onPress={() => setShowDebugLogs(false)}
                style={styles.debugLogsCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.debugLogsContent}>
              {debugLogs.map((log) => (
                <View key={log.id} style={[
                  styles.debugLogEntry,
                  log.type === 'error' && styles.debugLogError,
                  log.type === 'freeze' && styles.debugLogFreeze
                ]}>
                  <Text style={styles.debugLogTimestamp}>{log.timestamp}</Text>
                  <Text style={styles.debugLogMessage}>{log.message}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.debugLogsButtonsContainer}>
            <TouchableOpacity 
              style={styles.debugLogsCopyButton}
              onPress={() => {
                const logsText = debugLogs.map(log => `${log.timestamp}: ${log.message}`).join('\n');
                // Utiliser Clipboard pour copier les logs
                Clipboard.setString(logsText);
                // Afficher un toast de confirmation
                setToast({ message: 'Logs copiés dans le presse-papiers', type: 'success' });
              }}
            >
              <Text style={styles.debugLogsCopyButtonText}>Copier les logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.debugLogsReloadButton}
              onPress={() => {
                addDebugLog('[BOUTON MANUEL] Rechargement des colis demandé', 'info');
                // CORRECTION: Désactiver le rechargement manuel pour éviter les conflits
                // avec les mises à jour automatiques
                addDebugLog('[BOUTON MANUEL] Rechargement manuel désactivé pour éviter les conflits', 'warning');
                setToast({ message: 'Rechargement manuel désactivé - Les colis se mettent à jour automatiquement', type: 'warning' });
                // loadTakingCarePackages(true); // Désactivé pour éviter les conflits
              }}
            >
              <Text style={styles.debugLogsReloadButtonText}>Recharger colis (désactivé)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.debugLogsHistoryButton}
              onPress={() => {
                addDebugLog('[BOUTON MANUEL] Chargement historique demandé', 'info');
                // CORRECTION: Désactiver le chargement historique manuel pour éviter les conflits
                // avec les mises à jour automatiques des colis
                addDebugLog('[BOUTON MANUEL] Chargement historique manuel désactivé pour éviter les conflits', 'warning');
                setToast({ message: 'Chargement historique manuel désactivé - Les données se chargent automatiquement', type: 'warning' });
                // loadHistoricalData(); // Désactivé pour éviter les conflits avec les colis
              }}
            >
              <Text style={styles.debugLogsHistoryButtonText}>Charger historique (désactivé)</Text>
            </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.debugLogsClearButton}
                onPress={() => setDebugLogs([])}
              >
                <Text style={styles.debugLogsClearButtonText}>Effacer les logs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

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
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
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
  goToTourneeButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 6,
  },
  goToTourneeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scannedList: {
    maxHeight: 300,
  },
  // Styles pour les contenants scannés
  contenantItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contenantItemEntree: {
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22', // Orange pour prise en charge
  },
  contenantItemSortie: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71', // Vert pour dépôt
  },
  contenantInfo: {
    flex: 1,
  },
  contenantHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contenantCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  typeTagEntree: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTagSortie: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTagIcon: {
    marginRight: 4,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contenantTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  deleteContenantButton: {
    padding: 8,
    marginLeft: 8,
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
  
  forceButton: {
    backgroundColor: '#e67e22', // Orange pour le forçage
  },
  keystrokeButton: {
    backgroundColor: '#9b59b6', // Violet pour Keystroke
  },
  
  // Styles pour les logs de debug
  debugLogsContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  debugLogsHeader: {
    backgroundColor: '#1a4d94',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
  },
  debugLogsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugLogsCloseButton: {
    padding: 5,
  },
  debugLogsContent: {
    flex: 1,
    padding: 10,
  },
  debugLogEntry: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    marginBottom: 5,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  debugLogError: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#2a1a1a',
  },
  debugLogFreeze: {
    borderLeftColor: '#f39c12',
    backgroundColor: '#2a2a1a',
  },
  debugLogTimestamp: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 2,
  },
  debugLogMessage: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  debugLogsButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 8,
  },
  debugLogsCopyButton: {
    backgroundColor: '#3498db',
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderRadius: 8,
  },
  debugLogsCopyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugLogsReloadButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderRadius: 8,
  },
  debugLogsReloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugLogsHistoryButton: {
    backgroundColor: '#9b59b6',
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderRadius: 8,
  },
  debugLogsHistoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugLogsClearButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderRadius: 8,
  },
  debugLogsClearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});