import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCAN_BLUE = '#1a4d94';

export default function CustomHeader({ 
  title, 
  navigation, 
  showBackButton = true, 
  showLogoutButton = true,
  additionalButtons = [],
  handleLogout 
}) {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={SCAN_BLUE} translucent={false} />
      <View style={styles.customHeader}>
        {/* Logo SCAN en arrière-plan */}
        <Image 
          source={require('../assets/logo-SCAN-white.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        {/* Bouton retour */}
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* Titre supprimé - espace vide à la place */}
        <View style={styles.titleSpace} />
        
        {/* Boutons additionnels + déconnexion */}
        <View style={styles.headerButtons}>
          {additionalButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              onPress={button.onPress}
              style={styles.headerButton}
            >
              <Ionicons name={button.icon} size={18} color="#fff" />
            </TouchableOpacity>
          ))}
          
          {showLogoutButton && handleLogout && (
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    height: 80, // Même hauteur que PersonnelAdminHeader
    backgroundColor: SCAN_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    elevation: 4,
    shadowOpacity: 0.3,
    overflow: 'hidden',
  },
  backButton: {
    padding: 6,
    minWidth: 32,
  },
  titleSpace: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 32,
  },
  headerButton: {
    padding: 6,
    marginLeft: 4,
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
}); 