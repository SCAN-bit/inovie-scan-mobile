import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
// Import conditionnel de KeepAwake pour éviter les erreurs de build
let KeepAwake = null;
try {
  KeepAwake = require('expo-keep-awake');
} catch (e) {
  console.log('KeepAwake non disponible:', e.message);
}
import { AppState } from 'react-native';
import FirebaseService from './services/firebaseService';
import AppUpdateService from './services/AppUpdateService';

import UpdateAlert from './components/UpdateAlert';
// import './scripts/auto-start-keep-alive'; // Keep-alive Supabase automatique (temporairement désactivé)

// Solution pour l'erreur activateKeepAwake - Version web compatible
if (Platform.OS !== 'web' && KeepAwake && KeepAwake.activateKeepAwake) {
  try {
    const originalActivate = KeepAwake.activateKeepAwake;
    KeepAwake.activateKeepAwake = function() {
      // Silencieusement utiliser la nouvelle méthode à la place
      return KeepAwake.activateKeepAwakeAsync();
    };
  } catch (e) {
    // Ignorer les erreurs sur web
  }
}

// Conditionnellement charger les styles web si nous sommes sur le web
if (Platform.OS === 'web') {
  try {
    require('./web-styles.css');
  } catch (e) {
    console.log('CSS web non trouvé, utilisation des styles par défaut');
  }
}

export default function App() {
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const navigationRef = useRef(null);

  // Initialisation des services de mise à jour
  useEffect(() => {
    // Initialisation des systèmes de mise à jour
    
    // Test ExpoAsset supprimé pour éviter les problèmes
    
    // Vérifier les mises à jour GitHub au démarrage
    setTimeout(async () => {
      try {
        // Vérification automatique des mises à jour
        await AppUpdateService.checkForUpdatesAutomatic();
        
        // Vérifier s'il y a une mise à jour en attente d'affichage
        const hasUpdate = await AppUpdateService.hasPendingUpdate();
        if (hasUpdate) {
          const info = await AppUpdateService.getCachedUpdateInfo();
          setUpdateInfo(info);
          setShowUpdateAlert(true);
          // Mise à jour disponible détectée
        } else {
          // Aucune mise à jour disponible
        }
      } catch (error) {
        console.error('[App] Erreur lors de la vérification automatique:', error);
      }
    }, 3000); // Attendre 3 secondes après le démarrage
  }, []);

  // Gestion de l'état de l'application pour la déconnexion automatique
  useEffect(() => {
    // DÉSACTIVER la déconnexion automatique sur mobile car problématique sur Zebra
    if (Platform.OS === 'web') {
      // Référence à l'état précédent pour savoir si l'app passe en background
      let appStateTimeout;
      
      // Fonction pour traiter les changements d'état de l'application
      const handleAppStateChange = (nextAppState) => {
        // App state changed
        
        // Si l'application passe en arrière-plan ou est inactive
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Planifier la déconnexion après un délai (ex: 30 minutes sur web = 1800000 ms)
          appStateTimeout = setTimeout(() => {
            // Session expirée - déconnexion automatique (WEB)
            // Déconnexion et fermeture de session
            FirebaseService.closeCurrentSession()
              .then(() => FirebaseService.logout())
              .catch(error => console.error('Erreur lors de la déconnexion auto:', error));
          }, 1800000); // 30 minutes sur web
        } 
        // Si l'application revient au premier plan
        else if (nextAppState === 'active') {
          // Annuler la déconnexion programmée si l'utilisateur revient rapidement
          if (appStateTimeout) {
            clearTimeout(appStateTimeout);
          }
          
          // Vérifier les mises à jour quand l'app revient au premier plan
          AppUpdateService.checkForUpdatesAutomatic();
        }
      };

      // Configurer l'écouteur d'événements SEULEMENT sur web
      const subscription = AppState.addEventListener('change', handleAppStateChange);

      // Nettoyage lors du démontage du composant
      return () => {
        subscription.remove();
        if (appStateTimeout) {
          clearTimeout(appStateTimeout);
        }
      };
    } else {
      // Sur mobile : AUCUNE déconnexion automatique
      // Déconnexion automatique DÉSACTIVÉE sur mobile
      
      // Mais on vérifie les mises à jour quand l'app devient active
      const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active') {
          AppUpdateService.checkForUpdatesAutomatic();
        }
      };
      
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      return () => {
        subscription.remove();
      };
    }
  }, []);

  // Effet pour s'assurer que le défilement est activé sur le web
  useEffect(() => {
    if (Platform.OS === 'web') {
      // S'assurer que le document et le body sont scrollables
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
    }
  }, []);

  // Sur le web, utiliser un ScrollView comme conteneur principal
  if (Platform.OS === 'web') {
    return (
      <SafeAreaProvider>
        <ScrollView 
          contentContainerStyle={styles.webScrollContainer}
          style={styles.webScroll}
          className="scrollable-content"
        >
          <StatusBar style="auto" />
          <AppNavigator navigationRef={navigationRef} />
        </ScrollView>
      </SafeAreaProvider>
    );
  }

  // Fonctions de gestion de l'alerte de mise à jour
  const handleUpdateClose = async () => {
    setShowUpdateAlert(false);
    await AppUpdateService.markUpdateAsSeen();
  };

  const handleUpdateDownload = async () => {
    if (updateInfo) {
      await AppUpdateService.downloadAndInstallUpdate(updateInfo);
      setShowUpdateAlert(false);
      await AppUpdateService.markUpdateAsSeen();
    }
  };

  // Version mobile standard
  return (
    <SafeAreaProvider>
      <View style={styles.container} className="main-container">
        <StatusBar style="auto" />
        <AppNavigator navigationRef={navigationRef} />
        
        {/* Alerte de mise à jour */}
        <UpdateAlert
          visible={showUpdateAlert}
          onClose={handleUpdateClose}
          onDownload={handleUpdateDownload}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Assurer que le conteneur permet le défilement sur le web
    overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
  },
  webScroll: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  webScrollContainer: {
    minHeight: '100%',
  }
});