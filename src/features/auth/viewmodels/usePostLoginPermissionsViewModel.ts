import { useCallback, useEffect, useState } from 'react';
import {
  checkCameraPermission,
  checkMicrophonePermission,
  requestCameraPermission,
  requestMicrophonePermission,
} from '../../../shared/utils/appPermissions';

export function useWorkOrdersPermissionsViewModel(showAtStart: boolean) {
  const [visible, setVisible] = useState(false);

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
        setVisible(true);
      }
    })();
  }, [showAtStart, checkMissingPermissions]);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  const confirmSelection = useCallback(
    async (selection: { camera: boolean; microphone: boolean }) => {
      if (selection.camera) {
        await requestCameraPermission();
      }

      if (selection.microphone) {
        await requestMicrophonePermission();
      }

      setVisible(false);
    },
    [],
  );

  return {
    visible,
    closeModal,
    confirmSelection,
  };
}