import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des écrans
import LoginScreen from '../screens/LoginScreen';
import TourneeScreen from '../screens/TourneeScreen';
import CheckVehiculeScreen from '../screens/CheckVehiculeScreen';
import ScanScreen from '../screens/ScanScreen';
import BigSacocheScreen from '../screens/BigSacocheScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PersonnelAdminScreen from '../screens/PersonnelAdminScreen';

const Stack = createStackNavigator();

// Couleur bleue de l'application SCAN
const SCAN_BLUE = '#1a4d94';

export default function AppNavigator({ navigationRef }) { // Accepter navigationRef comme prop
  // Fonction pour la déconnexion
  const handleLogout = async (navigation) => {
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

  // Fonction pour créer un bouton de déconnexion pour tous les écrans
  const createLogoutButton = (navigation) => {
    return () => (
      <View style={{ marginRight: 10 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            // Créer un petit délai pour éviter les problèmes de superposition d'UI
            setTimeout(() => {
              handleLogout(navigation);
            }, 50);
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    );
  };

  // Fonction pour créer un en-tête personnalisé pour l'écran Scan
  const createScanHeaderButtons = (navigation) => {
    return () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Bouton de rafraîchissement */}
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => {
            navigation.setParams({ refresh: Date.now() });
          }}
        >
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
        
        {/* Bouton d'historique */}
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => {
            navigation.setParams({ showHistory: true });
          }}
        >
          <Ionicons name="time-outline" size={22} color="#fff" />
        </TouchableOpacity>
        
        {/* Bouton Big-Sacoche */}
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => {
            const route = navigation.getState().routes.find(r => r.name === 'Scan');
            const sessionId = (route && route.params && route.params.sessionId) || null;
            navigation.navigate('BigSacoche', { sessionId: sessionId });
          }}
        >
          <Ionicons name="briefcase-outline" size={22} color="#fff" />
        </TouchableOpacity>
        
        {/* Bouton Paramètres */}
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => {
            navigation.navigate('Settings');
          }}
        >
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </TouchableOpacity>
        
        {/* Bouton Déconnexion - utiliser la même fonction que pour les autres écrans */}
        <TouchableOpacity
          style={{ marginRight: 5 }}
          activeOpacity={0.7}
          onPress={() => {
            setTimeout(() => {
              handleLogout(navigation);
            }, 50);
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    );
  };

  const onNavigationReady = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken && navigationRef.current) {
        // Si un token existe, vérifier le rôle de l'utilisateur
        try {
          const userDataString = await AsyncStorage.getItem('user_data');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            const userRole = userData.role;
            
            // Token trouvé, rôle utilisateur vérifié
            
            // Rediriger selon le rôle
            if (userRole === 'HORS COURSIER' || userRole === 'Hors Coursier') {
              // Redirection HORS COURSIER vers PersonnelAdmin
              navigationRef.current.reset({
                index: 0,
                routes: [{ name: 'PersonnelAdmin' }],
              });
            } else {
              // Redirection vers Tournee pour les autres rôles
              navigationRef.current.reset({
                index: 0,
                routes: [{ name: 'Tournee' }],
              });
            }
          } else {
            // Pas de données utilisateur, redirection par défaut vers Tournee
            // Pas de données utilisateur, redirection par défaut vers Tournee
            navigationRef.current.reset({
              index: 0,
              routes: [{ name: 'Tournee' }],
            });
          }
        } catch (userDataError) {
          console.error('[AppNavigator] Erreur lors de la lecture des données utilisateur:', userDataError);
          // En cas d'erreur, redirection par défaut vers Tournee
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Tournee' }],
          });
        }
      } else {
        // Si aucun token n'est trouvé, l'utilisateur reste sur l'écran de Login (initialRouteName).
        // Aucun token trouvé, l'utilisateur reste sur Login
      }
    } catch (error) {
      console.error('[AppNavigator] Erreur lors de la vérification du token au démarrage:', error);
      // En cas d'erreur, on reste sur l'écran de Login par sécurité.
    }
  };

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStatusBarHeight: 0, // Réduire l'espace de la status bar
          headerStyle: {
            backgroundColor: SCAN_BLUE,
            elevation: 4, // Ombre pour Android
            shadowOpacity: 0.3, // Ombre pour iOS
            // Compatibilité web
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)', // Ombre pour web
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 16,
          },
          headerTitleContainerStyle: {
            paddingVertical: 8, // Réduire le padding vertical
          }
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            title: 'Connexion',
            headerShown: false  // Cache l'en-tête sur l'écran de connexion
          }} 
        />
        <Stack.Screen 
          name="Tournee" 
          component={TourneeScreen} 
          options={({ navigation }) => ({ 
            headerShown: false, // En-tête personnalisé
          })} 
        />
        <Stack.Screen 
          name="CheckVehicule" 
          component={CheckVehiculeScreen} 
          options={({ navigation }) => ({
            headerShown: false, // En-tête personnalisé
          })}
        />
        <Stack.Screen 
          name="Scan" 
          component={ScanScreen} 
          options={({ navigation }) => ({ 
            headerShown: false, // En-tête personnalisé
          })} 
        />
        <Stack.Screen 
          name="BigSacoche" 
          component={BigSacocheScreen} 
          options={({ navigation }) => ({ 
            headerShown: false, // En-tête personnalisé
          })} 
        />
                <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={({ navigation }) => ({
            headerShown: false, // En-tête personnalisé
          })} 
        />
        <Stack.Screen 
          name="PersonnelAdmin" 
          component={PersonnelAdminScreen} 
          options={({ navigation }) => ({
            headerShown: false, // En-tête personnalisé
          })} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}