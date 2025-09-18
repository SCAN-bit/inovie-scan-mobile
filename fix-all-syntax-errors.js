const fs = require('fs');
const path = require('path');

// Fonction pour corriger les erreurs de syntaxe
function fixSyntaxErrors(content) {
  // Corriger (item.prop && item.prop.subprop) en (item.prop && item.prop.subprop)
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+)\)/g, '($1.$2 && $1.$2.$3)');
  
  // Corriger (route.params && route.params.prop) en (route.params && route.params.prop)
  content = content.replace(/route\.\(params && params\.(\w+)\)/g, '(route.params && route.params.$1)');
  
  // Corriger (obj.prop && obj.prop) en (obj.prop && obj.prop)
  content = content.replace(/(\w+)\.\((\w+) && \2\)/g, '($1.$2 && $1.$2)');
  
  // Corriger les patterns avec des parenthèses mal placées
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+)\)/g, '($1.$2 && $1.$2.$3)');
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = fixSyntaxErrors(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
}

// Fonction pour parcourir récursivement
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(filePath);
    }
  });
}

console.log('🔧 Correction de toutes les erreurs de syntaxe...');
walkDir('./');
console.log('✅ Correction terminée !');
