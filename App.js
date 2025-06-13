import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import * as KeepAwake from 'expo-keep-awake';
import { AppState } from 'react-native';
import FirebaseService from './services/firebaseService';

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
  // Gestion de l'état de l'application pour la déconnexion automatique
  useEffect(() => {
    // Référence à l'état précédent pour savoir si l'app passe en background
    let appStateTimeout;
    
    // Fonction pour traiter les changements d'état de l'application
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changed to:', nextAppState);
      
      // Si l'application passe en arrière-plan ou est inactive
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Planifier la déconnexion après un délai (ex: 5 minutes = 300000 ms)
        appStateTimeout = setTimeout(() => {
          console.log('Session expirée - déconnexion automatique');
          // Déconnexion et fermeture de session
          FirebaseService.closeCurrentSession()
            .then(() => FirebaseService.logout())
            .catch(error => console.error('Erreur lors de la déconnexion auto:', error));
        }, 300000); // 5 minutes
      } 
      // Si l'application revient au premier plan
      else if (nextAppState === 'active') {
        // Annuler la déconnexion programmée si l'utilisateur revient rapidement
        if (appStateTimeout) {
          clearTimeout(appStateTimeout);
        }
      }
    };

    // Configurer l'écouteur d'événements
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Nettoyage lors du démontage du composant
    return () => {
      subscription.remove();
      if (appStateTimeout) {
        clearTimeout(appStateTimeout);
      }
    };
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