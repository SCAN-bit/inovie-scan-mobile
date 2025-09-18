import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Optionnel: Importez react-native-vector-icons si vous l'utilisez
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Configuration pour les icônes et couleurs selon le statut et le type
const statusConfig = {
  // Statuts standards
  livre: {
    icon: '✅',
    color: '#4CAF50', // Vert
    label: 'Livré',
  },
  'livre': { // avec accent
    icon: '✅',
    color: '#4CAF50',
    label: 'Livré',
  },
  'en-cours': {
    icon: '🔄',
    color: '#FF9800', // Orange
    label: 'En cours',
  },
  'en cours': {
    icon: '🔄',
    color: '#FF9800',
    label: 'En cours',
  },
  'pas de colis': {
    icon: '📭',
    color: '#9C27B0', // Violet
    label: 'Pas de colis',
  },
  'visite-terminee': {
    icon: '🏁',
    color: '#2196F3', // Bleu
    label: 'Visite terminée',
  },
  // Statut par défaut ou inconnu
  default: {
    icon: '❓',
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
  // Données reçues pour traitement
  
  // --- Gestion du type et du statut ---
  const currentType = item.type || item.operationType || 'entree'; 
  const typeKey = currentType.toLowerCase();

  // Récupération et normalisation du statut
  const rawStatus = (item.status || '').toString().toLowerCase().trim();
  // Statut et type récupérés

  // Détermination du statut en fonction de plusieurs critères
  let statusInfo;

  // 1. Si le statut est défini et reconnu directement
  if (rawStatus && statusConfig[rawStatus]) {
    statusInfo = statusConfig[rawStatus];
  } 
  // 2. Vérification sans tenir compte des tirets/espaces/diacritiques
  else if (rawStatus) {
    const normalizedStatus = rawStatus
      .normalize('NFD')
      .replace(/[\u0300-\u036f-\s]/g, '') // Supprime diacritiques, tirets et espaces
      .toLowerCase();
    
    const matchingStatus = Object.keys(statusConfig).find(key => 
      key.replace(/[\s-]/g, '') === normalizedStatus
    );
    
    if (matchingStatus) {
      statusInfo = statusConfig[matchingStatus];
    }
  }

  // 3. Si toujours pas de statut, vérifier les conditions spéciales 'pas de colis'
  if (!statusInfo) {
    // Vérification des conditions
    
    if (typeKey === 'visite_sans_colis' || 
        item.operationType === 'visite_sans_colis' || 
        !item.idColis || 
        item.status === 'visite-terminee' || 
        item.status === 'pas_de_colis' ||
        item.status === 'Pas de colis' ||
        (item.statut && item.statut.toLowerCase() === 'pas de colis')) {
      // Statut défini comme "Pas de colis"
      statusInfo = statusConfig['pas de colis'];
    }
  }

  // 4. Si toujours pas, déduire du type d'opération
  if (!statusInfo) {
    // Déduction du statut à partir du type
    if (typeKey === 'entree' || typeKey === 'prise en charge') {
      statusInfo = statusConfig['en-cours'];
    } else if (typeKey === 'sortie' || typeKey === 'depot') {
      statusInfo = statusConfig.livre;
    } else {
      // Aucun statut reconnu
      statusInfo = statusConfig.default;
    }
  }

  // Gestion du type
  const typeInfo = typeConfig[typeKey] || typeConfig.default;

  if (!typeConfig[typeKey]) {
    // Type non reconnu
  }

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
        { ((item.siteDetails && item.siteDetails.name) || item.siteName || item.site) && (
          <Text style={styles.siteText}>
            {(item.siteDetails && item.siteDetails.name) || item.siteName || item.site}
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