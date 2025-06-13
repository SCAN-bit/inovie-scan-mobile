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
import { Picker } from '@react-native-picker/picker';
import FirebaseService from '../services/firebaseService';
import CustomView from '../components/CustomView';
import { Ionicons } from '@expo/vector-icons'; // AJOUT DE L'IMPORTATION POUR LES ICÔNES

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

// Assurez-vous d'installer: npm install @react-native-picker/picker

// Fonction pour ouvrir Google Maps
const handleOpenMaps = (item) => {
  console.log('[TourneeScreen] handleOpenMaps appelé avec item:', JSON.stringify(item, null, 2)); // LOG AJOUTÉ
  const { latitude, longitude, nom } = item;

  // Vérifiez que latitude et longitude sont bien des nombres et existent
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.log('[TourneeScreen] Coordonnées invalides ou manquantes pour:', nom); // LOG AJOUTÉ
    Alert.alert(
      'Coordonnées invalides',
      `Les coordonnées pour "${nom || 'ce site'}" ne sont pas disponibles ou sont incorrectes pour la navigation.`
    );
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
      Alert.alert(
        'Erreur d\'ouverture',
        'Impossible d\'ouvrir Google Maps. Veuillez vérifier si une application de cartographie est installée et fonctionnelle.'
      );
    });
  });
};

export default function TourneeScreen({ navigation }) {
  const [tournees, setTournees] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [poles, setPoles] = useState([]);
  const [selectedTournee, setSelectedTournee] = useState(null);
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const [selectedPole, setSelectedPole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nouveaux états pour la recherche de véhicule
  const [modalVehiculeVisible, setModalVehiculeVisible] = useState(false);
  const [rechercheVehiculeTexte, setRechercheVehiculeTexte] = useState('');
  const [vehiculesFiltres, setVehiculesFiltres] = useState([]);

  useEffect(() => {
    // Charger les pôles, tournées et véhicules sans reprise de session
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer les pôles
        const polesData = await FirebaseService.getPoles();
        setPoles(polesData);

        // Récupérer tournées et véhicules
        const [tourneesData, vehiculesData] = await Promise.all([
          FirebaseService.getTournees(),
          FirebaseService.getVehicules()
        ]);
        setTournees(tourneesData);
        setVehicules(vehiculesData);
        setVehiculesFiltres(vehiculesData || []); // Initialiser les véhicules filtrés
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError("Impossible de charger les données. Veuillez vérifier votre connexion.");
        Alert.alert('Erreur','Impossible de récupérer les données. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigation]);

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

  // Fonction pour gérer la sélection d'un pôle
  const handlePoleSelect = async (poleId) => {
    try {
      if (poleId === selectedPole?.id) return; // Éviter de recharger si c'est le même pôle
      
      setIsLoading(true);
      
      // Réinitialiser les sélections actuelles
      setSelectedTournee(null);
      setSelectedVehicule(null);
      
      // Trouver le pôle sélectionné
      const pole = poles.find(p => p.id === poleId);
      setSelectedPole(pole);
      
      if (pole) {
        // Récupérer les tournées et véhicules filtrés par pôle
        const [tourneesData, vehiculesData] = await Promise.all([
          FirebaseService.getTourneesByPole(pole.id),
          FirebaseService.getVehiculesByPole(pole.id)
        ]);
        
        console.log('[TourneeScreen] Tournées chargées pour le pôle:', JSON.stringify(tourneesData, null, 2)); // LOG AJOUTÉ
        // S'assurer qu'aucun véhicule par défaut n'est ajouté
        setTournees(tourneesData || []);
        setVehicules(vehiculesData || []);
        setVehiculesFiltres(vehiculesData || []); // Mettre à jour les véhicules filtrés
        console.log(`Véhicules chargés pour le pôle ${pole.id}:`, vehiculesData);
      } else {
        // Si aucun pôle n'est sélectionné, réinitialiser les données
        setTournees([]);
        setVehicules([]);
        setVehiculesFiltres([]); // Réinitialiser si aucun pôle
      }
    } catch (error) {
      console.error('Erreur lors du filtrage par pôle:', error);
      Alert.alert('Erreur', 'Impossible de filtrer les données par pôle. Veuillez réessayer.');
      // En cas d'erreur, s'assurer que les listes sont vides
      setTournees([]);
      setVehicules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTourneeSelect = (tournee) => {
    setSelectedTournee(tournee);
  };

  const handleSubmit = async () => {
    if (!selectedTournee || !selectedVehicule) {
      Alert.alert(
        'Information incomplète',
        'Veuillez sélectionner une tournée et un véhicule.'
      );
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

      // LOG AJOUTÉ pour vérifier l'objet pôle
      console.log("[TourneeScreen] Données de session préparées pour CheckVehicule:", JSON.stringify(sessionData, null, 2));
      
      // Naviguer vers l'écran suivant
      navigation.navigate('CheckVehicule', { sessionData });
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTourneeItem = ({ item }) => {
    console.log('[TourneeScreen] renderTourneeItem avec item:', JSON.stringify(item, null, 2)); // LOG AJOUTÉ
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('Tournee')}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (poles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun pôle disponible actuellement.</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('Tournee')}
        >
          <Text style={styles.retryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sélection du pôle */}
      <Text style={styles.sectionTitle}>Sélectionnez votre pôle</Text>
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedPole?.id}
          onValueChange={(itemValue) => {
            handlePoleSelect(itemValue);
          }}
          style={styles.picker}
          prompt="Choisissez un pôle"
        >
          <Picker.Item label="-- Choisissez un pôle --" value={null} />
          {poles.map((pole) => (
            <Picker.Item
              key={pole.id}
              label={pole.nom}
              value={pole.id}
            />
          ))}
        </Picker>
      </View>
      
      {selectedPole && (
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
                    setSelectedVehicule(item);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyListContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 12,
    color: '#2c3e50',
  },
  tourneeListContainer: {
    paddingBottom: 10,
  },
  tourneeItemContainer: { // Nouveau style pour le conteneur de l'item et du bouton
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    // Les propriétés de fond/bordure sont maintenant sur tourneeItem et mapsButton individuellement
  },
  tourneeItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tourneeDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  tourneeDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  vehiculeContainer: {
    marginBottom: 20,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerPlaceholder: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    fontSize: 16,
    color: '#000', // Ou une couleur plus foncée pour le texte non sélectionné
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
  }
});