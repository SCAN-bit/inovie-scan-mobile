import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PersonnelAdminHeader({ title, onLogout, showBackButton = false, onBack }) {
  return (
    <SafeAreaView style={styles.header}>
      {/* Logo SCAN en premier plan et en dehors des containers */}
                <Image 
            source={require('../assets/logo-SCAN-white.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
      
      <View style={styles.headerContent}>
        {/* Bouton retour si nécessaire */}
        {showBackButton && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        
        {/* Bouton déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a4d94',
    height: 80,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
    paddingTop: 0,
  },
  logo: {
    height: 150,
    width: 500,
    resizeMode: 'stretch',
    position: 'absolute',
    top: -30,
    left: '50%',
    marginLeft: -250,
    zIndex: -1,
  },

  logoutButton: {
    padding: 8,
  },
});
