import React from 'react';
import { View as RNView, Text } from 'react-native';

/**
 * Composant View personnalisé qui encapsule automatiquement les nœuds texte dans des composants Text
 * afin d'éviter l'erreur "Unexpected text node. A text node cannot be a child of a <View>."
 */
const CustomView = (props) => {
  const { children, ...otherProps } = props;
  
  // Fonction pour encapsuler automatiquement le texte dans des composants Text
  const renderChildren = (childrenToRender) => {
    // Si c'est une chaîne ou un nombre, l'envelopper dans un Text
    if (typeof childrenToRender === 'string' || typeof childrenToRender === 'number') {
      return <Text>{childrenToRender}</Text>;
    }
    
    // Si null ou undefined, retourner null pour éviter les erreurs
    if (childrenToRender === null || childrenToRender === undefined) {
      return null;
    }
    
    // Gestion des tableaux d'enfants
    if (Array.isArray(childrenToRender)) {
      return childrenToRender.map((child, index) => {
        // Générer une clé unique basée sur l'index
        const uniqueKey = `custom-view-child-${index}`;
        
        // Pour les chaînes et nombres
        if (typeof child === 'string' || typeof child === 'number') {
          return <Text key={uniqueKey}>{child}</Text>;
        }
        
        // Pour null ou undefined
        if (child === null || child === undefined) {
          return null;
        }
        
        // Pour les objets qui ne sont pas des éléments React
        if (typeof child === 'object' && !React.isValidElement(child)) {
          return null;
        }
        
        // Vérifier les éléments React avec des enfants texte problématiques
        if (React.isValidElement(child)) {
          // S'il a des enfants texte qui posent problème
          if (child.props && child.props.children) {
            if (typeof child.props.children === 'string' && 
                (child.props.children.includes('.') || /^\s+$/.test(child.props.children))) {
              // Garder la clé existante ou en ajouter une nouvelle si elle n'existe pas
              return React.cloneElement(child, { 
                ...child.props,
                key: child.key || uniqueKey,
                children: <Text>{child.props.children}</Text>
              });
            }
          }
          
          // Si l'élément n'a pas de clé, en ajouter une
          if (!child.key) {
            return React.cloneElement(child, { 
              ...child.props,
              key: uniqueKey
            });
          }
        }
        
        return child;
      });
    }
    
    // Retourner l'enfant tel quel s'il ne correspond à aucun cas ci-dessus
    return childrenToRender;
  };

  return (
    <RNView {...otherProps}>
      {renderChildren(children)}
    </RNView>
  );
};

export default CustomView; 