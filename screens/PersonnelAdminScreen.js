import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  Linking,
  Image,
} from 'react-native';
import CustomPicker from '../components/CustomPicker';
import Toast from '../components/Toast';
import FirebaseService from '../services/firebaseService';
import CustomView from '../components/CustomView';
import { Ionicons } from '@expo/vector-icons';
import PersonnelAdminHeader from '../components/PersonnelAdminHeader';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

// Renommer CustomView en View pour maintenir la compatibilité
const View = CustomView;

export default function PersonnelAdminScreen({ navigation, route }) {
  // États pour la gestion des données
  const [vehicules, setVehicules] = useState([]);
  const [poles, setPoles] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedPole, setSelectedPole] = useState(null);
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Vérifier si un check a été terminé
  const routeCheckCompleted = (route.params && route.params.checkCompleted) || false;
  const completedSessionData = (route.params && route.params.sessionData) || null;

  // États pour les modales et la recherche
  const [modalVehiculeVisible, setModalVehiculeVisible] = useState(false);
  const [modalSiteVisible, setModalSiteVisible] = useState(false);
  const [rechercheVehiculeTexte, setRechercheVehiculeTexte] = useState('');
  const [rechercheSiteTexte, setRechercheSiteTexte] = useState('');
  const [vehiculesFiltres, setVehiculesFiltres] = useState([]);
  const [sitesFiltres, setSitesFiltres] = useState([]);
  
  // États pour le workflow
  const [currentStep, setCurrentStep] = useState('pole'); // pole -> vehicule -> check -> site -> maps
  const [checkCompleted, setCheckCompleted] = useState(false);
  
  // État pour les toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Chargement initial des pôles
  useEffect(() => {
    loadPoles();
  }, []);
  
  // Gérer le retour du check véhicule
  useEffect(() => {
    if (routeCheckCompleted && completedSessionData) {
      console.log('🔍 [PersonnelAdminScreen] Retour du check véhicule détecté');
      setCheckCompleted(true);
      setCurrentStep('site'); // Passer directement à la sélection du site
      
      // Récupérer le pôle depuis les données de session
      const sessionPole = completedSessionData.pole;
      console.log('🔍 [PersonnelAdminScreen] Pôle depuis session:', sessionPole);
      
      if (sessionPole && (!sites || sites.length === 0)) {
        console.log('🔍 [PersonnelAdminScreen] Rechargement des sites nécessaire avec pôle:', sessionPole.id);
        loadSites(sessionPole.id);
        setSelectedPole(sessionPole); // Restaurer le pôle sélectionné
      } else if (sites && sites.length > 0) {
        console.log('🔍 [PersonnelAdminScreen] Sites déjà chargés:', sites.length);
      } else {
        console.log('🔍 [PersonnelAdminScreen] Aucun pôle ou sites, rechargement forcé');
        // Rechargement forcé des pôles et sites
        loadPoles();
        if (sessionPole) {
          loadSites(sessionPole.id);
        }
      }
      
      showToast('Check véhicule terminé avec succès !', 'success');
    }
  }, [routeCheckCompleted, completedSessionData]);

  // Charger les pôles
  const loadPoles = async () => {
    try {
      setIsLoading(true);
      const polesData = await FirebaseService.getPoles();
      setPoles(polesData);
    } catch (error) {
      console.error('Erreur lors du chargement des pôles:', error);
      setError('Impossible de charger les pôles');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les véhicules d'un pôle
  const loadVehicules = async (poleId) => {
    try {
      setIsLoading(true);
      const vehiculesData = await FirebaseService.getVehiculesByPole(poleId);
      setVehicules(vehiculesData);
      setVehiculesFiltres(vehiculesData);
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
      setError('Impossible de charger les véhicules');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les sites d'un pôle
  const loadSites = async (poleId) => {
    try {
      console.log(`🔍 [PersonnelAdminScreen] loadSites appelé avec poleId: ${poleId}`);
      setIsLoading(true);
      const sitesData = await FirebaseService.getSitesByPole(poleId);
      console.log(`🔍 [PersonnelAdminScreen] Sites reçus de FirebaseService:`, sitesData);
      console.log(`🔍 [PersonnelAdminScreen] Nombre de sites: ${(sitesData && sitesData.length) || 0}`);
      
      setSites(sitesData);
      setSitesFiltres(sitesData);
      
      console.log(`🔍 [PersonnelAdminScreen] États mis à jour - sites: ${(sitesData && sitesData.length) || 0}, sitesFiltres: ${(sitesData && sitesData.length) || 0}`);
    } catch (error) {
      console.error('❌ [PersonnelAdminScreen] Erreur lors du chargement des sites:', error);
      setError('Impossible de charger les sites');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion de la sélection du pôle
  const handlePoleSelect = async (poleId) => {
    try {
      const selectedPoleData = poles.find(p => p.id === poleId);
      setSelectedPole(selectedPoleData);
      setCurrentStep('vehicule');
      
      // Charger les véhicules et sites du pôle
      await Promise.all([
        loadVehicules(poleId),
        loadSites(poleId)
      ]);
      
      showToast(`Pôle ${selectedPoleData.nom} sélectionné`, 'success');
    } catch (error) {
      console.error('Erreur lors de la sélection du pôle:', error);
      showToast('Erreur lors de la sélection du pôle', 'error');
    }
  };

  // Gestion de la sélection du véhicule
  const handleVehiculeSelect = (vehicule) => {
    setSelectedVehicule(vehicule);
    setModalVehiculeVisible(false);
    setCurrentStep('check');
    showToast(`Véhicule ${vehicule.immatriculation} sélectionné`, 'success');
  };

  // Gestion de la sélection du site
  const handleSiteSelect = (site) => {
    setSelectedSite(site);
    setModalSiteVisible(false);
    setCurrentStep('maps');
    showToast(`Site ${site.nom} sélectionné`, 'success');
  };

  // Navigation vers le check véhicule
  const navigateToCheckVehicule = () => {
    if (!selectedVehicule) {
      showToast('Veuillez sélectionner un véhicule', 'warning');
      return;
    }

    const sessionData = {
      vehicule: selectedVehicule,
      pole: selectedPole,
      isPersonnelAdmin: true, // Flag pour identifier le contexte
      isFromPersonnelAdmin: true
    };

    navigation.navigate('CheckVehicule', { sessionData });
  };

  // Retour à l'étape précédente
  const goBackStep = () => {
    switch (currentStep) {
      case 'vehicule':
        setCurrentStep('pole');
        setSelectedVehicule(null);
        break;
      case 'check':
        setCurrentStep('vehicule');
        setSelectedVehicule(null);
        break;
      case 'site':
        setCurrentStep('check');
        setSelectedSite(null);
        break;
      case 'maps':
        setCurrentStep('site');
        setSelectedSite(null);
        break;
    }
  };

  // Filtrage des véhicules
  useEffect(() => {
    if (rechercheVehiculeTexte.trim() === '') {
      setVehiculesFiltres(vehicules);
    } else {
      const filtered = vehicules.filter(vehicule =>
        vehicule.immatriculation.toLowerCase().includes(rechercheVehiculeTexte.toLowerCase()) ||
        (vehicule.modele && vehicule.modele.toLowerCase)().includes(rechercheVehiculeTexte.toLowerCase())
      );
      setVehiculesFiltres(filtered);
    }
  }, [rechercheVehiculeTexte, vehicules]);

  // Filtrage des sites
  useEffect(() => {
    console.log('🔍 [PersonnelAdminScreen] Filtrage des sites - sites:', (sites && sites.length) || 0, 'recherche:', rechercheSiteTexte);
    
    // Protection contre la perte des sites
    if (!sites || sites.length === 0) {
      console.log('🔍 [PersonnelAdminScreen] Sites vides, pas de filtrage');
      return;
    }
    
    if (rechercheSiteTexte.trim() === '') {
      setSitesFiltres(sites);
    } else {
      const filtered = sites.filter(site =>
        site.nom.toLowerCase().includes(rechercheSiteTexte.toLowerCase()) ||
        (site.adresse && site.adresse.toLowerCase)().includes(rechercheSiteTexte.toLowerCase())
      );
      setSitesFiltres(filtered);
    }
  }, [rechercheSiteTexte, sites]);

  // Déconnexion
  const handleLogout = async () => {
    try {
      await FirebaseService.closeCurrentSession();
      await FirebaseService.logout();
      
      showToast('Déconnexion réussie', 'success');
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      showToast('Impossible de se déconnecter', 'error');
    }
  };

  // Rendu des éléments de la liste des véhicules
  const renderVehiculeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleVehiculeSelect(item)}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.immatriculation}</Text>
          <Ionicons name="car" size={20} color="#1a4d94" />
        </View>
        <Text style={styles.itemSubtitle}>{item.modele || 'Modèle non spécifié'}</Text>
        <Text style={styles.itemDetail}>{item.type || 'Type non spécifié'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  // Rendu des éléments de la liste des sites
  const renderSiteItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleSiteSelect(item)}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.nom}</Text>
          <Ionicons name="location" size={20} color="#1a4d94" />
        </View>
        <Text style={styles.itemSubtitle}>{item.adresse || 'Adresse non spécifiée'}</Text>
        <Text style={styles.itemDetail}>{item.ville || 'Ville non spécifiée'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  // Rendu de l'étape actuelle
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'pole':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="business" size={32} color="#1a4d94" />
              <Text style={styles.stepTitle}>Sélection du Pôle</Text>
            </View>
            <Text style={styles.stepDescription}>
              Sélectionnez le pôle pour accéder aux véhicules et sites associés
            </Text>
            
            <View style={styles.pickerContainer}>
              <CustomPicker
                selectedValue={(selectedPole && selectedPole.id) || ''}
                onValueChange={handlePoleSelect}
                items={poles.map(pole => ({
                  label: pole.nom,
                  value: pole.id
                }))}
                placeholder="Sélectionner un pôle"
              />
            </View>
          </View>
        );

      case 'vehicule':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="car" size={32} color="#1a4d94" />
              <Text style={styles.stepTitle}>Sélection du Véhicule</Text>
            </View>
            <Text style={styles.stepDescription}>
              Pôle sélectionné : {(selectedPole && selectedPole.nom)}
            </Text>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setModalVehiculeVisible(true)}
            >
              <Ionicons name="car" size={20} color="white" />
              <Text style={styles.selectButtonText}>
                {selectedVehicule ? selectedVehicule.immatriculation : 'Sélectionner un véhicule'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'check':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#1a4d94" />
              <Text style={styles.stepTitle}>Check Véhicule</Text>
            </View>
            <Text style={styles.stepDescription}>
              Vérifiez l'état du véhicule avant de commencer
            </Text>
            
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleInfoText}>
                <Text style={styles.bold}>Véhicule :</Text> {(selectedVehicule && selectedVehicule.immatriculation)}
              </Text>
              <Text style={styles.vehicleInfoText}>
                <Text style={styles.bold}>Modèle :</Text> {(selectedVehicule && selectedVehicule.modele)}
              </Text>
              <Text style={styles.vehicleInfoText}>
                <Text style={styles.bold}>Pôle :</Text> {(selectedPole && selectedPole.nom)}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={navigateToCheckVehicule}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Commencer le Check</Text>
            </TouchableOpacity>
          </View>
        );

      case 'site':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="location" size={32} color="#1a4d94" />
              <Text style={styles.stepTitle}>Sélection du Site</Text>
            </View>
            <Text style={styles.stepDescription}>
              Choisissez le site de destination
            </Text>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setModalSiteVisible(true)}
            >
              <Ionicons name="location" size={20} color="white" />
              <Text style={styles.selectButtonText}>
                {selectedSite ? selectedSite.nom : 'Sélectionner un site'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'maps':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="map" size={32} color="#1a4d94" />
              <Text style={styles.stepTitle}>Navigation et Roadbook</Text>
            </View>
            <Text style={styles.stepDescription}>
              Accédez à la carte et au roadbook du site
            </Text>
            
            <View style={styles.siteInfo}>
              <Text style={styles.siteInfoText}>
                <Text style={styles.bold}>Site :</Text> {(selectedSite && selectedSite.nom)}
              </Text>
              <Text style={styles.siteInfoText}>
                <Text style={styles.bold}>Adresse :</Text> {(selectedSite && selectedSite.adresse)}
              </Text>
            </View>
            
                         <View style={styles.actionButtons}>
               <TouchableOpacity
                 style={styles.actionButton}
                 onPress={() => {
                   // Navigation vers Google Maps avec itinéraire automatique
                   const address = `${selectedSite.adresse}, ${selectedSite.ville}`;
                   // Utiliser l'API de navigation pour ouvrir directement l'itinéraire
                   const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
                   Linking.openURL(url);
                 }}
               >
                 <Image 
                   source={require('../assets/logo-carte.png')} 
                   style={styles.actionIcon}
                   resizeMode="contain"
                 />
                 <Text style={styles.actionButtonText}>Google Maps</Text>
               </TouchableOpacity>
               
               <TouchableOpacity
                 style={styles.actionButton}
                 onPress={() => {
                   // Navigation vers Waze avec itinéraire automatique
                   const address = `${selectedSite.adresse}, ${selectedSite.ville}`;
                   // Utiliser l'API Waze pour ouvrir directement l'itinéraire
                   const url = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
                   Linking.openURL(url);
                 }}
               >
                 <Image 
                   source={require('../assets/waze1.png')} 
                   style={styles.actionIcon}
                   resizeMode="contain"
                 />
                 <Text style={styles.actionButtonText}>Waze</Text>
               </TouchableOpacity>
             </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a4d94" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPoles}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
             <PersonnelAdminHeader 
         onLogout={handleLogout}
         showBackButton={currentStep !== 'pole'}
         onBack={goBackStep}
       />
      
      <SafeAreaView style={styles.content}>
        {/* Contenu de l'étape actuelle */}
        {renderCurrentStep()}
      </SafeAreaView>

      {/* Modale de sélection des véhicules */}
      <Modal
        visible={modalVehiculeVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVehiculeVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un véhicule</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVehiculeVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un véhicule..."
            value={rechercheVehiculeTexte}
            onChangeText={setRechercheVehiculeTexte}
          />
          
          <FlatList
            data={vehiculesFiltres}
            renderItem={renderVehiculeItem}
            keyExtractor={(item) => item.id}
            style={styles.modalList}
          />
        </SafeAreaView>
      </Modal>

      {/* Modale de sélection des sites */}
      <Modal
        visible={modalSiteVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalSiteVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un site</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalSiteVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un site..."
            value={rechercheSiteTexte}
            onChangeText={setRechercheSiteTexte}
          />
          
          {console.log(`🔍 [Modal Sites] sitesFiltres:`, sitesFiltres)}
          {console.log(`🔍 [Modal Sites] Nombre de sites: ${(sitesFiltres && sitesFiltres.length) || 0}`)}
          
          {sitesFiltres && sitesFiltres.length > 0 ? (
            <FlatList
              data={sitesFiltres}
              renderItem={renderSiteItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                {sitesFiltres === null ? 'Chargement des sites...' : 'Aucun site trouvé'}
              </Text>
              <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10 }}>
                sitesFiltres: {JSON.stringify(sitesFiltres)}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
  },
  backButtonText: {
    marginLeft: 8,
    color: '#1a4d94',
    fontSize: 16,
    fontWeight: '500',
  },
  stepContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a4d94',
    marginLeft: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
  pickerContainer: {
    marginTop: 16,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a4d94',
    padding: 18,
    borderRadius: 12,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    padding: 18,
    borderRadius: 12,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  vehicleInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  vehicleInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  siteInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  siteInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a4d94',
    padding: 15,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    margin: 20,
    fontSize: 16,
  },
  modalList: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1a4d94',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
