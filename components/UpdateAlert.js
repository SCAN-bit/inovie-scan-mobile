import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppUpdateService from '../services/AppUpdateService';
import { wp, hp, fp } from '../utils/responsiveUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function UpdateAlert({ visible, onClose, onDownload }) {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (visible) {
      loadUpdateInfo();
    }
  }, [visible]);

  const loadUpdateInfo = async () => {
    try {
      const info = await AppUpdateService.getCachedUpdateInfo();
      setUpdateInfo(info);
    } catch (error) {
      console.error('Erreur chargement info mise à jour:', error);
    }
  };

  if (!visible || !updateInfo || !updateInfo.available) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icône de mise à jour */}
            <View style={styles.iconContainer}>
              <Ionicons name="arrow-up-circle" size={48} color="#007AFF" />
            </View>

            {/* Titre */}
            <Text style={styles.title}>Mise à jour disponible</Text>

            {/* Version */}
            <Text style={styles.version}>
              Version {updateInfo.latestVersion} disponible
            </Text>

            {/* Description */}
            <Text style={styles.description}>
              Une nouvelle version de l'application est disponible avec des améliorations et corrections.
            </Text>

            {/* Notes de version si disponibles */}
            {updateInfo.releaseNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>Nouvelles fonctionnalités :</Text>
                <Text style={styles.notesText}>{updateInfo.releaseNotes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Boutons - toujours visibles en bas */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.laterButton} 
              onPress={onClose}
            >
              <Text style={styles.laterButtonText}>Plus tard</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={onDownload}
            >
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Télécharger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: Math.min(20, screenWidth * 0.05), // Marge adaptative
    width: Math.min(screenWidth * 0.9, 400), // Largeur adaptative avec maximum
    maxHeight: screenHeight * 0.8, // Hauteur maximale en pourcentage de l'écran
    minHeight: Math.min(200, screenHeight * 0.3), // Hauteur minimale adaptative
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
});
