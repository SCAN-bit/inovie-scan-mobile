/**
 * Service DataWedge Zebra - Version simplifiée et robuste
 * Pour diagnostiquer et résoudre les problèmes de scan
 */

import { DeviceEventEmitter, Platform } from 'react-native';
import DataWedgeIntents from 'react-native-datawedge-intents';

class ZebraDataWedgeService {
  constructor() {
    this.isInitialized = false;
    this.scanCallback = null;
    this.profileName = 'InovieScanProfile';
    this.intentAction = 'com.inovie.scan.ACTION';
    this.listeners = [];
    this.diagnosticMode = false;
    this.lastScanData = null;
  }

  // Activer le mode diagnostic pour voir tout ce qui se passe
  enableDiagnosticMode() {
    this.diagnosticMode = true;
    // Log supprimé pour nettoyer la console
  }

  // Initialisation complète avec diagnostic
  async initialize() {
    if (Platform.OS !== 'android') {
      // Log supprimé pour nettoyer la console
      return false;
    }

    // Log supprimé pour nettoyer la console
    
    try {
      // 1. Nettoyer les anciens listeners
      this.cleanup();
      
      // 2. Enregistrer le receiver principal
      this.registerBroadcastReceiver();
      
      // 3. Configuration basique du profil
      await this.createBasicProfile();
      
      // 4. Activer le profil
      await this.activateProfile();
      
      this.isInitialized = true;
      // Log supprimé pour nettoyer la console
      return true;
      
    } catch (error) {
      console.error('[ZebraDataWedge] ❌ Erreur d\'initialisation:', error);
      return false;
    }
  }

  // Enregistrer le receiver avec diagnostic
  registerBroadcastReceiver() {
    // Log supprimé pour nettoyer la console
    
    try {
      // Nettoyer d'abord
      this.cleanup();
      
      // Enregistrer avec toutes les actions possibles
      DataWedgeIntents.registerBroadcastReceiver({
        filterActions: [
          this.intentAction,
          'com.symbol.datawedge.api.RESULT_ACTION',
          'com.symbol.datawedge.api.NOTIFICATION_ACTION',
          'com.symbol.datawedge.api.ACTION_RESULT',
          // Actions alternatives au cas où
          'com.symbol.datawedge.data_string',
          'android.intent.action.SCAN'
        ],
        filterCategories: [
          'android.intent.category.DEFAULT'
        ]
      });

      // Listener principal avec diagnostic complet
      const listener = DeviceEventEmitter.addListener('datawedge_broadcast_intent', (intent) => {
        this.handleBroadcastIntent(intent);
      });
      
      this.listeners.push(listener);
      // Log supprimé pour nettoyer la console
      
    } catch (error) {
      console.error('[ZebraDataWedge] ❌ Erreur enregistrement receiver:', error);
    }
  }

  // Gestionnaire avec diagnostic détaillé
  handleBroadcastIntent(intent) {
    if (this.diagnosticMode || true) { // Toujours logger pour l'instant
      // Log supprimé pour nettoyer la console
      console.log('  Action:', intent.action);
      console.log('  Extras:', JSON.stringify(intent.extras, null, 2));
    }

    // Analyser tous les types de données possibles
    const scanData = this.extractScanData(intent);
    
    if (scanData) {
      // Log supprimé pour nettoyer la console
      this.lastScanData = scanData;
      
      if (this.scanCallback) {
        try {
          this.scanCallback(scanData);
        } catch (error) {
          console.error('[ZebraDataWedge] Erreur dans le callback:', error);
        }
      } else {
        console.warn('[ZebraDataWedge] ⚠️ Scan reçu mais aucun callback défini');
      }
    }
  }

  // Extraire les données de scan de différentes sources
  extractScanData(intent) {
    if (!intent || !intent.extras) {
      return null;
    }

    const extras = intent.extras;
    let data = null;
    let type = 'unknown';

    // Méthode 1: DataWedge standard
    if (extras['com.symbol.datawedge.data_string']) {
      data = extras['com.symbol.datawedge.data_string'];
      type = extras['com.symbol.datawedge.label_type'] || 'barcode';
    }
    // Méthode 2: Intent direct
    else if (extras.data) {
      data = extras.data;
      type = extras.type || 'barcode';
    }
    // Méthode 3: Scan alternatif
    else if (extras.scan_data) {
      data = extras.scan_data;
      type = extras.scan_type || 'barcode';
    }
    // Méthode 4: Zebra alternatif
    else if (extras.barcode_string) {
      data = extras.barcode_string;
      type = extras.barcode_type || 'barcode';
    }

    if (data && typeof data === 'string' && data.trim().length > 0) {
      return {
        data: data.trim(),
        type: type,
        timestamp: Date.now(),
        source: 'zebra_datawedge'
      };
    }

    return null;
  }

  // Configuration basique du profil (simplifié pour éviter les erreurs)
  async createBasicProfile() {
    // Log supprimé pour nettoyer la console
    
    try {
      // Supprimer l'ancien profil
      await this.sendCommand('com.symbol.datawedge.api.DELETE_PROFILE', this.profileName);
      await this.delay(1000);
      
      // Créer le nouveau profil
      await this.sendCommand('com.symbol.datawedge.api.CREATE_PROFILE', this.profileName);
      await this.delay(2000);
      
      // Configuration minimale de l'application
      const appConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "UPDATE",
        "APP_LIST": [{
          "PACKAGE_NAME": "SCAN.mobile",
          "ACTIVITY_LIST": ["*"]
        }]
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', appConfig);
      await this.delay(1500);
      
      // Configuration Intent minimale
      const intentConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "UPDATE",
        "PLUGIN_CONFIG": {
          "PLUGIN_NAME": "INTENT",
          "RESET_CONFIG": "true",
          "PARAM_LIST": {
            "intent_output_enabled": "true",
            "intent_action": this.intentAction,
            "intent_delivery": "2"
          }
        }
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', intentConfig);
      await this.delay(1000);
      
      // Log supprimé pour nettoyer la console
      
    } catch (error) {
      console.error('[ZebraDataWedge] ❌ Erreur création profil:', error);
      throw error;
    }
  }

  // Activer le profil
  async activateProfile() {
    try {
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', this.profileName);
      // Log supprimé pour nettoyer la console
    } catch (error) {
      console.error('[ZebraDataWedge] ❌ Erreur activation profil:', error);
    }
  }

  // Envoyer une commande DataWedge
  async sendCommand(command, parameter) {
    try {
      console.log(`[ZebraDataWedge] 📤 Commande: ${command}`, parameter);
      
      const broadcastExtras = {};
      broadcastExtras[command] = parameter;
      broadcastExtras["SEND_RESULT"] = "true";
      
      DataWedgeIntents.sendBroadcastWithExtras({
        action: "com.symbol.datawedge.api.ACTION",
        extras: broadcastExtras
      });
      
    } catch (error) {
      console.error(`[ZebraDataWedge] ❌ Erreur commande ${command}:`, error);
      throw error;
    }
  }

  // Test complet de diagnostic
  async runFullDiagnostic() {
    console.log('\n[ZebraDataWedge] 🔬 === DIAGNOSTIC COMPLET ZEBRA ===');
    
    try {
      // Test 1: Vérifier la version de DataWedge
      await this.sendCommand('com.symbol.datawedge.api.GET_VERSION_INFO', '');
      await this.delay(500);
      
      // Test 2: Lister tous les profils
      await this.sendCommand('com.symbol.datawedge.api.GET_PROFILES_LIST', '');
      await this.delay(500);
      
      // Test 3: Profil actuel
      await this.sendCommand('com.symbol.datawedge.api.GET_ACTIVE_PROFILE', '');
      await this.delay(500);
      
      // Test 4: Configuration de notre profil
      await this.sendCommand('com.symbol.datawedge.api.GET_CONFIG', this.profileName);
      await this.delay(500);
      
      // Test 5: Statut du scanner
      await this.sendCommand('com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN', 'GET_STATUS');
      await this.delay(500);
      
      // Test 6: Déclencher un scan test
      await this.sendCommand('com.symbol.datawedge.api.SOFT_SCAN_TRIGGER', 'START_SCANNING');
      
      // Log supprimé pour nettoyer la console
      
    } catch (error) {
      console.error('[ZebraDataWedge] ❌ Erreur diagnostic:', error);
    }
  }

  // Test de scan simulé
  simulateScan() {
    // Log supprimé pour nettoyer la console
    
    const testScanData = {
      data: 'TEST_ZEBRA_' + Date.now(),
      type: 'TEST',
      timestamp: Date.now(),
      source: 'simulation'
    };
    
    if (this.scanCallback) {
      this.scanCallback(testScanData);
    }
    
    // Log supprimé pour nettoyer la console
  }

  // Définir le callback pour les scans
  setScanCallback(callback) {
    this.scanCallback = callback;
    // Log supprimé pour nettoyer la console
  }

  // Supprimer le callback
  removeScanCallback() {
    this.scanCallback = null;
    // Log supprimé pour nettoyer la console
  }

  // Obtenir le dernier scan pour debug
  getLastScan() {
    return this.lastScanData;
  }

  // Nettoyer les listeners
  cleanup() {
    this.listeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.listeners = [];
    
    try {
      DeviceEventEmitter.removeAllListeners('datawedge_broadcast_intent');
    } catch (error) {
      // Ignorer les erreurs de nettoyage
    }
    
    // Log supprimé pour nettoyer la console
  }

  // Utilitaire délai
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance singleton
const zebraDataWedgeService = new ZebraDataWedgeService();

export default zebraDataWedgeService; 