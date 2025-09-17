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
      LAST_SEEN_VERSION: 'app_update_last_seen_version',
      AUTO_CHECK_ENABLED: 'app_update_auto_check'
    };
  }

  /**
   * Vérifie s'il y a une mise à jour disponible
   */
  async checkForUpdates(showNoUpdateMessage = false, forceCheck = false) {
    try {
      // Début vérification mises à jour
      
      // Si forceCheck est activé, nettoyer le cache
      if (forceCheck) {
        await this.clearUpdateCache();
      }
      
      // Forcer le rechargement de la version actuelle pour éviter le cache
      const currentVersion = this.getCurrentVersion();
      const latestVersion = await this.getLatestVersion();
      
      // Versions récupérées
      
      // Comparaison des versions
      const comparisonResult = this.compareVersions(latestVersion, currentVersion);
      const isUpdateAvailable = comparisonResult > 0;
      
      // Comparaison des versions terminée
      
      // Sauvegarder les informations
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_CHECK, Date.now().toString());
      await AsyncStorage.setItem(this.STORAGE_KEYS.UPDATE_AVAILABLE, isUpdateAvailable.toString());
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_VERSION, latestVersion);
      
      if (isUpdateAvailable) {
        // Mise à jour disponible
        return {
          available: true,
          latestVersion,
          currentVersion,
          downloadUrl: this.latestVersionInfo?.downloadUrl || this.GITHUB_DOWNLOAD_URL,
          releaseNotes: this.latestVersionInfo?.releaseNotes || 'Nouvelle version disponible'
        };
      } else {
        // Application à jour
        if (showNoUpdateMessage) {
          Alert.alert(
            'Aucune mise à jour',
            `Votre application est déjà à la dernière version (${currentVersion}).`,
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
      console.error('[AppUpdateService] Erreur lors de la vérification:', error);
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
      console.log('[AppUpdateService] Téléchargement de la mise à jour...');
      
      // Afficher une alerte de confirmation avec les notes de version
      const releaseNotes = this.latestVersionInfo?.releaseNotes || '';
      const message = `Une nouvelle version (${updateInfo.latestVersion}) est disponible.${releaseNotes ? `\n\nNouveautés:\n${releaseNotes}` : ''}\n\nVoulez-vous la télécharger et l'installer maintenant?`;
      
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
                  console.error('[AppUpdateService] Erreur téléchargement:', error);
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
      console.error('[AppUpdateService] Erreur installation:', error);
      throw error;
    }
  }

  /**
   * Ouvre le lien de release GitHub pour télécharger l'APK
   */
  async downloadApkAndInstall(downloadUrl, onProgress = null) {
    try {
      console.log('🔗 [AppUpdateService] Ouverture du lien de release...');
      console.log('🔗 [AppUpdateService] URL de release:', downloadUrl);
      
      if (!downloadUrl) {
        throw new Error('URL de release manquante');
      }
      
      // Afficher un message d'information
      Alert.alert(
        'Mise à jour disponible',
        'Le navigateur va s\'ouvrir pour télécharger la mise à jour.\n\nUne fois téléchargée, installez l\'APK manuellement.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ouvrir',
            onPress: async () => {
              try {
                // Ouvrir le lien de release dans le navigateur
                const supported = await Linking.canOpenURL(downloadUrl);
                if (supported) {
                  await Linking.openURL(downloadUrl);
                  console.log('[AppUpdateService] Lien de release ouvert');
                } else {
                  throw new Error('Impossible d\'ouvrir le lien');
                }
              } catch (error) {
                console.error('[AppUpdateService] Erreur ouverture lien:', error);
                Alert.alert('Erreur', 'Impossible d\'ouvrir le lien de téléchargement.');
              }
            }
          }
        ]
      );
      
      return true;
    } catch (error) {
      console.error('[AppUpdateService] Erreur ouverture lien:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir le lien de téléchargement.',
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
        console.log('ℹ️ [AppUpdateService] Vérification automatique désactivée');
        return null;
      }

      const lastCheck = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_CHECK);
      const now = Date.now();
      
      // Vérifier seulement si la dernière vérification date de plus d'une heure
      if (lastCheck && (now - parseInt(lastCheck)) < this.UPDATE_CHECK_INTERVAL) {
        console.log('ℹ️ [AppUpdateService] Vérification automatique ignorée (trop récente)');
        return null;
      }

      console.log('🔍 [AppUpdateService] Vérification automatique en cours...');
      const updateInfo = await this.checkForUpdates(false, true); // Force la vérification
      
      if (updateInfo.available) {
        // Vérifier si cette version a déjà été vue
        const lastSeenVersion = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SEEN_VERSION);
        if (lastSeenVersion !== updateInfo.latestVersion) {
          // Sauvegarder l'info de mise à jour pour l'alerte seulement si nouvelle version
          await AsyncStorage.setItem(this.STORAGE_KEYS.UPDATE_AVAILABLE, 'true');
          await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_VERSION, updateInfo.latestVersion);
          console.log('✅ [AppUpdateService] Nouvelle version détectée:', updateInfo.latestVersion);
        } else {
          console.log('ℹ️ [AppUpdateService] Version déjà vue:', updateInfo.latestVersion);
        }
      } else {
        console.log('ℹ️ [AppUpdateService] Aucune mise à jour disponible');
      }
      
      return updateInfo;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur vérification auto:', error);
      return null;
    }
  }

  /**
   * Vérifie s'il y a une mise à jour en attente d'affichage
   */
  async hasPendingUpdate() {
    try {
      const updateAvailable = await AsyncStorage.getItem(this.STORAGE_KEYS.UPDATE_AVAILABLE);
      return updateAvailable === 'true';
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur vérification mise à jour en attente:', error);
      return false;
    }
  }

  /**
   * Nettoie le cache des mises à jour pour forcer une vérification fraîche
   */
  async clearUpdateCache() {
    try {
      console.log('🧹 [AppUpdateService] Nettoyage du cache des mises à jour...');
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_CHECK);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.UPDATE_AVAILABLE);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_VERSION);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SEEN_VERSION);
      console.log('✅ [AppUpdateService] Cache des mises à jour nettoyé');
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur nettoyage cache:', error);
    }
  }

  /**
   * Marque la mise à jour comme vue (masque l'alerte)
   */
  async markUpdateAsSeen() {
    try {
      const lastVersion = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_VERSION);
      await AsyncStorage.setItem(this.STORAGE_KEYS.UPDATE_AVAILABLE, 'false');
      if (lastVersion) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SEEN_VERSION, lastVersion);
      }
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur marquage mise à jour vue:', error);
    }
  }

  /**
   * Vide complètement le cache des mises à jour
   */
  async clearUpdateCache() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_CHECK);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_VERSION);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.UPDATE_AVAILABLE);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SEEN_VERSION);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.AUTO_CHECK_ENABLED);
      
      // Cache clearing désactivé pour éviter les warnings webpack en mode web
      
      console.log('✅ [AppUpdateService] Cache des mises à jour vidé');
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur vidage cache:', error);
    }
  }

  /**
   * Obtient la version actuelle de l'application (version + build)
   */
  getCurrentVersion() {
    try {
      // Lire depuis app.json pour la version et le versionCode
      const appJson = require('../app.json');
      const version = appJson.expo.version;
      const buildNumber = appJson.expo.android?.versionCode || 55; // Fallback vers 55 si pas défini
      const fullVersion = `${version}.${buildNumber}`;
      
      // console.log('📱 [AppUpdateService] Version actuelle:', fullVersion);
      return fullVersion;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur lecture version:', error);
      return '1.0.0.0'; // Version par défaut
    }
  }

  /**
   * Obtient la version actuelle de l'application (méthode statique pour utilisation dans les composants)
   */
  static getCurrentVersion() {
    try {
      // Lire depuis app.json pour la version et le versionCode
      const appJson = require('../app.json');
      const version = appJson.expo.version;
      const buildNumber = appJson.expo.android?.versionCode || 55; // Fallback vers 55 si pas défini
      const fullVersion = `${version}.${buildNumber}`;
      
      // console.log('📱 [AppUpdateService] Version actuelle (statique):', fullVersion);
      console.log('📱 [AppUpdateService] Détails version:', {
        version: version,
        buildNumber: buildNumber,
        fullVersion: fullVersion
      });
      return fullVersion;
    } catch (error) {
      console.warn('❌ [AppUpdateService] Impossible de lire la version depuis app.json:', error.message);
      console.warn('❌ [AppUpdateService] Utilisation de la version par défaut: 1.0.0.0');
      return '1.0.0.0';
    }
  }

  /**
   * Obtient la dernière version disponible depuis GitHub Releases
   */
  async getLatestVersion() {
    try {
      console.log('🔍 [AppUpdateService] Vérification GitHub Releases...');
      console.log('🔗 [AppUpdateService] URL API:', this.GITHUB_API_URL);
      
      const response = await fetch(this.GITHUB_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'inovie-scan-mobile'
        }
      });
      
      console.log('📡 [AppUpdateService] Statut réponse:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 [AppUpdateService] Données GitHub reçues:', {
          tag_name: data.tag_name,
          name: data.name,
          published_at: data.published_at,
          html_url: data.html_url
        });
        
        if (data.tag_name || data.name) {
          // Utiliser tag_name si disponible, sinon utiliser name
          const versionSource = data.tag_name || data.name;
          const latestVersion = versionSource.replace(/^[vV]/, ''); // Enlever le 'v' ou 'V' du tag
          const releaseNotes = data.body || 'Nouvelle version disponible';
          
          // Le tag GitHub contient déjà la version complète (ex: v1.0.6.50)
          const fullVersion = latestVersion;
          
          // Utiliser directement le lien de release (plus simple et fiable)
          const releaseUrl = data.html_url;
          console.log('🔗 [AppUpdateService] Lien de release:', releaseUrl);
          
          // Sauvegarder les informations
          this.latestVersionInfo = {
            version: fullVersion,
            releaseNotes: releaseNotes,
            isForced: false,
            downloadUrl: releaseUrl,
            releaseId: data.id.toString(),
            publishedAt: data.published_at
          };
          
          console.log('✅ [AppUpdateService] Dernière version GitHub trouvée:', fullVersion);
          return fullVersion;
        } else {
          console.warn('⚠️ [AppUpdateService] Aucun tag_name ou name dans la réponse GitHub');
        }
      } else {
        console.error('❌ [AppUpdateService] Erreur GitHub API:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ [AppUpdateService] Détails erreur:', errorText);
      }
      
      // Méthode alternative : version locale
      console.log('🔄 [AppUpdateService] Fallback vers méthode alternative...');
      return await this.getLatestVersionFromPage();
      
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur API GitHub:', error);
      console.error('❌ [AppUpdateService] Détails erreur:', error.message);
      // En cas d'erreur, essayer la méthode alternative
      return await this.getLatestVersionFromPage();
    }
  }

  /**
   * Méthode alternative : récupère la version depuis la page GitHub Releases
   */
  async getLatestVersionFromPage() {
    try {
      console.log('🔍 [AppUpdateService] Tentative récupération version depuis page GitHub...');
      
      // Essayer de récupérer depuis la page GitHub Releases
      const response = await fetch(this.GITHUB_DOWNLOAD_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'inovie-scan-mobile'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Chercher la version dans le HTML de la page GitHub
        const versionMatch = html.match(/tag\/([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
        if (versionMatch && versionMatch[1]) {
          const latestVersion = versionMatch[1];
          console.log('✅ [AppUpdateService] Version trouvée depuis page GitHub:', latestVersion);
          
          this.latestVersionInfo = {
            version: latestVersion,
            releaseNotes: 'Mise à jour disponible',
            isForced: false,
            downloadUrl: this.GITHUB_DOWNLOAD_URL
          };
          
          return latestVersion;
        }
      }
      
      // Si pas de version trouvée, retourner la version actuelle
      const currentVersion = this.getCurrentVersion();
      console.log('⚠️ [AppUpdateService] Aucune version trouvée, utilisation version actuelle:', currentVersion);
      
      this.latestVersionInfo = {
        version: currentVersion,
        releaseNotes: 'Application à jour',
        isForced: false,
        downloadUrl: this.GITHUB_DOWNLOAD_URL
      };
      
      return currentVersion;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur récupération version page:', error);
      const currentVersion = this.getCurrentVersion();
      console.log('⚠️ [AppUpdateService] Fallback vers version actuelle:', currentVersion);
      return currentVersion;
    }
  }

  /**
   * Compare deux versions (format: "1.2.3.4")
   * Retourne: 1 si version1 > version2, -1 si version1 < version2, 0 si égales
   */
  compareVersions(version1, version2) {
    try {
      // Normaliser les versions (enlever les espaces, préfixes 'v', etc.)
      const v1 = version1.trim().replace(/^[vV]/, '').toLowerCase();
      const v2 = version2.trim().replace(/^[vV]/, '').toLowerCase();
      
      console.log(`🔍 [AppUpdateService] Comparaison: "${v1}" vs "${v2}"`);
      
      // Diviser en parties numériques
      const v1Parts = v1.split('.').map(part => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });
      const v2Parts = v2.split('.').map(part => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
      });
      
      // Comparer partie par partie
      const maxLength = Math.max(v1Parts.length, v2Parts.length);
      for (let i = 0; i < maxLength; i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        
        if (v1Part > v2Part) {
          console.log(`🆕 [AppUpdateService] Version GitHub plus récente (${v1Part} > ${v2Part})`);
          return 1;
        }
        if (v1Part < v2Part) {
          console.log(`📱 [AppUpdateService] Version locale plus récente (${v1Part} < ${v2Part})`);
          return -1;
        }
      }
      
      console.log('✅ [AppUpdateService] Versions identiques - Aucune mise à jour');
      return 0;
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur comparaison versions:', error);
      // En cas d'erreur, considérer qu'il n'y a pas de mise à jour
      return 0;
    }
  }

  /**
   * Active/désactive la vérification automatique
   */
  async setAutoCheckEnabled(enabled) {
    await AsyncStorage.setItem(this.STORAGE_KEYS.AUTO_CHECK_ENABLED, enabled.toString());
  }

  /**
   * Vide le cache des mises à jour pour forcer une nouvelle vérification
   */
  async clearUpdateCache() {
    try {
      console.log('🗑️ [AppUpdateService] Vidage du cache des mises à jour...');
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_CHECK);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_VERSION);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.UPDATE_AVAILABLE);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SEEN_VERSION);
      console.log('✅ [AppUpdateService] Cache vidé avec succès');
    } catch (error) {
      console.error('❌ [AppUpdateService] Erreur lors du vidage du cache:', error);
    }
  }

  /**
   * Force une vérification des mises à jour (ignore le cache)
   */
  async forceCheckForUpdates(showNoUpdateMessage = false) {
    console.log('🔄 [AppUpdateService] Vérification forcée des mises à jour...');
    await this.clearUpdateCache();
    return await this.checkForUpdates(showNoUpdateMessage, true);
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

