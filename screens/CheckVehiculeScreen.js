import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService from '../services/firebaseService';
import CustomView from '../components/CustomView';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

const { width } = Dimensions.get('window');

export default function CheckVehiculeScreen({ navigation, route }) {
  const { sessionData } = route.params || {};
  const vehicule = sessionData?.vehicule || {};
  const tournee = sessionData?.tournee || {};
  const pole = sessionData?.pole || {};
  
  // États pour gérer les fonctionnalités de l'écran
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  const [defects, setDefects] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 }); // État pour stocker les dimensions de l'image
  const [managerAlert, setManagerAlert] = useState(false); // Nouvel état pour l'alerte responsable

  // Nouveaux états pour le suivi des lavages
  const [lastWashDate, setLastWashDate] = useState(''); // Format YYYY-MM-DD
  const [washMileage, setWashMileage] = useState('');
  const [washType, setWashType] = useState(''); // ex: 'Interieur', 'Exterieur', 'Complet'
  const [washNotes, setWashNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false); // Nouvel état pour le date picker
  
  // Vérifier l'authentification au chargement de l'écran
  useEffect(() => {
    const checkAuth = async () => {
      await FirebaseService.checkAuthAndRedirect(navigation);
    };
    
    checkAuth();
  }, [navigation]);

  // Prendre une photo avec ImagePicker
  const takePicture = async () => {
    try {
      // Demander la permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la caméra.');
        return;
      }
      
      // Lancer la caméra
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Ajouter la nouvelle photo à la liste des photos
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo. Veuillez réessayer.');
    }
  };

  // Supprimer une photo
  const deletePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Ajouter un défaut en touchant l'image du véhicule
  const addDefect = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    // S'assurer que les dimensions de l'image ont été chargées
    if (imageLayout.width === 0 || imageLayout.height === 0) {
      Alert.alert("Attention", "Les dimensions de l'image ne sont pas encore chargées. Veuillez réessayer de marquer le défaut.");
      return;
    }
    const newDefect = {
      id: Date.now().toString(),
      x: locationX,
      y: locationY,
      imageWidthAtClick: imageLayout.width, // Sauvegarder la largeur de l'image au moment du clic
      imageHeightAtClick: imageLayout.height, // Sauvegarder la hauteur de l'image au moment du clic
    };
    setDefects([...defects, newDefect]);
  };

  // Supprimer un défaut en touchant la croix
  const removeDefect = (id) => {
    setDefects(defects.filter(defect => defect.id !== id));
  };

  // Fonctions pour le DatePicker
  const showDatepicker = () => {
    // Si aucune date n'est définie, la définir à la date du jour
    if (!lastWashDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      setLastWashDate(`${year}-${month}-${day}`);
    }
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // Sur iOS, garder visible pour permettre de "confirmer" ou "annuler"
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      setLastWashDate(`${year}-${month}-${day}`);
      if (Platform.OS !== 'ios') { // Sur Android, le picker se ferme après sélection
        setShowDatePicker(false);
      }
    } else {
      // Si l'utilisateur annule (surtout sur iOS où le picker reste visible)
       if (Platform.OS !== 'ios') {
          setShowDatePicker(false);
       }
    }
  };

  // Pour le TextInput sur le web, remplir la date du jour au focus si vide
  const handleWebDateFocus = () => {
    if (!lastWashDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      setLastWashDate(`${year}-${month}-${day}`);
    }
  };

  // Valider et passer à l'écran suivant
  const handleValidate = async () => {
    // Activer l'indicateur de chargement
    setIsLoading(true);
    
    try {
      // Vérifier l'authentification avant de continuer
      const isAuthenticated = await FirebaseService.checkAuthAndRedirect(navigation);
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      // Récupérer le selasId depuis AsyncStorage
      const selasId = await AsyncStorage.getItem('user_selas_id');
      if (!selasId) {
        console.warn('[CheckVehiculeScreen] selasId non trouvé dans AsyncStorage. Le check sera sauvegardé sans.');
        // Alert.alert('Erreur critique', 'Impossible de récupérer l\\'identifiant SELAS. Veuillez vous reconnecter.');
        // setIsLoading(false);
        // return; 
        // Décider si c'est bloquant ou non. Pour l'instant, on logue un avertissement et on continue.
      } else {
        console.log('[CheckVehiculeScreen] selasId récupéré:', selasId);
      }

      // 1. Uploader les photos vers Firebase Storage et récupérer les URLs
      const uploadedPhotoUrls = [];
      if (photos && photos.length > 0) {
        console.log('Début de l\'upload des photos...');
        for (let i = 0; i < photos.length; i++) {
          const localUri = photos[i];
          try {
            const fileName = `${Date.now()}_${i}.jpg`; // Nom de fichier unique
            const pathSuffix = `vehiculeChecks/${vehicule.id || 'unknown_vehicule'}/${fileName}`;
            const downloadURL = await FirebaseService.uploadImageAsync(localUri, pathSuffix);
            uploadedPhotoUrls.push(downloadURL);
            console.log(`Photo ${i + 1} uploadée: ${downloadURL}`);
          } catch (uploadError) {
            console.error(`Erreur lors de l'upload de la photo ${i + 1}:`, uploadError);
            Alert.alert("Erreur d'upload", `L'image ${i + 1} n'a pas pu être sauvegardée. Veuillez réessayer.`);
            // Optionnel: décider si on continue sans cette photo ou si on arrête tout
            // Pour l'instant, on continue, mais l'URL ne sera pas ajoutée.
          }
        }
        console.log('Toutes les photos ont été traitées.');
      }
      
      // 2. Créer l'objet de données de vérification avec les URLs des photos
      const checkData = {
        date: new Date().toISOString(),
        vehiculeId: vehicule.id,
        immatriculation: vehicule.immatriculation,
        selasId: selasId,
        vehicleSchemaName: 'car-diagram.png',
        defects: defects,
        photos: uploadedPhotoUrls, // Utiliser les URLs uploadées ici
        notes: notes,
        // Ajout des données de lavage
        washInfo: {
          lastWashDate: lastWashDate,
          washMileage: washMileage,
          washType: washType,
          washNotes: washNotes,
        },
        managerAlertRequested: managerAlert, // Sauvegarder l'état de l'alerte
      };
      
      console.log('Données de vérification:', checkData);
      
      // Mettre à jour les données de session avec les infos de vérification
      const updatedSessionData = {
        ...sessionData,
        vehiculeCheck: checkData,
      };
      
      // Log avant l'appel
      console.log(`[CheckVehiculeScreen] Appel de FirebaseService.saveSessionData avec:`, JSON.stringify(updatedSessionData, null, 2));
      
      const savedSession = await FirebaseService.saveSessionData(updatedSessionData);
      
      // Log après l'appel (si succès)
      console.log(`[CheckVehiculeScreen] FirebaseService.saveSessionData terminé avec succès. Session ID: ${savedSession.id}`);

      // Naviguer vers l'écran de scan avec SEULEMENT l'ID de la session.
      // ScanScreen se chargera de récupérer les données lui-même.
      navigation.navigate('Scan', { sessionId: savedSession.id });

    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder les données. Veuillez réessayer.'
      );
    } finally {
      // Désactiver l'indicateur de chargement
      setIsLoading(false);
    }
  };

  // Gérer les erreurs de chargement d'image
  const handleImageError = () => {
    console.warn("Erreur de chargement de l'image");
    setImageError(true);
  };

  // Rendu d'une photo dans la liste
  const renderPhotoItem = ({ item, index }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.deletePhotoButton}
        onPress={() => deletePhoto(index)}
      >
        <Ionicons name="close-circle" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  // Afficher le chargement pendant la sauvegarde
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Sauvegarde en cours...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vérification du véhicule</Text>
        {pole && pole.nom && (
          <Text style={styles.headerPole}>Pôle: {pole.nom}</Text>
        )}
        <Text style={styles.headerTournee}>
          Tournée: {tournee.nom || 'Non spécifiée'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Immatriculation: {vehicule.immatriculation || 'Non spécifiée'}
        </Text>
        <Text style={styles.headerDetail}>
          {vehicule.modele || 'Véhicule'} • {vehicule.type || 'Type non spécifié'}
        </Text>
      </View>

      {/* Photos du véhicule */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>Photos du véhicule (optionnel)</Text>
        
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            renderItem={renderPhotoItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            style={styles.photoList}
            contentContainerStyle={styles.photoListContent}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={50} color="#bdc3c7" />
            <Text style={styles.photoPlaceholderText}>Aucune photo</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={takePicture}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.cameraButtonText}>
            Prendre une photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image interactive du véhicule pour marquer les défauts */}
      <View style={styles.defectsSection}>
        <Text style={styles.sectionTitle}>Marquer les défauts</Text>
        <Text style={styles.instructions}>
          Touchez l'image pour ajouter une marque là où il y a un défaut
        </Text>
        
        <View style={styles.carDiagramContainer}>
          <TouchableOpacity activeOpacity={1} onPress={addDefect}>
            {imageError ? (
              // Afficher un placeholder si l'image ne se charge pas
              <View style={styles.carDiagram}>
                <Text style={styles.placeholderText}>Schéma du véhicule</Text>
                <Ionicons name="car" size={50} color="#bdc3c7" />
              </View>
            ) : (
              // Essayer de charger l'image
              <Image 
                source={require('../assets/car-diagram.png')} 
                style={styles.carDiagram}
                onError={handleImageError}
                resizeMode="contain"
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setImageLayout({ width, height });
                  console.log('Image layout:', { width, height });
                }}
              />
            )}
            
            {/* Afficher les défauts */}
            {defects.map(defect => (
              <TouchableOpacity
                key={defect.id}
                style={[styles.defectMark, { left: defect.x - 10, top: defect.y - 10 }]}
                onPress={() => removeDefect(defect.id)}
              >
                <Text style={styles.defectX}>✕</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.defectCount}>
          {defects.length} {defects.length <= 1 ? 'défaut marqué' : 'défauts marqués'}
        </Text>
        
        {defects.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setDefects([])}
          >
            <Text style={styles.clearButtonText}>Effacer tous les défauts</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Suivi des Lavages */}
      <View style={styles.washSection}>
        <Text style={styles.sectionTitle}>Suivi des Lavages</Text>
        
        <Text style={styles.inputLabel}>Date du dernier lavage</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.inputField} 
            placeholder="YYYY-MM-DD"
            value={lastWashDate}
            onChangeText={setLastWashDate}
            maxLength={10} 
            onFocus={handleWebDateFocus} // Ajout du onFocus
          />
        ) : (
          <TouchableOpacity onPress={showDatepicker} style={styles.datePickerButton}>
            <Text style={styles.datePickerText}>
              {lastWashDate || "Sélectionner une date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
          </TouchableOpacity>
        )}

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            testID="dateTimePicker"
            value={lastWashDate ? new Date(lastWashDate.replace(/-/g, '/')) : new Date()} 
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()} 
          />
        )}

        <Text style={styles.inputLabel}>Kilométrage au dernier lavage</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ex: 150000"
          value={washMileage}
          onChangeText={setWashMileage}
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Type de lavage</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ex: Intérieur, Extérieur, Complet"
          value={washType}
          onChangeText={setWashType}
        />

        <Text style={styles.inputLabel}>Notes sur le lavage</Text>
        <TextInput
          style={styles.notesInput} // Réutiliser le style des notes générales ou créer un spécifique
          multiline
          numberOfLines={3}
          placeholder="Saisissez des notes spécifiques au lavage..."
          value={washNotes}
          onChangeText={setWashNotes}
        />
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Notes additionnelles</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={4}
          placeholder="Saisissez vos observations..."
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Case à cocher pour alerter le responsable */}
      <TouchableOpacity 
        style={styles.alertManagerRow}
        onPress={() => setManagerAlert(!managerAlert)}
      >
        <Ionicons 
          name={managerAlert ? 'checkbox' : 'square-outline'} 
          size={24} 
          color={managerAlert ? '#2ecc71' : '#7f8c8d'} 
        />
        <Text style={styles.alertManagerText}>Signaler un problème majeur au responsable</Text>
      </TouchableOpacity>

      {/* Bouton de validation */}
      <TouchableOpacity 
        style={styles.validateButton}
        onPress={handleValidate}
        disabled={isLoading}
      >
        <Text style={styles.validateButtonText}>Valider et continuer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  headerPole: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 4,
  },
  headerTournee: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 4,
  },
  headerDetail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  // Section Photos
  photoSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  photoList: {
    marginBottom: 10,
  },
  photoListContent: {
    paddingRight: 16,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  photoPlaceholder: {
    height: 120,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoPlaceholderText: {
    marginTop: 10,
    color: '#7f8c8d',
  },
  cameraButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Section Défauts
  defectsSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  instructions: {
    marginBottom: 10,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  carDiagramContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 10,
  },
  carDiagram: {
    width: width * 0.8,
    height: width * 0.8 * 0.5, // Ratio aspect approx.
    backgroundColor: '#f0f0f0', // Fond si l'image ne charge pas
    borderRadius: 8,
    justifyContent: 'center', // Pour le placeholder
    alignItems: 'center',     // Pour le placeholder
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  defectMark: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defectX: {
    color: 'white',
    fontWeight: 'bold',
  },
  defectCount: {
    textAlign: 'center',
    marginTop: 5,
    color: '#7f8c8d',
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: 5,
    padding: 8,
  },
  clearButtonText: {
    color: '#e74c3c',
  },
  
  // Section Notes
  notesSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Styles pour la section Lavage
  washSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff', // Ajout d'un fond pour distinguer la section
    paddingVertical: 15,
    borderRadius: 8,
    elevation: 1, // Ombre légère
    marginHorizontal: 16, // Aligner avec les autres sections si elles ont des marges
  },
  inputLabel: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 5,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#f8f9fa', // Couleur de fond légèrement différente pour les champs
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 10,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 12, // Ajusté pour une meilleure apparence
    marginBottom: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: '#495057', // Couleur de texte standard pour les champs
  },
  // Ajustement pour les notes de lavage si nécessaire, sinon notesInput est utilisé
  // washNotesInput: {
  //   backgroundColor: '#fff',
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   borderRadius: 8,
  //   padding: 10,
  //   minHeight: 80, // Hauteur potentiellement différente pour les notes de lavage
  //   textAlignVertical: 'top',
  // },

  // Bouton Validation
  validateButton: {
    backgroundColor: '#2ecc71',
    margin: 16,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  validateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertManagerRow: { // Styles pour la ligne de la checkbox
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  alertManagerText: { // Style pour le texte à côté de la checkbox
    marginLeft: 10,
    fontSize: 16,
    color: '#34495e',
  },
});