import FirebaseService from './firebaseService';

/**
 * Service pour gérer les appels API
 */
class ApiService {
  /**
   * Tente de connecter l'utilisateur
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise<Object>} Résultat de la connexion
   */
  async login(email, password) {
    try {
      const result = await FirebaseService.login(email, password);
      return { success: true, user: result.user, userData: result.userData };
    } catch (error) {
      return { 
        success: false, 
        error: error.code === 'auth/user-not-found' ? 'Utilisateur non trouvé' :
               error.code === 'auth/wrong-password' ? 'Mot de passe incorrect' :
               error.code === 'auth/invalid-email' ? 'Email invalide' :
               'Erreur de connexion: ' + error.message
      };
    }
  }

  /**
   * Déconnecte l'utilisateur
   * @returns {Promise<Object>} Résultat de la déconnexion
   */
  async logout() {
    try {
      await FirebaseService.logout();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie si l'utilisateur est actuellement connecté
   * @returns {Promise<boolean>} État de connexion
   */
  async isAuthenticated() {
    return FirebaseService.isAuthenticated();
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   * @returns {Promise<Object|null>} Informations utilisateur ou null
   */
  async getUserInfo() {
    return FirebaseService.getCurrentUser();
  }

  /**
   * Récupère la liste des scans de l'utilisateur
   * @returns {Promise<Array>} Liste des scans
   */
  async getScans() {
    try {
      const scans = await FirebaseService.getScans();
      return { success: true, data: scans };
    } catch (error) {
      console.error('Erreur lors de la récupération des scans:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajoute un nouveau scan
   * @param {Object} scanData - Données du scan à ajouter
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async addScan(scanData) {
    try {
      const newScan = await FirebaseService.addScan(scanData);
      return { success: true, data: newScan };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du scan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour un scan existant
   * @param {string} id - ID du scan à mettre à jour
   * @param {Object} scanData - Nouvelles données du scan
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async updateScan(id, scanData) {
    try {
      const updatedScan = await FirebaseService.updateScan(id, scanData);
      return { success: true, data: updatedScan };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du scan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprime un scan
   * @param {string} id - ID du scan à supprimer
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async deleteScan(id) {
    try {
      await FirebaseService.deleteScan(id);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du scan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère le profil de l'utilisateur
   * @returns {Promise<Object>} Profil utilisateur
   */
  async getUserProfile() {
    try {
      const profile = await FirebaseService.getUserProfile();
      return { success: true, data: profile };
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour le profil utilisateur
   * @param {Object} profileData - Nouvelles données du profil
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async updateUserProfile(profileData) {
    try {
      const updatedProfile = await FirebaseService.updateUserProfile(profileData);
      return { success: true, data: updatedProfile };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exporter une instance unique du service
const apiService = new ApiService();
export default apiService;