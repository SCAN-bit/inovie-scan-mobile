const fs = require('fs');
const path = require('path');

// Patterns d'erreurs à rechercher
const errorPatterns = [
  // Optional chaining
  /\?\./g,
];

// Fonction pour vérifier un fichier
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    
    errorPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
          errors.push({
            line: lineNumber,
            pattern: `Pattern ${index + 1}`,
            match: match,
            file: filePath
          });
        });
      }
    });
    
    return errors;
  } catch (error) {
    console.error(`❌ Erreur lecture ${filePath}:`, error.message);
    return [];
  }
}

// Vérification spécifique des fichiers critiques
console.log('🔍 Vérification des fichiers critiques...');

const criticalFiles = [
  'components/ScanHistoryItem.js',
  'services/AppUpdateService.js', 
  'services/firebaseService.js',
  'screens/ScanScreen.js',
  'navigation/AppNavigator.js'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const errors = checkFile(file);
    if (errors.length === 0) {
      console.log(`✅ ${file} - Aucune erreur`);
    } else {
      console.log(`❌ ${file} - ${errors.length} erreurs:`);
      errors.forEach(error => {
        console.log(`  Ligne ${error.line}: "${error.match}"`);
      });
    }
  } else {
    console.log(`⚠️  ${file} - Fichier non trouvé`);
  }
});
