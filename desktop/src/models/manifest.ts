/** Public, immutable model metadata. No Hugging Face token or backend is required. */
export const MODEL = {
  name: "Whisper Base (multilingual)",
  filename: "ggml-base.bin",
  revision: "5359861c739e955e79d9a303bcbc70fb988958b1",
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin",
  size: 147951465,
  sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
  license: "MIT",
} as const;
export const ENGINE = {
  version: "v1.8.4",
  url: "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-bin-x64.zip",
  sha256: "74f973345cb52ef5ba3ec9e7e7af8e48cc8c71722d1528603b80588a11f82e3e",
} as const;
export const WINDOWS_RUNTIME = {
  url: "https://download.visualstudio.microsoft.com/download/pr/ebdab8e5-1d7b-4d9f-a11b-cbb1720c3b12/843068991DAAA1F73AD9F6239BCE4D0F6A07A51F18C37EA2A867E9BECA71295C/VC_redist.x64.exe",
  sha256: "843068991daaa1f73ad9f6239bce4d0f6a07a51f18c37ea2a867e9beca71295c",
} as const;
