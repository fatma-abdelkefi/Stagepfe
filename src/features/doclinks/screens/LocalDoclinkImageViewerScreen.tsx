import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import ImageViewer from 'react-native-image-zoom-viewer';

type Props = {
  route: RouteProp<
    Record<
      string,
      {
        uri: string;
        title?: string;
      }
    >,
    string
  >;
};

export default function LocalDoclinkImageViewer({ route }: Props) {
  const navigation = useNavigation<any>();

  const uri = route.params?.uri;
  const title = route.params?.title || 'Image';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          activeOpacity={0.8}
        >
          <FeatherIcon name="x" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={{ width: 42 }} />
      </View>

      <View style={styles.viewer}>
        <ImageViewer
          imageUrls={[{ url: uri }]}
          enableImageZoom={true}
          enableSwipeDown={true}
          onSwipeDown={() => navigation.goBack()}
          saveToLocalByLongPress={false}
          backgroundColor="#0b1120"
          renderIndicator={() => <View />}
          renderHeader={() => <View />}
          
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  header: {
    height: 58,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2235',
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#181c27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  footer: {
    height: 44,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#1e2235',
    backgroundColor: '#0b1120',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  footerText: {
    color: '#8b92b0',
    fontSize: 12,
    fontWeight: '700',
  },
});