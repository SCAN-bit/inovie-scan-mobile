const fs = require('fs');
const path = require('path');

// Patterns d'erreurs à rechercher
const errorPatterns = [
  // Optional chaining
  /\?\./g,
  // Parenthèses mal placées avec && 
  /\w+\.\(\w+ && \w+\)/g,
  // Patterns complexes avec parenthèses
  /\w+\.\(\w+ && \w+\.\w+\)/g,
  // Autres patterns problématiques
  /\.\(\w+ && \w+\.\w+ && \w+\.\w+\.\w+\)/g
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

// Fonction pour parcourir récursivement
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let allErrors = [];
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      allErrors = allErrors.concat(walkDir(filePath));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const errors = checkFile(filePath);
      allErrors = allErrors.concat(errors);
    }
  });
  
  return allErrors;
}

console.log('🔍 Vérification complète de tous les fichiers JavaScript...');
const allErrors = walkDir('./');

if (allErrors.length === 0) {
  console.log('✅ Aucune erreur de syntaxe détectée ! Tous les fichiers sont corrects.');
} else {
  console.log(`❌ ${allErrors.length} erreurs détectées :`);
  allErrors.forEach(error => {
    console.log(`  📁 ${error.file}:${error.line} - ${error.pattern} - "${error.match}"`);
  });
}

// Vérification spécifique des fichiers mentionnés dans les logs
console.log('\n🔍 Vérification spécifique des fichiers problématiques...');

const problematicFiles = [
  'components/ScanHistoryItem.js',
  'services/AppUpdateService.js', 
  'services/firebaseService.js'
];

problematicFiles.forEach(file => {
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
