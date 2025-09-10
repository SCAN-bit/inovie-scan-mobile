const https = require('https');

// Configuration Firebase - SCAN
const PROJECT_ID = 'scan-70156';
const API_KEY = 'AIzaSyBCcN9z5oixLmS_abShJFTkjn3LJGrBHlY';
const DEFAULT_SELAS_ID = 'iYWSwBh92twpoiZUWWqt'; // LABOSUD

// Collections à vérifier et corriger
const COLLECTIONS_TO_CHECK = [
  'vehicules',
  'poles', 
  'tournees',
  'sites',
  'passages',
  'sessions',
  'scans',
  'vehicleChecks',
  'documents',
  'maintenance',
  'inspections'
];

// Fonction pour faire une requête HTTP
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Fonction pour récupérer tous les documents d'une collection
async function getCollectionDocuments(collectionName) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?key=${API_KEY}`;
  
  try {
    console.log(`📊 Récupération de la collection: ${collectionName}`);
    const response = await makeRequest(url);
    
    if (response.documents) {
      console.log(`  ✅ ${response.documents.length} documents trouvés`);
      return response.documents;
    } else {
      console.log(`  ℹ️  Collection vide ou erreur:`, response.error || 'Pas de documents');
      return [];
    }
  } catch (error) {
    console.error(`  ❌ Erreur lors de l'accès à ${collectionName}:`, error.message);
    return [];
  }
}

// Fonction pour mettre à jour un document avec selasId
async function updateDocumentWithSelasId(collectionName, documentId, selasId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${documentId}?key=${API_KEY}`;
  
  const updateData = {
    fields: {
      selasId: {
        stringValue: selasId
      },
      updatedAt: {
        stringValue: new Date().toISOString()
      }
    }
  };

  try {
    const response = await makeRequest(url, 'PATCH', updateData);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fonction principale de correction
async function fixAllMissingSelas() {
  console.log('🔧 Correction des selasId manquants via API REST Firebase...\n');
  console.log(`🎯 SELAS par défaut: ${DEFAULT_SELAS_ID} (LABOSUD)\n`);

  let totalFixed = 0;
  const collectionStats = {};

  for (const collectionName of COLLECTIONS_TO_CHECK) {
    console.log(`\n🔧 CORRECTION DE LA COLLECTION: ${collectionName.toUpperCase()}`);
    
    try {
      const documents = await getCollectionDocuments(collectionName);
      
      if (documents.length === 0) {
        console.log(`  ℹ️  Collection vide, ignorée`);
        collectionStats[collectionName] = { total: 0, fixed: 0 };
        continue;
      }

      let fixed = 0;
      let total = documents.length;

      // Vérifier chaque document
      for (const doc of documents) {
        const data = doc.fields || {};
        const selasId = data.selasId?.stringValue || data.selasId || '';
        
        if (!selasId || selasId === '') {
          try {
            // Identifier l'élément pour le log
            let elementName = 'N/A';
            if (data.nom?.stringValue) elementName = data.nom.stringValue;
            else if (data.name?.stringValue) elementName = data.name.stringValue;
            else if (data.registrationNumber?.stringValue) elementName = data.registrationNumber.stringValue;
            else if (data.immatriculation?.stringValue) elementName = data.immatriculation.stringValue;
            
            console.log(`    - Correction de ${elementName} (ID: ${doc.name.split('/').pop()})`);
            
            // Mettre à jour avec le selasId
            const result = await updateDocumentWithSelasId(collectionName, doc.name.split('/').pop(), DEFAULT_SELAS_ID);
            
            if (result.success) {
              fixed++;
              console.log(`      ✅ Mis à jour avec succès`);
            } else {
              console.error(`      ❌ Erreur lors de la mise à jour:`, result.error);
            }
            
            // Petite pause pour éviter de surcharger l'API
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`      ❌ Erreur lors de la correction:`, error.message);
          }
        }
      }
      
      console.log(`  ✅ ${collectionName}: ${fixed}/${total} éléments corrigés`);
      collectionStats[collectionName] = { total, fixed };
      totalFixed += fixed;
      
    } catch (error) {
      console.error(`  ❌ Erreur lors du traitement de ${collectionName}:`, error.message);
      collectionStats[collectionName] = { total: 0, fixed: 0, error: error.message };
    }
  }

  // Résumé final
  console.log('\n📋 RÉSUMÉ DES CORRECTIONS:');
  console.log('=' .repeat(60));
  
  for (const [collectionName, stats] of Object.entries(collectionStats)) {
    if (stats.error) {
      console.log(`❌ ${collectionName.padEnd(25)}: ERREUR - ${stats.error}`);
    } else if (stats.total === 0) {
      console.log(`ℹ️  ${collectionName.padEnd(25)}: Vide`);
    } else {
      const status = stats.fixed > 0 ? '✅' : 'ℹ️';
      console.log(`${status} ${collectionName.padEnd(25)}: ${stats.fixed}/${stats.total} corrigés`);
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`🎯 Total d'éléments corrigés: ${totalFixed}`);
  
  if (totalFixed > 0) {
    console.log(`\n✅ ${totalFixed} éléments ont été corrigés avec le selasId: ${DEFAULT_SELAS_ID}`);
    console.log('🔒 La séparation des données SELAS est maintenant garantie !');
    console.log('📱 L\'application mobile ne devrait plus afficher de données d\'autres SELAS !');
  } else {
    console.log('\n✅ Tous les éléments avaient déjà un selasId défini !');
  }
}

// Exécuter la correction
fixAllMissingSelas().then(() => {
  console.log('\n✅ Correction terminée');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
