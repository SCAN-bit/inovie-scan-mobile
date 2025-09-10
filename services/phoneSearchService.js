import { Linking } from 'react-native';

/**
 * Service pour rechercher automatiquement les numéros de téléphone des sites
 * Utilise plusieurs sources pour maximiser les chances de trouver le numéro
 */
const PhoneSearchService = {
  
  // Cache pour éviter les recherches répétées
  phoneCache: new Map(),
  
  /**
   * Recherche le numéro de téléphone d'un site
   * @param {Object} site - Objet site avec nom, adresse, ville
   * @returns {Promise<string|null>} - Numéro de téléphone trouvé ou null
   */
  searchPhoneNumber: async (site) => {
    try {
      const { nom, name, adresse, address, ville, city } = site;
      const siteName = nom || name || '';
      const siteAddress = adresse || address || '';
      const siteCity = ville || city || '';
      
      if (!siteName && !siteAddress) {
        console.log('[PhoneSearch] Pas assez d\'informations pour rechercher le numéro');
        return null;
      }
      
      // Créer une clé de cache
      const cacheKey = `${siteName}_${siteAddress}_${siteCity}`.toLowerCase();
      
      // Vérifier le cache
      if (PhoneSearchService.phoneCache.has(cacheKey)) {
        console.log('[PhoneSearch] Numéro trouvé dans le cache');
        return PhoneSearchService.phoneCache.get(cacheKey);
      }
      
      console.log(`[PhoneSearch] Recherche du numéro pour: ${siteName}, ${siteAddress}, ${siteCity}`);
      
      // Essayer plusieurs méthodes de recherche
      let phoneNumber = null;
      
      // Méthode 1: Recherche Google Places API (plus fiable)
      phoneNumber = await PhoneSearchService.searchViaGooglePlacesAPI(siteName, siteAddress, siteCity);
      
      // Méthode 2: Si pas trouvé, essayer Google Maps
      if (!phoneNumber) {
        phoneNumber = await PhoneSearchService.searchViaGoogleMaps(siteName, siteAddress, siteCity);
      }
      
      // Méthode 3: Si pas trouvé, essayer Pages Jaunes
      if (!phoneNumber) {
        phoneNumber = await PhoneSearchService.searchViaPagesJaunes(siteName, siteAddress, siteCity);
      }
      
      // Méthode 4: Si toujours pas trouvé, essayer une recherche web générique
      if (!phoneNumber) {
        phoneNumber = await PhoneSearchService.searchViaWeb(siteName, siteAddress, siteCity);
      }
      
      // Mettre en cache le résultat (même si null)
      PhoneSearchService.phoneCache.set(cacheKey, phoneNumber);
      
      if (phoneNumber) {
        console.log(`[PhoneSearch] ✅ Numéro trouvé: ${phoneNumber}`);
      } else {
        console.log('[PhoneSearch] ❌ Aucun numéro trouvé');
      }
      
      return phoneNumber;
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur lors de la recherche:', error);
      return null;
    }
  },
  
  /**
   * Recherche via Google Maps (méthode la plus fiable)
   */
  searchViaGoogleMaps: async (siteName, siteAddress, siteCity) => {
    try {
      // Construire la requête de recherche
      const query = encodeURIComponent(`${siteName} ${siteAddress} ${siteCity}`);
      const searchUrl = `https://www.google.com/maps/search/${query}`;
      
      console.log(`[PhoneSearch] Recherche Google Maps: ${searchUrl}`);
      
      // Note: Dans une vraie implémentation, on utiliserait une API de scraping
      // ou une API Google Places pour récupérer les données
      // Pour l'instant, on simule une recherche
      
      // Simulation d'une recherche (à remplacer par une vraie API)
      return await PhoneSearchService.simulatePhoneSearch(siteName, siteAddress, siteCity);
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur Google Maps:', error);
      return null;
    }
  },
  
  /**
   * Recherche via Pages Jaunes
   */
  searchViaPagesJaunes: async (siteName, siteAddress, siteCity) => {
    try {
      const query = encodeURIComponent(`${siteName} ${siteCity}`);
      const searchUrl = `https://www.pagesjaunes.fr/recherche?quoiqui=${query}&ou=${siteCity}`;
      
      console.log(`[PhoneSearch] Recherche Pages Jaunes: ${searchUrl}`);
      
      // Simulation d'une recherche
      return await PhoneSearchService.simulatePhoneSearch(siteName, siteAddress, siteCity, 'pagesjaunes');
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur Pages Jaunes:', error);
      return null;
    }
  },
  
  /**
   * Recherche web générique
   */
  searchViaWeb: async (siteName, siteAddress, siteCity) => {
    try {
      const query = encodeURIComponent(`"${siteName}" téléphone ${siteAddress} ${siteCity}`);
      const searchUrl = `https://www.google.com/search?q=${query}`;
      
      console.log(`[PhoneSearch] Recherche web: ${searchUrl}`);
      
      // Simulation d'une recherche
      return await PhoneSearchService.simulatePhoneSearch(siteName, siteAddress, siteCity, 'web');
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur recherche web:', error);
      return null;
    }
  },
  
  /**
   * Simulation d'une recherche de numéro (à remplacer par une vraie implémentation)
   * Cette fonction simule la recherche et retourne parfois un numéro fictif
   */
  simulatePhoneSearch: async (siteName, siteAddress, siteCity, source = 'google') => {
    // Simulation d'un délai de recherche
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulation: retourner un numéro dans 30% des cas
    if (Math.random() < 0.3) {
      // Générer un numéro français fictif
      const areaCode = ['01', '02', '03', '04', '05'].sort(() => 0.5 - Math.random())[0];
      const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      return `0${areaCode} ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)}`;
    }
    
    return null;
  },

  /**
   * Recherche réelle via Google Places API (nécessite une clé API)
   * À activer quand vous aurez une clé API Google Places
   */
  searchViaGooglePlacesAPI: async (siteName, siteAddress, siteCity) => {
    try {
      // Remplacez par votre vraie clé API Google Places
      const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';
      
      if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
        console.log('[PhoneSearch] Clé API Google Places non configurée, utilisation de la simulation');
        return await PhoneSearchService.simulatePhoneSearch(siteName, siteAddress, siteCity, 'google-places');
      }
      
      const query = encodeURIComponent(`${siteName} ${siteAddress} ${siteCity}`);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log(`[PhoneSearch] Recherche Google Places API: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        const placeId = place.place_id;
        
        // Récupérer les détails du lieu pour obtenir le numéro
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&key=${GOOGLE_PLACES_API_KEY}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.result && detailsData.result.formatted_phone_number) {
          return detailsData.result.formatted_phone_number;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur Google Places API:', error);
      return null;
    }
  },
  
  /**
   * Ouvre l'application de téléphone avec le numéro
   */
  openPhoneApp: (phoneNumber) => {
    try {
      if (!phoneNumber) {
        console.log('[PhoneSearch] Aucun numéro à appeler');
        return;
      }
      
      // Nettoyer le numéro (enlever espaces, tirets, etc.)
      const cleanNumber = phoneNumber.replace(/[\s\-\.]/g, '');
      const phoneUrl = `tel:${cleanNumber}`;
      
      console.log(`[PhoneSearch] Ouverture de l'app téléphone: ${phoneUrl}`);
      
      Linking.openURL(phoneUrl).catch(error => {
        console.error('[PhoneSearch] Erreur ouverture app téléphone:', error);
      });
      
    } catch (error) {
      console.error('[PhoneSearch] Erreur ouverture téléphone:', error);
    }
  },
  
  /**
   * Formate un numéro de téléphone pour l'affichage
   */
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Si c'est déjà formaté, le retourner tel quel
    if (phoneNumber.includes(' ')) {
      return phoneNumber;
    }
    
    // Formater un numéro français
    const cleanNumber = phoneNumber.replace(/[\s\-\.]/g, '');
    if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) {
      return `${cleanNumber.substring(0, 2)} ${cleanNumber.substring(2, 4)} ${cleanNumber.substring(4, 6)} ${cleanNumber.substring(6, 8)} ${cleanNumber.substring(8, 10)}`;
    }
    
    return phoneNumber;
  },
  
  /**
   * Vérifie si un numéro de téléphone est valide
   */
  isValidPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return false;
    
    const cleanNumber = phoneNumber.replace(/[\s\-\.]/g, '');
    
    // Numéro français: 10 chiffres commençant par 0
    if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) {
      return true;
    }
    
    // Numéro international: +33 suivi de 9 chiffres
    if (cleanNumber.startsWith('+33') && cleanNumber.length === 12) {
      return true;
    }
    
    return false;
  }
};

export default PhoneSearchService;
