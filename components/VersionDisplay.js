import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppUpdateService from '../services/AppUpdateService';
import { fp } from '../utils/responsiveUtils';

export default function VersionDisplay({ style, textStyle, showLabel = true }) {
  // Utiliser directement le service AppUpdateService
  const version = AppUpdateService.getCurrentVersion();

  return (
    <View style={[styles.container, style]}>
      {showLabel && <Text style={[styles.label, textStyle]}>v</Text>}
      <Text style={[styles.version, textStyle]}>{version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: fp(10),
    color: '#9ca3af',
    marginRight: 2,
  },
  version: {
    fontSize: fp(10),
    color: '#9ca3af',
    fontWeight: '500',
  },
});
