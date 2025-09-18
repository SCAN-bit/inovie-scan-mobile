const fs = require('fs');
const path = require('path');

// Fonction pour corriger tous les optional chaining
function fixOptionalChaining(content) {
  // Corriger les patterns les plus courants
  content = content.replace(/(\w+)\?\.(\w+)/g, '($1 && $1.$2)');
  content = content.replace(/(\w+)\?\.(\w+)\?\.(\w+)/g, '($1 && $1.$2 && $1.$2.$3)');
  content = content.replace(/(\w+)\?\.(\w+)\?\.(\w+)\?\.(\w+)/g, '($1 && $1.$2 && $1.$2.$3 && $1.$2.$3.$4)');
  
  // Corriger les appels de méthodes
  content = content.replace(/(\w+)\?\.\(\)/g, '($1 && $1())');
  content = content.replace(/(\w+)\?\.(\w+)\?\.\(\)/g, '($1 && $1.$2 && $1.$2())');
  
  // Corriger les patterns avec des crochets
  content = content.replace(/(\w+)\[(\w+)\]\?\.(\w+)/g, '($1[$2] && $1[$2].$3)');
  content = content.replace(/(\w+)\[(\w+)\]\?\.(\w+)\?\.(\w+)/g, '($1[$2] && $1[$2].$3 && $1[$2].$3.$4)');
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = fixOptionalChaining(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
    return false;
  }
}

// Liste des fichiers à traiter
const filesToProcess = [
  'components/ScanHistoryItem.js',
  'services/firebaseService.js',
  'screens/ScanScreen.js',
  'navigation/AppNavigator.js',
  'services/supabaseService.js'
];

console.log('🔧 Correction finale de tous les optional chaining...');
let corrected = 0;

filesToProcess.forEach(file => {
  if (fs.existsSync(file)) {
    if (processFile(file)) {
      corrected++;
    }
  } else {
    console.log(`⚠️  Fichier non trouvé: ${file}`);
  }
});

console.log(`✅ Correction terminée ! ${corrected} fichiers corrigés.`);
