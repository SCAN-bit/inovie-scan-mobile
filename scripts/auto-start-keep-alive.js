// Keep-alive Supabase intégré dans l'application
// Se lance automatiquement au démarrage de l'app

const SUPABASE_URL = 'https://xcljahinisqetnsyjmvc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbGphaGluaXNxZXRuc3lqbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTgwMzcsImV4cCI6MjA3MTA5NDAzN30.D9bpEubfMSF-MOE3UQs1_Jr8DDx479byvhEgxVeh8xU';

class SupabaseKeepAlive {
  constructor() {
    this.isRunning = false;
    this.pingInterval = null;
    this.PING_INTERVAL = 4 * 60 * 60 * 1000; // 4 heures
    this.lastPing = null;
  }

  // Ping silencieux vers Supabase
  async pingSupabase() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        timeout: 5000
      });
      
      this.lastPing = new Date();
      
      if (response.ok) {
        // Supabase actif
        return true;
      } else {
        // Supabase répond mais avec erreur
        return false;
      }
    } catch (error) {
      // Supabase inaccessible
      return false;
    }
  }

  // Démarrer le keep-alive
  start() {
    if (this.isRunning) {
      return;
    }

    // Démarrage automatique Supabase
    this.isRunning = true;

    // Ping immédiat
    this.pingSupabase();

    // Programmer les pings réguliers
    this.pingInterval = setInterval(() => {
      this.pingSupabase();
    }, this.PING_INTERVAL);

    // Ping toutes les heures
  }

  // Arrêter le keep-alive
  stop() {
    if (!this.isRunning) {
      return;
    }

    // Arrêt du keep-alive
    this.isRunning = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Instance globale
const supabaseKeepAlive = new SupabaseKeepAlive();

// Démarrer automatiquement
supabaseKeepAlive.start();

// Exporter pour utilisation dans l'app
export default supabaseKeepAlive;
