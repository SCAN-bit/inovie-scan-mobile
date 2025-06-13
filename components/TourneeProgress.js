import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform, FlatList, Pressable, Image } from 'react-native';
import firebaseService from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RoadbookModal from './RoadbookModal';

/**
 * Composant affichant le suivi de progression d'une tournée
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.tourneeId - L'ID de la tournée à afficher
 * @param {string} props.sessionId - L'ID de la session courante
 * @param {function} props.onSiteSelect - Callback pour la sélection d'un site
 */
const TourneeProgress = React.forwardRef(({ tourneeId, sessionId, onSiteSelect }, ref) => {
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
          console.warn('iOS maps app not available, falling back to web URL for navigation.');
          Linking.openURL(webUrl).catch(err => console.error("Couldn't load page on iOS", err));
        }
      }).catch(err => {
        console.error('Error checking maps app support on iOS, falling back to web URL:', err);
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
          console.warn('Android geo: scheme not supported, falling back to web URL for navigation.');
          Linking.openURL(webUrl).catch(err => console.error("Couldn't load page on Android", err));
        }
      }).catch(err => {
        console.error('Error checking geo support on Android, falling back to web URL:', err);
        Linking.openURL(webUrl).catch(webErr => console.error("Couldn't load page on Android fallback", webErr));
      });
    } else {
      // Pour toutes les autres plateformes (y compris 'web' si Platform.OS le retourne, ou undefined)
      // ouvrir directement l'URL web.
      console.log('Platform is not iOS or Android, opening web URL for navigation:', webUrl);
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

  // Fonction pour charger les détails de la tournée
  const loadTourneeDetails = async (forceReload = false) => {
    if (forceReload) {
      console.log('[TourneeProgress] forceReload: réinitialisation de tourneeDetails local');
      setTourneeDetails(null);
    }
    if (!forceReload && tourneeDetails) {
      console.log("[TourneeProgress] Détails déjà chargés et pas de forçage, skip reload.");
      return;
    }
    if (!tourneeId) {
      setError('ID de tournée manquant');
      setLoading(false);
      return;
    }
    if (!sessionId) {
      console.warn("[TourneeProgress] loadTourneeDetails: sessionId manquant via les props.");
    }
    try {
      setLoading(true);
      console.log(`Chargement des détails de la tournée: ${tourneeId} pour session: ${sessionId}`);
      const details = await firebaseService.getTourneeWithSites(tourneeId, sessionId);
      if (!details) {
        throw new Error('Impossible de récupérer les détails de la tournée');
      }
      console.log(`Détails de la tournée récupérés: ${details.sitesWithStatus?.length || 0} sites`);
      console.log('[TourneeProgress] Details complets reçus:', {
        id: details.id,
        nom: details.nom,
        sitesWithStatusLength: details.sitesWithStatus?.length,
        sitesWithStatus: details.sitesWithStatus?.slice(0, 2) // 2 premiers sites pour debug
      });
      setTourneeDetails(details);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des détails de la tournée:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exposer la fonction de rechargement ET la fonction de marquage local via la référence
  React.useImperativeHandle(ref, () => ({
    loadTourneeDetails: (force = false) => loadTourneeDetails(force),
    markSiteAsVisitedLocally,
    getSitesWithStatus: () => tourneeDetails?.sitesWithStatus || []
  }));

  // Charger les détails initiaux au montage et quand tourneeId OU sessionId change
  useEffect(() => {
    console.log("[TourneeProgress] useEffect [tourneeId, sessionId] triggered. Calling loadTourneeDetails.");
    loadTourneeDetails();
  }, [tourneeId, sessionId]);

  // Restaurer les visites locales ET SAUVEGARDER les changements de tourneeDetails dans AsyncStorage
  useEffect(() => {
    const manageLocalPersistence = async () => {
      if (!tourneeDetails || !tourneeDetails.sitesWithStatus || !sessionId) {
        console.log('[TourneeProgress] manageLocalPersistence: Skipping due to missing tourneeDetails, sitesWithStatus, or sessionId.', { hasDetails: !!tourneeDetails, hasSessionId: !!sessionId });
        return;
      }

      const sessionKey = `visitedSiteIds_${sessionId}`;
      let idsFromTourneeKey = null;
      if (tourneeId) {
        idsFromTourneeKey = `tourneeVisitedSites_${tourneeId}`;
      }

      // Étape 1: Déterminer les IDs actuellement marqués comme visités dans l'état tourneeDetails
      // Ces visites peuvent provenir de loadTourneeDetails (Firestore) ou d'un markSiteAsVisitedLocally.
      const visitedIdsInCurrentState = new Set(
        tourneeDetails.sitesWithStatus
          .filter(site => site.visited)
          .map(site => site.uniqueDisplayId)
      );
      console.log('[TourneeProgress] manageLocalPersistence - Visited IDs in current tourneeDetails state:', Array.from(visitedIdsInCurrentState));

      // Étape 2: Lire les IDs depuis AsyncStorage (pour la session et pour la tournée)
      let idsFromSessionStorage = [];
      const storedSessionData = await AsyncStorage.getItem(sessionKey);
      if (storedSessionData) {
        try { idsFromSessionStorage = JSON.parse(storedSessionData); } catch (e) { console.error('Error parsing session visited IDs for restore', e); idsFromSessionStorage = []; }
      }
      if (!Array.isArray(idsFromSessionStorage)) idsFromSessionStorage = [];
      console.log(`[TourneeProgress] manageLocalPersistence - IDs from Session AsyncStorage (${sessionId}):`, JSON.stringify(idsFromSessionStorage));

      let idsFromTourneeStorage = [];
      if (idsFromTourneeKey) {
        const storedTourneeData = await AsyncStorage.getItem(idsFromTourneeKey);
        if (storedTourneeData) {
          try { idsFromTourneeStorage = JSON.parse(storedTourneeData); } catch (e) { console.error('Error parsing tournee visited IDs for restore', e); idsFromTourneeStorage = []; }
        }
      }
      if (!Array.isArray(idsFromTourneeStorage)) idsFromTourneeStorage = [];
      console.log(`[TourneeProgress] manageLocalPersistence - IDs from Tournee AsyncStorage (${tourneeId}):`, JSON.stringify(idsFromTourneeStorage));

      // Étape 3: Fusionner les IDs de l'état actuel et d'AsyncStorage pour la sauvegarde
      // Cela garantit que ce qui est dans l'état (potentiellement de Firestore) est préservé et sauvegardé.
      const combinedIdsToPersist = new Set([...visitedIdsInCurrentState, ...idsFromSessionStorage, ...idsFromTourneeStorage]);
      const idsToPersistArray = Array.from(combinedIdsToPersist);
      console.log('[TourneeProgress] manageLocalPersistence - Combined unique IDs to persist to AsyncStorage:', JSON.stringify(idsToPersistArray));
      
      // Étape 4: Mettre à jour l'état visuel UNIQUEMENT si les IDs combinés diffèrent de l'état actuel.
      // Cela évite les re-render inutiles si l'état actuel est déjà correct.
      let visualChangeNeeded = false;
      const sitesAfterPotentialMerge = tourneeDetails.sitesWithStatus.map(site => {
        const expectedUniqueId = site.uniqueDisplayId;
        const долженБытьПосещен = idsToPersistArray.includes(expectedUniqueId); // "devrait être visité"
        if (site.visited !== долженБытьПосещен) {
          visualChangeNeeded = true;
        }
        return { ...site, visited: долженБытьПосещен };
      });

      if (visualChangeNeeded) {
        console.log('[TourneeProgress] manageLocalPersistence: Visual change detected after merging with AsyncStorage. Updating tourneeDetails.');
        setTourneeDetails(prev => ({
          ...prev,
          sitesWithStatus: sitesAfterPotentialMerge,
          visitedSites: sitesAfterPotentialMerge.filter(s => s.visited).length
        }));
        // Après cette mise à jour, useEffect se redéclenchera. 
        // Lors du prochain passage, visitedIdsInCurrentState reflétera sitesAfterPotentialMerge,
        // et si AsyncStorage n'a pas changé, visualChangeNeeded devrait être false, stabilisant l'état.
      }

      // Étape 5: Sauvegarder les IDs fusionnés dans AsyncStorage
      // On sauvegarde TOUJOURS l'ensemble combiné pour s'assurer qu'AsyncStorage est à jour
      // avec la vision la plus complète des visites.
      try {
        await AsyncStorage.setItem(sessionKey, JSON.stringify(idsToPersistArray));
        console.log(`[TourneeProgress] manageLocalPersistence - Saved to Session AsyncStorage (${sessionKey}): ${idsToPersistArray.length} IDs`);

        if (idsFromTourneeKey) {
          // Pour la clé de tournée, on sauvegarde également l'ensemble complet.
          // Ceci est important si on veut qu'une tournée partagée entre sessions garde ses visites.
          await AsyncStorage.setItem(idsFromTourneeKey, JSON.stringify(idsToPersistArray));
          console.log(`[TourneeProgress] manageLocalPersistence - Saved to Tournee AsyncStorage (${idsFromTourneeKey}): ${idsToPersistArray.length} IDs`);
        }
      } catch (e) {
        console.error('[TourneeProgress] manageLocalPersistence - Error during AsyncStorage save:', e);
      }
    };

    manageLocalPersistence();

  }, [tourneeDetails, sessionId, tourneeId]); 

  // --- AJOUT: Fonction pour marquer un site comme visité localement ---
  const markSiteAsVisitedLocally = async (siteIdentifier, specificIndex = null) => {
    console.log(`[TourneeProgress] markSiteAsVisitedLocally CALLED. Identifier: ${siteIdentifier}, Index: ${specificIndex}`);

    console.log('[TourneeProgress] Reading tourneeDetails directly before attempting update.');
    if (tourneeDetails === null) {
      console.error('[TourneeProgress] Direct read: tourneeDetails is NULL. Cannot update.');
      return; 
    } else if (!tourneeDetails.sitesWithStatus) {
      console.error('[TourneeProgress] Direct read: tourneeDetails.sitesWithStatus is FALSY. Cannot update. tourneeDetails:', tourneeDetails);
      return; 
    }

    console.log(`[TourneeProgress] Direct read: tourneeDetails.sitesWithStatus.length: ${tourneeDetails.sitesWithStatus.length}`);
    
    let siteSuccessfullyMarked = false;
    let markedSiteName = "";

    const updatedSites = tourneeDetails.sitesWithStatus.map((site, index) => {
      let newSiteState = { ...site };
      if (specificIndex !== null && specificIndex !== undefined) {
        if (index === specificIndex) {
          if (!newSiteState.visited) {
            newSiteState.visited = true;
            siteSuccessfullyMarked = true;
            markedSiteName = newSiteState.name;
          }
        }
      }
      return newSiteState;
    });

    if (siteSuccessfullyMarked) {
      console.log(`[TourneeProgress] MARKED site (direct read): ${markedSiteName} (index ${specificIndex}) as visited.`);
      const newVisitedCount = updatedSites.filter(s => s.visited).length;
      console.log(`[TourneeProgress] updatedSites count (direct read): ${updatedSites.length}. New visited count: ${newVisitedCount}`);

      const newState = {
        ...tourneeDetails, 
        sitesWithStatus: updatedSites,
        visitedSites: newVisitedCount
      };
      
      console.log('[TourneeProgress] Just BEFORE calling setTourneeDetails with new state object (direct read).');
      setTourneeDetails(newState);
      console.log('[TourneeProgress] Just AFTER calling setTourneeDetails with new state object (direct read).');
    } else {
      console.warn('[TourneeProgress] WARNING (direct read): No site was marked as visited. Index provided: ', specificIndex);
    }
  };
  // --- FIN DE markSiteAsVisitedLocally ---

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
      console.log("✅ [TourneeProgress] Affichage du roadbook pour le site:", site.nom || site.name, site.roadbook);
      setSelectedSiteRoadbook(site.roadbook);
      setRoadbookModalVisible(true);
    } else {
      console.log("❌ [TourneeProgress] Pas de données de roadbook pour le site:", site.nom || site.name);
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
      </View>
    );
  }

  const { sitesWithStatus = [] } = tourneeDetails;
  const totalSites = sitesWithStatus.length;
  const visitedSites = sitesWithStatus.filter(site => site.visited).length;

  const progressPercentage = totalSites > 0 ? (visitedSites / totalSites) * 100 : 0;
  const nextSiteToVisit = sitesWithStatus.find(site => !site.visited);

  const generateUniqueKey = (prefix, id, index) => {
    return `${prefix}-${id || ''}-${index}-${Math.random().toString(36).substring(2, 7)}`;
  };

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
              </View>
              {((nextSiteToVisit.adresse || nextSiteToVisit.address) && (nextSiteToVisit.ville || nextSiteToVisit.city)) && (
                <TouchableOpacity
                  style={styles.navigationButtonNextSite}
                  onPress={(e) => {
                    e.stopPropagation();
                    openMap(nextSiteToVisit.adresse || nextSiteToVisit.address, nextSiteToVisit.ville || nextSiteToVisit.city);
                  }}
                >
                  <Image source={require('../assets/logo-carte.png')} style={styles.mapIconCustom} />
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
                    <Image source={require('../assets/logo-carte.png')} style={styles.mapIconCustom} />
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
    resizeMode: 'contain',
  },
});

export default TourneeProgress; 