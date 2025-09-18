const fs = require('fs');

// Fonction pour corriger les erreurs de syntaxe
function fixSyntaxErrors(content) {
  // Corriger (route.params && route.params.prop) en (route.params && route.params.prop)
  content = content.replace(/route\.\(params && params\.(\w+)\)/g, '(route.params && route.params.$1)');
  
  // Corriger (obj.prop && obj.prop.subprop) en (obj.prop && obj.prop.subprop)
  content = content.replace(/(\w+)\.\((\w+) && \2\.(\w+)\)/g, '($1.$2 && $1.$2.$3)');
  
  // Corriger les autres patterns similaires
  content = content.replace(/(\w+)\.\((\w+) && \2\)/g, '($1.$2 && $1.$2)');
  
  return content;
}

// Traiter le fichier ScanScreen.js
const filePath = './screens/ScanScreen.js';
try {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = fixSyntaxErrors(content);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Erreurs de syntaxe corrigées dans ScanScreen.js');
  } else {
    console.log('⏭️  Aucune erreur de syntaxe trouvée');
  }
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
