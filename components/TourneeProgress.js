import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform, FlatList, Pressable, Image } from 'react-native';
import firebaseService from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RoadbookModal from './RoadbookModal';
import PhoneSearchService from '../services/phoneSearchService';

/**
 * Composant affichant le suivi de progression d'une tournée
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.tourneeId - L'ID de la tournée à afficher
 * @param {string} props.sessionId - L'ID de la session courante
 * @param {function} props.onSiteSelect - Callback pour la sélection d'un site
 */
const TourneeProgress = React.forwardRef(({ tourneeId, sessionId, onSiteSelect, onFinalVehicleCheck }, ref) => {
  const [tourneeDetails, setTourneeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadbookModalVisible, setRoadbookModalVisible] = useState(false);
  const [selectedSiteRoadbook, setSelectedSiteRoadbook] = useState(null);


  // Fonction pour ouvrir la carte
  const openMap = (address, city) => {
    const destination = encodeURIComponent(`${address}, ${city}`);
    let url = '';

    // BEGIN MODIFICATION
    // Toujours utiliser l'URL web pour la compatibilité maximale, 
    // surtout si ce code peut s'exécuter dans un navigateur de bureau via Expo Web ou un portage.
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    if (Platform.OS === 'ios') {
      // Pour iOS, on peut tenter d'ouvrir l'application native directement
      url = `maps://app?daddr=${destination}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback sur l'URL web pour iOS si l'app maps n'est pas dispo
          // iOS maps app not available, falling back to web URL
          Linking.openURL(webUrl).catch(err => console.error("Couldn't load page on iOS", err));
        }
      }).catch(err => {
        // Error checking maps app support on iOS, falling back to web URL
        Linking.openURL(webUrl).catch(webErr => console.error("Couldn't load page on iOS fallback", webErr));
      });
    } else if (Platform.OS === 'android') {
      // Pour Android, on peut tenter d'utiliser geo: pour laisser le choix ou ouvrir Google Maps
      url = `geo:0,0?q=${destination}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback sur l'URL web pour Android si geo: n'est pas géré
          // Android geo: scheme not supported, falling back to web URL
          Linking.openURL(webUrl).catch(err => console.error("Couldn't load page on Android", err));
        }
      }).catch(err => {
        // Error checking geo support on Android, falling back to web URL
        Linking.openURL(webUrl).catch(webErr => console.error("Couldn't load page on Android fallback", webErr));
      });
    } else {
      // Pour toutes les autres plateformes (y compris 'web' si Platform.OS le retourne, ou undefined)
      // ouvrir directement l'URL web.
      // Platform is not iOS or Android, opening web URL for navigation
      Linking.openURL(webUrl).catch(err => console.error("Couldn't load page on Web/Other", err));
    }
    // END MODIFICATION

    /* Ancienne logique problématique :
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${destination}`;
    } else {
      // Utilisation de geo: qui est plus universel et permet à l'utilisateur de choisir si plusieurs apps sont installées
      // Ou directement pour Google Maps: `google.navigation:q=${destination}`
      url = `geo:0,0?q=${destination}`;
    }
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback si aucune application de carte n'est trouvée ou si l'URL spécifique n'est pas supportée
        // On peut ouvrir Google Maps dans le navigateur
        const webUrlFallback = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        Linking.openURL(webUrlFallback).catch(err => console.error("Couldn't load page", err));
      }
    }).catch(err => console.error('An error occurred opening map', err));
    */
  };

  // OPTIMISATION: Cache intelligent pour éviter les rechargements inutiles
  const cacheRef = React.useRef({
    data: null,
    timestamp: 0,
    tourneeId: null,
    sessionId: null
  });
  
  // Fonction OPTIMISÉE pour charger les détails de la tournée
  const loadTourneeDetails = async (forceReload = false) => {
    const startTime = Date.now();
    console.log(`[TourneeProgress] loadTourneeDetails - Force: ${forceReload}`);
    
    // CACHE: Vérifier si on peut utiliser les données en cache
    const cache = cacheRef.current;
    const cacheAge = startTime - cache.timestamp;
    const maxCacheAge = 30000; // 30 secondes
    
    const canUseCache = !forceReload 
      && cache.data 
      && cache.tourneeId === tourneeId 
      && cache.sessionId === sessionId
      && cacheAge < maxCacheAge;
    
    if (canUseCache) {
      console.log(`[TourneeProgress] Cache utilisé (age: ${Math.round(cacheAge/1000)}s)`);
      setTourneeDetails(cache.data);
      setError(null);
      setLoading(false);
      return;
    }
    
    // OPTIMISATION: Vérifier le cache AsyncStorage avec durée réduite
    if (!forceReload) {
      try {
        const cacheKey = `tourneeDetails_${tourneeId}_${sessionId}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        const cacheTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);
        const maxAgeSetting = await AsyncStorage.getItem(`${cacheKey}_maxAge`);
        const maxAge = maxAgeSetting ? parseInt(maxAgeSetting) : 15000; // 15 secondes par défaut
        const now = Date.now();
        const asyncCacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp) : Infinity;
        
        if (cachedData && asyncCacheAge < maxAge) {
          console.log(`[TourneeProgress] Cache AsyncStorage utilisé (age: ${Math.round(asyncCacheAge/1000)}s)`);
          const parsedData = JSON.parse(cachedData);
          setTourneeDetails(parsedData);
          setError(null);
          setLoading(false);
          
          // Mettre à jour le cache en mémoire aussi
          cacheRef.current = {
            data: parsedData,
            timestamp: now,
            tourneeId: tourneeId,
            sessionId: sessionId
          };
          return;
        }
      } catch (cacheError) {
        console.warn('[TourneeProgress] Erreur cache AsyncStorage:', cacheError);
      }
    }
    
    if (forceReload) {
      console.log('[TourneeProgress] forceReload: nettoyage cache et AsyncStorage');
      
      // Réinitialiser le cache
      cacheRef.current = {
        data: null,
        timestamp: 0,
        tourneeId: null,
        sessionId: null
      };
      
      setTourneeDetails(null);
      
      // Supprimer les données AsyncStorage pour un vrai refresh
      if (sessionId) {
        try {
          await AsyncStorage.removeItem(`visitedSiteIds_${sessionId}`);
        } catch (e) {
          console.error('[TourneeProgress] forceReload: erreur suppression AsyncStorage session:', e);
        }
      }
      
      if (tourneeId) {
        try {
          await AsyncStorage.removeItem(`tourneeVisitedSites_${tourneeId}`);
        } catch (e) {
          console.error('[TourneeProgress] forceReload: erreur suppression AsyncStorage tournée:', e);
        }
      }
    }
    
    if (!tourneeId) {
      setError('ID de tournée manquant');
      setLoading(false);
      return;
    }
    
    if (!sessionId) {
      console.warn("[TourneeProgress] loadTourneeDetails: sessionId manquant");
    }
    
    try {
      setLoading(true);
      
      const details = await firebaseService.getTourneeWithSites(tourneeId, sessionId);
      if (!details) {
        throw new Error('Impossible de récupérer les détails de la tournée');
      }
      
      // CACHE: Sauvegarder les nouvelles données
      const now = Date.now();
      cacheRef.current = {
        data: details,
        timestamp: now,
        tourneeId: tourneeId,
        sessionId: sessionId
      };
      
      // OPTIMISATION: Mettre en cache AsyncStorage avec durée réduite
      try {
        const cacheKey = `tourneeDetails_${tourneeId}_${sessionId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(details));
        await AsyncStorage.setItem(`${cacheKey}_timestamp`, now.toString());
        // Cache plus court pour données plus fraîches
        await AsyncStorage.setItem(`${cacheKey}_maxAge`, '15000'); // 15 secondes
      } catch (cacheError) {
        console.warn('[TourneeProgress] Erreur mise en cache AsyncStorage:', cacheError);
      }
      
      setTourneeDetails(details);
      setError(null);
      
      const loadTime = Date.now() - startTime;
      console.log(`[TourneeProgress] Chargement terminé en ${loadTime}ms - ${details.sitesCount} sites`);
      
    } catch (err) {
      console.error('[TourneeProgress] Erreur chargement:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exposer la fonction de rechargement ET la fonction de marquage local via la référence
  React.useImperativeHandle(ref, () => ({
    loadTourneeDetails: (force = false) => loadTourneeDetails(force),
    markSiteAsVisitedLocally,
    getSitesWithStatus: () => (tourneeDetails && tourneeDetails.sitesWithStatus) || []
  }));

  // OPTIMISATION: Chargement intelligent uniquement si nécessaire
  useEffect(() => {
    // Ne charger que si on a un tourneeId valide et qu'on n'a pas déjà les bonnes données
    if (tourneeId && (!tourneeDetails || tourneeDetails.id !== tourneeId)) {
      console.log(`[TourneeProgress] Rechargement nécessaire pour tournée ${tourneeId}`);
      loadTourneeDetails(false);
    }
  }, [tourneeId, sessionId]);


  // UNIQUE useEffect pour gérer la persistance et la restoration
  useEffect(() => {
    const managePersistence = async () => {
      try {
        if (!tourneeDetails || !tourneeDetails.sitesWithStatus || !sessionId) {
          return; // Arrêt silencieux si les données ne sont pas prêtes
        }

        // Clés AsyncStorage
        const sessionKey = `visitedSiteIds_${sessionId}`;
        const tourneeKey = tourneeId ? `tourneeVisitedSites_${tourneeId}` : null;

        // Récupérer les IDs stockés
        let idsFromSession = [];
        let idsFromTournee = [];

        try {
          const storedSessionData = await AsyncStorage.getItem(sessionKey);
          if (storedSessionData) {
            idsFromSession = JSON.parse(storedSessionData);
          }
        } catch (e) {
          idsFromSession = [];
        }

        if (tourneeKey) {
          try {
            const storedTourneeData = await AsyncStorage.getItem(tourneeKey);
            if (storedTourneeData) {
              idsFromTournee = JSON.parse(storedTourneeData);
            }
          } catch (e) {
            idsFromTournee = [];
          }
        }

        // S'assurer que c'est des arrays
        if (!Array.isArray(idsFromSession)) idsFromSession = [];
        if (!Array.isArray(idsFromTournee)) idsFromTournee = [];

        // Fusionner tous les IDs stockés
        const allStoredIds = [...new Set([...idsFromSession, ...idsFromTournee])];

        // Mettre à jour les sites avec les données persistées
        let hasChanges = false;
        const updatedSites = tourneeDetails.sitesWithStatus.map(site => {
          const shouldBeVisited = allStoredIds.includes(site.uniqueDisplayId) || site.visited;
          if (site.visited !== shouldBeVisited) {
            hasChanges = true;
          }
          return { ...site, visited: shouldBeVisited };
        });

        // Mettre à jour l'état seulement si nécessaire
        if (hasChanges) {
          setTourneeDetails(prev => ({
            ...prev,
            sitesWithStatus: updatedSites,
            visitedSites: updatedSites.filter(s => s.visited).length
          }));
        }

        // Sauvegarder l'état actuel
        const currentVisitedIds = updatedSites
          .filter(site => site.visited)
          .map(site => site.uniqueDisplayId)
          .filter(id => id !== undefined);

        if (currentVisitedIds.length > 0) {
          await AsyncStorage.setItem(sessionKey, JSON.stringify(currentVisitedIds));
          if (tourneeKey) {
            await AsyncStorage.setItem(tourneeKey, JSON.stringify(currentVisitedIds));
          }
        }

      } catch (error) {
        console.error('[TourneeProgress] Erreur de persistance:', error);
      }
    };

    managePersistence();
  }, [tourneeDetails, sessionId, tourneeId]); // Toutes les dépendances nécessaires

  // Fonction pour marquer un site comme visité localement ET persister immédiatement
  const markSiteAsVisitedLocally = async (siteIdentifier, specificIndex = null) => {
    console.log(`[TourneeProgress] markSiteAsVisitedLocally CALLED. Identifier: ${siteIdentifier}, Index: ${specificIndex}`);

    if (!(tourneeDetails && tourneeDetails.sitesWithStatus)) {
      console.error('[TourneeProgress] tourneeDetails.sitesWithStatus est manquant');
      return; 
    }

    let siteSuccessfullyMarked = false;
    let markedSiteUniqueId = null;

    const updatedSites = tourneeDetails.sitesWithStatus.map((site, index) => {
      if (specificIndex !== null && specificIndex !== undefined && index === specificIndex) {
        if (!site.visited) {
          siteSuccessfullyMarked = true;
          markedSiteUniqueId = site.uniqueDisplayId;
          return { ...site, visited: true };
        }
      }
      return site;
    });

    if (siteSuccessfullyMarked) {
      // Mettre à jour l'état React
      const newState = {
        ...tourneeDetails, 
        sitesWithStatus: updatedSites,
        visitedSites: updatedSites.filter(s => s.visited).length
      };
      setTourneeDetails(newState);

      // Persister immédiatement dans AsyncStorage
      if (sessionId && markedSiteUniqueId) {
        try {
          const visitedIds = updatedSites
            .filter(site => site.visited)
            .map(site => site.uniqueDisplayId)
            .filter(id => id !== undefined);

          const sessionKey = `visitedSiteIds_${sessionId}`;
          await AsyncStorage.setItem(sessionKey, JSON.stringify(visitedIds));

          if (tourneeId) {
            const tourneeKey = `tourneeVisitedSites_${tourneeId}`;
            await AsyncStorage.setItem(tourneeKey, JSON.stringify(visitedIds));
          }

          console.log(`[TourneeProgress] Site marqué et persisté: ${markedSiteUniqueId}`);
        } catch (error) {
          console.error('[TourneeProgress] Erreur de persistance immédiate:', error);
        }
      }
    }
  };

  // Gérer la sélection d'un site
  const handleSitePress = (site) => {
    if (onSiteSelect) {
      onSiteSelect(site);
    }
  };

  // Fonction pour gérer l'appui long sur un site
  const handleSiteLongPress = (site) => {
    console.log("[TourneeProgress] Long press détecté sur le site:", site.nom || site.name);
    console.log("[TourneeProgress] Données du site:", {
      id: site.id,
      nom: site.nom || site.name,
      roadbook: site.roadbook,
      roadbookType: typeof site.roadbook,
      roadbookKeys: site.roadbook ? Object.keys(site.roadbook) : 'null'
    });
    
    if (site.roadbook && Object.keys(site.roadbook).length > 0) {
      console.log("[TourneeProgress] Affichage du roadbook pour le site:", site.nom || site.name, site.roadbook);
      setSelectedSiteRoadbook(site.roadbook);
      setRoadbookModalVisible(true);
    } else {
      console.log("[TourneeProgress] Pas de données de roadbook pour le site:", site.nom || site.name);
      // Optionnel: afficher un message à l'utilisateur
      alert("Aucune information roadbook disponible pour ce site.");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Suivi de tournée</Text>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Suivi de tournée</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTourneeDetails(true)}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tourneeDetails) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Suivi de tournée</Text>
        <Text style={styles.emptyText}>Aucune information disponible</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTourneeDetails(true)}>
          <Text style={styles.retryButtonText}>Recharger</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Vérifications de sécurité pour éviter les erreurs
  const sitesWithStatus = (tourneeDetails && tourneeDetails.sitesWithStatus) || [];
  const totalSites = Array.isArray(sitesWithStatus) ? sitesWithStatus.length : 0;
  const visitedSites = Array.isArray(sitesWithStatus) ? sitesWithStatus.filter(site => (site && site.visited)).length : 0;

  const progressPercentage = totalSites > 0 ? (visitedSites / totalSites) * 100 : 0;
  const nextSiteToVisit = Array.isArray(sitesWithStatus) ? sitesWithStatus.find(site => !(site && site.visited)) : null;

  const generateUniqueKey = (prefix, id, index) => {
    return `${prefix}-${id || ''}-${index}-${Math.random().toString(36).substring(2, 7)}`;
  };

  const handleFinalVehicleCheck = () => {
    if (onFinalVehicleCheck) {
      onFinalVehicleCheck();
    }
  };

  try {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Suivi de tournée</Text>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {visitedSites} / {totalSites} sites visités ({Math.round(progressPercentage)}%)
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        <View style={styles.nextSiteContainer}>
          <Text style={styles.nextSiteLabel}>Prochain site à visiter :</Text>
          {nextSiteToVisit ? (
            <TouchableOpacity 
              style={styles.siteCard}
              onPress={() => handleSitePress(nextSiteToVisit)}
              onLongPress={() => handleSiteLongPress(nextSiteToVisit)}
              delayLongPress={500}
            >
              <View style={styles.nextSiteContentWrapper}>
                <View style={styles.nextSiteTextContainer}>
                  <Text style={styles.siteName}>{nextSiteToVisit.nom || nextSiteToVisit.name}</Text>
                  {(nextSiteToVisit.adresse || nextSiteToVisit.address) && (
                    <Text style={styles.siteAddress}>{nextSiteToVisit.adresse || nextSiteToVisit.address}</Text>
                  )}
                  {(nextSiteToVisit.ville || nextSiteToVisit.city) && (
                    <Text style={styles.siteCity}>{nextSiteToVisit.ville || nextSiteToVisit.city}</Text>
                  )}
                  {nextSiteToVisit.heureArrivee && (
                    <Text style={styles.siteScheduledTime}>
                      🕐 Heure prévue : {(() => {
                        try {
                          const date = new Date(nextSiteToVisit.heureArrivee);
                          if (isNaN(date.getTime())) {
                            return 'Heure non définie';
                          }
                          return date.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (error) {
                          console.warn('[TourneeProgress] Erreur formatage heure nextSite:', nextSiteToVisit.heureArrivee, error);
                          return 'Heure non définie';
                        }
                      })()}
                    </Text>
                  )}
                  {/* Numéro de téléphone */}
                  {(() => {
                    const phoneNumber = nextSiteToVisit.telephone || nextSiteToVisit.phone || nextSiteToVisit.tel;
                    
                    if (phoneNumber) {
                      return (
                        <TouchableOpacity 
                          style={styles.sitePhoneContainer}
                          onPress={() => PhoneSearchService.openPhoneApp(phoneNumber)}
                        >
                          <Text style={styles.sitePhoneNumber}>
                            📞 {PhoneSearchService.formatPhoneNumber(phoneNumber)}
                          </Text>
                        </TouchableOpacity>
                      );
                    } else {
                      return (
                        <Text style={styles.sitePhoneNotAvailable}>
                          📞 Numéro non disponible
                        </Text>
                      );
                    }
                  })()}
                </View>
                {((nextSiteToVisit.adresse || nextSiteToVisit.address) && (nextSiteToVisit.ville || nextSiteToVisit.city)) && (
                  <TouchableOpacity
                    style={styles.navigationButtonNextSite}
                    onPress={(e) => {
                      e.stopPropagation();
                      openMap(nextSiteToVisit.adresse || nextSiteToVisit.address, nextSiteToVisit.ville || nextSiteToVisit.city);
                    }}
                  >
                    <Image source={require('../assets/logo-carte.png')} style={styles.mapIconCustom} resizeMode="contain" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.allVisitedContainer}>
              {visitedSites > 0 ? (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                  <Text style={styles.allVisitedText}>Tous les sites ont été visités!</Text>
                </>
              ) : (
                <Text style={styles.noSitesText}>Aucun site défini pour cette tournée</Text>
              )}
            </View>
          )}
        </View>

      {/* Bouton Check Véhicule Final - Affiché quand la tournée est terminée */}
      {visitedSites > 0 && !nextSiteToVisit && (
        <View style={styles.finalCheckContainer}>
          <Text style={styles.finalCheckTitle}>Tournée terminée</Text>
          <TouchableOpacity
            style={styles.finalCheckButton}
            onPress={handleFinalVehicleCheck}
          >
            <Ionicons name="car-outline" size={24} color="#fff" />
            <Text style={styles.finalCheckButtonText}>Check Véhicule Final</Text>
          </TouchableOpacity>
        </View>
      )}

      {sitesWithStatus.length > 0 && (
        <View style={styles.allSitesContainer}>
          <Text style={styles.allSitesTitle}>Tous les sites de la tournée :</Text>
          {sitesWithStatus.map((site, index) => (
            <Pressable
              key={generateUniqueKey('site', site.id, index)}
              style={({ pressed }) => [
                styles.siteItem,
                site.visited ? styles.visitedSite : styles.unvisitedSite,
                pressed && styles.siteItemPressed
              ]}
              onPress={() => handleSitePress(site)}
              onLongPress={() => handleSiteLongPress(site)}
              delayLongPress={500}
            >
              <View style={styles.siteItemInfoContainer}>
                <View style={styles.siteItemContent}>
                  <Text style={styles.siteItemName}>{site.nom || site.name}</Text>
                  <Text style={styles.siteItemAddress}>{site.adresse || site.address}</Text>
                  {site.heureArrivee && (
                    <Text style={styles.siteItemTime}>
                      🕐 Heure prévue : {(() => {
                        try {
                          const date = new Date(site.heureArrivee);
                          if (isNaN(date.getTime())) {
                            return 'Heure non définie';
                          }
                          return date.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (error) {
                          console.warn('[TourneeProgress] Erreur formatage heure:', site.heureArrivee, error);
                          return 'Heure non définie';
                        }
                      })()}
                    </Text>
                  )}
                  {/* Numéro de téléphone pour chaque site */}
                  {(() => {
                    const phoneNumber = site.telephone || site.phone || site.tel;
                    
                    if (phoneNumber) {
                      return (
                        <TouchableOpacity 
                          style={styles.siteItemPhoneContainer}
                          onPress={() => PhoneSearchService.openPhoneApp(phoneNumber)}
                        >
                          <Text style={styles.siteItemPhoneNumber}>
                            📞 {PhoneSearchService.formatPhoneNumber(phoneNumber)}
                          </Text>
                        </TouchableOpacity>
                      );
                    } else {
                      return (
                        <Text style={styles.siteItemPhoneNotAvailable}>
                          📞 Non disponible
                        </Text>
                      );
                    }
                  })()}
                </View>
              </View>

              <View style={styles.siteItemActionsContainer}>
                {site.visited ? (
                  <View style={styles.statusIconContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                  </View>
                ) : (
                  <View style={styles.statusIconContainer}>
                    <Ionicons name="ellipse-outline" size={24} color="#e74c3c" />
                  </View>
                )}
                {((site.adresse || site.address) && (site.ville || site.city)) && (
                  <TouchableOpacity
                    style={styles.navigationButton}
                    onPress={() => openMap(site.adresse || site.address, site.ville || site.city)}
                  >
                    <Image source={require('../assets/logo-carte.png')} style={styles.mapIconCustom} resizeMode="contain" />
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <RoadbookModal 
        visible={roadbookModalVisible}
        onClose={() => setRoadbookModalVisible(false)}
        roadbookData={selectedSiteRoadbook}
      />
    </View>
  );
  } catch (error) {
    console.error('[TourneeProgress] Erreur de rendu:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Suivi de tournée</Text>
        <Text style={styles.errorText}>Erreur de chargement du suivi de tournée</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTourneeDetails(true)}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  nextSiteContainer: {
    marginBottom: 15,
  },
  nextSiteLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  siteCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  siteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  siteAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  siteCity: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 3,
  },
  allVisitedContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allVisitedText: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noSitesText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginVertical: 10,
  },
  allSitesContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  allSitesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  siteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  visitedSite: {
    backgroundColor: '#e8f8f5',
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  unvisitedSite: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  siteItemInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  siteItemContent: {
    flex: 1,
  },
  siteItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  siteItemAddress: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  siteItemTime: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 5,
    fontWeight: '600',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusIconContainer: {
    paddingHorizontal: 5,
  },
  siteItemActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationButton: {
    padding: 5,
    marginLeft: 5,
  },
  refreshButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  siteItemPressed: {
    backgroundColor: '#e0e0e0',
  },
  nextSiteContentWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextSiteTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  navigationButtonNextSite: {
    padding: 5,
  },
  mapIconCustom: {
    width: 28,
    height: 28,
  },
  finalCheckContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderStyle: 'dashed',
  },
  finalCheckTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
  finalCheckButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  finalCheckButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  siteScheduledTime: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 5,
    fontWeight: '600',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  // Styles pour les numéros de téléphone
  sitePhoneLoading: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    fontStyle: 'italic',
  },
  sitePhoneContainer: {
    marginTop: 5,
  },
  sitePhoneNumber: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  sitePhoneSearchButton: {
    marginTop: 5,
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sitePhoneSearchText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // Styles pour les numéros dans la liste des sites
  siteItemPhoneLoading: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 3,
    fontStyle: 'italic',
  },
  siteItemPhoneContainer: {
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  siteItemPhoneNumber: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  siteItemPhoneSearchButton: {
    marginTop: 3,
    backgroundColor: '#f39c12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  siteItemPhoneSearchText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  // Styles pour les numéros non disponibles
  sitePhoneNotAvailable: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 5,
    fontStyle: 'italic',
  },
  siteItemPhoneNotAvailable: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 3,
    fontStyle: 'italic',
  },
});

export default TourneeProgress; 