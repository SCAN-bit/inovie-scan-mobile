import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking, // Ajout de Linking
  Platform, // Ajout de Platform
  Modal, // Ajout de Modal
  TextInput, // Ajout de TextInput
  SafeAreaView, // Ajout pour la modale
  StatusBar, // Ajout pour la barre de statut
} from 'react-native';
import CustomPicker from '../components/CustomPicker';
import Toast from '../components/Toast';
import FirebaseService from '../services/firebaseService';
import CustomView from '../components/CustomView';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

// Assurez-vous d'installer: npm install @react-native-picker/picker

// Fonction pour ouvrir Google Maps
  const handleOpenMaps = (item) => {
    // console.log('[TourneeScreen] handleOpenMaps appelé avec item:', JSON.stringify(item, null, 2)); // LOG AJOUTÉ
    const { latitude, longitude, nom } = item;

  // Vérifiez que latitude et longitude sont bien des nombres et existent
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    // console.log('[TourneeScreen] Coordonnées invalides ou manquantes pour:', nom); // LOG AJOUTÉ
    console.log(`Coordonnées invalides pour ${nom || 'ce site'}`);
    return;
  }

  // URL pour lancer la navigation vers la destination.
  // Google Maps utilisera la position actuelle de l'utilisateur comme point de départ.
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

  Linking.openURL(mapsUrl).catch(err => {
    console.error('Erreur lors de l\'ouverture de Google Maps via URL de navigation:', err);
    // Essayer une URL web plus simple en fallback
    const webFallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(webFallbackUrl).catch(webErr => {
      console.error('Erreur lors de l\'ouverture de Google Maps via URL web:', webErr);
      console.log('Impossible d\'ouvrir Google Maps');
    });
  });
};

export default function TourneeScreen({ navigation, route }) {
  const { preSelectedTournee, preSelectedPole, changeVehicleMode, resetSelection } = route.params || {};
  
  const [tournees, setTournees] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [poles, setPoles] = useState([]);
  const [selectedTournee, setSelectedTournee] = useState(resetSelection ? null : (preSelectedTournee || null));
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const [selectedPole, setSelectedPole] = useState(resetSelection ? null : (preSelectedPole || null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nouveaux états pour la recherche de véhicule
  const [modalVehiculeVisible, setModalVehiculeVisible] = useState(false);
  const [rechercheVehiculeTexte, setRechercheVehiculeTexte] = useState('');
  const [vehiculesFiltres, setVehiculesFiltres] = useState([]);
  
  // État pour les toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // OPTIMISATION: Chargement initial optimisé
  useEffect(() => {
    const fetchDataOptimized = async () => {
      const startTime = Date.now();
      // console.log('🚀 [TourneeScreen] Chargement initial optimisé');
      
      try {
        setIsLoading(true);
        setError(null);

        // OPTIMISATION 1: Toutes les requêtes en parallèle
        const [polesData, tourneesData, vehiculesData] = await Promise.all([
          FirebaseService.getPoles(),
          FirebaseService.getTournees(),
          FirebaseService.getVehicules()
        ]);

        setPoles(polesData || []);

        // OPTIMISATION 2: Sauvegarder dans le cache ET afficher les données
        allDataCache.current = { tournees: tourneesData || [], vehicules: vehiculesData || [] };
        // console.log(`💾 [TourneeScreen] Cache mis à jour: ${tourneesData?.length || 0} tournées, ${vehiculesData?.length || 0} véhicules`);

        if (preSelectedPole) {
          // console.log(`🎯 [TourneeScreen] Filtrage pour pôle: ${preSelectedPole.id}`);
          
          // Filtrer localement avec la nouvelle logique
          const tourneesFiltered = (tourneesData || []).filter(t => {
            return t.poleId === preSelectedPole.id || t.pole === preSelectedPole.id || t.pole === preSelectedPole.nom;
          });
          const vehiculesFiltered = (vehiculesData || []).filter(v => {
            return v.poleId === preSelectedPole.id || v.pole === preSelectedPole.id || v.pole === preSelectedPole.nom;
          });
          
          setTournees(tourneesFiltered);
          setVehicules(vehiculesFiltered);
          setVehiculesFiltres(vehiculesFiltered);
          setSelectedPole(preSelectedPole);
          
          // console.log(`🎯 [TourneeScreen] Pré-filtrage: ${tourneesFiltered.length} tournées, ${vehiculesFiltered.length} véhicules`);
        } else {
          // Mode normal : toutes les données
          setTournees(tourneesData || []);
          setVehicules(vehiculesData || []);
          setVehiculesFiltres(vehiculesData || []);
          
          // console.log(`📊 [TourneeScreen] Mode normal: ${tourneesData?.length || 0} tournées, ${vehiculesData?.length || 0} véhicules`);
        }

        const loadTime = Date.now() - startTime;
        // console.log(`⚡ [TourneeScreen] Chargement terminé en ${loadTime}ms`);
        
      } catch (error) {
        console.error('❌ [TourneeScreen] Erreur chargement:', error);
        setError("Impossible de charger les données. Veuillez vérifier votre connexion.");
        showToast('Impossible de récupérer les données.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDataOptimized();
  }, [navigation, preSelectedPole]);

  // Mettre à jour vehiculesFiltres lorsque vehicules ou rechercheVehiculeTexte change
  useEffect(() => {
    if (rechercheVehiculeTexte === '') {
      setVehiculesFiltres(vehicules || []);
    } else {
      const filtres = (vehicules || []).filter(vehicule => 
        (vehicule.immatriculation && vehicule.immatriculation.toLowerCase().includes(rechercheVehiculeTexte.toLowerCase())) ||
        (vehicule.nom && vehicule.nom.toLowerCase().includes(rechercheVehiculeTexte.toLowerCase()))
      );
      setVehiculesFiltres(filtres);
    }
  }, [rechercheVehiculeTexte, vehicules]);

  // OPTIMISATION: Cache pour éviter les requêtes répétées
  const allDataCache = React.useRef({ tournees: [], vehicules: [] });

  // Fonction OPTIMISÉE pour gérer la sélection d'un pôle
  const handlePoleSelect = async (poleId) => {
            // console.log(`🎯 [TourneeScreen] Sélection pôle: ${poleId}`);
    
    try {
      if (poleId === selectedPole?.id) {
        // console.log('⚡ [TourneeScreen] Même pôle, pas de rechargement');
        return; // Éviter de recharger si c'est le même pôle
      }
      
      setIsLoading(true);
      
      // Réinitialiser les sélections actuelles
      setSelectedTournee(null);
      setSelectedVehicule(null);
      
      // Trouver le pôle sélectionné
      const pole = poles.find(p => p.id === poleId);
      setSelectedPole(pole);
      
      if (pole) {
        // OPTIMISATION: Utiliser le cache si disponible, sinon charger
        let tourneesData = allDataCache.current.tournees;
        let vehiculesData = allDataCache.current.vehicules;

        if (tourneesData.length === 0 || vehiculesData.length === 0) {
          // console.log('📡 [TourneeScreen] Cache vide, chargement depuis Firebase');
          [tourneesData, vehiculesData] = await Promise.all([
            FirebaseService.getTournees(),
            FirebaseService.getVehicules()
          ]);
          
          // Sauvegarder dans le cache
          allDataCache.current = { tournees: tourneesData, vehicules: vehiculesData };
        } else {
          // console.log('⚡ [TourneeScreen] Utilisation du cache local');
        }

        // CORRECTION: Filtrage local avec plusieurs champs possibles pour le pôle
        const tourneesFiltered = tourneesData.filter(t => {
          // Essayer plusieurs champs possibles pour la relation pôle/tournée
          return t.poleId === pole.id || t.pole === pole.id || t.pole === pole.nom;
        });
        
        const vehiculesFiltered = vehiculesData.filter(v => {
          // Essayer plusieurs champs possibles pour la relation pôle/véhicule  
          return v.poleId === pole.id || v.pole === pole.id || v.pole === pole.nom;
        });

        // DEBUG: Afficher quelques exemples pour comprendre la structure des données
        if (tourneesData.length > 0) {
          // console.log('🔍 [TourneeScreen] Structure d\'une tournée exemple:', {
          //   id: tourneesData[0].id,
          //   nom: tourneesData[0].nom,
          //   poleId: tourneesData[0].poleId,
          //   pole: tourneesData[0].pole,
          //   allFields: Object.keys(tourneesData[0])
          // });
        }
        
        if (vehiculesData.length > 0) {
          // console.log('🔍 [TourneeScreen] Structure d\'un véhicule exemple:', {
          //   id: vehiculesData[0].id,
          //   immatriculation: vehiculesData[0].immatriculation,
          //   poleId: vehiculesData[0].poleId,
          //   pole: vehiculesData[0].pole,
          //   allFields: Object.keys(vehiculesData[0])
          // });
        }
        
        setTournees(tourneesFiltered);
        setVehicules(vehiculesFiltered);
        setVehiculesFiltres(vehiculesFiltered);
        
        // console.log(`⚡ [TourneeScreen] Filtrage local: ${tourneesFiltered.length} tournées, ${vehiculesFiltered.length} véhicules`);
      } else {
        // Si aucun pôle n'est sélectionné, afficher toutes les données
        const { tournees, vehicules } = allDataCache.current;
        setTournees(tournees);
        setVehicules(vehicules);
        setVehiculesFiltres(vehicules);
      }
    } catch (error) {
      console.error('❌ [TourneeScreen] Erreur filtrage pôle:', error);
      showToast('Impossible de filtrer les données par pôle.', 'error');
      // En cas d'erreur, s'assurer que les listes sont vides
      setTournees([]);
      setVehicules([]);
      setVehiculesFiltres([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTourneeSelect = (tournee) => {
    setSelectedTournee(tournee);
  };

  const handleVehiculeSelect = (vehicule) => {
    setSelectedVehicule(vehicule);
  };

  const handleSubmit = async () => {
    if (!selectedTournee || !selectedVehicule) {
      showToast('Veuillez sélectionner une tournée et un véhicule.', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      
      // Préparer les données de session avec le pôle
      const sessionData = {
        tournee: selectedTournee,
        vehicule: selectedVehicule,
        pole: selectedPole
      };

      // Log des données de session pour debug
              // console.log("[TourneeScreen] Données de session préparées pour CheckVehicule:", JSON.stringify(sessionData, null, 2));
      
      // Naviguer vers l'écran suivant
      navigation.navigate('CheckVehicule', { sessionData });
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
              showToast('Une erreur est survenue.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

    // OPTIMISATION: Déconnexion rapide sans confirmation pour l'en-tête
  const handleLogout = async () => {
    try {
      // console.log('🚪 [TourneeScreen] Déconnexion depuis l\'en-tête');
      
      // Fermer la session actuelle
      await FirebaseService.closeCurrentSession();
      await FirebaseService.logout();
      
      showToast('Déconnexion réussie', 'success');
      
      // Redirection vers Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('❌ [TourneeScreen] Erreur déconnexion:', error);
      showToast('Impossible de se déconnecter.', 'error');
    }
  };

  const renderTourneeItem = ({ item }) => {
    // console.log('[TourneeScreen] renderTourneeItem avec item:', JSON.stringify(item, null, 2)); // LOG AJOUTÉ
    // Enveloppez l'item et le bouton dans une View avec flexDirection: 'row'
    return (
      <View style={styles.tourneeItemContainer}>
        <TouchableOpacity
          style={[
            styles.tourneeItem,
            selectedTournee?.id === item.id && styles.tourneeItemSelected,
          ]}
          onPress={() => handleTourneeSelect(item)}
        >
          <Text style={styles.tourneeName}>{item.nom}</Text>
          <Text style={styles.tourneeDetails}>
            {item.nombreColis || 0} colis à livrer
          </Text>
          {item.description && (
            <Text style={styles.tourneeDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </TouchableOpacity>

        {/* Bouton Google Maps */}
        {/* Assurez-vous que item.latitude et item.longitude existent et sont des nombres */}
        {(typeof item.latitude === 'number' && typeof item.longitude === 'number') && (
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={() => handleOpenMaps(item)}
          >
            <Text style={styles.mapsButtonText}>Maps</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader 
          title="Sélection de tournée"
          navigation={navigation}
          showBackButton={false}
          showLogoutButton={true}
          handleLogout={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader 
          title="Sélection de tournée"
          navigation={navigation}
          showBackButton={false}
          showLogoutButton={true}
          handleLogout={handleLogout}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.replace('Tournee')}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (poles.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader 
          title="Sélection de tournée"
          navigation={navigation}
          showBackButton={false}
          showLogoutButton={true}
          handleLogout={handleLogout}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun pôle disponible actuellement.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.replace('Tournee')}
          >
            <Text style={styles.retryButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title="Sélection de tournée"
        navigation={navigation}
        showBackButton={false}
        showLogoutButton={true}
        handleLogout={handleLogout}
      />
      
      <View style={styles.container}>
        {/* Sélection du pôle */}
        {(
          <>
            <Text style={styles.sectionTitle}>Sélectionnez votre pôle</Text>
          
                            <CustomPicker
                  selectedValue={selectedPole?.id}
                  onValueChange={handlePoleSelect}
                  items={[
                    { label: "-- Choisissez un pôle --", value: null },
                    ...poles.map(pole => ({ label: pole.nom, value: pole.id }))
                  ]}
                  placeholder="-- Choisissez un pôle --"
                  enabled={poles.length > 0}
                />
          </>
        )}
      
      {selectedPole && (
        <>
          {/* Sélection de tournée */}
          {(
            <>
              <Text style={styles.sectionTitle}>Sélectionnez votre tournée</Text>
              
              {tournees.length > 0 ? (
                <FlatList
                  data={tournees}
                  renderItem={renderTourneeItem}
                  keyExtractor={(item) => item.id}
                  horizontal={false} // Afficher verticalement
                  numColumns={1} // Sur une seule colonne
                  contentContainerStyle={styles.tourneeListContainer}
                />
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>Aucune tournée disponible pour ce pôle</Text>
                </View>
              )}
            </>
          )}

          {/* Sélection de véhicule */}
          {selectedTournee && (
            <>
              <View style={styles.vehiculeContainer}>
                <Text style={styles.sectionTitle}>Sélectionnez votre véhicule</Text>
                
                <TouchableOpacity 
                  style={styles.pickerContainer} 
                  onPress={() => setModalVehiculeVisible(true)}
                >
                  <Text style={styles.pickerPlaceholder}>
                    {selectedVehicule ? selectedVehicule.immatriculation || selectedVehicule.nom : "-- Choisissez un véhicule --"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bouton de soumission */}
              {(
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!selectedTournee || !selectedVehicule) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedTournee || !selectedVehicule || isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    Continuer vers vérification du véhicule
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

      {/* Modale pour la sélection du véhicule */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVehiculeVisible}
        onRequestClose={() => {
          setModalVehiculeVisible(!modalVehiculeVisible);
          setRechercheVehiculeTexte(''); // Réinitialiser la recherche en fermant
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un véhicule</Text>
              <TouchableOpacity onPress={() => { 
                setModalVehiculeVisible(false); 
                setRechercheVehiculeTexte('');
              }} style={styles.modalCloseIconContainer}>
                <Ionicons name="close-circle" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#ccc" style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un véhicule..."
                value={rechercheVehiculeTexte}
                onChangeText={setRechercheVehiculeTexte}
                placeholderTextColor="#aaa"
              />
            </View>
            <FlatList
              data={vehiculesFiltres}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    handleVehiculeSelect(item);
                    setModalVehiculeVisible(false);
                    setRechercheVehiculeTexte('');
                  }}
                >
                  <Ionicons name="car-sport-outline" size={24} color={styles.modalItemText.color} style={styles.modalItemIcon} />
                  <Text style={styles.modalItemText}>{item.immatriculation || item.nom}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.infoTextModal}>Aucun véhicule trouvé.</Text>}
              style={styles.modalFlatList}
            />
          </View>
        </View>
      </Modal>
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: sp(12),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: sp(10),
    fontSize: fp(15),
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp(20),
  },
  errorText: {
    fontSize: fp(16),
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: sp(20),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp(20),
  },
  emptyText: {
    fontSize: fp(16),
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: sp(20),
  },
  emptyListContainer: {
    padding: sp(20),
    backgroundColor: '#ffffff',
    borderRadius: sp(8),
    marginVertical: sp(10),
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: fp(14),
    color: '#7f8c8d',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: sp(12),
    paddingHorizontal: sp(20),
    borderRadius: sp(8),
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fp(16),
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: fp(16),
    fontWeight: 'bold',
    marginBottom: sp(10),
    marginTop: sp(10),
    color: '#2c3e50',
  },
  tourneeListContainer: {
    paddingBottom: sp(10),
  },
  tourneeItemContainer: { // Nouveau style pour le conteneur de l'item et du bouton
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(8),
    // Les propriétés de fond/bordure sont maintenant sur tourneeItem et mapsButton individuellement
  },
  tourneeItem: {
    backgroundColor: '#ffffff',
    borderRadius: sp(6),
    padding: sp(12),
    // marginBottom: 8, // Géré par tourneeItemContainer
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1, // Pour que l'item prenne l'espace disponible à côté du bouton
  },
  tourneeItemSelected: {
    borderColor: '#3498db',
    backgroundColor: '#ecf0f1',
  },
  tourneeName: {
    fontSize: fp(15),
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tourneeDetails: {
    fontSize: fp(13),
    color: '#7f8c8d',
    marginTop: sp(3),
  },
  tourneeDescription: {
    fontSize: fp(14),
    color: '#7f8c8d',
    marginTop: sp(8),
    fontStyle: 'italic',
  },
  vehiculeContainer: {
    marginBottom: sp(20),
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: sp(8),
    marginBottom: sp(16),
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: sp(8),
  },
  picker: {
    height: hp(48),
    width: '100%',
    color: '#1f2937',
    fontSize: fp(16),
  },
  pickerItem: {
    fontSize: fp(16),
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'left',
    paddingLeft: sp(8),
  },
  pickerItemPlaceholder: {
    fontSize: fp(16),
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'left',
    paddingLeft: sp(8),
  },
  pickerPlaceholder: {
    paddingHorizontal: sp(10),
    paddingVertical: sp(15),
    fontSize: fp(16),
    color: '#1f2937',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: hp(16),
    borderRadius: sp(8),
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: fp(16),
    fontWeight: 'bold',
  },
  // Nouveaux styles pour le bouton Maps
  mapsButton: {
    marginLeft: 10,
    paddingHorizontal: 15, // Augmenté pour un meilleur toucher
    paddingVertical: 10, // Augmenté pour un meilleur toucher
    backgroundColor: '#27ae60', // Couleur verte pour se distinguer
    borderRadius: 8, // Cohérent avec les autres éléments
    justifyContent: 'center',
    alignItems: 'center',
    height: 'auto', // S'adapte au contenu, ou fixez une hauteur si nécessaire
    minHeight: 50, // Pour une bonne zone de clic
  },
  mapsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Styles pour la modale de véhicule
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Augmenté
    paddingVertical: 15, // Augmenté
    borderBottomWidth: 0, // Supprimé car le header a un fond
    backgroundColor: '#3498db', // Couleur principale
    borderTopLeftRadius: 20, // Pour arrondir avec modalView
    borderTopRightRadius: 20, // Pour arrondir avec modalView
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff', // Texte blanc
  },
  modalCloseButton: { // Ce style n'est plus utilisé pour le texte "Fermer"
    fontSize: 16,
    color: '#3498db',
  },
  modalCloseIconContainer: { // Style pour le conteneur de l'icône de fermeture
    padding: 5, // Petite zone de clic autour de l'icône
  },
  searchInputContainer: { // Conteneur pour l'input et l'icône de recherche
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12, // Plus arrondi
    marginHorizontal: 15,
    marginTop: 15, // Espacement après le header
    marginBottom: 10, // Espacement avant la liste
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  searchInputIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1, // Pour que le TextInput prenne l'espace restant
    height: 48, // Hauteur augmentée
    // Les bordures sont maintenant sur searchInputContainer
    // borderRadius: 12,
    // paddingHorizontal: 15, 
    // margin: 15,
    // backgroundColor: '#fff',
    fontSize: 16, // Taille de police pour l'input
  },
  modalItem: {
    flexDirection: 'row', // Pour l'icône et le texte
    alignItems: 'center', // Aligner verticalement
    paddingVertical: 18, // Plus d'espace vertical
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Bordure plus claire
  },
  modalItemIcon: {
    marginRight: 15, // Espace entre icône et texte
  },
  modalItemText: {
    fontSize: 16,
    color: '#333', // Texte un peu plus foncé pour meilleure lisibilité
  },
  modalFlatList: { // Style pour la FlatList à l'intérieur du pop-up
    width: '100%',
  },
  infoTextModal: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#7f8c8d',
  },
  changeVehicleNotice: {
    backgroundColor: '#ecf0f1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeVehicleNoticeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
});