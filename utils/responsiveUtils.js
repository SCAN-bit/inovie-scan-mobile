import { Dimensions, PixelRatio } from 'react-native';

// Obtenir les dimensions de l'écran
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions de référence (iPhone 12 par exemple)
const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

/**
 * Calcule une largeur responsive basée sur la largeur de l'écran (plus conservative)
 * @param {number} size - Taille de référence
 * @returns {number} - Taille adaptée à l'écran
 */
export const wp = (size) => {
  const scale = Math.min((SCREEN_WIDTH / REFERENCE_WIDTH), 1.2); // Limiter l'agrandissement max à 20%
  return size * scale;
};

/**
 * Calcule une hauteur responsive basée sur la hauteur de l'écran (plus conservative)
 * @param {number} size - Taille de référence
 * @returns {number} - Taille adaptée à l'écran
 */
export const hp = (size) => {
  const scale = Math.min((SCREEN_HEIGHT / REFERENCE_HEIGHT), 1.15); // Limiter l'agrandissement max à 15%
  return size * scale;
};

/**
 * Calcule une taille de police responsive (plus modérée)
 * @param {number} size - Taille de police de référence
 * @returns {number} - Taille de police adaptée
 */
export const fp = (size) => {
  const scale = Math.min((SCREEN_WIDTH / REFERENCE_WIDTH), 1.1); // Limiter l'agrandissement des polices à 10%
  const newSize = size * scale;
  return Math.max(12, Math.min(24, PixelRatio.roundToNearestPixel(newSize))); // Min 12px, Max 24px
};

/**
 * Calcule un padding/margin responsive (plus conservatif)
 * @param {number} size - Taille de référence
 * @returns {number} - Taille adaptée
 */
export const sp = (size) => {
  const scale = Math.min((SCREEN_WIDTH / REFERENCE_WIDTH), 1.1); // Limiter l'agrandissement des espacements à 10%
  return size * scale;
};

/**
 * Détermine si l'écran est considéré comme petit
 * @returns {boolean}
 */
export const isSmallScreen = () => {
  return SCREEN_WIDTH < 370;
};

/**
 * Détermine si l'écran est considéré comme grand
 * @returns {boolean}
 */
export const isLargeScreen = () => {
  return SCREEN_WIDTH > 400;
};

/**
 * Détermine si l'écran est en mode paysage
 * @returns {boolean}
 */
export const isLandscape = () => {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
};

/**
 * Retourne des styles responsive pour les conteneurs principaux
 */
export const getResponsiveContainerStyles = () => ({
  flex: 1,
  paddingHorizontal: sp(16),
  paddingTop: hp(10),
});

/**
 * Retourne des styles responsive pour les boutons
 */
export const getResponsiveButtonStyles = () => ({
  height: hp(50),
  borderRadius: sp(8),
  paddingHorizontal: sp(20),
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: sp(8),
});

/**
 * Retourne des styles responsive pour les champs de saisie
 */
export const getResponsiveInputStyles = () => ({
  height: hp(50),
  borderRadius: sp(8),
  paddingHorizontal: sp(16),
  fontSize: fp(16),
  marginVertical: sp(8),
});

/**
 * Retourne des styles responsive pour le logo
 */
export const getResponsiveLogoStyles = () => ({
  width: wp(280),
  height: hp(140),
  maxWidth: wp(320),
});

/**
 * Retourne des styles responsive pour les titres
 */
export const getResponsiveTitleStyles = () => ({
  fontSize: fp(24),
  fontWeight: 'bold',
  marginBottom: sp(16),
});

/**
 * Retourne des styles responsive pour le texte normal
 */
export const getResponsiveTextStyles = () => ({
  fontSize: fp(16),
  lineHeight: fp(24),
});

/**
 * Retourne les dimensions actuelles de l'écran
 */
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
});

// Export des constantes utiles
export { SCREEN_WIDTH, SCREEN_HEIGHT }; 