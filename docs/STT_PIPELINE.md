# Speech-to-text pipeline

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Candidate execution modes

| Mode | Proposed implementation | Tradeoffs |
| --- | --- | --- |
| Local | Transformers.js with a compatible quantized ONNX Whisper model | No per-request provider charge; initial download, CPU/RAM use, and device-dependent latency |
| Cloud | Backend TypeScript adapter to a Hugging Face Inference Provider that supports ASR | Requires connectivity, provider credentials, quotas/budget, and external audio processing |
| Self-hosted later | Separate inference worker/service behind the same backend adapter | Infrastructure and operational cost; inference runtime may use another language |

Transformers.js documents automatic speech recognition support and ONNX-based execution: [Transformers.js](https://huggingface.co/docs/transformers.js/index). Evaluate [onnx-community/whisper-base](https://huggingface.co/onnx-community/whisper-base/tree/main) as an initial local candidate, then smaller/larger compatible variants if measurements justify them. Compatibility, quantization, download size, memory, license, and revision must be checked for the exact chosen artifact.

Hosted ASR uses authenticated requests; free credits or publicly downloadable weights do not make unlimited hosted inference free. Provider/model availability varies: [Hugging Face ASR documentation](https://huggingface.co/docs/inference-providers/tasks/automatic-speech-recognition). Never embed a provider key in desktop or frontend code. Public, ungated model downloads may work without an end-user token; verify this for the selected files. Gated/private models require an explicit access strategy.

## Processing stages

1. Validate app state, microphone selection, model/provider readiness, and recording limit.
2. Capture microphone only after the user starts recording. Save target window identity without taking focus.
3. Produce bounded mono audio buffers, record actual sample rate, and calculate input level.
4. On stop, release the microphone immediately. Resample once to the model-required rate; proposed internal transport is 16 kHz mono PCM WAV, subject to adapter validation.
5. Apply conservative silence detection. Do not treat silence as a transcription request. Voice activity detection is an optimization to validate, not a required new model dependency.
6. Run local inference in a worker or send bounded audio to the backend cloud endpoint with a request ID and cancellation signal.
7. Normalize whitespace and supported punctuation without rewriting meaning. Preserve names and user wording; AI rewriting is deferred.
8. Return one final transcript for the session. Partial transcripts, if added later, remain display-only.
9. Recheck target/focus and session state, insert once or offer copy, and dispose audio buffers/files.

Proposed limit: 60 seconds per utterance. If the chosen model requires shorter windows, use bounded segments with overlap and tested deduplication of boundary words; do not silently truncate. Show the recording limit before capture and stop visibly at the limit.

## Adapter contract sketch

```ts
type SttRequest = {
  sessionId: string;
  audio: Float32Array;
  sampleRate: number;
  language?: string;
  signal: AbortSignal;
};
type SttResult = {
  sessionId: string;
  text: string;
  language?: string;
  modelRevision: string;
  audioDurationMs: number;
  processingDurationMs: number;
};
interface SttEngine {
  prepare(signal: AbortSignal): Promise<void>;
  transcribe(request: SttRequest): Promise<SttResult>;
  dispose(): Promise<void>;
}
```

Internal contract only; network upload uses an encoded audio file and metadata, not JSON-serialized float arrays. Cloud results may identify a provider version rather than an immutable weight revision; record what the provider actually exposes. Do not invent confidence scores.

## Local model lifecycle

Use an allowlisted model manifest with repository, pinned revision, exact files, hashes, license reference, estimated download/storage requirements, and runtime compatibility. Show progress, cancel/retry, disk-full and corrupted-cache recovery. Cache once per user and support model removal. Successful download must be verified before use. First inference should warm the model only when appropriate; never block the UI thread.

## Failure policy and evaluation

No automatic local-to-cloud fallback without explicit user consent. Cloud failure offers retry, local mode if ready, or cancellation. Cancelled session IDs cannot insert late results. Retrying transcription must not repeat insertion; keep session and insertion completion state separately.

Benchmark fixed, consented samples across quiet/noisy environments, Indian English and other English accents, names, punctuation, silence, and segment boundaries. Compare word error rate, stop-to-final latency, real-time factor, peak memory, model download size, and actual hosted cost. Record hardware, network conditions, model revision and sample counts. Choose the default only after the feasibility gate; local mode must work offline after initial setup if it is advertised as offline.
