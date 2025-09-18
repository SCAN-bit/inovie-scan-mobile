const fs = require('fs');
const path = require('path');

// Fonction pour corriger tous les optional chaining
function fixOptionalChaining(content) {
  // Corriger (obj && obj.prop) en (obj && obj.prop)
  content = content.replace(/(\w+)\?\.(\w+)/g, '($1 && $1.$2)');
  
  // Corriger (obj && obj.prop)?.subprop en (obj && obj.prop && obj.prop.subprop)
  content = content.replace(/(\w+)\?\.(\w+)\?\.(\w+)/g, '($1 && $1.$2 && $1.$2.$3)');
  
  // Corriger (obj && obj.prop)?.(subprop && subprop.subsubprop) en (obj && obj.prop && obj.prop.subprop && obj.prop.subprop.subsubprop)
  content = content.replace(/(\w+)\?\.(\w+)\?\.(\w+)\?\.(\w+)/g, '($1 && $1.$2 && $1.$2.$3 && $1.$2.$3.$4)');
  
  // Corriger les appels de méthodes avec ?.()
  content = content.replace(/(\w+)\?\.\(\)/g, '($1 && $1())');
  
  // Corriger les patterns plus complexes
  content = content.replace(/(\w+)\?\.(\w+)\?\.\(\)/g, '($1 && $1.$2 && $1.$2())');
  
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

console.log('🔧 Correction de TOUS les optional chaining restants...');
const corrected = walkDir('./');
console.log(`✅ Correction terminée ! ${corrected} fichiers corrigés.`);
