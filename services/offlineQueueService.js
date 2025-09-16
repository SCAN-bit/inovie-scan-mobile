import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import firebaseService from './firebaseService';

class OfflineQueueService {
  constructor() {
    this.isProcessing = false;
    this.queueKey = 'offline_scan_queue';
    this.retryInterval = null;
    this.listeners = [];
    
    // Écouter les changements de connectivité
    this.initNetworkListener();
  }

  // Initialiser l'écoute de la connectivité réseau
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      // Log supprimé pour nettoyer la console
      
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  // Ajouter des scans à la queue hors-ligne
  async addToQueue(scansData) {
    try {
      const existingQueue = await this.getQueue();
      const timestamp = Date.now();
      
      const queueItem = {
        id: `queue_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        data: scansData,
        timestamp,
        retryCount: 0,
        status: 'pending'
      };

      existingQueue.push(queueItem);
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(existingQueue));
      
      // Scans ajoutés à la queue hors-ligne
      
      // Notifier les listeners
      this.notifyListeners('queued', { count: scansData.length, queueSize: existingQueue.length });
      
      return queueItem.id;
    } catch (error) {
      console.error('[OfflineQueue] Erreur ajout queue:', error);
      throw error;
    }
  }

  // Récupérer la queue actuelle
  async getQueue() {
    try {
      const queue = await AsyncStorage.getItem(this.queueKey);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('[OfflineQueue] Erreur lecture queue:', error);
      return [];
    }
  }

  // Obtenir le nombre d'éléments en attente
  async getQueueSize() {
    const queue = await this.getQueue();
    return queue.filter(item => item.status === 'pending').length;
  }

  // Traiter la queue quand la connexion revient
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    // Log supprimé pour nettoyer la console

    try {
      const queue = await this.getQueue();
      const pendingItems = queue.filter(item => item.status === 'pending');
      
      if (pendingItems.length === 0) {
        // Log supprimé pour nettoyer la console
        this.isProcessing = false;
        return;
      }

      // Traitement des éléments en attente
      
      let successCount = 0;
      let failCount = 0;

      for (const item of pendingItems) {
        try {
          // Vérifier la connectivité avant chaque tentative
          const netState = await NetInfo.fetch();
          if (!netState.isConnected) {
            // Log supprimé pour nettoyer la console
            break;
          }

          // Envoi des scans
          const result = await firebaseService.addPassages(item.data);
          
          if (result.success) {
            // Marquer comme réussi
            item.status = 'completed';
            item.completedAt = Date.now();
            successCount++;
            
            console.log(`[OfflineQueue] Envoi réussi: ${item.data.length} scan(s)`);
            this.notifyListeners('sent', { count: item.data.length });
          } else {
            throw new Error(result.error || 'Échec envoi');
          }
          
        } catch (error) {
          console.error(`[OfflineQueue] Échec envoi item ${item.id}:`, error.message);
          
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = error.message;
          item.lastRetry = Date.now();
          
          // Abandon après 3 tentatives
          if (item.retryCount >= 3) {
            item.status = 'failed';
            console.error(`[OfflineQueue] Abandon après 3 tentatives: ${item.id}`);
          }
          
          failCount++;
        }
      }

      // Sauvegarder la queue mise à jour
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(queue));
      
      // Nettoyer les éléments traités (garder seulement pending et failed récents)
      await this.cleanupQueue();
      
      console.log(`[OfflineQueue] Traitement terminé: ${successCount} réussis, ${failCount} échecs`);
      
      this.notifyListeners('processed', { 
        success: successCount, 
        failed: failCount, 
        remaining: await this.getQueueSize() 
      });
      
    } catch (error) {
      console.error('[OfflineQueue] Erreur traitement queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Nettoyer la queue (supprimer les anciens éléments traités)
  async cleanupQueue() {
    try {
      const queue = await this.getQueue();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24h
      
      const cleanedQueue = queue.filter(item => {
        // Garder les éléments pending
        if (item.status === 'pending') return true;
        
        // Garder les éléments récents (moins de 24h)
        const age = now - (item.completedAt || item.timestamp);
        return age < maxAge;
      });
      
      if (cleanedQueue.length !== queue.length) {
        await AsyncStorage.setItem(this.queueKey, JSON.stringify(cleanedQueue));
        console.log(`[OfflineQueue] 🧹 Queue nettoyée: ${queue.length - cleanedQueue.length} anciens éléments supprimés`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Erreur nettoyage queue:', error);
    }
  }

  // Vider complètement la queue
  async clearQueue() {
    try {
      await AsyncStorage.removeItem(this.queueKey);
      // Log supprimé pour nettoyer la console
      this.notifyListeners('cleared', {});
    } catch (error) {
      console.error('[OfflineQueue] Erreur vidage queue:', error);
      throw error;
    }
  }

  // Forcer le traitement de la queue
  async forceProcess() {
    if (this.isProcessing) {
      // Log supprimé pour nettoyer la console
      return;
    }
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('Aucune connexion réseau disponible');
    }
    
    await this.processQueue();
  }

  // Ajouter un listener pour les événements
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notifier tous les listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[OfflineQueue] Erreur listener:', error);
      }
    });
  }

  // Obtenir les statistiques de la queue
  async getStats() {
    const queue = await this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(item => item.status === 'pending').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      oldestPending: queue
        .filter(item => item.status === 'pending')
        .reduce((oldest, item) => 
          !oldest || item.timestamp < oldest.timestamp ? item : oldest, null)
    };
  }
}

// Instance singleton
const offlineQueueService = new OfflineQueueService();

export default offlineQueueService; 