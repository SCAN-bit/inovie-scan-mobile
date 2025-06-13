import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService from '../services/firebaseService';

export default function SettingsScreen({ navigation }) {
  // État pour stocker les préférences
  const [enableAutoLogout, setEnableAutoLogout] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Charger les préférences au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Charger la préférence de déconnexion automatique
        const autoLogoutPref = await AsyncStorage.getItem('enable_auto_logout');
        setEnableAutoLogout(autoLogoutPref === 'true');
        
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

  // Fonction pour se déconnecter
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
    <ScrollView style={styles.container}>
      {/* Entête de la page */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>
      
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
      
      {/* Section Avancé */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avancé</Text>
        
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a4d94',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  accountDetails: {
    marginLeft: 15,
  },
  accountEmail: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a4d94',
    padding: 12,
    borderRadius: 5,
    marginVertical: 10,
  },
  logoutButton: {
    backgroundColor: '#1a4d94',
  },
  dangerButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
}); 