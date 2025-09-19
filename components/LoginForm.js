import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const LoginForm = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    onLogin(email, password);
  };

  const resetLocalStorage = async () => {
    try {
      setResetLoading(true);
      // Liste des clés à supprimer d'AsyncStorage
      const keysToRemove = [
        'auth_token',
        'user_data',
        'current_session_id'
      ];
      
      // Réinitialisation du stockage local
      await AsyncStorage.multiRemove(keysToRemove);
      // Stockage local réinitialisé avec succès
      
      Alert.alert(
        'Stockage réinitialisé',
        'Les données d\'authentification ont été effacées. Vous pouvez maintenant vous reconnecter.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du stockage:', error);
      Alert.alert('Erreur', 'Impossible de réinitialiser le stockage');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? "eye-off" : "eye"} 
            size={20} 
            color="#7f8c8d" 
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      {/* Bouton de réinitialisation du stockage */}
      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={resetLocalStorage}
        disabled={resetLoading}
      >
        {resetLoading ? (
          <ActivityIndicator size="small" color="#e74c3c" />
        ) : (
          <Text style={styles.resetButtonText}>
            Réinitialiser les données de connexion
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 5,
  },
  loginButton: {
    backgroundColor: '#1a4d94',
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  resetButtonText: {
    color: '#e74c3c',
    fontSize: 14,
  },
});

export default LoginForm; 