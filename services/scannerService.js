/**
 * scannerService.js
 * 
 * Service pour gérer le scan de codes-barres et QR codes.
 */

import { Alert } from 'react-native';

class ScannerService {
  constructor() {
    this.isScanning = false;
    this.scanHistory = [];
    this.scanListeners = []; // Ajout des listeners
  }

  /**
   * Ajoute un listener pour les scans
   * @param {Function} listener - Fonction à appeler lors d'un scan
   */
  addScanListener(listener) {
    if (typeof listener === 'function') {
      this.scanListeners.push(listener);
      // Listener ajouté
    }
  }

  /**
   * Supprime un listener de scan
   * @param {Function} listener - Fonction à supprimer
   */
  removeScanListener(listener) {
    const index = this.scanListeners.indexOf(listener);
    if (index > -1) {
      this.scanListeners.splice(index, 1);
      // Listener supprimé
    }
  }

  /**
   * Notifie tous les listeners d'un nouveau scan
   * @param {Object} scanData - Données du scan
   */
  notifyListeners(scanData) {
    this.scanListeners.forEach(listener => {
      try {
        listener(scanData);
      } catch (error) {
        console.error('Erreur dans le listener de scan:', error);
      }
    });
  }

  /**
   * Initialise le service de scan
   * @returns {Promise<boolean>} Succès de l'initialisation
   */
  async initialize() {
    try {
      // Initialisation du scanner
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du scanner:', error);
      return false;
    }
  }

  /**
   * Démarre un scan
   * @param {Object} options - Options de scan
   * @returns {Promise<Object>} Résultat du scan
   */
  async startScan(options = {}) {
    try {
      if (this.isScanning) {
        throw new Error('Un scan est déjà en cours');
      }

      this.isScanning = true;
      // Démarrage du scan

      // Ici, vous intégreriez une vraie bibliothèque de scan comme expo-camera ou react-native-camera
      // Pour l'instant, c'est un placeholder qui simule un scan

      return {
        success: true,
        data: null, // Les données scannées seraient ici
        type: null, // Le type de code scanné (QR, barcode, etc.)
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Arrête le scan en cours
   */
  stopScan() {
    this.isScanning = false;
    // Scan arrêté
  }

  /**
   * Traite un code scanné et notifie les listeners
   * @param {string} code - Le code scanné
   * @param {string} type - Le type de code
   * @returns {Object} Résultat du traitement
   */
  processScannedCode(code, type = 'unknown') {
    try {
      if (!code || typeof code !== 'string') {
        throw new Error('Code invalide');
      }

      const scanResult = {
        code: code.trim(),
        type: type,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      // Ajouter à l'historique
      this.addToHistory(scanResult);

      // Notifier les listeners
      this.notifyListeners(scanResult);

      // Code traité
      return {
        success: true,
        data: scanResult
      };
    } catch (error) {
      console.error('Erreur lors du traitement du code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valide un code scanné
   * @param {string} code - Le code à valider
   * @returns {boolean} Validité du code
   */
  validateCode(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Validation basique - vous pouvez adapter selon vos besoins
    const trimmedCode = code.trim();
    return trimmedCode.length > 0 && trimmedCode.length <= 100;
  }

  /**
   * Ajoute un scan à l'historique
   * @param {Object} scanResult - Résultat du scan
   */
  addToHistory(scanResult) {
    this.scanHistory.unshift(scanResult);
    
    // Limiter l'historique à 50 éléments
    if (this.scanHistory.length > 50) {
      this.scanHistory = this.scanHistory.slice(0, 50);
    }
  }

  /**
   * Récupère l'historique des scans
   * @returns {Array} Historique des scans
   */
  getHistory() {
    return [...this.scanHistory];
  }

  /**
   * Efface l'historique
   */
  clearHistory() {
    this.scanHistory = [];
    // Historique effacé
  }

  /**
   * Vérifie si un scan est en cours
   * @returns {boolean} État du scan
   */
  isScanInProgress() {
    return this.isScanning;
  }

  /**
   * Formate un code pour l'affichage
   * @param {string} code - Le code à formater
   * @returns {string} Code formaté
   */
  formatCodeForDisplay(code) {
    if (!code) return 'N/A';
    
    // Limiter l'affichage à 20 caractères avec "..." si plus long
    if (code.length > 20) {
      return code.substring(0, 17) + '...';
    }
    
    return code;
  }
}

// Exporter une instance unique du service
const scannerService = new ScannerService();
export default scannerService; 