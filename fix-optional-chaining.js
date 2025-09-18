const fs = require('fs');
const path = require('path');

// Fonction pour remplacer l'optional chaining
function replaceOptionalChaining(content) {
  // Remplacer (obj && obj.prop) par (obj && obj.prop)
  content = content.replace(/(\w+)\?\.(\w+)/g, '($1 && $1.$2)');
  
  // Remplacer (obj && obj.method)() par (obj && obj.method())
  content = content.replace(/(\w+)\?\.(\w+)\(/g, '($1 && $1.$2(');
  
  // Remplacer (obj && obj.prop)?.prop par (obj && obj.prop && obj.prop.prop)
  content = content.replace(/(\w+)\?\.(\w+)\?\.(\w+)/g, '($1 && $1.$2 && $1.$2.$3)');
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = replaceOptionalChaining(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Traité: ${filePath}`);
    } else {
      console.log(`⏭️  Aucun changement: ${filePath}`);
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

console.log('🔧 Correction de l\'optional chaining...');
walkDir('./');
console.log('✅ Correction terminée !');
