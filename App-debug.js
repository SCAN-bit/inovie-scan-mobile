import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Empêcher le splash screen de se masquer automatiquement
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        console.log('[DEBUG-SIMPLE] Masquage du splash screen...');
        await SplashScreen.hideAsync();
        console.log('[DEBUG-SIMPLE] Splash screen masqué avec succès !');
      } catch (error) {
        console.error('[DEBUG-SIMPLE] Erreur masquage splash:', error);
      }
    };

    // Masquer après 2 secondes
    setTimeout(hideSplash, 2000);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <Text style={styles.title}>🚀 Inovie Scan</Text>
        <Text style={styles.subtitle}>Version de diagnostic</Text>
        <Text style={styles.info}>Si vous voyez ce message,</Text>
        <Text style={styles.info}>le splash screen fonctionne !</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: '#888',
    textAlign: 'center',
  },
}); 