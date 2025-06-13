import React from 'react';
import { Modal, View, Text, StyleSheet, Button, ScrollView, Linking, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RoadbookModal = ({ visible, onClose, roadbookData }) => {
  if (!roadbookData) {
    return null; // Ne rien rendre si pas de données
  }

  const renderPhotos = () => {
    if (!roadbookData.photos || roadbookData.photos.length === 0) {
      return <Text style={styles.noDataText}>Aucune photo disponible.</Text>;
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
        {roadbookData.photos.map((photoUrl, index) => (
          <TouchableOpacity key={index} onPress={() => Linking.openURL(photoUrl)} style={styles.photoContainer}>
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Roadbook du Site</Text>
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.infoSection}>
              <Text style={styles.label}>Instructions d'accès :</Text>
              <Text style={styles.text}>{roadbookData.instructionsAcces || 'Non renseigné'}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.label}>Code Alarme :</Text>
              <Text style={styles.text}>{roadbookData.codeAlarme || 'Non renseigné'}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.label}>Informations Clés :</Text>
              <Text style={styles.text}>{roadbookData.informationsCles || 'Non renseigné'}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.label}>Notes Supplémentaires :</Text>
              <Text style={styles.text}>{roadbookData.notesSupplementaires || 'Non renseigné'}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.label}>Photos :</Text>
              {renderPhotos()}
            </View>
          </ScrollView>

          <Button title="Fermer" onPress={onClose} color="#3498db" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fond semi-transparent
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    paddingTop: 45, // Plus d'espace pour le bouton fermer
    alignItems: 'stretch', // Pour que le ScrollView prenne la largeur
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%', 
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    marginBottom: 15,
  },
  infoSection: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  text: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  noDataText: {
    fontSize: 15,
    color: '#777',
    fontStyle: 'italic',
  },
  photosScrollView: {
    marginTop: 5,
    maxHeight: 120, // Hauteur max pour la galerie de photos
  },
  photoContainer: {
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden', // Pour que le borderRadius s'applique à l'image
  },
  photo: {
    width: 100,
    height: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10, // S'assurer qu'il est au-dessus des autres éléments
  }
});

export default RoadbookModal; 