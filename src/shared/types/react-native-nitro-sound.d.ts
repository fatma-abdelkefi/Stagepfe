declare module 'react-native-nitro-sound' {
  export type RecordBackType = {
    currentPosition?: number;
    currentMetering?: number;
  };

  const Sound: {
    startRecorder(path?: string): Promise<string>;
    stopRecorder(): Promise<string>;
    addRecordBackListener(callback: (e: RecordBackType) => void): void;
    removeRecordBackListener(): void;
  };

  export default Sound;
}