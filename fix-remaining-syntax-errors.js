const fs = require('fs');
const path = require('path');

// Fonction pour corriger les erreurs de syntaxe restantes
function fixRemainingSyntaxErrors(content) {
  // Corriger (obj.prop && obj.prop.subprop) en (obj.prop && obj.prop.subprop)
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+)\)/g, '($1.$2 && $1.$2.$3)');
  
  // Corriger les patterns plus complexes
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+) && \2\.\3\.(\w+)\)/g, '($1.$2 && $1.$2.$3 && $1.$2.$3.$4)');
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = fixRemainingSyntaxErrors(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
}

// Traiter tous les fichiers JS
const jsFiles = [
  './components/ScanHistoryItem.js',
  './services/AppUpdateService.js',
  './services/firebaseService.js',
  './services/supabaseService.js',
  './screens/ScanScreen.js',
  './screens/BigSacocheScreen.js',
  './screens/LoginScreen.js',
  './screens/PersonnelAdminScreen.js'
];

console.log('🔧 Correction des erreurs de syntaxe restantes...');
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    processFile(file);
  }
});
console.log('✅ Correction terminée !');
