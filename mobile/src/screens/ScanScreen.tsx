import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ApiError } from '../api/client';
import type { AnalysisResult } from '../api/types';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { cacheResult } from '../state/resultCache';
import { recognizeOnDevice } from '../ocr';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/** Barcode formats that carry a food GTIN; QR and the rest are ignored. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** How long to ignore repeat reads of the same barcode. */
const RESCAN_DELAY_MS = 3000;

export function ScanScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { context, t } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const cameraRef = useRef<CameraView>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const show = useCallback(
    (result: AnalysisResult) => {
      cacheResult(result);
      navigation.navigate('Result', { scanId: result.id });
    },
    [navigation],
  );

  const analyze = useCallback(
    async (work: () => Promise<AnalysisResult>) => {
      if (!context) return;
      setBusy(true);
      setError(null);
      try {
        show(await work());
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : String(caught));
      } finally {
        setBusy(false);
      }
    },
    [context, show],
  );

  const onBarcode = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const now = Date.now();
      // The camera fires continuously while a code stays in frame.
      if (busy || (lastScan.current?.code === data && now - lastScan.current.at < RESCAN_DELAY_MS)) return;
      lastScan.current = { code: data, at: now };
      if (!context) return;

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void analyze(() => api.analyzeBarcode(data, context));
    },
    [busy, context, analyze],
  );

  /**
   * Takes a photo of the label.
   *
   * On-device OCR is tried first: it is faster, keeps the photo on the phone
   * and needs no connection for the recognition half. Only a build without the
   * OCR module — Expo Go, for instance — uploads the image itself.
   */
  const shootLabel = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || !context) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await analyze(async () => {
      const photo = await camera.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new ApiError(0, 'camera_error', 'Не удалось сделать снимок');

      const ocr = await recognizeOnDevice(photo.uri);
      if (ocr.available && ocr.text.trim().length > 20) {
        return api.analyzeLabel(ocr.text, context, { ocrConfidence: ocr.confidence });
      }

      // Downscale before upload: a full-resolution photo is several megabytes
      // and adds nothing an OCR engine can use.
      const compressed = await manipulateAsync(photo.uri, [{ resize: { width: 1400 } }], {
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });
      if (!compressed.base64) throw new ApiError(0, 'camera_error', 'Не удалось подготовить снимок');
      return api.analyzePhoto(compressed.base64, context);
    });
  }, [context, analyze]);

  const submitManual = useCallback(() => {
    const code = manualCode.trim();
    if (!code || !context) return;
    setManualOpen(false);
    setManualCode('');
    void analyze(() => api.analyzeBarcode(code, context));
  }, [manualCode, context, analyze]);

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionTitle, { color: theme.text }]}>{t('scan.permissionTitle')}</Text>
        <Text style={[styles.permissionBody, { color: theme.textMuted }]}>{t('scan.permissionBody')}</Text>
        <Pressable onPress={() => void requestPermission()} style={[styles.primary, { backgroundColor: theme.accent }]}>
          <Text style={styles.primaryText}>{t('scan.permissionButton')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        ref={cameraRef}
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={busy ? undefined : onBarcode}
      >
        <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.hintBlock}>
            <Text style={styles.hintTitle}>{t('scan.title')}</Text>
            <Text style={styles.hint}>{t('scan.hintBarcode')}</Text>
            <Text style={styles.hint}>{t('scan.hintLabel')}</Text>
          </View>

          <View style={styles.frame} />

          <View style={styles.controls}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void shootLabel()}
              disabled={busy}
              style={[styles.shutter, busy && styles.shutterBusy]}
              accessibilityRole="button"
              accessibilityLabel={t('scan.shootLabel')}
            >
              {busy ? <ActivityIndicator color="#14181F" /> : <View style={styles.shutterInner} />}
            </Pressable>

            <Text style={styles.shutterLabel}>{busy ? t('scan.analyzing') : t('scan.shootLabel')}</Text>

            <Pressable onPress={() => setManualOpen(true)} style={styles.manualButton}>
              <Text style={styles.manualText}>{t('scan.manualEntry')}</Text>
            </Pressable>
          </View>
        </View>
      </CameraView>

      <Modal visible={manualOpen} transparent animationType="fade" onRequestClose={() => setManualOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('scan.manualEntry')}</Text>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder={t('scan.manualPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              autoFocus
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setManualOpen(false)} style={styles.modalAction}>
                <Text style={{ color: theme.textMuted }}>{t('scan.cancel')}</Text>
              </Pressable>
              <Pressable onPress={submitManual} style={[styles.modalAction, { backgroundColor: theme.accent }]}>
                <Text style={styles.primaryText}>{t('scan.manualSubmit')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permissionTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permissionBody: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  primary: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  hintBlock: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, padding: 14, gap: 3 },
  hintTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },

  frame: {
    alignSelf: 'center', width: '82%', aspectRatio: 1.5,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.75)', borderRadius: 18,
  },

  controls: { alignItems: 'center', gap: 10 },
  error: {
    color: '#FFFFFF', backgroundColor: 'rgba(196,43,28,0.9)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, fontSize: 13, textAlign: 'center',
  },
  shutter: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterBusy: { opacity: 0.7 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  shutterLabel: { color: '#FFFFFF', fontSize: 13 },
  manualButton: { paddingVertical: 8, paddingHorizontal: 14 },
  manualText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textDecorationLine: 'underline' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 18, padding: 20, gap: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 17 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalAction: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
});
