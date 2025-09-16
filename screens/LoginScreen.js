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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomView from '../components/CustomView';
import VersionDisplay from '../components/VersionDisplay';
import CustomPicker from '../components/CustomPicker';
import Toast from '../components/Toast';
import firebaseService from '../services/firebaseService';
import AppUpdateService from '../services/AppUpdateService';
import { wp, hp, fp, sp, getResponsiveContainerStyles, getResponsiveButtonStyles, getResponsiveInputStyles, isSmallScreen } from '../utils/responsiveUtils';

// CustomView importé mais nous utilisons View de React Native pour la responsivité

// Logo SCAN importé depuis assets
const logoSCAN = require('../assets/logo-SCAN.png');

export default function LoginScreen({ navigation, route }) { // Added route
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  
  // État pour les toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Fonction pour vérifier les mises à jour
  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const updateInfo = await AppUpdateService.checkForUpdates(true);
      if (updateInfo.available) {
        showToast('Mise à jour disponible !', 'success');
        // Proposer le téléchargement
        await AppUpdateService.downloadAndInstallUpdate(updateInfo);
      }
    } catch (error) {
      showToast('Erreur lors de la vérification des mises à jour', 'error');
    } finally {
      setCheckingUpdates(false);
    }
  };
  
  // États pour le sélecteur de SELAS
  const [selasList, setSelasList] = useState([]);
  const [selectedSelasId, setSelectedSelasId] = useState('');
  const [selasLoading, setSelasLoading] = useState(true);
  const [selasError, setSelasError] = useState(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement de l'écran
    useEffect(() => {
    const loadDataAndCheckAuth = async () => {
      // console.log('🚀 [LoginScreen] Chargement optimisé');
      const currentJustReset = route.params?.justReset;

      if (currentJustReset) {
        // console.log('🔄 [LoginScreen] Traitement reset flow');
        navigation.setParams({ justReset: undefined });
        setInitialChecking(false);
      }

      // Chargement SELAS optimisé
      setSelasLoading(true);
      try {
        // console.log('📡 [LoginScreen] Chargement SELAS depuis Firebase');
        const selas = await firebaseService.getAllSelas();
        setSelasList(selas || []);
        setSelasError(null);
      } catch (error) {
        console.error('[LoginScreen] Erreur chargement SELAS:', error);
        setSelasError('Impossible de charger la liste des SELAS.');
        setSelasList([]);
      } finally {
        setSelasLoading(false);
      }

      // Vérification de l'authentification
      try {
        const isAuthenticated = await apiService.isAuthenticated();
        if (isAuthenticated) {
          const storedSelasId = await AsyncStorage.getItem('user_selas_id');
          if (storedSelasId) {
            // console.log('✅ [LoginScreen] Utilisateur authentifié avec SELAS');
          } else {
            // console.log('⚠️ [LoginScreen] Utilisateur authentifié sans SELAS');
          }
        }
      } catch (error) {
        console.error('❌ [LoginScreen] Erreur vérification auth:', error);
      } finally {
        setInitialChecking(false);
      }
    };

    loadDataAndCheckAuth();
  }, [navigation, route.params?.justReset]);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Veuillez entrer un email et un mot de passe.', 'error');
      return;
    }

    if (selasList.length > 0 && !selectedSelasId) {
      showToast('Veuillez sélectionner votre SELAS.', 'warning');
      return;
    }
    
    if (selasList.length === 0 && !selasLoading && !selasError) {
        showToast('Aucune SELAS configurée. Contactez l\'administrateur.', 'error');
        return;
    }

    setLoading(true);

    try {
      const result = await apiService.login(email, password);

      if (result.success) {
        if (selectedSelasId) {
          await AsyncStorage.setItem('user_selas_id', selectedSelasId);
          // Selas ID sauvegardé dans AsyncStorage
        } else if (selasList.length > 0) {
          showToast('Erreur interne: aucune SELAS sélectionnée.', 'error');
          setLoading(false);
          return;
        }
        
        // Vérifier le rôle de l'utilisateur pour la redirection
        const userRole = result.user?.role || result.userData?.role;
        // Rôle utilisateur détecté
        // Données utilisateur récupérées
        
        // Accepter les deux variantes du rôle
        if (userRole === 'HORS COURSIER' || userRole === 'Hors Coursier') {
          // Redirection HORS COURSIER vers PersonnelAdmin
          // Rediriger vers l'écran Personnel Administratif
          navigation.replace('PersonnelAdmin');
        } else {
          // Redirection vers Tournee pour le rôle
          // Rediriger vers l'écran normal des tournées
          navigation.replace('Tournee');
        }
      } else {
        showToast(result.error || 'Identifiant ou mot de passe incorrect.', 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
              showToast('Une erreur est survenue lors de la connexion.', 'error');
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
        showToast('Données locales effacées.', 'warning');
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

      showToast('Données d\'authentification effacées avec succès.', 'success');
      
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login', params: { justReset: true } }],
        });
      }
          } catch (error) {
        console.error('Erreur lors de la réinitialisation du stockage:', error);
        showToast('Impossible de réinitialiser le stockage.', 'error');
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
              source={require('../assets/logo-SCAN.png')}
              style={[
                styles.logoImage,
                isSmallScreen() && styles.logoImageSmall
              ]}
              resizeMode="contain"
            />
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
            <CustomPicker
              selectedValue={selectedSelasId}
              onValueChange={setSelectedSelasId}
              items={[
                { label: selasLoading ? "Chargement des SELAS..." : "-- Sélectionnez votre SELAS --", value: '' },
                ...selasList.map(selas => ({ label: selas.nom, value: selas.id }))
              ]}
              placeholder="-- Sélectionnez votre SELAS --"
              icon="business-outline"
              enabled={!selasLoading && selasList.length > 0}
            />

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
            <TouchableOpacity 
              style={[styles.checkUpdateButton, checkingUpdates && styles.checkUpdateButtonDisabled]}
              onPress={handleCheckUpdates}
              disabled={checkingUpdates}
            >
              {checkingUpdates ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : (
                <Ionicons name="refresh" size={12} color="#9ca3af" />
              )}
              <Text style={styles.checkUpdateButtonText}>
                {checkingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
              </Text>
            </TouchableOpacity>
            <VersionDisplay textStyle={styles.version} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: sp(20),
    paddingTop: hp(20),
    paddingBottom: hp(30),
    justifyContent: 'flex-start',
  },
  scrollContentSmall: {
    paddingTop: hp(15),
    paddingHorizontal: sp(16),
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: hp(60),
    paddingHorizontal: sp(20),
    flex: 1,
    justifyContent: 'center',
  },
  logoImage: {
    width: wp(800),
    height: hp(400),
    maxWidth: wp(850),
  },
  logoImageSmall: {
    width: wp(750),
    height: hp(375),
  },

  formContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: sp(12),
    marginBottom: sp(16),
    paddingHorizontal: sp(16),
    width: '100%',
    height: hp(56),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerContainer: {
    paddingHorizontal: sp(12),
  },
  pickerOuterContainer: { // Style spécifique si le conteneur externe du Picker a besoin de plus d'ajustements
    // Peut hériter de inputContainer et ajouter/modifier des propriétés si nécessaire
    // Par exemple, si le Picker a besoin d'un padding vertical différent ou pas de hauteur fixe.
    // Pour l'instant, on utilise inputContainer directement.
  },
  inputIcon: {
    marginRight: sp(12),
  },
  eyeIcon: {
    padding: sp(8),
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: sp(8),
    color: '#1f2937',
    fontSize: fp(16),
  },
  picker: {
    flex: 1,
    height: '100%',
    color: '#1f2937',
    backgroundColor: 'transparent',
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
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: sp(12),
    height: hp(56),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: sp(16),
    width: '100%',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonSmall: {
    height: hp(52),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: fp(16),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  helpContainer: {
    marginTop: sp(16),
    alignItems: 'center',
  },
  helpText: {
    color: '#6b7280',
    fontSize: fp(14),
    textAlign: 'center',
  },
  resetButton: {
    marginTop: sp(20),
    padding: sp(12),
  },
  resetButtonText: {
    color: '#e74c3c',
    fontSize: fp(14),
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: hp(15),
    paddingBottom: hp(10),
  },
  checkUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(4),
    paddingHorizontal: sp(8),
    marginBottom: sp(4),
    borderRadius: sp(12),
    backgroundColor: 'transparent',
  },
  checkUpdateButtonDisabled: {
    opacity: 0.4,
  },
  checkUpdateButtonText: {
    marginLeft: sp(3),
    color: '#9ca3af',
    fontSize: fp(10),
    fontWeight: '400',
  },
  version: {
    color: '#9ca3af',
    fontSize: fp(12),
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