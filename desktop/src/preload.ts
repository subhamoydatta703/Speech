import { contextBridge, ipcRenderer } from "electron";
import type { SpeechBridge } from "./shared/types";

function subscribe(channel: string, listener: (...args: any[]) => void) {
  const handler = (_event: Electron.IpcRendererEvent, value: unknown) =>
    listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}
const bridge: SpeechBridge = {
  status: () => ipcRenderer.invoke("speech:status"),
  activate: () => ipcRenderer.invoke("speech:activate"),
  cancelActivation: () => ipcRenderer.invoke("speech:cancel-activation"),
  downloadModel: () => ipcRenderer.invoke("speech:download-model"),
  installRuntime: () => ipcRenderer.invoke("speech:install-runtime"),
  cancelModel: () => ipcRenderer.invoke("speech:cancel-model"),
  toggle: () => ipcRenderer.invoke("speech:toggle"),
  cancel: () => ipcRenderer.invoke("speech:cancel"),
  transcribe: (samples, rate) =>
    ipcRenderer.invoke("speech:transcribe", samples, rate),
  copy: () => ipcRenderer.invoke("speech:copy"),
  hide: () => ipcRenderer.invoke("speech:hide"),
  signOut: () => ipcRenderer.invoke("speech:sign-out"),
  shortcut: (value) => ipcRenderer.invoke("speech:shortcut", value),
  onStatus: (listener) => subscribe("speech:state", listener),
  onCapture: (listener) => subscribe("speech:capture", listener),
  onTranscript: (listener) => subscribe("speech:transcript", listener),
};
contextBridge.exposeInMainWorld("speech", bridge);
