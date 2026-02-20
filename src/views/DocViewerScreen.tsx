// src/views/DocViewerScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ActivityIndicator,
  View,
  Alert,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { Buffer } from 'buffer';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { RootStackParamList } from '../navigation/AppNavigator';

import {
  buildBinaryDoclinkUrl,
  normalizeNavigationUrl,
  buildDocViewerCandidates,
  fixMaximoUrlTypos,
} from '../services/docUrlFix';

type Props = {
  route: RouteProp<RootStackParamList, 'DocViewer'>;
};

const makeMaxAuth = (u: string, p: string) => Buffer.from(`${u}:${p}`).toString('base64');

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * ✅ Your project doesn't have rewriteDoclinkUrl/metaToDoclinkUrl in workOrderDetailsService.
 * So we provide local versions here.
 *
 * They MUST accept (u?: string) to match docUrlFix expected signature.
 */
function metaToDoclinkUrl(u?: string): string {
  const url = (u || '').trim();
  if (!url) return '';

  // Convert ".../doclinks/meta/{id}" or ".../doclinks/{id}/meta" → ".../doclinks/{id}"
  return url
    .replace(/\/doclinks\/meta\/(\d+)/i, '/doclinks/$1')
    .replace(/\/doclinks\/(\d+)\/meta/i, '/doclinks/$1');
}

function rewriteDoclinkUrl(u?: string): string {
  const url = (u || '').trim();
  if (!url) return '';

  // Remove accidental double slashes (but keep "https://")
  return url.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Build a raw URL from the document metadata (href/urlname/docinfo...),
 * then normalize it.
 */
function extractRawDocUrl(document: any): string {
  return (
    safeStr(document?.href) ||
    safeStr(document?.docinfo?.href) ||
    safeStr(document?.urlname) ||
    safeStr(document?.docinfo?.urlname) ||
    ''
  );
}

export default function DocViewerScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { document } = route.params;

  const webRef = useRef<WebView>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  // 1) Build "binary base" (doclinks endpoint) from doc meta
  const binaryBase = useMemo(() => {
    const raw = extractRawDocUrl(document);
    // buildBinaryDoclinkUrl expects (rewriteFn, metaFn) signatures: (u?: string) => string
    const base = buildBinaryDoclinkUrl(document, rewriteDoclinkUrl, metaToDoclinkUrl);

    console.log('🔵 [DocViewer] raw meta url:', raw);
    console.log('🔵 [DocViewer] Binary Base URL:', base);
    return base || '';
  }, [document]);

  // 2) Candidate URLs (different patterns that Maximo may accept)
  const candidates = useMemo(() => {
    const list = buildDocViewerCandidates(binaryBase);
    console.log('🟣 [DocViewer] Candidate URLs:', list);
    return list;
  }, [binaryBase]);

  const [index, setIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(candidates[0] || '');

  const referenceUrl = useMemo(() => candidates[0] || binaryBase, [candidates, binaryBase]);

  useEffect(() => {
    setIndex(0);
    setCurrentUrl(candidates[0] || '');
  }, [candidates]);

  // 3) Read credentials & create MAXAUTH token
  useEffect(() => {
    (async () => {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');

      if (!username || !password) {
        Alert.alert('Erreur', 'Identifiants non trouvés');
        return;
      }

      const tk = makeMaxAuth(username, password);
      console.log('🟢 [DocViewer] Auth token generated');
      setToken(tk);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && currentUrl?.startsWith('http://')) {
      console.log('🟡 [DocViewer] HTTP detected (cleartext?) →', currentUrl);
    }
  }, [currentUrl]);

  const handleClose = () => {
    console.log('🔴 [DocViewer] Closing viewer');
    navigation.goBack();
  };

  const tryNextCandidate = (reason: string) => {
    console.log(`❌ [DocViewer] Failed URL: ${currentUrl}`);
    console.log(`❌ Reason: ${reason}`);

    const nextIndex = index + 1;
    if (nextIndex < candidates.length) {
      console.log(`➡️ [DocViewer] Trying next candidate (${nextIndex})`);
      setIndex(nextIndex);
      setCurrentUrl(candidates[nextIndex]);
      return;
    }

    console.log('⛔ [DocViewer] All candidates failed.');
    Alert.alert('Impossible d’afficher', `Ce document ne peut pas être affiché.\n\n(${reason})`);
  };

  if (!currentUrl || !token) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* ✅ Close button */}
      <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.85}>
        <FeatherIcon name="x" size={24} color="#fff" />
      </TouchableOpacity>

      <WebView
        ref={webRef}
        source={{
          uri: fixMaximoUrlTypos(currentUrl),
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
        onLoadStart={() => {
          console.log('🔄 [DocViewer] Loading started →', currentUrl);
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('✅ [DocViewer] Load finished →', currentUrl);
          setLoading(false);
        }}
        onShouldStartLoadWithRequest={(req) => {
          const next = req?.url || '';
          if (!next) return true;

          console.log('➡️ [DocViewer] Navigation requested →', next);

          const normalized = normalizeNavigationUrl(next, referenceUrl);

          // ✅ If WebView tries to load the same currentUrl, allow.
          if (normalized === currentUrl) {
            console.log('✅ [DocViewer] Same as currentUrl, allow');
            return true;
          }

          // ✅ If we rewrote the url, update state and block the original.
          if (normalized !== next) {
            console.log('🔁 [DocViewer] Rewriting URL →', normalized);
            setCurrentUrl(normalized);
            return false;
          }

          return true;
        }}
        onHttpError={(e) => {
          const code = e?.nativeEvent?.statusCode || 0;
          console.log(`🚨 [DocViewer] HTTP ERROR ${code} →`, currentUrl);
          if (code >= 400) tryNextCandidate(`HTTP ${code}`);
        }}
        onError={(e) => {
          console.log('🚨 [DocViewer] WebView native error →', e?.nativeEvent);
          tryNextCandidate(e?.nativeEvent?.description || 'WebView error');
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
