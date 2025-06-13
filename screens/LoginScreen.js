import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomView from '../components/CustomView';
import { Picker } from '@react-native-picker/picker';
import firebaseService from '../services/firebaseService';

// Renommer CustomView en View pour maintenir la compatibilité avec le code existant
const View = CustomView;

// Logo Inovie importé depuis assets
const logoInovie = require('../assets/logo-inovie.png');

export default function LoginScreen({ navigation, route }) { // Added route
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // États pour le sélecteur de SELAS
  const [selasList, setSelasList] = useState([]);
  const [selectedSelasId, setSelectedSelasId] = useState('');
  const [selasLoading, setSelasLoading] = useState(true);
  const [selasError, setSelasError] = useState(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement de l'écran
  useEffect(() => {
    const loadDataAndCheckAuth = async () => {
      const currentJustReset = route.params?.justReset;

      if (currentJustReset) {
        console.log('LoginScreen: justReset param is true. Processing reset flow.');
        // Clear the param immediately so it doesn't affect subsequent interactions
        // if the user stays on the screen and causes re-renders.
        navigation.setParams({ justReset: undefined });

        setInitialChecking(false); // Allow UI to render fully, show SELAS picker etc.
        setSelasLoading(true);
        try {
          const selas = await firebaseService.getAllSelas();
          setSelasList(selas || []);
          setSelasError(null);
          // Do not set selectedSelasId, should be fresh
        } catch (error) {
          console.error('Erreur lors du chargement des SELAS après reset:', error);
          setSelasError('Impossible de charger la liste des SELAS.');
          setSelasList([]);
        } finally {
          setSelasLoading(false);
        }
        return; // IMPORTANT: Skip authentication check for this render cycle
      }

      // Normal flow (not immediately after a reset)
      // This includes initial mount if not a reset, or subsequent renders if user stays on screen.
      // initialChecking is true by default, this effect will set it to false.

      let selasLoadedSuccessfully = false;
      setSelasLoading(true);
      try {
        const selas = await firebaseService.getAllSelas();
        setSelasList(selas || []);
        setSelasError(null);
        selasLoadedSuccessfully = true;
        // Check if a selas_id was previously stored, but don't auto-select, let user confirm or pick
        // const storedSelasId = await AsyncStorage.getItem('user_selas_id');
        // if (storedSelasId && selas.some(s => s.id === storedSelasId)) {
        //   setSelectedSelasId(storedSelasId);
        // }
      } catch (error) {
        console.error('Erreur lors du chargement des SELAS (normal flow):', error);
        setSelasError('Impossible de charger la liste des SELAS.');
        setSelasList([]);
      } finally {
        setSelasLoading(false);
      }

      // Proceed with authentication check if SELAS loading was attempted (even if failed, auth state is independent)
      // The initialChecking state handles the global loading spinner.
      try {
        const isAuthenticated = await apiService.isAuthenticated();
        if (isAuthenticated) {
          const storedSelasId = await AsyncStorage.getItem('user_selas_id');
          if (storedSelasId) {
            console.log('LoginScreen: User authenticated and selasId found, should stay on Login or ask confirmation.');
            // navigation.replace('Tournee'); // Ligne commentée pour empêcher la redirection automatique
          } else {
            console.warn("LoginScreen: User authenticated but no selasId stored. User should select SELAS on login screen.");
            // Stay on LoginScreen, user needs to pick SELAS from the picker.
            // Or, if there's a dedicated PoleSelection screen for after login without SELAS:
            // navigation.replace('PoleSelection'); 
          }
        } else {
          console.log('LoginScreen: User not authenticated according to apiService.isAuthenticated.');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      } finally {
        setInitialChecking(false); // Done with all initial loading/checking for this effect run
      }
    };

    loadDataAndCheckAuth();
  }, [navigation, route.params?.justReset]); // Dependencies

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez entrer un email et un mot de passe.');
      return;
    }

    if (selasList.length > 0 && !selectedSelasId) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner votre SELAS.');
      return;
    }
    
    if (selasList.length === 0 && !selasLoading && !selasError) {
        Alert.alert('Aucune SELAS', 'Aucune SELAS n\'est configurée. Veuillez contacter l\'administrateur.');
        return;
    }

    setLoading(true);

    try {
      const result = await apiService.login(email, password);

      if (result.success) {
        if (selectedSelasId) {
          await AsyncStorage.setItem('user_selas_id', selectedSelasId);
          console.log(`Selas ID ${selectedSelasId} sauvegardé dans AsyncStorage.`);
        } else if (selasList.length > 0) {
          Alert.alert('Erreur interne', 'Aucune SELAS sélectionnée malgré une liste disponible.');
          setLoading(false);
          return;
        }
        
        navigation.replace('Tournee');
      } else {
        Alert.alert('Erreur de connexion', result.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const resetLocalStorage = async () => {
    try {
      setResetLoading(true);
      const keysToRemove = [
        'auth_token',
        'user_data',
        'current_session_id',
        'current_session_data',
        'user_selas_id',
        'userToken', // Ensure this is the correct key used by firebaseService.isAuthenticated
        'logout_in_progress' // Also remove the old flag if it's still there
      ];
      
      console.log('Réinitialisation du stockage local et déconnexion Firebase...');
      await AsyncStorage.multiRemove(keysToRemove);
      const tokenAfterMultiRemove = await AsyncStorage.getItem('userToken');
      console.log('LoginScreen resetLocalStorage: userToken in AsyncStorage after multiRemove:', tokenAfterMultiRemove);

      try {
        await firebaseService.logout(); // This also attempts to remove 'userToken'
        const tokenAfterFirebaseLogout = await AsyncStorage.getItem('userToken');
        console.log('LoginScreen resetLocalStorage: userToken in AsyncStorage after firebaseService.logout():', tokenAfterFirebaseLogout);
        console.log('Utilisateur déconnecté de Firebase avec succès.');
      } catch (logoutError) {
        console.error('Erreur lors de la déconnexion Firebase pendant la réinitialisation:', logoutError);
        Alert.alert('Avertissement', 'La déconnexion de Firebase a échoué, mais les données locales ont été effacées.');
      }

      console.log('Stockage local réinitialisé avec succès');
      
      setSelectedSelasId('');
      setEmail('');
      setPassword('');

      // No longer using 'logout_in_progress' flag in AsyncStorage for this flow.
      // The navigation param 'justReset' will handle it.

      // Reload SELAS list for the now-cleared Login screen
      try {
        setSelasLoading(true); // Show loading for SELAS
        const selas = await firebaseService.getAllSelas();
        setSelasList(selas || []);
        setSelasError(null);
      } catch (error) {
        console.error('Erreur lors du rechargement des SELAS après reset:', error);
        setSelasError('Impossible de recharger la liste des SELAS.');
        setSelasList([]);
      } finally {
        setSelasLoading(false);
      }

      Alert.alert(
        'Stockage réinitialisé',
        'Les données d\'authentification et de SELAS ont été effacées. Vous pouvez maintenant vous reconnecter.',
        [{ text: 'OK', onPress: () => {
          if (navigation) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login', params: { justReset: true } }], // Pass justReset param
            });
          }
        }}]
      );
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du stockage:', error);
      Alert.alert('Erreur', 'Impossible de réinitialiser le stockage');
    } finally {
      setResetLoading(false);
    }
  };

  // Afficher un indicateur de chargement pendant la vérification initiale
  if (initialChecking || selasLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#263471" />
        <Text style={styles.loadingText}>{initialChecking ? 'Vérification de la session...' : 'Chargement des SELAS...'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f3f4f6" barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={logoInovie} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.titleContainer}> 
              <Text style={styles.appName}>TraceLink</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BÊTA</Text>
              </View>
            </View>
          </View>

          <View style={styles.formContainer}>
            {/* Sélecteur de SELAS - DÉPLACÉ ICI (AVANT EMAIL) */}
            {selasError && (
              <Text style={styles.errorText}>{selasError}</Text>
            )}
            {!selasLoading && !selasError && selasList.length === 0 && (
              <Text style={styles.infoText}>Aucune SELAS n'est actuellement configurée.</Text>
            )}
            {/* Toujours afficher le conteneur du Picker même pendant le chargement pour éviter les sauts d'interface, mais le Picker sera désactivé ou vide */}
            <View style={[styles.inputContainer, styles.pickerOuterContainer]}> 
              <Ionicons name="business-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
              <Picker
                selectedValue={selectedSelasId}
                style={styles.picker} // Le style du Picker lui-même
                onValueChange={(itemValue, itemIndex) => setSelectedSelasId(itemValue)}
                prompt="Sélectionnez votre SELAS"
                enabled={!selasLoading && selasList.length > 0} // Désactiver si chargement ou vide
              >
                <Picker.Item label={selasLoading ? "Chargement des SELAS..." : "-- Sélectionnez votre SELAS --"} value={''} style={styles.pickerItemPlaceholder} />
                {selasList.map((selas) => (
                  <Picker.Item key={selas.id} label={selas.nom} value={selas.id} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>

            {/* Champ Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#a0aec0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Champ Mot de passe */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#a0aec0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#7f8c8d" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>SE CONNECTER</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Utilisez votre email et mot de passe
              </Text>
            </View>

            {/* Bouton de réinitialisation du stockage */}
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetLocalStorage}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color="#e74c3c" />
              ) : (
                <Text style={styles.resetButtonText}>
                  Réinitialiser les données de connexion
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 60,
    width: '100%',
  },
  logoImage: {
    width: 350,
    height: 200,
    marginBottom: 50,
    alignSelf: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#263471',
    letterSpacing: 1.5,
    textShadow: '0px 1px 1px rgba(0, 0, 0, 0.1)', // Correction pour le web
  },
  betaBadge: {
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  betaBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: { // Style de base pour les champs de saisie et le picker
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16, // Espacement uniforme
    paddingHorizontal: 12, // Padding interne horizontal
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.2)', // Correction pour le web
    width: '90%', // Largeur standard
    height: 50, // Hauteur standard
  },
  pickerOuterContainer: { // Style spécifique si le conteneur externe du Picker a besoin de plus d'ajustements
    // Peut hériter de inputContainer et ajouter/modifier des propriétés si nécessaire
    // Par exemple, si le Picker a besoin d'un padding vertical différent ou pas de hauteur fixe.
    // Pour l'instant, on utilise inputContainer directement.
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: '100%', // Prend toute la hauteur du inputContainer
    paddingHorizontal: 5,
    color: '#1f2937',
    fontSize: 16, // Taille de police cohérente
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    width: '90%',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.1)', // Correction pour le web
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  helpContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  helpText: {
    color: '#7f8c8d',
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 24,
    padding: 10,
  },
  resetButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  version: {
    color: '#9ca3af',
    fontSize: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#2c3e50',
    fontSize: 16,
  },
  picker: { // Style pour le composant Picker lui-même
    flex: 1, // Pour qu'il prenne l'espace disponible dans son conteneur
    height: '100%', // S'assurer qu'il utilise la hauteur définie par inputContainer
    color: '#2c3e50', 
    backgroundColor: 'transparent', // Important pour que le fond du inputContainer soit visible
  },
  pickerItem: {
    fontSize: 16,
    color: '#2c3e50',
  },
  pickerItemPlaceholder: {
    fontSize: 16,
    color: '#a0aec0',
  },
  errorText: {
    color: '#e53e3e',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    width: '90%', // Pour s'aligner avec les autres champs
  },
  infoText: {
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 10, // Cohérence avec errorText
    fontSize: 14,
    width: '90%', // Pour s'aligner
  },
});