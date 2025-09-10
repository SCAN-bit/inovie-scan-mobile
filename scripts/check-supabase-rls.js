const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://xcljahinisqetnsyjmvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbGphaGluaXNxZXRuc3lqbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTgwMzcsImV4cCI6MjA3MTA5NDAzN30.D9bpEubfMSF-MOE3UQs1_Jr8DDx479byvhEgxVeh8xU';

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseRLS() {
  try {
    console.log('🔍 Vérification des politiques RLS Supabase...\n');
    
    // 1. Vérifier les informations du bucket vehicle-checks
    console.log('📦 1. Informations du bucket vehicle-checks...');
    try {
      const { data: bucketInfo, error: bucketError } = await supabase.storage
        .getBucket('vehicle-checks');
      
      if (bucketError) {
        console.log('❌ Erreur récupération bucket:', bucketError.message);
      } else {
        console.log('✅ Informations bucket vehicle-checks:');
        console.log('   - Nom:', bucketInfo.name);
        console.log('   - Public:', bucketInfo.public);
        console.log('   - RLS activé:', bucketInfo.rls_enabled);
        console.log('   - Taille max:', bucketInfo.file_size_limit);
        console.log('   - Types autorisés:', bucketInfo.allowed_mime_types);
      }
    } catch (error) {
      console.log('❌ Erreur bucket info:', error.message);
    }
    
    // 2. Vérifier les politiques RLS
    console.log('\n🔒 2. Vérification des politiques RLS...');
    try {
      // Essayer de récupérer les politiques via l'API REST
      const response = await fetch(`${supabaseUrl}/rest/v1/storage/policies`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok) {
        const policies = await response.json();
        console.log('✅ Politiques RLS récupérées:', policies);
      } else {
        console.log('⚠️ Impossible de récupérer les politiques via REST');
      }
    } catch (error) {
      console.log('⚠️ Erreur récupération politiques:', error.message);
    }
    
    // 3. Test avec authentification
    console.log('\n🔐 3. Test avec authentification...');
    try {
      // Essayer de s'authentifier
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123'
      });
      
      if (authError) {
        console.log('⚠️ Authentification échouée (normal):', authError.message);
      } else {
        console.log('✅ Authentification réussie');
        
        // Tester l'upload avec authentification
        const testFileName = `auth-test-${Date.now()}.txt`;
        const testContent = 'Test upload avec authentification';
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-checks')
          .upload(testFileName, testContent, {
            contentType: 'text/plain',
            upsert: false
          });
        
        if (uploadError) {
          console.log('❌ Upload avec auth échoué:', uploadError.message);
        } else {
          console.log('✅ Upload avec auth réussi:', uploadData);
          
          // Nettoyer
          await supabase.storage
            .from('vehicle-checks')
            .remove([testFileName]);
        }
      }
    } catch (error) {
      console.log('⚠️ Erreur test authentification:', error.message);
    }
    
    // 4. Vérifier les permissions du bucket
    console.log('\n📋 4. Vérification des permissions...');
    try {
      const { data: permissions, error: permError } = await supabase.storage
        .from('vehicle-checks')
        .list('', { limit: 1, offset: 0 });
      
      if (permError) {
        console.log('❌ Erreur permissions:', permError.message);
      } else {
        console.log('✅ Permissions de lecture OK');
        console.log('   - Contenu accessible:', permissions);
      }
    } catch (error) {
      console.log('❌ Erreur vérification permissions:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter la vérification
checkSupabaseRLS().then(() => {
  console.log('\n✅ Vérification RLS terminée');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
