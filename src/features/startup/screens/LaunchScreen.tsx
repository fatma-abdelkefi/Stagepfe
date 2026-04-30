import React from 'react';
import { View, StyleSheet, StatusBar, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useLaunchViewModel } from '../viewmodels/useLaunchViewModel';

import AppText from '../../../shared/components/typography/AppText';
import { colors, spacing } from '../../../shared/theme';

export default function LaunchScreen() {
  useLaunchViewModel();

  return (
    <LinearGradient
      colors={['#000000', colors.primaryDark, colors.primary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.center}>
        <Image
          source={require('../../../assets/images/smartech_logo.png')}
          style={styles.logo}
        />

        <AppText style={styles.title}>SMARTECH EAM Experts</AppText>
      </View>

      <View style={styles.footer}>
        <AppText style={styles.footerText}>
          Powered by Smartech
        </AppText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },

  logo: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginBottom: spacing.md,
  },

  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffffad',
    letterSpacing: 1,
  },

  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },

  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});