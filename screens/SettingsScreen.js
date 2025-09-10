import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService from '../services/firebaseService';
import AppUpdateService from '../services/AppUpdateService';
import CustomHeader from '../components/CustomHeader';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

export default function SettingsScreen({ navigation }) {
  // État pour stocker les préférences
  const [enableAutoLogout, setEnableAutoLogout] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [enableAutoUpdate, setEnableAutoUpdate] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Charger les préférences au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Charger la préférence de déconnexion automatique
        const autoLogoutPref = await AsyncStorage.getItem('enable_auto_logout');
        setEnableAutoLogout(autoLogoutPref === 'true');
        
        // Charger la préférence de mise à jour automatique
        const autoUpdateEnabled = await AppUpdateService.isAutoCheckEnabled();
        setEnableAutoUpdate(autoUpdateEnabled);
        
        // Charger les informations de mise à jour en cache
        const cachedUpdateInfo = await AppUpdateService.getCachedUpdateInfo();
        setUpdateInfo(cachedUpdateInfo);
        
        // Charger les informations utilisateur
        const userData = await FirebaseService.getCurrentUser();
        if (userData) {
          setUserEmail(userData.email || '');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Fonction pour mettre à jour la préférence de déconnexion automatique
  const handleAutoLogoutToggle = async (value) => {
    try {
      setEnableAutoLogout(value);
      await AsyncStorage.setItem('enable_auto_logout', value.toString());
      
      // Mettre à jour la configuration globale si elle existe
      if (global.APP_CONFIG) {
        global.APP_CONFIG.enableAutoLogout = value;
      }
      
      // Afficher un message de confirmation
      Alert.alert(
        'Paramètre mis à jour',
        value 
          ? 'La déconnexion automatique est maintenant activée. Vous serez déconnecté après une période d\'inactivité.'
          : 'La déconnexion automatique est désactivée. Vous resterez connecté jusqu\'à une déconnexion manuelle.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les paramètres.');
    }
  };

  // OPTIMISATION: Déconnexion pour l'en-tête (sans confirmation)
  const handleHeaderLogout = async () => {
    try {
      console.log('🚪 [SettingsScreen] Déconnexion depuis l\'en-tête');
      
      await FirebaseService.closeCurrentSession();
      await FirebaseService.logout();
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('❌ [SettingsScreen] Erreur déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
    }
  };

  // Fonction pour se déconnecter (avec confirmation)
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Déconnecter', 
            onPress: async () => {
              await FirebaseService.closeCurrentSession();
              await FirebaseService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter.');
    }
  };

  // Fonction pour gérer la vérification automatique des mises à jour
  const handleAutoUpdateToggle = async (value) => {
    try {
      setEnableAutoUpdate(value);
      await AppUpdateService.setAutoCheckEnabled(value);
      
      Alert.alert(
        'Paramètre mis à jour',
        value 
          ? 'La vérification automatique des mises à jour est maintenant activée.'
          : 'La vérification automatique des mises à jour est désactivée.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les paramètres.');
    }
  };

  // Fonction pour vérifier manuellement les mises à jour
  const handleCheckForUpdates = async () => {
    try {
      setCheckingUpdates(true);
      const updateInfo = await AppUpdateService.checkForUpdates(true);
      setUpdateInfo(updateInfo);
      
      if (updateInfo.available) {
        Alert.alert(
          'Mise à jour disponible',
          `Une nouvelle version (${updateInfo.latestVersion}) est disponible.\n\nVoulez-vous la télécharger maintenant?`,
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Télécharger', 
              onPress: () => AppUpdateService.downloadAndInstallUpdate(updateInfo)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      Alert.alert('Erreur', 'Impossible de vérifier les mises à jour.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  // Fonction pour vider le cache des mises à jour
  const handleClearUpdateCache = async () => {
    try {
      await AppUpdateService.clearUpdateCache();
      setUpdateInfo({ available: false, lastCheck: null });
      Alert.alert(
        'Cache vidé',
        'Le cache des mises à jour a été vidé avec succès.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error);
      Alert.alert('Erreur', 'Impossible de vider le cache des mises à jour.');
    }
  };

  // Fonction pour effacer toutes les données locales (attention, fonction dangereuse)
  const handleClearLocalData = async () => {
    try {
      Alert.alert(
        'Effacer les données locales',
        'Attention: cette action supprimera toutes les données stockées localement et vous déconnectera. Continuer?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Effacer', 
            style: 'destructive',
            onPress: async () => {
              // Effacer toutes les données stockées dans AsyncStorage
              await AsyncStorage.clear();
              Alert.alert(
                'Données effacées',
                'Toutes les données locales ont été supprimées. L\'application va maintenant redémarrer.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      // Rediriger vers l'écran de connexion
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    } 
                  }
                ]
              );
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
      Alert.alert('Erreur', 'Impossible de supprimer les données locales.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title="Paramètres"
        navigation={navigation}
        showBackButton={true}
        showLogoutButton={true}
        handleLogout={handleHeaderLogout}
      />
      
    <ScrollView style={styles.container}>
      
      {/* Section Compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        
        <View style={styles.accountInfo}>
          <Ionicons name="person-circle-outline" size={50} color="#1a4d94" />
          <View style={styles.accountDetails}>
            <Text style={styles.accountEmail}>{userEmail}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
      
      {/* Section Sécurité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sécurité</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Déconnexion automatique</Text>
            <Text style={styles.settingDescription}>
              {enableAutoLogout 
                ? 'L\'application vous déconnectera automatiquement après une période d\'inactivité' 
                : 'Vous resterez connecté jusqu\'à ce que vous vous déconnectiez manuellement'}
            </Text>
          </View>
          <Switch
            value={enableAutoLogout}
            onValueChange={handleAutoLogoutToggle}
            trackColor={{ false: '#767577', true: '#1a4d94' }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>

      {/* Section Mises à jour */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mises à jour</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Vérification automatique</Text>
            <Text style={styles.settingDescription}>
              {enableAutoUpdate 
                ? 'L\'application vérifiera automatiquement les mises à jour disponibles' 
                : 'Vous devrez vérifier manuellement les mises à jour'}
            </Text>
          </View>
          <Switch
            value={enableAutoUpdate}
            onValueChange={handleAutoUpdateToggle}
            trackColor={{ false: '#767577', true: '#1a4d94' }}
            thumbColor="#f4f3f4"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.updateButton]}
          onPress={handleCheckForUpdates}
          disabled={checkingUpdates}
        >
          <Ionicons 
            name={checkingUpdates ? "refresh-outline" : "download-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.buttonText}>
            {checkingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
          </Text>
        </TouchableOpacity>

        {updateInfo && updateInfo.available && (
          <View style={styles.updateAvailable}>
            <Ionicons name="information-circle" size={20} color="#28a745" />
            <Text style={styles.updateAvailableText}>
              Mise à jour disponible: v{updateInfo.latestVersion}
            </Text>
          </View>
        )}

        {updateInfo && updateInfo.lastCheck && (
          <Text style={styles.lastCheckText}>
            Dernière vérification: {updateInfo.lastCheck.toLocaleDateString()} à {updateInfo.lastCheck.toLocaleTimeString()}
          </Text>
        )}
      </View>
      
      {/* Section Avancé */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avancé</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleClearUpdateCache}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Vider le cache des mises à jour</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearLocalData}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Effacer toutes les données locales</Text>
        </TouchableOpacity>
      </View>
      
      {/* Section À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 Tous droits réservés.</Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: sp(15),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: fp(24),
    fontWeight: 'bold',
    color: '#1a4d94',
  },
  section: {
    marginTop: sp(16),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    padding: sp(15),
  },
  sectionTitle: {
    fontSize: fp(18),
    fontWeight: 'bold',
    marginBottom: sp(15),
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: sp(10),
  },
  settingInfo: {
    flex: 1,
    marginRight: sp(10),
  },
  settingTitle: {
    fontSize: fp(16),
    color: '#333',
  },
  settingDescription: {
    fontSize: fp(14),
    color: '#666',
    marginTop: sp(5),
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(15),
  },
  accountDetails: {
    marginLeft: sp(15),
  },
  accountEmail: {
    fontSize: fp(16),
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a4d94',
    padding: sp(12),
    borderRadius: sp(5),
    marginVertical: sp(10),
  },
  logoutButton: {
    backgroundColor: '#1a4d94',
  },
  updateButton: {
    backgroundColor: '#28a745',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  dangerButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontSize: fp(16),
    fontWeight: '500',
    marginLeft: sp(5),
  },
  updateAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: sp(10),
    borderRadius: sp(5),
    marginTop: sp(10),
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  updateAvailableText: {
    marginLeft: sp(8),
    color: '#155724',
    fontSize: fp(14),
    fontWeight: '500',
  },
  lastCheckText: {
    fontSize: fp(12),
    color: '#999',
    marginTop: sp(10),
    textAlign: 'center',
  },
  versionText: {
    fontSize: fp(14),
    color: '#666',
  },
  copyrightText: {
    fontSize: fp(12),
    color: '#999',
    marginTop: sp(5),
  },
}); 