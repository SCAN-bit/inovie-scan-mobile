import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { v4 as uuidv4 } from 'uuid';

// Configuration Supabase
const supabaseUrl = 'https://xcljahinisqetnsyjmvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbGphaGluaXNxZXRuc3lqbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTgwMzcsImV4cCI6MjA3MTA5NDAzN30.D9bpEubfMSF-MOE3UQs1_Jr8DDx479byvhEgxVeh8xU';

// Initialiser le client Supabase avec configuration optimisée pour mobile
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'inovie-scan-mobile'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Clés pour le stockage local
const AUTH_TOKEN_KEY = 'supabase_auth_token';
const USER_DATA_KEY = 'supabase_user_data';

const SupabaseService = {
  // Authentification
  login: async (email, password) => {
    try {
      // Tentative de connexion avec Supabase
      
      // Fermer toute session existante avant la connexion
      try {
        await SupabaseService.closeCurrentSession();
        // Session précédente fermée automatiquement
      } catch (sessionError) {
        // Pas de session active à fermer
      }
      
      // Tentative de connexion avec Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        console.error('Erreur de connexion Supabase:', error);
        throw error;
      }
      
      // Connexion réussie avec Supabase
      
      // Stocker les informations utilisateur
      try {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.session.access_token);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
          email: data.user.email,
          uid: data.user.id
        }));
        // Informations utilisateur stockées avec succès
      } catch (storageError) {
        console.error('Erreur lors du stockage des informations utilisateur:', storageError);
      }
      
      return data.user;
    } catch (error) {
      console.error('Erreur détaillée de connexion:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
      // Déconnexion réussie
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  },
  
  register: async (email, password, selasId = '') => {
    try {
      // Créer l'utilisateur avec Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      });
      
      if (error) {
        console.error('Erreur d\'inscription Supabase:', error);
        throw error;
      }
      
      const user = data.user;
      
      // Si pas de selasId fourni, essayer de trouver une SELAS associée à cet email
      let finalSelasId = selasId;
      if (!finalSelasId) {
        const { data: selasData } = await supabase
          .from('selas')
          .select('id')
          .contains('user_emails', [email])
          .single();
        
        if (selasData) {
          finalSelasId = selasData.id;
        }
      }
      
      // Créer un profil utilisateur
      const userProfile = {
        id: user.id,
        email: user.email,
        selas_id: finalSelasId,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      // Enregistrer le profil dans la table users
      const { error: profileError } = await supabase
        .from('users')
        .insert([userProfile]);
      
      if (profileError) {
        console.error('Erreur création profil:', profileError);
        throw profileError;
      }
      
      // Stocker le selasId localement
      if (finalSelasId) {
        await AsyncStorage.setItem('user_selas_id', finalSelasId);
      }
      
      return {
        user,
        profile: userProfile
      };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const userData = await AsyncStorage.getItem(USER_DATA_KEY);
        return userData ? JSON.parse(userData) : null;
      }
      
      // Mettre à jour AsyncStorage si nécessaire
      const userToSave = {
        email: user.email,
        uid: user.id
      };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, user.aud || '');
      
      return userToSave;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },
  
  getCurrentUserId: async () => {
    try {
      const userData = await SupabaseService.getCurrentUser();
      if (!userData || !userData.uid) {
        console.warn('Aucun utilisateur authentifié ou UID manquant');
        return null;
      }
      return userData.uid;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      return null;
    }
  },

  isAuthenticated: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'authentification:', error);
      return false;
    }
  },
  
  // Obtenir la SELAS d'un utilisateur
  getUserSelas: async () => {
    try {
      // D'abord vérifier si le selasId est stocké localement
      const selasId = await AsyncStorage.getItem('user_selas_id');
      if (selasId) {
        console.log('SELAS ID récupéré du stockage local:', selasId);
        return selasId;
      }
      
      // Sinon, essayer de le récupérer depuis Supabase
      const userData = await SupabaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Vérifier si l'utilisateur a un selasId dans sa table users
      const { data: userProfile } = await supabase
        .from('users')
        .select('selas_id')
        .eq('id', userData.uid)
        .single();
      
      if ((userProfile && userProfile.selas_id)) {
        const selasId = userProfile.selas_id;
        // Stocker pour utilisation future
        await AsyncStorage.setItem('user_selas_id', selasId);
        console.log('SELAS ID récupéré du profil et stocké localement:', selasId);
        return selasId;
      }
      
      // Si aucun selasId n'est trouvé, vérifier dans la table 'selas'
      const { data: selasData } = await supabase
        .from('selas')
        .select('id')
        .contains('user_emails', [userData.email])
        .single();
      
      if (selasData) {
        const selasId = selasData.id;
        // Mettre à jour le profil utilisateur
        await supabase
          .from('users')
          .update({ selas_id: selasId })
          .eq('id', userData.uid);
        
        // Stocker pour utilisation future
        await AsyncStorage.setItem('user_selas_id', selasId);
        console.log('SELAS ID trouvé via email et stocké:', selasId);
        return selasId;
      }
      
      console.warn('Aucun SELAS ID trouvé pour l\'utilisateur');
      return '';
    } catch (error) {
      console.error('Erreur lors de la récupération de la SELAS:', error);
      return '';
    }
  },

  // Récupérer toutes les SELAS disponibles
  getAllSelas: async () => {
    try {
      console.log('Récupération de toutes les SELAS...');
      
      const { data: selasList, error } = await supabase
        .from('selas')
        .select('*')
        .order('nom');
      
      if (error) {
        console.error('Erreur récupération SELAS:', error);
        throw error;
      }
      
      console.log(`${selasList.length} SELAS récupérées:`, selasList.map(s => s.nom));
      return selasList.map(selas => ({
        id: selas.id,
        nom: selas.nom || 'SELAS sans nom',
        description: selas.description || '',
        code: selas.code || '',
        active: selas.active !== false,
        dateCreation: selas.created_at,
        dateModification: selas.updated_at,
        accesPages: selas.acces_pages || {},
        sitesAutorises: selas.sites_autorises || []
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des SELAS:', error);
      throw error;
    }
  },

  // Session de travail
  saveSessionData: async (sessionData) => {
    try {
      const userData = await SupabaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      // Récupérer le selasId pour l'associer aux données
      const selasId = await SupabaseService.getUserSelas();
      
      const sessionInfo = {
        user_id: userData.uid,
        tournee_id: sessionData.(tournee && tournee.id) || null,
        vehicule_id: sessionData.(vehicule && vehicule.id) || null,
        pole_id: sessionData.(pole && pole.id) || null,
        status: 'active',
        selas_id: selasId || null,
        visited_site_identifiers: [],
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // Sauvegarder la session dans Supabase
      const { data, error } = await supabase
        .from('sessions')
        .insert([sessionInfo])
        .select()
        .single();
      
      if (error) {
        console.error('Erreur sauvegarde session:', error);
        throw error;
      }
      
      // Stocker l'ID de session localement
      await AsyncStorage.setItem('current_session_id', data.id);
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
      throw error;
    }
  },

  getCurrentSession: async () => {
    try {
      // Vérifier s'il existe une session active dans le stockage local
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) return null;
      
      // Récupérer les détails de la session depuis Supabase
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();
      
      if (error || !sessionData) {
        // Session non trouvée, supprimer la référence locale
        await AsyncStorage.removeItem('current_session_id');
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return null;
    }
  },
  
  closeCurrentSession: async () => {
    try {
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) return false;
      
      // Mettre à jour la session comme terminée
      const { error } = await supabase
        .from('sessions')
        .update({ 
          end_time: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) {
        console.error('Erreur fermeture session:', error);
        throw error;
      }
      
      // Supprimer la référence locale
      await AsyncStorage.removeItem('current_session_id');
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la fermeture de la session:', error);
      throw error;
    }
  },

  // Récupérer les véhicules
  getVehicules: async () => {
    try {
      console.log('Tentative de récupération des véhicules...');
      
      const selasId = await SupabaseService.getUserSelas();
      
      let query = supabase.from('vehicules').select('*');
      
      if (selasId) {
        query = query.eq('selas_id', selasId);
      }
      
      const { data: vehicules, error } = await query;
      
      if (error) {
        console.error('Erreur récupération véhicules:', error);
        throw error;
      }
      
      if (!vehicules || vehicules.length === 0) {
        console.log('Aucun véhicule trouvé, retour des données par défaut');
        return [
          { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', selas_id: selasId },
          { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', selas_id: selasId }
        ];
      }
      
      return vehicules;
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      const selasId = await SupabaseService.getUserSelas().catch(() => "");
      return [
        { id: 'V1', immatriculation: 'AB-123-CD', modele: 'Renault Master', type: 'Utilitaire', selas_id: selasId },
        { id: 'V2', immatriculation: 'EF-456-GH', modele: 'Citroën Jumper', type: 'Fourgon', selas_id: selasId }
      ];
    }
  },

  // Récupérer les tournées
  getTournees: async () => {
    try {
      const selasId = await SupabaseService.getUserSelas();
      
      let query = supabase.from('tournees').select('*').order('nom');
      
      if (selasId) {
        query = query.eq('selas_id', selasId);
      }
      
      const { data: tournees, error } = await query;
      
      if (error) {
        console.error('Erreur récupération tournées:', error);
        throw error;
      }
      
      return tournees || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des tournées:', error);
      throw error;
    }
  },

  // Récupérer les pôles
  getPoles: async () => {
    try {
      console.log('Tentative de récupération des pôles...');
      
      const selasId = await SupabaseService.getUserSelas();
      
      let query = supabase.from('poles').select('*');
      
      if (selasId) {
        query = query.eq('selas_id', selasId);
      }
      
      const { data: poles, error } = await query;
      
      if (error) {
        console.error('Erreur récupération pôles:', error);
        throw error;
      }
      
      if (!poles || poles.length === 0) {
        console.log('Aucun pôle trouvé, retour des données par défaut');
        return [
          { id: 'P1', nom: 'Pôle Nord', selas_id: selasId },
          { id: 'P2', nom: 'Pôle Centre', selas_id: selasId },
          { id: 'P3', nom: 'Pôle Sud', selas_id: selasId }
        ];
      }
      
      return poles;
    } catch (error) {
      console.error('Erreur lors de la récupération des pôles:', error);
      const selasId = await SupabaseService.getUserSelas().catch(() => "");
      return [
        { id: 'P1', nom: 'Pôle Nord', selas_id: selasId },
        { id: 'P2', nom: 'Pôle Centre', selas_id: selasId },
        { id: 'P3', nom: 'Pôle Sud', selas_id: selasId }
      ];
    }
  },

  // Ajouter des scans/passages
  addScans: async (scansArray) => {
    console.log('addScans appelé avec:', scansArray.length, 'scans');
    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) {
        console.log('Utilisateur non connecté lors de l\'envoi des scans');
        return { success: false, error: 'Utilisateur non connecté' };
      }
      
      const userProfile = await SupabaseService.getUserProfile();
      const selaId = await SupabaseService.getUserSelas();
      const sessionData = await SupabaseService.getCurrentSession();
      
      const userName = (userProfile && userProfile.nom) && (userProfile && userProfile.prenom) 
        ? `${userProfile.prenom} ${userProfile.nom}` 
        : user.email;
      
      // Formatage des données pour Supabase
      const formattedScans = scansArray.map(scan => ({
        id_colis: scan.idColis || scan.code || '',
        scan_date: scan.scanDate || new Date().toISOString(),
        operation_type: scan.operationType || 'entree',
        session_id: scan.sessionId || '',
        coursier_charge: userName || user.email,
        coursier_chargeant_id: user.uid,
        tournee: scan.tournee || (sessionData && sessionData.tournee)?.nom || '',
        tournee_id: scan.tourneeId || (sessionData && sessionData.tournee_id) || '',
        vehicule: scan.vehicule || (sessionData && sessionData.vehicule)?.immatriculation || '',
        vehicule_id: scan.vehiculeId || (sessionData && sessionData.vehicule_id) || '',
        site: scan.site || scan.siteDepart || 'Non spécifié',
        site_depart: scan.siteDepart || scan.site || 'Non spécifié',
        site_fin: scan.operationType === 'sortie' ? (scan.siteFin || scan.siteActuel || scan.site || '') : null,
        selas_id: selaId || null,
        pole: scan.poleId || scan.pole || (sessionData && sessionData.pole_id) || '',
        pole_name: scan.poleName || scan.pole || '',
        location: scan.location || null,
        status: scan.operationType === 'sortie' ? 'livré' : 
                scan.operationType === 'visite_sans_colis' ? 'pas_de_colis' : 'en-cours',
        created_at: new Date().toISOString()
      }));
      
      console.log('Données formatées pour Supabase:', JSON.stringify(formattedScans, null, 2));
      
      // Insérer tous les scans en une seule opération
      const { data, error } = await supabase
        .from('passages')
        .insert(formattedScans)
        .select();
      
      if (error) {
        console.error('Erreur insertion scans:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`${data.length} passages créés avec succès`);
      return { success: true, created: data.length, updated: 0 };
    } catch (error) {
      console.error('Erreur lors de l\'envoi des scans:', error);
      return { success: false, error: error.message };
    }
  },

  // Récupérer le profil utilisateur
  getUserProfile: async () => {
    try {
      const userData = await SupabaseService.getCurrentUser();
      if (!userData) throw new Error('Utilisateur non authentifié');
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.uid)
        .single();
      
      if (error) {
        console.error('Erreur récupération profil:', error);
        throw error;
      }
      
      return profile;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  },

  // Fonction de vérification d'authentification
  checkAuthAndRedirect: async (navigation) => {
    try {
      const userData = await SupabaseService.getCurrentUser();
      const isAuth = await SupabaseService.isAuthenticated();
      
      if (!userData || !isAuth) {
        console.log('Session expirée ou utilisateur déconnecté, redirection vers la connexion');
        
        // Effacer les données locales
        await AsyncStorage.removeItem(USER_DATA_KEY);
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem('current_session_id');
        
        // Rediriger vers l'écran de connexion
        if (navigation) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erreur de vérification d\'authentification:', error);
      
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      return false;
    }
  },

  // Fonction pour uploader un fichier vers Supabase Storage
  uploadFile: async (file, bucketName = 'documents', folderPath = '') => {
    try {
      console.log(`[Supabase] Début upload - Bucket: ${bucketName}, Dossier: ${folderPath}`);
      
      if (!file) {
        throw new Error('Fichier manquant');
      }

      // Générer un nom de fichier unique
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${folderPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log(`[Supabase] Nom de fichier généré: ${fileName}`);

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[Supabase] Erreur upload:', error);
        throw error;
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log(`[Supabase] Upload réussi, URL: ${urlData.publicUrl}`);
      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        bucket: bucketName
      };

    } catch (error) {
      console.error(`[Supabase] Erreur générale upload:`, error);
      throw error;
    }
  },

  // Fonction pour uploader une image depuis un URI local (React Native) - Photos de vérification mobile
  uploadImageFromUri: async (uri, bucketName = 'vehicle-checks', folderPath = null) => {
    try {
      if (!uri) {
        throw new Error('URI de l\'image manquante');
      }

      console.log(`[Supabase] Début upload image depuis URI: ${uri.substring(0, 50)}...`);
      
      // Test de connectivité simplifié - éviter les tests trop lourds sur mobile
      console.log('[Supabase] Test de connectivité rapide...');
      try {
        // Test simple de connectivité réseau
        const quickTest = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!quickTest.ok) {
          console.warn('[Supabase] Test de connectivité échoué, tentative d\'upload direct...');
        } else {
          console.log('[Supabase] Test de connectivité OK');
        }
      } catch (connectionError) {
        console.warn('[Supabase] Test de connectivité échoué, tentative d\'upload direct:', connectionError.message);
      }

      let blob;
      let fileExt = 'jpg';

      // Gérer différents types d'URIs selon la plateforme
      if (uri.startsWith('blob:') || uri.startsWith('data:')) {
        // Pour les URIs blob ou data sur le web
        if (uri.startsWith('data:')) {
          // Convertir data URL en blob
          const response = await fetch(uri);
          blob = await response.blob();
          fileExt = uri.split(';')[0].split('/')[1] || 'jpg';
        } else {
          // Pour les URIs blob, essayer de les récupérer depuis le cache
          try {
            const response = await fetch(uri);
            blob = await response.blob();
          } catch (blobError) {
            console.warn('[Supabase] Erreur avec URI blob, tentative alternative:', blobError);
            // Fallback: essayer de créer un blob vide et demander à l'utilisateur de reprendre la photo
            throw new Error('Format d\'image non supporté sur le web. Veuillez reprendre la photo.');
          }
        }
      } else if (uri.startsWith('file://') || uri.startsWith('content://')) {
        // Pour les URIs de fichiers sur mobile
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Erreur lors de la lecture du fichier: ${response.status}`);
        }
        blob = await response.blob();
        fileExt = uri.split('.').pop() || 'jpg';
      } else {
        // Tentative générique
        try {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Erreur lors de la lecture du fichier: ${response.status}`);
          }
          blob = await response.blob();
          fileExt = uri.split('.').pop() || 'jpg';
        } catch (fetchError) {
          console.error('[Supabase] Erreur fetch générique:', fetchError);
          throw new Error('Impossible de lire le fichier image. Vérifiez que l\'image est accessible.');
        }
      }

      if (!blob) {
        throw new Error('Impossible de créer le blob de l\'image');
      }

      // Créer un objet File à partir du blob
      // CORRECTION : Éviter la duplication de chemins en construisant un nom de fichier unique
      let fileName;
      
      if (folderPath) {
        // Si folderPath est fourni, l'utiliser comme dossier de base
        // Nettoyer le folderPath pour éviter les caractères problématiques
        const cleanFolderPath = folderPath.replace(/[^a-zA-Z0-9_-]/g, '_');
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        fileName = `${cleanFolderPath}/${timestamp}_${randomId}.${fileExt}`;
      } else {
        // Pas de folderPath, créer un nom basé sur la date et un ID unique
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        fileName = `${timestamp}_${randomId}.${fileExt}`;
      }
      
      console.log(`[Supabase] Nom de fichier construit: ${fileName}`);
      
      const file = new File([blob], fileName, { type: `image/${fileExt}` });

      console.log(`[Supabase] Upload vers bucket: ${bucketName}, fichier: ${fileName}`);

      // Upload vers Supabase Storage avec fallback REST
      let uploadResult;
      let uploadError;
      
      try {
        console.log(`[Supabase] Tentative d'upload vers bucket: ${bucketName}`);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        uploadResult = data;
        uploadError = error;
      } catch (uploadException) {
        console.error('[Supabase] Exception lors de l\'upload SDK:', uploadException);
        uploadError = uploadException;
      }

      if (uploadError) {
        // Log moins verbeux pour les erreurs SDK attendues sur mobile
        console.log('[Supabase] SDK échoué, passage au fallback REST...');
        
        // Fallback 1: Essayer avec l'API REST directe
        console.log('[Supabase] Tentative d\'upload via API REST directe...');
        try {
          const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;
          console.log(`[Supabase] Upload REST vers: ${uploadUrl}`);
          
          // Pour React Native, nous devons utiliser la syntaxe spécifique
          const formData = new FormData();
          formData.append('file', {
            uri: uri,
            type: `image/${fileExt}`,
            name: fileName
          });
          
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            },
            body: formData
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Supabase] Erreur upload REST vers ${bucketName}:`, response.status, errorText);
            throw new Error(`Upload REST échoué: ${response.status} ${errorText}`);
          }
          
          console.log(`[Supabase] Upload réussi via API REST vers ${bucketName}`);
          
          // Récupérer l'URL publique
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
          
          return {
            success: true,
            url: publicUrl,
            path: fileName,
            bucket: bucketName,
            method: 'REST'
          };
          
        } catch (restError) {
          console.error('[Supabase] Erreur upload REST:', restError);
          
          // Fallback 2: Essayer le bucket par défaut "documents"
          if (bucketName !== 'documents') {
            console.log('[Supabase] Tentative d\'upload vers le bucket par défaut "documents"...');
            
            try {
              const fallbackFileName = `fallback/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
              
              // Essayer d'abord avec le SDK
              const { data: fallbackData, error: fallbackError } = await supabase.storage
                .from('documents')
                .upload(fallbackFileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (fallbackError) {
                console.error('[Supabase] Erreur upload fallback SDK:', fallbackError);
                throw new Error(`Upload échoué sur tous les buckets: ${uploadError.message}`);
              } else {
                console.log('[Supabase] Upload réussi sur le bucket fallback "documents"');
                
                // Récupérer l'URL publique du bucket fallback
                const { data: fallbackUrlData } = supabase.storage
                  .from('documents')
                  .getPublicUrl(fallbackFileName);
                
                return {
                  success: true,
                  url: fallbackUrlData.publicUrl,
                  path: fallbackFileName,
                  bucket: 'documents',
                  isFallback: true
                };
              }
            } catch (fallbackException) {
              console.error('[Supabase] Exception upload fallback:', fallbackException);
              throw new Error(`Upload échoué sur tous les buckets: ${uploadError.message}`);
            }
          } else {
            throw new Error(`Upload échoué sur tous les buckets: ${uploadError.message}`);
          }
        }
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log(`[Supabase] Upload réussi, URL: ${urlData.publicUrl}`);

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        bucket: bucketName
      };

    } catch (error) {
      console.error(`[Supabase] Erreur générale upload image:`, error);
      throw error;
    }
  },

  // Fonction spécifique pour uploader les documents des véhicules
  uploadVehicleDocument: async (file, vehicleId, documentType = 'general') => {
    try {
      console.log(`[Supabase] Upload document véhicule - Type: ${documentType}, Véhicule: ${vehicleId}`);
      
      if (!file) {
        throw new Error('Fichier manquant');
      }

      // Générer un nom de fichier unique avec métadonnées
      const fileExt = file.name ? file.name.split('.').pop() : 'pdf';
      const fileName = `vehicules/${vehicleId}/${documentType}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log(`[Supabase] Nom de fichier généré: ${fileName}`);

      // Upload vers le bucket vehicle-documents
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[Supabase] Erreur upload document véhicule:', uploadError);
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(fileName);

      console.log(`[Supabase] Upload document véhicule réussi, URL: ${urlData.publicUrl}`);
      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        bucket: 'vehicle-documents',
        vehicleId: vehicleId,
        documentType: documentType
      };

    } catch (error) {
      console.error(`[Supabase] Erreur générale upload document véhicule:`, error);
      throw error;
    }
  },

  // Fonction pour uploader une image de document véhicule depuis URI
  uploadVehicleDocumentFromUri: async (uri, vehicleId, documentType = 'general') => {
    try {
      console.log(`[Supabase] Upload document véhicule depuis URI - Type: ${documentType}, Véhicule: ${vehicleId}`);
      
      if (!uri) {
        throw new Error('URI du document manquant');
      }

      // Convertir l'URI en blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Erreur lors de la lecture du fichier: ${response.status}`);
      }

      const blob = await response.blob();
      console.log(`[Supabase] Blob créé, taille: ${blob.size} bytes`);

      // Créer un objet File à partir du blob
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `vehicules/${vehicleId}/${documentType}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const file = new File([blob], fileName, { type: `image/${fileExt}` });

      // Upload vers le bucket vehicle-documents
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[Supabase] Erreur upload document véhicule:', uploadError);
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(fileName);

      console.log(`[Supabase] Upload document véhicule réussi, URL: ${urlData.publicUrl}`);
      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        bucket: 'vehicle-documents',
        vehicleId: vehicleId,
        documentType: documentType
      };

    } catch (error) {
      console.error(`[Supabase] Erreur générale upload document véhicule:`, error);
      throw error;
    }
  },

  // Fonction pour tester la connectivité réseau spécifique mobile
  testMobileNetwork: async () => {
    try {
      console.log('[Supabase] Test de connectivité réseau mobile...');
      
      // Détecter si on est sur web ou mobile
      const isWeb = typeof window !== 'undefined' && window.(location && location.protocol) === 'http:';
      console.log('[Supabase] Plateforme détectée:', isWeb ? 'Web' : 'Mobile');
      
      // Test 1: Connectivité internet de base
      let internetTest;
      if (isWeb) {
        // Sur web, utiliser un endpoint qui accepte CORS
        try {
          internetTest = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            timeout: 5000
          });
        } catch (corsError) {
          // Si httpbin échoue aussi, essayer Supabase directement
          console.log('[Supabase] Test internet via Supabase (fallback web)...');
          internetTest = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': supabaseKey,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
        }
      } else {
        // Sur mobile, utiliser Google comme avant
        internetTest = await fetch('https://www.google.com', {
          method: 'HEAD',
          timeout: 5000
        });
      }
      console.log('[Supabase] Test internet:', internetTest.ok ? 'OK' : 'ÉCHEC');
      
      // Test 2: Connectivité Supabase directe
      const supabaseTest = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log('[Supabase] Test Supabase API:', supabaseTest.ok ? 'OK' : 'ÉCHEC');
      
      // Test 3: Test DNS Storage
      let dnsTest;
      try {
        dnsTest = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        console.log('[Supabase] Test DNS Storage:', dnsTest.ok ? 'OK' : 'ÉCHEC');
      } catch (dnsError) {
        console.error('[Supabase] Erreur DNS Storage:', dnsError.message);
        dnsTest = { ok: false };
      }
      
      return {
        internet: internetTest.ok,
        supabase: supabaseTest.ok,
        dns: dnsTest.ok,
        platform: isWeb ? 'web' : 'mobile'
      };
      
    } catch (error) {
      console.error('[Supabase] Erreur test réseau mobile:', error);
      return {
        internet: false,
        supabase: false,
        dns: false,
        error: error.message
      };
    }
  },

  // Fonction de diagnostic simple pour tester l'accès aux buckets
  testBucketAccess: async (bucketName = 'vehicle-checks') => {
    try {
      console.log(`[Supabase] Test d'accès simple au bucket: ${bucketName}`);
      
      // Test 1: Essayer de lister les fichiers (lecture)
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 });
        
        if (listError) {
          console.log(`[Supabase] Erreur lecture bucket ${bucketName}:`, listError.message);
          return { success: false, error: listError.message, operation: 'read' };
        } else {
          console.log(`[Supabase] Lecture bucket ${bucketName} OK`);
          return { success: true, operation: 'read', files: (files && files.length) || 0 };
        }
      } catch (readError) {
        console.log(`[Supabase] Exception lecture bucket ${bucketName}:`, readError.message);
        return { success: false, error: readError.message, operation: 'read' };
      }
      
    } catch (error) {
      console.error(`[Supabase] Erreur test accès bucket ${bucketName}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Fonction de test pour vérifier la connectivité avec Supabase
  testConnection: async () => {
    try {
      console.log('[Supabase] Test de connectivité...');
      console.log('[Supabase] URL Supabase:', supabaseUrl);
      console.log('[Supabase] Clé API présente:', !!supabaseKey);
      
      // Test de connectivité réseau de base
      try {
        console.log('[Supabase] Test de connectivité réseau...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('[Supabase] Erreur réponse réseau:', response.status, response.statusText);
          throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
        }
        
        console.log('[Supabase] Connectivité réseau OK');
        
        // Test spécifique de l'API Storage
        console.log('[Supabase] Test de l\'API Storage...');
        const storageResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!storageResponse.ok) {
          console.error('[Supabase] Erreur API Storage:', storageResponse.status, storageResponse.statusText);
          throw new Error(`Erreur API Storage: ${storageResponse.status} ${storageResponse.statusText}`);
        }
        
        console.log('[Supabase] API Storage accessible');
        
      } catch (networkError) {
        console.error('[Supabase] Erreur réseau:', networkError);
        throw new Error(`Problème de connectivité réseau: ${networkError.message}`);
      }
      
      // Test de la connexion de base (optionnel)
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.log('[Supabase] Pas d\'utilisateur authentifié (normal pour les opérations publiques)');
        } else {
          console.log('[Supabase] Utilisateur authentifié:', (user && user.email));
        }
      } catch (authError) {
        console.log('[Supabase] Pas d\'authentification requise pour les opérations publiques');
      }

      // Test de l'accès au stockage (sans authentification pour les buckets publics)
      console.log('[Supabase] Test d\'accès au stockage...');
      
      // Essayer d'abord l'accès direct aux buckets spécifiques (plus fiable pour les buckets publics)
      const bucketsToTest = ['vehicle-checks', 'documents'];
      const accessibleBuckets = [];
      let hasVehicleChecksBucket = false;
      
      for (const bucketName of bucketsToTest) {
        const bucketTest = await SupabaseService.testBucketAccess(bucketName);
        if (bucketTest.success) {
          console.log(`[Supabase] ✅ Bucket ${bucketName} accessible`);
          accessibleBuckets.push(bucketName);
          if (bucketName === 'vehicle-checks') {
            hasVehicleChecksBucket = true;
          }
        } else {
          console.log(`[Supabase] Bucket ${bucketName} non accessible:`, bucketTest.error);
        }
      }
      
      // Si aucun bucket n'est accessible directement, essayer listBuckets() comme fallback
      if (accessibleBuckets.length === 0) {
        console.log('[Supabase] Aucun bucket accessible directement, tentative listBuckets()...');
        try {
          const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
          if (storageError) {
            console.error('[Supabase] Erreur listBuckets:', storageError);
          } else {
            console.log('[Supabase] Buckets via listBuckets:', buckets.map(b => b.name));
            accessibleBuckets.push(...buckets.map(b => b.name));
            hasVehicleChecksBucket = buckets.some(b => b.name === 'vehicle-checks');
          }
        } catch (listError) {
          console.error('[Supabase] Erreur lors de listBuckets:', listError);
        }
      }

      console.log('[Supabase] Buckets disponibles:', accessibleBuckets);
      
      if (hasVehicleChecksBucket) {
        console.log('[Supabase] ✅ Bucket vehicle-checks trouvé et accessible');
      } else {
        console.warn('[Supabase] ⚠️ Bucket vehicle-checks non trouvé. Buckets disponibles:', accessibleBuckets);
      }

      return {
        success: true,
        buckets: accessibleBuckets,
        hasVehicleChecksBucket: hasVehicleChecksBucket
      };

    } catch (error) {
      console.error('[Supabase] Erreur lors du test de connectivité:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Fonction pour tester spécifiquement l'upload vers un bucket
  testBucketUpload: async (bucketName = 'vehicle-checks') => {
    try {
      console.log(`[Supabase] Test d'upload vers bucket: ${bucketName}`);
      
      // Créer un petit fichier de test compatible React Native
      const testContent = 'test upload';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFileName = `test/${Date.now()}_test.txt`;
      
      console.log(`[Supabase] Tentative d'upload de fichier test: ${testFileName}`);
      
      // Essayer d'abord avec le SDK Supabase
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(testFileName, testBlob, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error(`[Supabase] Erreur upload SDK vers ${bucketName}:`, error);
          throw error;
        }
        
        console.log(`[Supabase] ✅ Upload test réussi vers ${bucketName} via SDK`);
        
        // Nettoyer le fichier de test
        try {
          await supabase.storage
            .from(bucketName)
            .remove([testFileName]);
          console.log(`[Supabase] Fichier test supprimé: ${testFileName}`);
        } catch (cleanupError) {
          console.warn(`[Supabase] Impossible de supprimer le fichier test: ${cleanupError.message}`);
        }
        
        return {
          success: true,
          bucket: bucketName,
          testFile: testFileName,
          method: 'SDK'
        };
        
      } catch (sdkError) {
        console.log(`[Supabase] SDK échoué, tentative avec API REST directe...`);
        
        // Fallback: utiliser l'API REST directement
        const formData = new FormData();
        formData.append('file', {
          uri: `data:text/plain;charset=utf-8,${encodeURIComponent(testContent)}`,
          type: 'text/plain',
          name: 'test.txt'
        });
        
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${testFileName}`;
        console.log(`[Supabase] Upload REST vers: ${uploadUrl}`);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Supabase] Erreur upload REST vers ${bucketName}:`, response.status, errorText);
          throw new Error(`Upload REST échoué: ${response.status} ${errorText}`);
        }
        
        console.log(`[Supabase] ✅ Upload test réussi vers ${bucketName} via REST`);
        
        // Nettoyer le fichier de test via REST
        try {
          const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${testFileName}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            }
          });
          console.log(`[Supabase] Fichier test supprimé via REST: ${testFileName}`);
        } catch (cleanupError) {
          console.warn(`[Supabase] Impossible de supprimer le fichier test via REST: ${cleanupError.message}`);
        }
        
        return {
          success: true,
          bucket: bucketName,
          testFile: testFileName,
          method: 'REST'
        };
      }
      
    } catch (error) {
      console.error(`[Supabase] Erreur test upload bucket ${bucketName}:`, error);
      return {
        success: false,
        error: error.message,
        bucket: bucketName
      };
    }
  },

  // Fonction de diagnostic complet pour mobile
  diagnosticComplet: async () => {
    console.log('[Supabase] 🔍 Début diagnostic complet...');
    
    const results = {
      timestamp: new Date().toISOString(),
      platform: 'mobile',
      tests: {}
    };
    
    // Test 1: Connectivité réseau de base
    try {
      console.log('[Supabase] Test 1: Connectivité réseau...');
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      results.tests.connectivite = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
      
      console.log(`[Supabase] Test 1: ${response.ok ? '✅' : '❌'} Status: ${response.status}`);
    } catch (error) {
      results.tests.connectivite = {
        success: false,
        error: error.message
      };
      console.log(`[Supabase] Test 1: ❌ Erreur: ${error.message}`);
    }
    
    // Test 2: Accès aux buckets
    try {
      console.log('[Supabase] Test 2: Accès aux buckets...');
      const bucketTest = await SupabaseService.testBucketAccess('vehicle-checks');
      results.tests.bucketVehicleChecks = bucketTest;
      console.log(`[Supabase] Test 2: ${bucketTest.success ? '✅' : '❌'} Bucket vehicle-checks`);
    } catch (error) {
      results.tests.bucketVehicleChecks = {
        success: false,
        error: error.message
      };
      console.log(`[Supabase] Test 2: ❌ Erreur: ${error.message}`);
    }
    
    // Test 3: Upload de test
    try {
      console.log('[Supabase] Test 3: Upload de test...');
      const uploadTest = await SupabaseService.testBucketUpload('vehicle-checks');
      results.tests.uploadTest = uploadTest;
      console.log(`[Supabase] Test 3: ${uploadTest.success ? '✅' : '❌'} Upload test`);
    } catch (error) {
      results.tests.uploadTest = {
        success: false,
        error: error.message
      };
      console.log(`[Supabase] Test 3: ❌ Erreur: ${error.message}`);
    }
    
    // Résumé
    const totalTests = Object.keys(results.tests).length;
    const successfulTests = Object.values(results.tests).filter(test => test.success).length;
    
    results.summary = {
      total: totalTests,
      successful: successfulTests,
      failed: totalTests - successfulTests,
      successRate: Math.round((successfulTests / totalTests) * 100)
    };
    
    console.log(`[Supabase] 📊 Diagnostic terminé: ${successfulTests}/${totalTests} tests réussis (${results.summary.successRate}%)`);
    
    return results;
  }
};

export default SupabaseService;
