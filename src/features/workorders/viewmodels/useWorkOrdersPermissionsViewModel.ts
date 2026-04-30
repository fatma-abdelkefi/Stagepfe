import { useCallback, useEffect, useState } from 'react';
import {
  checkCameraPermission,
  checkMicrophonePermission,
  requestCameraPermission,
  requestMicrophonePermission,
} from '../../../shared/utils/appPermissions';

export type PermissionModalMode = 'all' | 'camera' | 'microphone';

export type PermissionSelection = {
  camera: boolean;
  microphone: boolean;
};

export function useWorkOrdersPermissionsViewModel(showAtStart: boolean) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PermissionModalMode>('all');
  const [blockedCamera, setBlockedCamera] = useState(false);
  const [blockedMicrophone, setBlockedMicrophone] = useState(false);

  const checkMissingPermissions = useCallback(async () => {
    const [cameraGranted, microphoneGranted] = await Promise.all([
      checkCameraPermission(),
      checkMicrophonePermission(),
    ]);

    return {
      cameraGranted,
      microphoneGranted,
      hasMissing: !cameraGranted || !microphoneGranted,
    };
  }, []);

  useEffect(() => {
    if (!showAtStart) return;

    (async () => {
      const result = await checkMissingPermissions();
      if (result.hasMissing) {
        setMode('all');
        setVisible(true);
      }
    })();
  }, [showAtStart, checkMissingPermissions]);

  const closeModal = useCallback(() => {
    setVisible(false);
    setMode('all');
  }, []);

  const confirmSelection = useCallback(
    async (selection: PermissionSelection) => {
      let camBlocked = false;
      let micBlocked = false;

      if (selection.camera) {
        const res = await requestCameraPermission();
        camBlocked = res.blocked;
      }

      if (selection.microphone) {
        const res = await requestMicrophonePermission();
        micBlocked = res.blocked;
      }

      setBlockedCamera(camBlocked);
      setBlockedMicrophone(micBlocked);
      setVisible(false);
      setMode('all');
    },
    [],
  );

  const ensureCameraPermission = useCallback(async () => {
    const granted = await checkCameraPermission();
    if (granted) return true;

    const result = await requestCameraPermission();
    setBlockedCamera(result.blocked);

    if (result.granted) return true;

    setMode('camera');
    setVisible(true);
    return false;
  }, []);

  const ensureMicrophonePermission = useCallback(async () => {
    const granted = await checkMicrophonePermission();
    if (granted) return true;

    const result = await requestMicrophonePermission();
    setBlockedMicrophone(result.blocked);

    if (result.granted) return true;

    setMode('microphone');
    setVisible(true);
    return false;
  }, []);

  return {
    visible,
    mode,
    blockedCamera,
    blockedMicrophone,
    closeModal,
    confirmSelection,
    ensureCameraPermission,
    ensureMicrophonePermission,
  };
}