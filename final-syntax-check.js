const fs = require('fs');
const path = require('path');

// Fonction pour corriger toutes les erreurs de syntaxe restantes
function fixAllSyntaxErrors(content) {
  // Corriger (obj.prop && obj.prop.subprop) en (obj.prop && obj.prop.subprop)
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+)\)/g, '($1.$2 && $1.$2.$3)');
  
  // Corriger (obj.prop && obj.prop) en (obj.prop && obj.prop)
  content = content.replace(/(\w+)\.\((\w+) && \2\)/g, '($1.$2 && $1.$2)');
  
  // Corriger les patterns avec des parenthèses mal placées
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+) && \2\.\3\.(\w+)\)/g, '($1.$2 && $1.$2.$3 && $1.$2.$3.$4)');
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = fixAllSyntaxErrors(content);
    
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

// Fonction pour parcourir récursivement
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let corrected = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      corrected += walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (processFile(filePath)) {
        corrected++;
      }
    }
  });
  
  return corrected;
}

console.log('🔧 Vérification et correction finale de toutes les erreurs de syntaxe...');
const corrected = walkDir('./');
console.log(`✅ Correction terminée ! ${corrected} fichiers corrigés.`);
