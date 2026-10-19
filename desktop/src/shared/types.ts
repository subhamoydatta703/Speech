export type Activation = {
  user: { id: string; email: string };
  activatedAt: number;
};
export type AppStatus = {
  activated: boolean;
  email?: string;
  modelReady: boolean;
  runtimeReady: boolean;
  modelProgress?: number;
  busy: boolean;
  phase: "idle" | "recording" | "processing";
  message: string;
  confirmationCode?: string;
  shortcut: string;
  version: string;
  development: boolean;
};
export type SpeechBridge = {
  status(): Promise<AppStatus>;
  activate(): Promise<void>;
  cancelActivation(): Promise<void>;
  downloadModel(): Promise<void>;
  installRuntime(): Promise<void>;
  cancelModel(): Promise<void>;
  toggle(): Promise<void>;
  cancel(): Promise<void>;
  transcribe(audio: Float32Array, sampleRate: number): Promise<void>;
  copy(): Promise<void>;
  hide(): Promise<void>;
  signOut(): Promise<void>;
  shortcut(value: string): Promise<void>;
  onStatus(listener: (status: AppStatus) => void): () => void;
  onCapture(
    listener: (action: "start" | "stop" | "cancel") => void,
  ): () => void;
  onTranscript(listener: (text: string) => void): () => void;
};
declare global {
  interface Window {
    speech: SpeechBridge;
  }
}
