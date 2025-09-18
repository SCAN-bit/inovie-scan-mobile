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
import SupabaseService from '../services/supabaseService';
import CustomView from '../components/CustomView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../components/CustomHeader';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

const { width } = Dimensions.get('window');

export default function CheckVehiculeScreen({ navigation, route }) {
  const { sessionData, isFromScanScreen, isFromPersonnelAdmin } = route.params || {};
  const vehicule = (sessionData && sessionData.vehicule) || {};
  const tournee = (sessionData && sessionData.tournee) || {};
  const pole = (sessionData && sessionData.pole) || {};
  const isFinalCheck = (sessionData && sessionData.isFinalCheck) || false; // Nouveau: détecter si c'est un check final
  const isPersonnelAdmin = (sessionData && sessionData.isPersonnelAdmin) || false; // Flag pour le personnel administratif

  // États pour gérer les fonctionnalités de l'écran
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  const [defects, setDefects] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 }); // État pour stocker les dimensions de l'image
  const [managerAlert, setManagerAlert] = useState(false); // Nouvel état pour l'alerte responsable
  const [kilometrage, setKilometrage] = useState(''); // Nouvel état pour le kilométrage

  // Nouveaux états pour le suivi des lavages
  const [washCompleted, setWashCompleted] = useState(false); // État pour la coche de lavage effectué
  const [washTypes, setWashTypes] = useState([]); // Types de lavage sélectionnés (choix multiple)
  
  // État pour les toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    // Auto-hide après 3 secondes
    setTimeout(() => setToast(null), 3000);
  };

  
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
    
    // Convertir les coordonnées vers le format web (400x240)
    const webWidth = 400;
    const webHeight = 240;
    
    // Calculer le ratio de conversion
    const ratioX = webWidth / imageLayout.width;
    const ratioY = webHeight / imageLayout.height;
    
    // Convertir les coordonnées vers le format web
    const webX = Math.round(locationX * ratioX);
    const webY = Math.round(locationY * ratioY);
    
    const newDefect = {
      id: Date.now().toString(),
      x: webX, // Coordonnée convertie vers le format web (400x240)
      y: webY, // Coordonnée convertie vers le format web (400x240)
      imageWidthAtClick: imageLayout.width,
      imageHeightAtClick: imageLayout.height,
      platform: Platform.OS, // Ajouter la plateforme pour le debug
      originalX: locationX, // Coordonnée originale mobile
      originalY: locationY, // Coordonnée originale mobile
    };
    
    // Coordonnées converties pour web
    setDefects([...defects, newDefect]);
  };

  // Supprimer un défaut en touchant la croix
  const removeDefect = (id) => {
    setDefects(defects.filter(defect => defect.id !== id));
  };

  // Fonction pour gérer la sélection multiple des types de lavage
  const toggleWashType = (type) => {
    if (washTypes.includes(type)) {
      setWashTypes(washTypes.filter(t => t !== type));
    } else {
      setWashTypes([...washTypes, type]);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      // Fermer la session actuelle si elle existe
      await FirebaseService.closeCurrentSession();
      
      // Déconnexion Firebase
      await FirebaseService.logout();
      
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
        console.warn('[CheckVehiculeScreen] selasId non trouvé dans AsyncStorage');
      }

      // OPTIMISATION 1: Upload parallèle des photos
      // Upload optimisé des photos
      const startUpload = Date.now();
      
      const uploadedPhotoUrls = [];
      
      if (photos && photos.length > 0) {
        // Upload toutes les photos en parallèle
        const uploadPromises = photos.map(async (localUri, i) => {
          try {
            // Utiliser l'immatriculation du véhicule comme identifiant unique
            const vehiculeImmat = vehicule.immatriculation || vehicule.registrationNumber || 'unknown_vehicule';
            // Upload photo pour véhicule
            const downloadURL = await FirebaseService.uploadImageAsync(localUri, vehiculeImmat);
            return { success: true, url: downloadURL, index: i };
          } catch (uploadError) {
            console.error(`[CheckVehiculeScreen] Erreur upload photo ${i + 1}:`, uploadError);
            return { success: false, error: uploadError, index: i };
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        
        // Traiter les résultats
        const failedUploads = [];
        uploadResults.forEach(result => {
          if (result.success) {
            uploadedPhotoUrls.push(result.url);
          } else {
            failedUploads.push(result.index + 1);
          }
        });

        const uploadTime = Date.now() - startUpload;
        // Upload terminé

        if (failedUploads.length > 0) {
          Alert.alert("Erreur d'upload partielle", 
            `Les images ${failedUploads.join(', ')} n'ont pas pu être sauvegardées.`);
        }
      }
      
      // 2. Créer l'objet de données de vérification avec les URLs des photos
      // console.log('[CheckVehiculeScreen] Données véhicule pour checkData:', {
      //   vehiculeId: vehicule.id,
      //   vehiculeIdType: typeof vehicule.id,
      //   immatriculation: vehicule.immatriculation || vehicule.registrationNumber,
      //   immatriculationType: typeof (vehicule.immatriculation || vehicule.registrationNumber),
      //   vehiculeComplet: vehicule
      // });

      // Créer une date unique pour ce check avec une précision en millisecondes
      const now = new Date();
      const uniqueTimestamp = now.getTime() + Math.random() * 1000; // Ajouter des millisecondes aléatoires
      const uniqueDate = new Date(uniqueTimestamp).toISOString();
      
      const checkData = {
        date: uniqueDate,
        vehiculeId: vehicule.id,
        immatriculation: vehicule.immatriculation || vehicule.registrationNumber,
        selasId: selasId,
        checkType: isFinalCheck ? 'fin_tournee' : 'debut_tournee',
        photos: uploadedPhotoUrls.map((url, index) => ({
          id: `photo_${Date.now()}_${index}`,
          url: url,
          description: `Photo du véhicule ${index + 1}`,
          createdAt: new Date().toISOString()
        })),
        defects: defects,
        notes: notes,
        kilometrage: kilometrage,
        washInfo: {
          washCompleted: washCompleted,
          washTypes: washTypes,
          washNotes: '',
          washMileage: kilometrage
        },
        managerAlertRequested: managerAlert,
        vehicleSchemaName: 'car-diagram.png'
      };

      console.log('[CheckVehiculeScreen] checkData final:', {
        vehiculeId: checkData.vehiculeId,
        immatriculation: checkData.immatriculation,
        photosCount: checkData.photos.length,
        defectsCount: checkData.defects.length,
        notes: checkData.notes,
        selasId: checkData.selasId
      });
      
      // Mettre à jour les données de session avec les infos de vérification
      const updatedSessionData = {
        ...sessionData,
        vehiculeCheck: checkData,
      };
      
      const savedSession = await FirebaseService.saveSessionData(updatedSessionData);

      // 3. Sauvegarder également dans la collection vehicleChecks pour le suivi
      // CORRECTION : Sauvegarder TOUS les checks (même les checks vides)
      // Un check doit être sauvegardé même sans contenu pour le suivi complet
      const hasContent = true; // Toujours sauvegarder dans vehicleChecks
      
      if (hasContent) {
        try {
          console.log('[CheckVehiculeScreen] Données à sauvegarder dans vehicleChecks:');
          console.log('[CheckVehiculeScreen] - vehiculeId:', checkData.vehiculeId);
          console.log('[CheckVehiculeScreen] - immatriculation:', checkData.immatriculation);
          console.log('[CheckVehiculeScreen] - photos count:', checkData.photos.length);
          console.log('[CheckVehiculeScreen] - defects count:', checkData.defects.length);
          console.log('[CheckVehiculeScreen] - notes:', checkData.notes);
          console.log('[CheckVehiculeScreen] - kilometrage:', checkData.kilometrage);
          console.log('[CheckVehiculeScreen] - washCompleted:', checkData.washInfo.washCompleted);
          console.log('[CheckVehiculeScreen] - selasId:', selasId);
          console.log('[CheckVehiculeScreen] - Platform:', Platform.OS);
          
          // Vérification spécifique pour mobile
          if (Platform.OS !== 'web') {
            console.log('[CheckVehiculeScreen] Mode mobile détecté - vérifications supplémentaires');
            
            // Vérifier que vehiculeId n'est pas null/undefined
            if (!checkData.vehiculeId) {
              throw new Error('vehiculeId est null ou undefined sur mobile');
            }
            
            // Vérifier que selasId existe
            if (!selasId) {
              console.warn('⚠️ [CheckVehiculeScreen] selasId manquant sur mobile');
            }
          }
          
          // Récupérer l'utilisateur actuel pour l'uid
          const userData = await FirebaseService.getCurrentUser();
          const currentUid = userData ? userData.uid : null;
          
          const vehicleCheckResult = await FirebaseService.saveVehicleCheck(checkData, currentUid, selasId);
          console.log('✅ [CheckVehiculeScreen] Données sauvegardées dans vehicleChecks:', vehicleCheckResult.id);
          
          // Afficher un toast de succès sur mobile
          if (Platform.OS !== 'web') {
            showToast('Photos sauvegardées avec succès !', 'success');
          }
        } catch (vehicleCheckError) {
          console.error('❌ [CheckVehiculeScreen] Erreur sauvegarde vehicleChecks:', vehicleCheckError);
          console.error('❌ [CheckVehiculeScreen] Détails erreur:', {
            message: vehicleCheckError.message,
            code: vehicleCheckError.code,
            vehiculeId: checkData.vehiculeId,
            immatriculation: checkData.immatriculation,
            platform: Platform.OS,
            stack: vehicleCheckError.stack
          });
          
          // Afficher un toast d'erreur sur mobile
          if (Platform.OS !== 'web') {
            showToast(`Erreur sauvegarde photos: ${vehicleCheckError.message}`, 'error');
          }
          
          // Ne pas bloquer le processus si cette sauvegarde échoue
        }
      } else {
        console.log('ℹ️ [CheckVehiculeScreen] Aucune donnée à sauvegarder dans vehicleChecks (pas de photos, défauts ou notes)');
      }

      // Gérer la navigation selon le type de check
      if (isPersonnelAdmin) {
        // Pour le personnel administratif, retourner à l'écran principal avec le check terminé
        navigation.navigate('PersonnelAdmin', { 
          checkCompleted: true,
          sessionData: updatedSessionData
        });
      } else if (isFinalCheck && isFromScanScreen) {
        // Pour un check final depuis ScanScreen, marquer le retour avec paramètre
        navigation.navigate('Scan', { fromFinalCheck: true });
      } else {
        // Navigation normale vers l'écran de scan
        navigation.navigate('Scan', { sessionId: savedSession.id });
      }

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
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title={isFinalCheck ? "Check Véhicule Final" : "Vérification du véhicule"}
        navigation={navigation}
        showBackButton={true}
        showLogoutButton={true}
        handleLogout={handleLogout}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
        {isFinalCheck && (
          <View style={styles.finalCheckBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#e74c3c" />
            <Text style={styles.finalCheckBannerText}>Check Final de Tournée</Text>
          </View>
        )}
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

      {/* Section Kilométrage */}
      <View style={styles.kilometrageSection}>
        <Text style={styles.sectionTitle}>Kilométrage actuel</Text>
        <Text style={styles.inputLabel}>Saisissez le kilométrage affiché au compteur</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ex: 125000"
          value={kilometrage}
          onChangeText={setKilometrage}
          keyboardType="numeric"
        />
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
                }}
              />
            )}
            
            {/* Afficher les défauts */}
            {defects.map(defect => {
              // Convertir les coordonnées web vers les coordonnées mobiles pour l'affichage
              const webWidth = 400;
              const webHeight = 240;
              const ratioX = imageLayout.width / webWidth;
              const ratioY = imageLayout.height / webHeight;
              
              // Convertir les coordonnées web vers mobile pour l'affichage
              const displayX = defect.x * ratioX;
              const displayY = defect.y * ratioY;
              
              const markStyle = {
                left: Math.max(0, Math.min(displayX - 10, imageLayout.width - 20)), // Limiter dans les bounds
                top: Math.max(0, Math.min(displayY - 10, imageLayout.height - 20)), // Limiter dans les bounds
              };
              
              return (
                <TouchableOpacity
                  key={defect.id}
                  style={[styles.defectMark, markStyle]}
                  onPress={() => removeDefect(defect.id)}
                >
                  <Text style={styles.defectX}>✕</Text>
                </TouchableOpacity>
              );
            })}
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
        
        {/* Case à cocher pour validation du lavage effectué */}
        <TouchableOpacity 
          style={styles.washCheckRow}
          onPress={() => setWashCompleted(!washCompleted)}
        >
          <Ionicons 
            name={washCompleted ? 'checkbox' : 'square-outline'} 
            size={24} 
            color={washCompleted ? '#2ecc71' : '#7f8c8d'} 
          />
          <Text style={styles.washCheckText}>J'ai effectué le lavage du véhicule</Text>
        </TouchableOpacity>

        {/* Sélection multiple des types de lavage */}
        <Text style={styles.inputLabel}>Type de lavage</Text>
        <View style={styles.washTypesContainer}>
          {['Intérieur', 'Extérieur', 'Complet'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.washTypeOption,
                washTypes.includes(type) && styles.washTypeOptionSelected
              ]}
              onPress={() => toggleWashType(type)}
            >
              <Text style={[
                styles.washTypeText,
                washTypes.includes(type) && styles.washTypeTextSelected
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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

    {/* Toast pour les notifications */}
    {toast && (
      <View style={styles.toastContainer}>
        <Text style={[
          styles.toastText,
          toast.type === 'success' && styles.toastSuccess,
          toast.type === 'error' && styles.toastError,
          toast.type === 'warning' && styles.toastWarning
        ]}>
          {toast.message}
        </Text>
      </View>
    )}
    </View>
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
  // Section Kilométrage  
  kilometrageSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 8,
    elevation: 1,
    marginHorizontal: 16,
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
    width: Platform.OS === 'web' ? 400 : width * 0.9, // Taille fixe sur web, responsive sur mobile
    height: Platform.OS === 'web' ? 240 : width * 0.9 * 0.6, // Ratio 5:3 cohérent
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
  washCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  washCheckText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#34495e',
  },
  washTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  washTypeOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  washTypeOptionSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  washTypeText: {
    fontSize: 14,
    color: '#495057',
  },
  washTypeTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
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
  finalCheckBanner: {
    backgroundColor: '#f39c12',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalCheckBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },

  // Styles pour le Toast
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  toastSuccess: {
    backgroundColor: '#2ecc71',
  },
  toastError: {
    backgroundColor: '#e74c3c',
  },
  toastWarning: {
    backgroundColor: '#f39c12',
  },
});