import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

const Toast = ({ message, type = 'info', duration = 3000, onHide }) => {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Animation d'entrée
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide après duration
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (onHide) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const getBackgroundColor = () => {
    switch (type) {
      case 'error': return '#e74c3c';
      case 'success': return '#27ae60';
      case 'warning': return '#f39c12';
      default: return '#3498db';
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: getBackgroundColor(), transform: [{ translateY: slideAnim }] }
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: hp(40),
    left: wp(20),
    right: wp(20),
    paddingHorizontal: sp(16),
    paddingVertical: sp(12),
    borderRadius: sp(8),
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  message: {
    color: '#fff',
    fontSize: fp(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Toast; 