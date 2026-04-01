// src/screens/DetailsWorkLogScreen.tsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { WebView } from 'react-native-webview';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';
import { useAuth } from '../context/AuthContext';
import { getWorkLogByLocalRef } from '../services/worklogService';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'DetailsWorkLog'> };

function formatDateTime(dateString?: string) {
  if (!dateString) return '-';

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);

  const pad = (n: number) => String(n).padStart(2, '0');

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function extractLongText(wl: any) {
  return wl?.description_longdescription?.ldtext ?? wl?.description_longdescription ?? '';
}

function buildHtmlPreview(html: string) {
  return `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
  body{
    font-family:Arial;
    font-size:14px;
    color:#0f172a;
    padding:10px;
  }
  img{max-width:100%}
  </style>
  </head>
  <body>${html || '—'}</body>
  </html>`;
}

export default function DetailsWorkLogScreen({ route }: Props) {
  const workOrder = (route as any)?.params?.workOrder;
  const { username, password, authLoading } = useAuth();

  const worklogs = useMemo(() => {
    const arr = (workOrder as any)?.workLogs ?? (workOrder as any)?.worklog ?? [];
    return [...arr].sort((a: any, b: any) =>
      String(b?.createdate || '').localeCompare(String(a?.createdate || ''))
    );
  }, [workOrder]);

  const [selected, setSelected] = useState<any>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const closeModal = useCallback(() => {
    setSelected(null);
    setLoadingSelected(false);
  }, []);

  const openWorklog = useCallback(
    async (wl: any) => {
      const longText = extractLongText(wl);
      setSelected({ ...wl, _longText: longText });

      const localref = String(wl?.localref || '').trim();
      if (!localref) return;

      if (authLoading || !username || !password) return;

      setLoadingSelected(true);

      try {
        const full = await getWorkLogByLocalRef({ localref, username, password });
        if (!full) return;

        const fullLong = extractLongText(full);

        setSelected((prev: any) => ({
          ...(prev || {}),
          ...(full || {}),
          _longText: fullLong,
        }));
      } catch (e: any) {
        console.log(e);
      } finally {
        setLoadingSelected(false);
      }
    },
    [authLoading, username, password]
  );

  const renderItem = ({ item: wl }: { item: any }) => {
    const summary = wl?.description || '—';
    const longText = extractLongText(wl);
    const hasLong = !!String(longText || '').trim();

    return (
      <TouchableOpacity style={styles.card} onPress={() => openWorklog(wl)}>

        <View style={styles.cardTop}>

          <View style={styles.left}>

            <View style={styles.badge}>
              <FeatherIcon name="file-text" size={14} color="#2563eb"/>
              <Text style={styles.badgeText}>
                {wl?.logtype_description || wl?.logtype || '—'}
              </Text>
            </View>

            <Text style={styles.summary} numberOfLines={2}>
              {summary}
            </Text>

            {/* USER + DATE SAME LINE */}
            <View style={styles.metaRow}>

              <View style={styles.metaGroup}>
                <FeatherIcon name="user" size={14} color="#64748b"/>
                <Text style={styles.metaText} numberOfLines={1}>
                  {wl?.createby || '—'}
                </Text>
              </View>

              <Text style={styles.dot}>•</Text>

              <View style={styles.metaGroup}>
                <FeatherIcon name="calendar" size={14} color="#64748b"/>
                <Text style={styles.metaText} numberOfLines={1}>
                  {formatDateTime(wl?.createdate)}
                </Text>
              </View>

            </View>

          </View>

          <View style={styles.right}>

            <View style={[styles.pill, hasLong ? styles.pillOk : styles.pillWarn]}>
              <Text style={[styles.pillText, hasLong ? styles.pillTextOk : styles.pillTextWarn]}>
                {hasLong ? 'Détails' : 'Sans détails'}
              </Text>
            </View>

            <FeatherIcon name="chevron-right" size={18} color="#64748b"/>

          </View>

        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={detailsStyles.container}>

      <DetailsHeader title="Work Log" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      <FlatList
        data={worklogs}
        keyExtractor={(wl,index)=>String(wl?.worklogid ?? index)}
        renderItem={renderItem}
        contentContainerStyle={detailsStyles.content}
      />

      <Modal visible={!!selected} transparent animationType="slide">

        <View style={styles.modalRoot}>

          <Pressable style={styles.backdrop} onPress={closeModal}/>

          <View style={styles.sheet}>

            <ScrollView contentContainerStyle={styles.sheetScrollContent}>

              {loadingSelected &&
                <ActivityIndicator style={{marginBottom:10}}/>
              }

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Résumé</Text>
                <Text>{selected?.description || '—'}</Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Détails</Text>

                <View style={styles.htmlPreviewBox}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: buildHtmlPreview(String(selected?._longText || '')) }}
                  />
                </View>

              </View>

            </ScrollView>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

card:{
backgroundColor:"#fff",
borderRadius:16,
padding:14,
marginBottom:12,
borderWidth:1,
borderColor:"#e2e8f0"
},

cardTop:{
flexDirection:"row",
justifyContent:"space-between"
},

left:{
flex:1
},

right:{
alignItems:"flex-end",
justifyContent:"space-between"
},

badge:{
flexDirection:"row",
alignItems:"center",
gap:6,
backgroundColor:"#eff6ff",
paddingHorizontal:10,
paddingVertical:6,
borderRadius:999
},

badgeText:{
fontSize:12,
fontWeight:"800",
color:"#2563eb"
},

summary:{
marginTop:8,
fontSize:15,
fontWeight:"700",
color:"#0f172a"
},

metaRow:{
flexDirection:"row",
alignItems:"center",
marginTop:8
},

metaGroup:{
flexDirection:"row",
alignItems:"center",
gap:6
},

metaText:{
fontSize:12,
fontWeight:"700",
color:"#64748b"
},

dot:{
marginHorizontal:6,
color:"#cbd5e1"
},

pill:{
paddingHorizontal:10,
paddingVertical:4,
borderRadius:999
},

pillOk:{backgroundColor:"#dcfce7"},
pillWarn:{backgroundColor:"#fee2e2"},

pillText:{
fontSize:12,
fontWeight:"800"
},

pillTextOk:{color:"#166534"},
pillTextWarn:{color:"#991b1b"},

modalRoot:{
flex:1,
justifyContent:"flex-end"
},

backdrop:{
...StyleSheet.absoluteFillObject,
backgroundColor:"rgba(0,0,0,0.5)"
},

sheet:{
height:"80%",
backgroundColor:"#f8fafc",
borderTopLeftRadius:24,
borderTopRightRadius:24
},

sheetScrollContent:{
padding:16
},

sectionCard:{
backgroundColor:"#fff",
borderRadius:16,
padding:14,
marginBottom:12,
borderWidth:1,
borderColor:"#e2e8f0"
},

sectionTitle:{
fontSize:13,
fontWeight:"900",
marginBottom:10
},

htmlPreviewBox:{
height:260,
borderWidth:1,
borderColor:"#e2e8f0",
borderRadius:10,
overflow:"hidden"
}

});