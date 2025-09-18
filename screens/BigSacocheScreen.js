import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from '../services/firebaseService';
import CustomView from '../components/CustomView';
import CustomHeader from '../components/CustomHeader';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

export default function BigSacocheScreen({ navigation, route }) {
  const sessionData = route.(params && params.sessionData) || {}; // ✅ Sécurise `sessionData`

  // ✅ Vérifie si `sessionData.tournee` et `sessionData.vehicule` existent
  const tournee = sessionData.tournee ? sessionData.tournee.nom || "Tournée inconnue" : "Tournée inconnue";
  const vehicule = sessionData.vehicule ? sessionData.vehicule.immatriculation || "Véhicule inconnu" : "Véhicule inconnu";

  const [scanning, setScanning] = useState(false);
  const [sacocheCode, setSacocheCode] = useState('');
  const [sacocheCreated, setSacocheCreated] = useState(false);
  const [scannedContenants, setScannedContenants] = useState([]);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [historicalScans, setHistoricalScans] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Chargement des scans historiques au démarrage
  useEffect(() => {
    loadHistoricalScans();
  }, []);

  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      // Fermer la session actuelle si elle existe
      await firebaseService.closeCurrentSession();
      
      // Déconnexion Firebase
      await firebaseService.logout();
      
      // Rediriger vers l'écran de connexion
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
    }
  };

  const loadHistoricalScans = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('scanHistory');
      if (jsonValue !== null) {
        const history = JSON.parse(jsonValue);
        setHistoricalScans(history);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  // 🔹 Simulation d'un scan
  const simulateScan = () => {
    if (!sacocheCreated) {
      // Simuler un scan de big-sacoche
      return `SACOCHE_${Math.floor(Math.random() * 100000)}`;
    } else {
      // Simuler un scan de contenant
      return `CONTENANT_${Math.floor(Math.random() * 100000)}`;
    }
  };

  const handleScan = (data) => {
    setScanning(false);
    setManualCodeInput('');
    
    if (!sacocheCreated) {
      // On crée une nouvelle big-sacoche
      handleSacocheCreation(data);
    } else {
      // On a déjà créé la big-sacoche, on peut scanner des contenants
      handleContenantScan(data);
      // Continuer à scanner automatiquement
      setTimeout(() => {
        setScanning(true);
      }, 500);
    }
  };

  const handleSimulatedScan = () => {
    const fakeData = simulateScan();
    handleScan(fakeData);
  };

  const handleManualScan = () => {
    if (manualCodeInput.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer un code valide');
      return;
    }
    
    handleScan(manualCodeInput.trim());
  };

  const activateScanner = () => {
    setScanning(true);
    setErrorMessage('');
  };

  const handleSacocheCreation = (data) => {
    if (data.startsWith('SACOCHE_') || data.startsWith('BS_')) {
      // Format valide pour une big-sacoche
      setSacocheCode(data);
      setSacocheCreated(true);
      
      Alert.alert('Big-Sacoche créée', `Identifiant: ${data}`, [{ text: 'OK' }]);
    } else {
      // Si le format n'est pas reconnu, on propose de préfixer automatiquement
      Alert.alert(
        'Format non reconnu',
        'Le code ne commence pas par "SACOCHE_" ou "BS_". Voulez-vous le préfixer automatiquement?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Préfixer avec BS_', 
            onPress: () => {
              const prefixedCode = `BS_${data}`;
              setSacocheCode(prefixedCode);
              setSacocheCreated(true);
              Alert.alert('Big-Sacoche créée', `Identifiant: ${prefixedCode}`);
            }
          }
        ]
      );
    }
  };

  const handleContenantScan = (data) => {
    // Vérifier si le contenant a déjà été scanné
    if (scannedContenants.some(contenant => contenant.code === data)) {
      Alert.alert('Attention', `Le contenant ${data} a déjà été scanné.`);
    } else {
      // Ajouter le contenant à la liste
      const newContenant = {
        id: Date.now().toString(),
        code: data,
        timeStamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        bigSacoche: sacocheCode, // Lien vers la big-sacoche
      };
      
      setScannedContenants([newContenant, ...scannedContenants]);
    }
  };

  const renderScannedItem = ({ item }) => (
    <View style={styles.contenantItem}>
      <View style={styles.contenantInfo}>
        <Text style={styles.contenantCode}>{item.code}</Text>
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

  const handleValidateSacoche = async () => {
    if (scannedContenants.length === 0) {
      Alert.alert('Attention', 'Aucun contenant scanné dans cette big-sacoche.');
      return;
    }

    try {
      // Préparation des données de la Big-Sacoche
      const bigSacocheData = {
        code: sacocheCode,
        tournee: sessionData.(tournee && tournee.id) || '',
        tourneeId: sessionData.(tournee && tournee.id) || '',
        vehicule: sessionData.(vehicule && vehicule.immatriculation) || '',
        vehiculeId: sessionData.(vehicule && vehicule.id) || '',
        site: sessionData.(tournee && tournee.siteDepart) || 'Non spécifié',
        siteDepart: sessionData.(tournee && tournee.siteDepart) || 'Non spécifié',
        location: sessionData.location || null
      };

      // Préparation des contenants
      const formattedContenants = scannedContenants.map(contenant => ({
        code: contenant.code,
        scanDate: new Date().toISOString(),
        tournee: sessionData.(tournee && tournee.id) || '',
        tourneeId: sessionData.(tournee && tournee.id) || '',
        vehicule: sessionData.(vehicule && vehicule.immatriculation) || '',
        vehiculeId: sessionData.(vehicule && vehicule.id) || '',
        site: sessionData.(tournee && tournee.siteDepart) || 'Non spécifié',
        siteDepart: sessionData.(tournee && tournee.siteDepart) || 'Non spécifié',
        siteDépart: sessionData.(tournee && tournee.siteDepart) || 'Non spécifié',
        siteFin: 'Laboratoire Central',
        location: sessionData.location || null
      }));

      // Envoi des données à Firebase
      console.log('Envoi de la Big-Sacoche:', JSON.stringify(bigSacocheData, null, 2));
      const result = await firebaseService.saveBigSacoche(bigSacocheData, formattedContenants);
      
      if (result.success) {
        // Création d'un objet Big-Sacoche pour l'historique local
        const localBigSacoche = {
          id: result.bigSacocheId || Date.now().toString(),
          code: sacocheCode,
          timeStamp: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
          type: 'big-sacoche',
          contenants: scannedContenants,
          count: scannedContenants.length
        };
        
        // Ajout de la big-sacoche à l'historique local
        const newHistory = [...historicalScans, localBigSacoche];
        await AsyncStorage.setItem('scanHistory', JSON.stringify(newHistory));
        
        Alert.alert(
          'Big-Sacoche validée', 
          `Big-Sacoche ${sacocheCode} avec ${scannedContenants.length} contenants transmise avec succès.`,
          [
            { 
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Erreur lors de l\'envoi à Firebase');
      }
    } catch (error) {
      console.error('Erreur lors de la validation de la big-sacoche:', error);
      Alert.alert('Erreur', `Impossible de valider la big-sacoche: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title="Créer une Big-Sacoche"
        navigation={navigation}
        showBackButton={true}
        showLogoutButton={true}
        handleLogout={handleLogout}
      />
      
    <SafeAreaView style={styles.container}>
      <View style={styles.infoHeader}>
        <Text style={styles.headerSubtitle}>Tournée: {tournee}</Text>
        <Text style={styles.headerSubtitle}>Véhicule: {vehicule}</Text>
      </View>

      <View style={styles.sacocheSection}>
        {!sacocheCreated ? (
          <>
            <View style={styles.titleContainer}>
              <Ionicons name="briefcase-outline" size={24} color="#9b59b6" />
              <Text style={styles.sectionTitle}>Création d'une Big-Sacoche</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanSacocheButton}
              onPress={() => activateScanner()}
            >
              <Ionicons name="barcode-outline" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>Scanner code Big-Sacoche</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.sacocheInfo}>
              <Ionicons name="briefcase" size={20} color="#9b59b6" style={styles.sacocheIcon} />
              <Text style={styles.sacocheCode}>{sacocheCode}</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanContenantButton}
              onPress={() => activateScanner()}
            >
              <Ionicons name="barcode-outline" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>Scanner contenant à ajouter</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {sacocheCreated && (
        <View style={styles.contenantListContainer}>
          <Text style={styles.listTitle}>
            Contenants dans la Big-Sacoche ({scannedContenants.length})
          </Text>
          
          {scannedContenants.length > 0 ? (
            <>
              <FlatList
                data={scannedContenants}
                renderItem={renderScannedItem}
                keyExtractor={item => item.id}
                style={styles.contenantsList}
              />
              <TouchableOpacity 
                style={styles.validateButton}
                onPress={handleValidateSacoche}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.validateButtonText}>Valider la Big-Sacoche</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyList}>
              <Ionicons name="cart-outline" size={50} color="#bdc3c7" />
              <Text style={styles.emptyListText}>
                Scannez des contenants pour les ajouter à la Big-Sacoche
              </Text>
            </View>
          )}
        </View>
      )}

      {scanning && (
        <Modal visible={scanning} transparent={true} animationType="fade">
          <View style={styles.scannerModal}>
            <View style={styles.scannerContent}>
              <Text style={styles.scannerTitle}>
                {!sacocheCreated ? "Scanner une Big-Sacoche" : "Scanner un contenant"}
              </Text>
              
              <View style={styles.manualInputContainer}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Entrez le code manuellement"
                  value={manualCodeInput}
                  onChangeText={setManualCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.manualScanButton}
                  onPress={handleManualScan}
                >
                  <Text style={styles.manualScanButtonText}>Valider</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.orText}>- OU -</Text>
              
              <TouchableOpacity
                style={styles.simulateScanButton}
                onPress={handleSimulatedScan}
              >
                <Ionicons name="scan-outline" size={30} color="#fff" />
                <Text style={styles.simulateScanButtonText}>Simuler un scan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelScanButton}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.cancelScanButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  infoHeader: {
    marginTop: 5,
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  sacocheSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  scanSacocheButton: {
    backgroundColor: '#9b59b6',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sacocheInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0e6f6',
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  sacocheIcon: {
    marginRight: 10,
  },
  sacocheCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  scanContenantButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
  },
  errorContainer: {
    backgroundColor: '#ffcccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  contenantListContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#34495e',
  },
  contenantsList: {
    flex: 1,
  },
  contenantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  contenantInfo: {
    flex: 1,
  },
  contenantCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contenantTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  deleteContenantButton: {
    padding: 8,
  },
  validateButton: {
    backgroundColor: '#9b59b6',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyListText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  scannerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  manualInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  manualScanButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  manualScanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 16,
    marginVertical: 10,
    color: '#7f8c8d',
  },
  simulateScanButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  simulateScanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cancelScanButton: {
    backgroundColor: '#ecf0f1',
    padding: 10,
    borderRadius: 8,
  },
  cancelScanButtonText: {
    fontWeight: 'bold',
  },
});