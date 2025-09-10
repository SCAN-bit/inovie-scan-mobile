import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

class AppUpdateService {
  constructor() {
    // Configuration GitHub Releases (remplace Firebase App Distribution)
    this.GITHUB_OWNER = 'SCAN-bit'; // Nom d'utilisateur GitHub correct
    this.GITHUB_REPO = 'inovie-scan-mobile'; // À remplacer par votre nom de repo
    this.GITHUB_API_URL = `https://api.github.com/repos/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/releases/latest`;
    this.GITHUB_DOWNLOAD_URL = `https://github.com/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/releases/latest`;
    
    this.UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // Vérifier toutes les heures
    this.STORAGE_KEYS = {
      LAST_CHECK: 'app_update_last_check',
      LAST_VERSION: 'app_update_last_version',
      UPDATE_AVAILABLE: 'app_update_available',
      AUTO_CHECK_ENABLED: 'app_update_auto_check'
    };
  }

  /**
   * Vérifie s'il y a une mise à jour disponible
   */
  async checkForUpdates(showNoUpdateMessage = false) {
    try {
      // Log supprimé pour nettoyer la console
      
      // Simuler une vérification (à remplacer par votre API ou Firebase Function)
      const currentVersion = this.getCurrentVersion();
      const latestVersion = await this.getLatestVersion();
      
      console.log(`📱 Version actuelle: ${currentVersion}`);
      console.log(`🆕 Dernière version: ${latestVersion}`);
      
      const isUpdateAvailable = this.compareVersions(latestVersion, currentVersion) > 0;
      
      // Sauvegarder les informations
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_CHECK, Date.now().toString());
      await AsyncStorage.setItem(this.STORAGE_KEYS.UPDATE_AVAILABLE, isUpdateAvailable.toString());
      
      if (isUpdateAvailable) {
        console.log('✅ [AppUpdateService] Mise à jour disponible!');
        return {
          available: true,
          latestVersion,
          currentVersion,
          downloadUrl: this.APP_DISTRIBUTION_URL
        };
      } else {
        console.log('ℹ️ [AppUpdateService] Application à jour');
        if (showNoUpdateMessage) {
          Alert.alert(
            'Aucune mise à jour',
            'Votre application est déjà à la dernière version.',
            [{ text: 'OK' }]
          );
        }
        return {
          available: false,
          latestVersion,
          currentVersion
        };
      }
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur lors de la vérification:', error);
      if (showNoUpdateMessage) {
        Alert.alert(
          'Erreur',
          'Impossible de vérifier les mises à jour. Vérifiez votre connexion internet.',
          [{ text: 'OK' }]
        );
      }
      return { available: false, error: error.message };
    }
  }

  /**
   * Télécharge et installe la mise à jour
   */
  async downloadAndInstallUpdate(updateInfo) {
    try {
      console.log('⬇️ [AppUpdateService] Téléchargement de la mise à jour...');
      
      // Afficher une alerte de confirmation avec les notes de version
      const releaseNotes = this.latestVersionInfo?.releaseNotes || '';
      const message = `Une nouvelle version (${updateInfo.latestVersion}) est disponible.${releaseNotes ? `\n\n📋 Nouveautés:\n${releaseNotes}` : ''}\n\nVoulez-vous la télécharger et l'installer maintenant?`;
      
      return new Promise((resolve) => {
        Alert.alert(
          'Mise à jour disponible',
          message,
          [
            {
              text: 'Plus tard',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Télécharger',
              onPress: async () => {
                try {
                  // Obtenir le lien de téléchargement direct
                  const downloadUrl = await this.getDirectDownloadUrl();
                  
                  // Télécharger et installer automatiquement l'APK
                  const success = await this.downloadApkAndInstall(downloadUrl);
                  resolve(success);
                } catch (error) {
                  console.error('❌ [AppUpdateService] Erreur téléchargement:', error);
                  Alert.alert(
                    'Erreur',
                    'Impossible de télécharger la mise à jour.',
                    [{ text: 'OK' }]
                  );
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur installation:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'APK et ouvre l'installateur (version avancée)
   */
  async downloadApkAndInstall(downloadUrl) {
    try {
      console.log('⬇️ [AppUpdateService] Téléchargement de l\'APK...');
      
      const downloadPath = `${FileSystem.documentDirectory}app-update.apk`;
      
      // Supprimer l'ancien fichier s'il existe
      const fileInfo = await FileSystem.getInfoAsync(downloadPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(downloadPath);
      }
      
      // Télécharger le nouveau fichier
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, downloadPath);
      
      if (downloadResult.status === 200) {
        console.log('✅ [AppUpdateService] APK téléchargé avec succès');
        
        // Ouvrir l'installateur Android
        if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: downloadResult.uri,
            flags: 1,
            type: 'application/vnd.android.package-archive',
          });
        }
        
        return true;
      } else {
        throw new Error(`Échec du téléchargement: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur téléchargement APK:', error);
      Alert.alert(
        'Erreur de téléchargement',
        'Impossible de télécharger la mise à jour. Vérifiez votre connexion internet.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Vérification automatique des mises à jour
   */
  async checkForUpdatesAutomatic() {
    try {
      const autoCheckEnabled = await this.isAutoCheckEnabled();
      if (!autoCheckEnabled) {
        return null;
      }

      const lastCheck = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_CHECK);
      const now = Date.now();
      
      // Vérifier seulement si la dernière vérification date de plus d'une heure
      if (lastCheck && (now - parseInt(lastCheck)) < this.UPDATE_CHECK_INTERVAL) {
        return null;
      }

      const updateInfo = await this.checkForUpdates(false);
      
      if (updateInfo.available) {
        // Afficher une notification discrète
        setTimeout(() => {
          Alert.alert(
            'Mise à jour disponible',
            `Une nouvelle version (${updateInfo.latestVersion}) de l'application est disponible.`,
            [
              { text: 'Plus tard', style: 'cancel' },
              { 
                text: 'Télécharger', 
                onPress: () => this.downloadAndInstallUpdate(updateInfo)
              }
            ]
          );
        }, 2000); // Attendre 2 secondes après le démarrage
      }
      
      return updateInfo;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur vérification auto:', error);
      return null;
    }
  }

  /**
   * Obtient la version actuelle de l'application
   */
  getCurrentVersion() {
    try {
      // Récupérer la version depuis app.json
      const appJson = require('../app.json');
      return appJson.expo.version;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur lecture version:', error);
      return '1.0.0'; // Version par défaut
    }
  }

  /**
   * Obtient la dernière version disponible depuis GitHub Releases
   */
  async getLatestVersion() {
    try {
      console.log('🔍 [AppUpdateService] Vérification GitHub Releases...');
      
      const response = await fetch(this.GITHUB_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'inovie-scan-mobile'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 [AppUpdateService] Réponse GitHub:', data);
        
        if (data.tag_name) {
          const latestVersion = data.tag_name.replace('v', ''); // Enlever le 'v' du tag
          const releaseNotes = data.body || 'Nouvelle version disponible';
          const downloadUrl = data.html_url; // Lien vers la page de release
          
          // Trouver l'APK dans les assets
          let apkDownloadUrl = null;
          if (data.assets && data.assets.length > 0) {
            const apkAsset = data.assets.find(asset => asset.name.endsWith('.apk'));
            if (apkAsset) {
              apkDownloadUrl = apkAsset.browser_download_url;
            }
          }
          
          // Sauvegarder les informations
          this.latestVersionInfo = {
            version: latestVersion,
            releaseNotes: releaseNotes,
            isForced: false,
            downloadUrl: apkDownloadUrl || downloadUrl,
            releaseId: data.id.toString(),
            publishedAt: data.published_at
          };
          
          console.log('📱 [AppUpdateService] Dernière version trouvée:', latestVersion);
          return latestVersion;
        }
      } else {
        console.log('⚠️ [AppUpdateService] Erreur GitHub API:', response.status);
      }
      
      // Méthode alternative : version locale
      return await this.getLatestVersionFromPage();
      
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur API GitHub:', error);
      // En cas d'erreur, essayer la méthode alternative
      return await this.getLatestVersionFromPage();
    }
  }

  /**
   * Méthode alternative : récupère la version depuis la page Firebase App Distribution
   */
  async getLatestVersionFromPage() {
    try {
      const currentVersion = this.getCurrentVersion();
      // Log supprimé pour nettoyer la console
      
      // Pour les tests réels, vous devrez créer une version plus récente sur Firebase
      // et le système la détectera automatiquement
      
      // Pour l'instant, retourner la version actuelle (pas de mise à jour)
      const latestVersion = currentVersion;
      const releaseNotes = 'Application à jour';
      
      this.latestVersionInfo = {
        version: latestVersion,
        releaseNotes: releaseNotes,
        isForced: false,
        downloadUrl: this.APP_DISTRIBUTION_URL
      };
      
      console.log('📱 [AppUpdateService] Version alternative:', latestVersion);
      return latestVersion;
      
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur méthode alternative:', error);
      return this.getCurrentVersion();
    }
  }

  /**
   * Compare deux versions (format: "1.2.3")
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Active/désactive la vérification automatique
   */
  async setAutoCheckEnabled(enabled) {
    await AsyncStorage.setItem(this.STORAGE_KEYS.AUTO_CHECK_ENABLED, enabled.toString());
  }

  /**
   * Vide le cache des mises à jour
   */
  async clearUpdateCache() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.LAST_CHECK,
        this.STORAGE_KEYS.LAST_VERSION,
        this.STORAGE_KEYS.UPDATE_AVAILABLE
      ]);
      console.log('🧹 [AppUpdateService] Cache des mises à jour vidé');
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur vidage cache:', error);
    }
  }

  /**
   * Vérifie si la vérification automatique est activée
   */
  async isAutoCheckEnabled() {
    const enabled = await AsyncStorage.getItem(this.STORAGE_KEYS.AUTO_CHECK_ENABLED);
    return enabled !== 'false'; // Activé par défaut
  }

  /**
   * Obtient les informations de mise à jour en cache
   */
  async getCachedUpdateInfo() {
    try {
      const available = await AsyncStorage.getItem(this.STORAGE_KEYS.UPDATE_AVAILABLE);
      const lastCheck = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_CHECK);
      
      return {
        available: available === 'true',
        lastCheck: lastCheck ? new Date(parseInt(lastCheck)) : null
      };
    } catch (error) {
      return { available: false, lastCheck: null };
    }
  }

  /**
   * Obtient le lien de téléchargement direct pour la dernière version
   */
  async getDirectDownloadUrl() {
    try {
      // Si nous avons les informations de la dernière release GitHub
      if (this.latestVersionInfo && this.latestVersionInfo.downloadUrl) {
        console.log('🔗 [AppUpdateService] URL de téléchargement GitHub:', this.latestVersionInfo.downloadUrl);
        return this.latestVersionInfo.downloadUrl;
      }
      
      // Fallback vers l'URL générale GitHub
      return this.GITHUB_DOWNLOAD_URL;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur URL téléchargement:', error);
      return this.GITHUB_DOWNLOAD_URL;
    }
  }
}

export default new AppUpdateService(); 
