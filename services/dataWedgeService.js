import DataWedgeIntents from 'react-native-datawedge-intents';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DataWedgeService {
  constructor() {
    this.initialized = false;
    this.isListening = false;
    this.scanCallback = null;
    this.profileName = 'InovieScanProfile';
    this.intentAction = 'com.inovie.scan.ACTION';
    this.resultAction = 'com.symbol.datawedge.api.RESULT_ACTION';
    this.configurationKey = 'datawedge_configured';
  }

  // Initialiser DataWedge avec vérification de configuration existante
  async initialize() {
    if (this.initialized) return;

    console.log('[DataWedgeService] Initialisation...');
    
    try {
      // 1. Enregistrer les broadcast receivers (toujours nécessaire)
      await this.registerBroadcastReceivers();
      
      // 2. Vérifier si le profil est déjà configuré
      const isConfigured = await this.isProfileConfigured();
      
      if (!isConfigured) {
        console.log('[DataWedgeService] 🔧 Première installation - Configuration complète...');
        await this.resetProfile();
        await this.configureDataWedgeProfile();
        await this.markProfileAsConfigured();
        console.log('[DataWedgeService] ✅ Configuration sauvegardée pour les prochains lancements');
      } else {
        console.log('[DataWedgeService] ⚡ Profil déjà configuré - Activation rapide...');
      }
      
      // 3. Activer le profil existant (rapide)
      await this.forceActivateProfile();
      
      this.initialized = true;
      console.log('[DataWedgeService] Initialisé avec succès');
    } catch (error) {
      console.error('[DataWedgeService] Erreur d\'initialisation:', error);
      throw error;
    }
  }

  // Activation optimisée du profil DataWedge
  async forceActivateProfile() {
    console.log('[DataWedgeService] ⚡ Activation rapide du profil...');
    
    try {
      // Activation simple et rapide - le profil existe déjà
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', this.profileName);
      await this.delay(200); // Délai réduit
      
      // Activer le scanner
      await this.sendCommand('com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN', 'ENABLE_PLUGIN');
      await this.delay(100); // Délai réduit
      
      console.log('[DataWedgeService] ✅ Profil activé rapidement');
    } catch (error) {
      console.error('[DataWedgeService] Erreur lors de l\'activation:', error);
    }
  }

  // Réinitialiser complètement le profil DataWedge
  async resetProfile() {
    console.log('[DataWedgeService] Suppression de l\'ancien profil...');
    
    try {
      // Supprimer l'ancien profil s'il existe
      await this.sendCommand('com.symbol.datawedge.api.DELETE_PROFILE', this.profileName);
      await this.delay(1000); // Attendre plus longtemps pour la suppression
      
      console.log('[DataWedgeService] Ancien profil supprimé');
    } catch (error) {
      console.log('[DataWedgeService] Aucun ancien profil à supprimer (normal pour première installation)');
    }
  }

  // Enregistrer les broadcast receivers
  async registerBroadcastReceivers() {
    console.log('[DataWedgeService] Enregistrement des broadcast receivers...');
    
    DataWedgeIntents.registerBroadcastReceiver({
      filterActions: [
        this.intentAction,
        this.resultAction,
        'com.symbol.datawedge.api.NOTIFICATION_ACTION' // Ajout action manquante
      ],
      filterCategories: [
        'android.intent.category.DEFAULT'
      ]
    });

    // Listener pour les événements de broadcast
    DeviceEventEmitter.addListener('datawedge_broadcast_intent', this.handleBroadcastIntent.bind(this));
  }

  // Gérer les broadcasts reçus
  handleBroadcastIntent(intent) {
    console.log('[DataWedgeService] Broadcast reçu:', JSON.stringify(intent, null, 2));

    if (intent.action === this.intentAction) {
      // Données de scan reçues
      const scanData = intent.extras;
      if (scanData && scanData['com.symbol.datawedge.data_string']) {
        const barcodeData = {
          data: scanData['com.symbol.datawedge.data_string'],
          type: scanData['com.symbol.datawedge.label_type'],
          timestamp: Date.now()
        };
        
        console.log('[DataWedgeService] Scan détecté:', barcodeData);
        
        if (this.scanCallback) {
          this.scanCallback(barcodeData);
        }
      }
    } else if (intent.action === this.resultAction || intent.action === 'com.symbol.datawedge.api.NOTIFICATION_ACTION') {
      // Réponse aux commandes API
      console.log('[DataWedgeService] Réponse API DataWedge:', intent.extras);
    }
  }

  // Configuration SIMPLIFIÉE et CORRIGÉE du profil DataWedge
  async configureDataWedgeProfile() {
    console.log('[DataWedgeService] Configuration CORRIGÉE du profil DataWedge...');

    try {
      // 🚀 OPTIMISATION: Configuration groupée pour réduire les délais
      console.log('[DataWedgeService] ⚡ Configuration optimisée en cours...');
      
      // 1. Créer le profil
      await this.sendCommand('com.symbol.datawedge.api.CREATE_PROFILE', this.profileName);
      await this.delay(500); // Réduit de 2000ms à 500ms

      // 2. Configuration groupée de l'application et des plugins
      const completeConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "CREATE_IF_NOT_EXIST",
        "APP_LIST": [{
          "PACKAGE_NAME": "SCAN.mobile",
          "ACTIVITY_LIST": ["*"]
        }],
        "PLUGIN_CONFIG": [
          {
            "PLUGIN_NAME": "BARCODE",
            "RESET_CONFIG": "true",
            "PARAM_LIST": {
              "scanner_input_enabled": "true",
              "trigger_mode": "0",
              "hardware_trigger_enabled": "true"
            }
          },
          {
            "PLUGIN_NAME": "INTENT",
            "RESET_CONFIG": "true",
            "PARAM_LIST": {
              "intent_output_enabled": "true",
              "intent_action": this.intentAction,
              "intent_delivery": "2",
              "intent_category": "android.intent.category.DEFAULT"
            }
          },
          {
            "PLUGIN_NAME": "KEYSTROKE",
            "RESET_CONFIG": "true",
            "PARAM_LIST": {
              "keystroke_output_enabled": "false"
            }
          }
        ]
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', completeConfig);
      await this.delay(800); // Configuration plus rapide

      console.log('[DataWedgeService] ✅ Configuration groupée terminée - gain de temps significatif');

    } catch (error) {
      console.error('[DataWedgeService] Erreur lors de la configuration:', error);
      throw error;
    }
  }

  // Envoyer une commande à DataWedge
  async sendCommand(command, parameter) {
    try {
      console.log(`[DataWedgeService] Commande: ${command}`, parameter);
      
      const broadcastExtras = {};
      broadcastExtras[command] = parameter;
      broadcastExtras["SEND_RESULT"] = "true";
      
      DataWedgeIntents.sendBroadcastWithExtras({
        action: "com.symbol.datawedge.api.ACTION",
        extras: broadcastExtras
      });
    } catch (error) {
      console.error(`[DataWedgeService] ERREUR lors de l'envoi de commande ${command}:`, error);
      throw error;
    }
  }

  // Définir le callback pour les scans
  setScanCallback(callback) {
    this.scanCallback = callback;
    console.log('[DataWedgeService] Callback de scan défini');
  }

  // Supprimer le callback
  removeScanCallback() {
    this.scanCallback = null;
    console.log('[DataWedgeService] Callback de scan supprimé');
  }

  // Activer le scanner
  async enableScanner() {
    await this.sendCommand('com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN', 'ENABLE_PLUGIN');
    console.log('[DataWedgeService] Scanner activé');
  }

  // Désactiver le scanner
  async disableScanner() {
    await this.sendCommand('com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN', 'DISABLE_PLUGIN');
    console.log('[DataWedgeService] Scanner désactivé');
  }

  // Déclencher un scan logiciel
  async softScanTrigger() {
    await this.sendCommand('com.symbol.datawedge.api.SOFT_SCAN_TRIGGER', 'START_SCANNING');
    console.log('[DataWedgeService] Scan logiciel déclenché');
  }

  // Test de diagnostic pour vérifier la configuration ET l'association
  async testDataWedgeConfiguration() {
    console.log('[DataWedgeService] Test COMPLET de configuration DataWedge...');
    
    try {
      // Vérifier si DataWedge est disponible
      await this.sendCommand('com.symbol.datawedge.api.GET_VERSION_INFO', '');
      await this.delay(500);
      
      // Lister tous les profils
      await this.sendCommand('com.symbol.datawedge.api.GET_PROFILES_LIST', '');
      await this.delay(500);
      
      // Vérifier le profil actuel
      await this.sendCommand('com.symbol.datawedge.api.GET_ACTIVE_PROFILE', '');
      await this.delay(500);
      
      // Vérifier la configuration de notre profil
      await this.sendCommand('com.symbol.datawedge.api.GET_CONFIG', this.profileName);
      await this.delay(500);
      
      // NOUVEAU: Vérifier les applications associées
      await this.sendCommand('com.symbol.datawedge.api.GET_ASSOCIATED_APPS', this.profileName);
      await this.delay(500);
      
      // Test du scanner
      await this.sendCommand('com.symbol.datawedge.api.SCANNER_INPUT_PLUGIN', 'GET_CONFIG');
      
      console.log('[DataWedgeService] Tests de diagnostic complets envoyés');
      console.log('[DataWedgeService] Regardez les logs pour voir si l\'application est associée');
    } catch (error) {
      console.error('[DataWedgeService] Erreur lors du test de diagnostic:', error);
    }
  }

  // NOUVELLE: Fonction pour FORCER l'association de l'application
  async forceApplicationAssociation() {
    console.log('[DataWedgeService] FORCE l\'association de l\'application...');
    
    try {
      // Méthode 1: Reconfiguration complète avec OVERWRITE
      const forceAppConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "OVERWRITE", // Force l'écrasement complet
        "APP_LIST": [{
          "PACKAGE_NAME": "SCAN.mobile",
          "ACTIVITY_LIST": ["*"]
        }]
      };
      
      console.log('[DataWedgeService] Configuration OVERWRITE...');
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', forceAppConfig);
      await this.delay(3000);
      
      // Méthode 2: Association directe par commande spécifique
      console.log('[DataWedgeService] Association directe...');
      await this.sendCommand('com.symbol.datawedge.api.ASSOCIATE_PROFILE', {
        "PROFILE_NAME": this.profileName,
        "PACKAGE_NAME": "inovie.scan.mobile"
      });
      await this.delay(2000);
      
      // Méthode 3: Activer le profil pour finaliser
      console.log('[DataWedgeService] Activation du profil...');
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', this.profileName);
      await this.delay(1000);
      
      console.log('[DataWedgeService] Association forcée terminée');
      console.log('[DataWedgeService] Testez maintenant le scan avec le bouton jaune !');
      
    } catch (error) {
      console.error('[DataWedgeService] Erreur lors du forçage d\'association:', error);
    }
  }

  // Vérifier si le profil DataWedge est déjà configuré
  async isProfileConfigured() {
    try {
      const configured = await AsyncStorage.getItem(this.configurationKey);
      return configured === 'true';
    } catch (error) {
      console.warn('[DataWedgeService] Erreur vérification configuration:', error);
      return false;
    }
  }

  // Marquer le profil comme configuré
  async markProfileAsConfigured() {
    try {
      await AsyncStorage.setItem(this.configurationKey, 'true');
      console.log('[DataWedgeService] Configuration marquée comme terminée');
    } catch (error) {
      console.error('[DataWedgeService] Erreur sauvegarde configuration:', error);
    }
  }

  // Réinitialiser la configuration (pour forcer une reconfiguration)
  async resetConfiguration() {
    try {
      await AsyncStorage.removeItem(this.configurationKey);
      console.log('[DataWedgeService] Configuration réinitialisée');
    } catch (error) {
      console.error('[DataWedgeService] Erreur réinitialisation configuration:', error);
    }
  }

  // Fonction utilitaire pour attendre
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Nettoyer les listeners
  cleanup() {
    if (this.isListening) {
      DeviceEventEmitter.removeAllListeners('datawedge_broadcast_intent');
      this.isListening = false;
    }
    this.scanCallback = null;
    console.log('[DataWedgeService] Nettoyage effectué');
  }

  // Activer le profil DataWedge (quand on entre sur ScanScreen)
  async activateProfile() {
    try {
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', this.profileName);
      console.log('[DataWedgeService] Profil activé:', this.profileName);
    } catch (error) {
      console.error('[DataWedgeService] Erreur activation profil:', error);
    }
  }

  // Désactiver le profil DataWedge (quand on quitte ScanScreen)
  async deactivateProfile() {
    try {
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', 'Profile0');
      console.log('[DataWedgeService] Profil désactivé, retour au profil par défaut');
    } catch (error) {
      console.error('[DataWedgeService] Erreur désactivation profil:', error);
    }
  }
}

// Instance singleton
const dataWedgeService = new DataWedgeService();

export default dataWedgeService; 