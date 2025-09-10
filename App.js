import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import * as KeepAwake from 'expo-keep-awake';
import { AppState } from 'react-native';
import FirebaseService from './services/firebaseService';
import AppUpdateService from './services/AppUpdateService';
import './scripts/auto-start-keep-alive'; // Keep-alive Supabase automatique

// Solution pour l'erreur activateKeepAwake
if (KeepAwake.activateKeepAwake && !KeepAwake._overridden) {
  const originalActivate = KeepAwake.activateKeepAwake;
  KeepAwake.activateKeepAwake = function() {
    // Silencieusement utiliser la nouvelle méthode à la place
    return KeepAwake.activateKeepAwakeAsync();
  };
  KeepAwake._overridden = true;
}

// Conditionnellement charger les styles web si nous sommes sur le web
if (Platform.OS === 'web') {
  // Cette ligne sera ignorée sur les plateformes natives mais fonctionnera sur le web
  try {
    // Essayer de charger le fichier CSS pour le web
    require('./web-styles.css');
  } catch (e) {
    console.log('Chargement de CSS web ignoré sur les plateformes natives');
  }
}

export default function App() {
  // Initialisation des services de mise à jour
  useEffect(() => {
    console.log('🚀 [App] Initialisation des systèmes de mise à jour');
    
    // Vérifier les mises à jour App Distribution au démarrage
    setTimeout(() => {
      AppUpdateService.checkForUpdatesAutomatic();
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
        console.log('App state changed to:', nextAppState);
        
        // Si l'application passe en arrière-plan ou est inactive
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Planifier la déconnexion après un délai (ex: 30 minutes sur web = 1800000 ms)
          appStateTimeout = setTimeout(() => {
            console.log('Session expirée - déconnexion automatique (WEB)');
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
      console.log('Déconnexion automatique DÉSACTIVÉE sur mobile');
      
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
          <AppNavigator />
        </ScrollView>
      </SafeAreaProvider>
    );
  }

  // Version mobile standard
  return (
    <SafeAreaProvider>
      <View style={styles.container} className="main-container">
        <StatusBar style="auto" />
        <AppNavigator />
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