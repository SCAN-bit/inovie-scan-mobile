import DataWedgeIntents from 'react-native-datawedge-intents';

class KeystrokeDataWedgeService {
  constructor() {
    this.initialized = false;
    this.profileName = 'InovieScanKeystrokeProfile';
  }

  // Initialiser DataWedge en mode Keystroke avec auto-validation
  async initialize() {
    if (this.initialized) return;

    // Log supprimé pour nettoyer la console
    
    try {
      // 1. Supprimer l'ancien profil s'il existe
      await this.resetProfile();
      
      // 2. Configurer le profil DataWedge pour Keystroke avec Enter
      await this.configureKeystrokeProfile();
      
      // 3. Activer le profil
      await this.activateProfile();
      
      this.initialized = true;
      // Log supprimé pour nettoyer la console
    } catch (error) {
      console.error('[KeystrokeDataWedgeService] Erreur d\'initialisation:', error);
      throw error;
    }
  }

  // Réinitialiser complètement le profil
  async resetProfile() {
    // Log supprimé pour nettoyer la console
    
    try {
      await this.sendCommand('com.symbol.datawedge.api.DELETE_PROFILE', this.profileName);
      await this.delay(1000);
      // Log supprimé pour nettoyer la console
    } catch (error) {
      // Log supprimé pour nettoyer la console
    }
  }

  // Configuration du profil DataWedge pour mode Keystroke + Enter
  async configureKeystrokeProfile() {
    // Log supprimé pour nettoyer la console

    try {
      // 1. Créer le profil
      await this.sendCommand('com.symbol.datawedge.api.CREATE_PROFILE', this.profileName);
      await this.delay(2000);

      // 2. Associer l'application
      const appConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "CREATE_IF_NOT_EXIST",
        "APP_LIST": [{
          "PACKAGE_NAME": "SCAN.mobile",
          "ACTIVITY_LIST": ["*"]
        }]
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', appConfig);
      await this.delay(2000);

      // 3. Configuration du scanner
      const barcodeConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "UPDATE",
        "PLUGIN_CONFIG": {
          "PLUGIN_NAME": "BARCODE",
          "RESET_CONFIG": "true",
          "PARAM_LIST": {
            "scanner_input_enabled": "true",
            "trigger_mode": "0", // Hardware trigger
            "hardware_trigger_enabled": "true"
          }
        }
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', barcodeConfig);
      await this.delay(1500);

      // 4. Configuration Keystroke avec Enter automatique
      const keystrokeConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "UPDATE",
        "PLUGIN_CONFIG": {
          "PLUGIN_NAME": "KEYSTROKE",
          "RESET_CONFIG": "true",
          "PARAM_LIST": {
            "keystroke_output_enabled": "true",
            "keystroke_delay_control": "0", // Pas de délai
            "keystroke_action_char": "13", // Enter (code 13)
            "keystroke_delay_multibyte": "0",
            "keystroke_delay_extended_ascii": "0"
          }
        }
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', keystrokeConfig);
      await this.delay(1500);

      // 5. Désactiver Intent Output pour éviter les conflits
      const intentConfig = {
        "PROFILE_NAME": this.profileName,
        "PROFILE_ENABLED": "true",
        "CONFIG_MODE": "UPDATE",
        "PLUGIN_CONFIG": {
          "PLUGIN_NAME": "INTENT",
          "RESET_CONFIG": "true",
          "PARAM_LIST": {
            "intent_output_enabled": "false"
          }
        }
      };
      
      await this.sendCommand('com.symbol.datawedge.api.SET_CONFIG', intentConfig);
      await this.delay(1000);

      // Log supprimé pour nettoyer la console

    } catch (error) {
      console.error('[KeystrokeDataWedgeService] Erreur lors de la configuration:', error);
      throw error;
    }
  }

  // Envoyer une commande à DataWedge
  async sendCommand(command, parameter) {
    try {
      console.log(`[KeystrokeDataWedgeService] Commande: ${command}`, parameter);
      
      const broadcastExtras = {};
      broadcastExtras[command] = parameter;
      broadcastExtras["SEND_RESULT"] = "true";
      
      DataWedgeIntents.sendBroadcastWithExtras({
        action: "com.symbol.datawedge.api.ACTION",
        extras: broadcastExtras
      });
    } catch (error) {
      console.error(`[KeystrokeDataWedgeService] ERREUR lors de l'envoi de commande ${command}:`, error);
      throw error;
    }
  }

  // Activer le profil DataWedge
  async activateProfile() {
    try {
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', this.profileName);
      // Log supprimé pour nettoyer la console
    } catch (error) {
      console.error('[KeystrokeDataWedgeService] Erreur activation profil:', error);
    }
  }

  // Désactiver le profil DataWedge
  async deactivateProfile() {
    try {
      await this.sendCommand('com.symbol.datawedge.api.SWITCH_TO_PROFILE', 'Profile0');
      // Log supprimé pour nettoyer la console
    } catch (error) {
      console.error('[KeystrokeDataWedgeService] Erreur désactivation profil:', error);
    }
  }

  // Test de diagnostic
  async testConfiguration() {
    // Log supprimé pour nettoyer la console
    
    try {
      await this.sendCommand('com.symbol.datawedge.api.GET_ACTIVE_PROFILE', '');
      await this.sendCommand('com.symbol.datawedge.api.GET_CONFIG', this.profileName);
      
      // Log supprimé pour nettoyer la console
    } catch (error) {
      console.error('[KeystrokeDataWedgeService] Erreur lors du test:', error);
    }
  }

  // Fonction utilitaire pour attendre
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance singleton
const keystrokeDataWedgeService = new KeystrokeDataWedgeService();

export default keystrokeDataWedgeService; 