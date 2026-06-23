import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import ErrorModal from '../../../shared/components/feedback/ErrorModal';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';

type Props = {
  scrollRef?: React.RefObject<ScrollView>;
};

export default function LoginForm({ scrollRef }: Props) {
  const {
    username,
    setUsername,
    password,
    setPassword,
    securePassword,
    togglePasswordVisibility,
    handleLogin,
    loading,
  } = useLoginViewModel();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Erreur');
  const [errorMessage, setErrorMessage] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const passwordWrapperRef = useRef<View>(null);

  const onPressLogin = useCallback(async () => {
    Keyboard.dismiss();
    const result = await handleLogin();

    if (!result.ok) {
      setErrorTitle('Erreur de connexion');
      setErrorMessage(result.message || 'Identifiants invalides.');
      setErrorVisible(true);
    }
  }, [handleLogin]);

  // Scroll vers le champ mot de passe quand il est focus (Android surtout)
  const handlePasswordFocus = useCallback(() => {
    if (Platform.OS === 'android' && scrollRef?.current && passwordWrapperRef.current) {
      passwordWrapperRef.current.measureLayout(
        // @ts-ignore
        scrollRef.current.getInnerViewNode?.() ?? scrollRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: y - 16, animated: true });
        },
        () => {},
      );
    }
  }, [scrollRef]);

  return (
    <>
      <ErrorModal
        visible={errorVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Bienvenue</Text>
        <Text style={styles.formSubtitle}>
          Connectez-vous pour accéder à votre tableau de bord
        </Text>

        {/* Nom d'utilisateur */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#3b82f6"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Nom d'utilisateur"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              style={styles.textInput}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Mot de passe */}
        <View ref={passwordWrapperRef} style={styles.inputWrapper}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#3b82f6"
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              placeholder="Mot de passe"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={securePassword}
              style={styles.textInput}
              returnKeyType="done"
              onSubmitEditing={onPressLogin}
              onFocus={handlePasswordFocus}
            />
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={securePassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <View />
          <TouchableOpacity>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onPressLogin}
          disabled={loading}
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.gradientButton}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Se connecter</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={styles.arrowIcon}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nouveau sur Smartech ? </Text>
          <TouchableOpacity>
            <Text style={styles.signUpText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
});
