/**
 * dateUtils.js
 * 
 * Fonctions utilitaires pour la manipulation et le formatage des dates.
 */

/**
 * Convertit un timestamp Firebase (objet avec seconds et nanoseconds) ou une chaîne ISO en objet Date
 * @param {Object|string|number} timestamp - Le timestamp à convertir
 * @returns {Date|null} L'objet Date ou null si conversion impossible
 */
export const convertTimestampToDate = (timestamp) => {
  if (!timestamp) return null;

  try {
    // Si c'est un timestamp Firebase avec seconds et nanoseconds
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    // Si c'est déjà un objet Date
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Si c'est une chaîne ISO ou un nombre
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la conversion du timestamp:', error);
    return null;
  }
};

/**
 * Formate un timestamp en heure (HH:MM)
 * @param {Object|string|number} timestamp - Le timestamp à formater
 * @returns {string} L'heure formatée
 */
export const formatTime = (timestamp) => {
  const date = convertTimestampToDate(timestamp);
  if (!date) return 'N/A';

  try {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Erreur de formatage de l\'heure:', error);
    return 'N/A';
  }
};

/**
 * Formate un timestamp en date (DD/MM/YYYY)
 * @param {Object|string|number} timestamp - Le timestamp à formater
 * @returns {string} La date formatée
 */
export const formatDate = (timestamp) => {
  const date = convertTimestampToDate(timestamp);
  if (!date) return 'N/A';

  try {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erreur de formatage de la date:', error);
    return 'N/A';
  }
};

/**
 * Formate un objet Date ou un timestamp en une chaîne de caractères lisible.
 * Exemple: 13/06/2025 14:30
 * @param {Date|number|string} date - L'objet Date, le timestamp ou la chaîne ISO à formater.
 * @returns {string} La date formatée.
 */
export const formatReadableDateTime = (date) => {
  if (!date) return 'N/A';

  try {
    const d = convertTimestampToDate(date) || new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Les mois sont de 0 à 11
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return 'Date invalide';
  }
};

/**
 * Formate un objet Date en une chaîne de caractères pour un nom de fichier.
 * Exemple: 2025-06-13_14-30-55
 * @param {Date} date - L'objet Date à formater.
 * @returns {string} La date formatée pour un nom de fichier.
 */
export const formatDateForFilename = (date = new Date()) => {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  } catch (error) {
    console.error('Erreur de formatage de date pour nom de fichier:', error);
    return 'date_invalide';
  }
};

/**
 * Renvoie une salutation basée sur l'heure de la journée.
 * @returns {string} 'Bonjour' ou 'Bonsoir'.
 */
export const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 18) {
    return 'Bonjour';
  }
  return 'Bonsoir';
};

// Export par défaut pour la compatibilité
const dateUtils = {
  convertTimestampToDate,
  formatTime,
  formatDate,
  formatReadableDateTime,
  formatDateForFilename,
  getGreeting
};

export default dateUtils;

// Vous pouvez ajouter d'autres fonctions utilitaires de date ici si nécessaire. 