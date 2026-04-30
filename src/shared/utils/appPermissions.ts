import { PermissionsAndroid, Platform, Permission } from 'react-native';

export type PermissionKind = 'camera' | 'microphone';

export type PermissionRequestResult = {
  granted: boolean;
  blocked: boolean;
};

function getAndroidPermission(kind: PermissionKind): Permission {
  return kind === 'camera'
    ? PermissionsAndroid.PERMISSIONS.CAMERA
    : PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
}

function getPermissionTexts(kind: PermissionKind) {
  if (kind === 'camera') {
    return {
      title: 'Permission Caméra',
      message: "L'application a besoin de la caméra pour scanner les codes-barres.",
    };
  }

  return {
    title: 'Permission Microphone',
    message: "L'application a besoin du microphone pour l'enregistrement vocal.",
  };
}

async function requestAndroidPermission(
  permission: Permission,
  title: string,
  message: string,
): Promise<PermissionRequestResult> {
  try {
    const result = await PermissionsAndroid.request(permission, {
      title,
      message,
      buttonPositive: 'Autoriser',
      buttonNegative: 'Refuser',
      buttonNeutral: 'Plus tard',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return { granted: true, blocked: false };
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return { granted: false, blocked: true };
    }

    return { granted: false, blocked: false };
  } catch (error) {
    console.log('[PERMISSION ERROR]', error);
    return { granted: false, blocked: false };
  }
}

export async function checkPermission(
  kind: PermissionKind,
): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const permission = getAndroidPermission(kind);
  return PermissionsAndroid.check(permission);
}

export async function checkCameraPermission(): Promise<boolean> {
  return checkPermission('camera');
}

export async function checkMicrophonePermission(): Promise<boolean> {
  return checkPermission('microphone');
}

export async function requestPermission(
  kind: PermissionKind,
): Promise<PermissionRequestResult> {
  if (Platform.OS !== 'android') {
    return { granted: true, blocked: false };
  }

  const permission = getAndroidPermission(kind);
  const { title, message } = getPermissionTexts(kind);

  return requestAndroidPermission(permission, title, message);
}

export async function requestCameraPermission(): Promise<PermissionRequestResult> {
  return requestPermission('camera');
}

export async function requestMicrophonePermission(): Promise<PermissionRequestResult> {
  return requestPermission('microphone');
}

export async function requestLaunchPermissions() {
  const camera = await requestCameraPermission();
  const microphone = await requestMicrophonePermission();

  return {
    camera,
    microphone,
    allGranted: camera.granted && microphone.granted,
  };
}

export async function getPermissionsState() {
  const [cameraGranted, microphoneGranted] = await Promise.all([
    checkCameraPermission(),    
    checkMicrophonePermission(),
  ]);

  return {
    cameraGranted,
    microphoneGranted,
    allGranted: cameraGranted && microphoneGranted,
    hasMissing: !cameraGranted || !microphoneGranted,
  };
}