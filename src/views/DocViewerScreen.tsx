// src/views/DocViewerScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ActivityIndicator,
  View,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { Buffer } from 'buffer';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';
import { rewriteDoclinkUrl, metaToDoclinkUrl } from '../services/workOrderDetailsService';
import { buildBinaryDoclinkUrl, normalizeNavigationUrl } from '../services/docUrlFix';

type Props = {
  route: RouteProp<RootStackParamList, 'DocViewer'>;
};

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

export default function DocViewerScreen({ route }: Props) {
  const navigation = useNavigation();
  const { document } = route.params;

  const webRef = useRef<WebView>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const initialUrl = useMemo(() => {
    return buildBinaryDoclinkUrl(
      document,
      rewriteDoclinkUrl,
      metaToDoclinkUrl
    );
  }, [document]);

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const referenceUrl = useMemo(() => initialUrl, [initialUrl]);

  useEffect(() => setCurrentUrl(initialUrl), [initialUrl]);

  useEffect(() => {
    (async () => {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) {
        Alert.alert('Erreur', 'Identifiants non trouvés');
        return;
      }
      setToken(makeMaxAuth(username, password));
    })();
  }, []);

  const handleClose = () => navigation.goBack();

  if (!currentUrl || !token) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      
      {/* 🔵 Header même style que ton app */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          activeOpacity={0.8}
        >
          <FeatherIcon name="x" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* 🌐 WebView */}
      <WebView
        ref={webRef}
        source={{
          uri: currentUrl,
          headers: {
            Authorization: `Basic ${token}`,
            MAXAUTH: token,
            Accept: '*/*',
          },
        }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled

        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}

        startInLoadingState={false}

        onShouldStartLoadWithRequest={(req) => {
          const next = req?.url || '';
          if (!next) return true;

          const normalized = normalizeNavigationUrl(
            next,
            referenceUrl
          );

          if (normalized !== next) {
            setCurrentUrl(normalized);
            return false;
          }
          return true;
        }}

        onHttpError={(e) => {
          Alert.alert('Erreur', `HTTP ${e?.nativeEvent?.statusCode || ''}`);
        }}
        onError={(e) => {
          Alert.alert(
            'Erreur',
            e?.nativeEvent?.description ||
              "Impossible d'afficher le document"
          );
        }}
      />

      {/* 🔄 Loader centré au milieu */}
      {loading && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlayLoader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
