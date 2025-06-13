import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Optionnel: Importez react-native-vector-icons si vous l'utilisez
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Configuration pour les icônes et couleurs selon le statut et le type
const statusConfig = {
  livre: {
    icon: '✅', // Ou utilisez Icon: <Icon name="check-circle" size={24} color="#4CAF50" />
    color: '#4CAF50', // Vert
    label: 'Livré',
  },
  'en-cours': {
    icon: '🚚', // Ou utilisez Icon: <Icon name="truck-delivery" size={24} color="#FF9800" />
    color: '#FF9800', // Orange
    label: 'En cours',
  },
  // Statut par défaut ou inconnu
  default: {
    icon: '❓', // Ou utilisez Icon: <Icon name="help-circle" size={24} color="#9E9E9E" />
    color: '#9E9E9E',
    label: 'Inconnu',
  },
};

const typeConfig = {
  sortie: { // Dépôt
    color: '#e74c3c', // Rougeâtre
    label: 'Dépôt',
  },
  entree: { // Prise en charge
    color: '#3498db', // Bleu
    label: 'Prise en charge',
  },
  'big-sacoche': {
    color: '#9b59b6', // Violet
    label: 'Big-Sacoche',
  },
  default: {
      color: '#7f8c8d', // Gris
      label: 'Autre'
  }
};

const ScanHistoryItem = ({ item }) => {
  // --- DEBUG LOG --- 
  console.log('[ScanHistoryItem] Rendering item:', JSON.stringify(item, null, 2));
  // --- FIN DEBUG LOG ---
  
  // --- Gestion du statut accentié ---
  // Définir typeKey en début pour qu'il soit accessible partout
  const typeKey = (item.type || '').toLowerCase();

  // Normaliser le statut: enlever les accents puis en minuscules
  const rawStatus = (item.status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .toLowerCase();
  let statusInfo = statusConfig[rawStatus];

  // Si le statut n'est pas reconnu après normalisation, fallback selon le type
  if (!statusInfo) {
    if (typeKey === 'sortie') {
      statusInfo = statusConfig.livre;
    } else if (typeKey === 'entree') {
      statusInfo = statusConfig['en-cours'];
    } else {
      statusInfo = statusConfig.default;
    }
  }
  
  // Utiliser 'entree' comme type par défaut si non défini
  const currentType = item.type || 'entree'; 
  const typeInfo = typeConfig[currentType] || typeConfig.default;

  return (
    <View style={styles.card}>
      {/* Icône de statut */}
      <View style={styles.iconContainer}>
         {/* Affichez l'icône texte (ou le composant Icon si vous l'utilisez) */}
         <Text style={[styles.iconText, { backgroundColor: statusInfo.color }]}>
           {statusInfo.icon}
         </Text>
      </View>

      {/* Détails du scan */}
      <View style={styles.detailsContainer}>
        <Text style={styles.scanId}>{item.idColis || item.code || 'Code inconnu'}</Text>
        { (item.siteDetails?.name || item.siteName || item.site) && (
          <Text style={styles.siteText}>
            {item.siteDetails?.name || item.siteName || item.site}
          </Text>
        ) }
        
        <View style={styles.metaContainer}>
           {/* Statut */}
           <View style={[styles.badge, { backgroundColor: statusInfo.color }]}>
             <Text style={styles.badgeText}>{statusInfo.label}</Text>
           </View>
           
           {/* Type d'opération */}
           <View style={[styles.badge, { backgroundColor: typeConfig[typeKey]?.color || typeConfig.default.color }]}>
             <Text style={styles.badgeText}>{typeConfig[typeKey]?.label || typeConfig.default.label}</Text>
           </View>

           {/* Heure du scan */}
           {item.timeStamp && <Text style={styles.timestampText}>{item.timeStamp}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    padding: 5, // Ajoute un peu d'espace autour de l'icône
    borderRadius: 15, // Pour faire un cercle
    width: 30,
    height: 30,
    textAlign: 'center',
    lineHeight: 20, // Ajustement pour centrer l'emoji verticalement (peut nécessiter ajustement)
    color: '#FFFFFF', // Couleur de l'emoji (si texte)
    overflow: 'hidden', // Assure que le fond ne dépasse pas le cercle
  },
  detailsContainer: {
    flex: 1,
  },
  scanId: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
   siteText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 5,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // Permet aux badges de passer à la ligne si nécessaire
  },
  badge: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 4, // Espace si les badges passent à la ligne
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 'auto', // Pousse l'heure à droite si possible
    alignSelf: 'center', // Centre verticalement avec les badges
  },
});

export default ScanHistoryItem; 