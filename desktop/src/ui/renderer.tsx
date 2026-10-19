import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppStatus } from "../shared/types";

type Capture = {
  stream: MediaStream;
  context: AudioContext;
  processor: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
  mute: GainNode;
  samples: Float32Array[];
  length: number;
  timer: ReturnType<typeof setTimeout>;
};
function App() {
  const [status, setStatus] = useState<AppStatus>();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [shortcut, setShortcut] = useState("Control+Shift+Space");
  const capture = useRef<Capture | undefined>(undefined);
  const deviceRef = useRef("");
  const recordingId = useRef(0);
  const isOverlay = new URLSearchParams(location.search).has("overlay");
  async function perform(action: () => Promise<unknown>) {
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }
  function release(recording: Capture) {
    clearTimeout(recording.timer);
    recording.processor.disconnect();
    recording.source.disconnect();
    recording.mute.disconnect();
    recording.stream.getTracks().forEach((track) => track.stop());
    void recording.context.close();
    setLevel(0);
  }
  async function stop(discard = false) {
    recordingId.current++;
    const recording = capture.current;
    capture.current = undefined;
    if (!recording) {
      if (!discard) await window.speech.cancel();
      return;
    }
    release(recording);
    if (!discard) {
      const samples = new Float32Array(recording.length);
      let offset = 0;
      for (const part of recording.samples) {
        samples.set(part, offset);
        offset += part.length;
        part.fill(0);
      }
      try {
        await window.speech.transcribe(samples, recording.context.sampleRate);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Transcription failed.",
        );
        await window.speech.cancel();
      } finally {
        samples.fill(0);
      }
    } else recording.samples.forEach((part) => part.fill(0));
  }
  async function start() {
    if (capture.current) return;
    const id = ++recordingId.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceRef.current
            ? { exact: deviceRef.current }
            : undefined,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (id !== recordingId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContext({ sampleRate: 16000 });
      await context.resume();
      const source = context.createMediaStreamSource(stream),
        processor = context.createScriptProcessor(4096, 1, 1),
        mute = context.createGain();
      mute.gain.value = 0;
      const recording: Capture = {
        stream,
        context,
        source,
        processor,
        mute,
        samples: [],
        length: 0,
        timer: setTimeout(() => {
          void stop();
        }, 60000),
      };
      capture.current = recording;
      processor.onaudioprocess = (event) => {
        if (capture.current !== recording) return;
        const part = new Float32Array(event.inputBuffer.getChannelData(0));
        const remaining = context.sampleRate * 60 - recording.length;
        if (remaining <= 0) return;
        const bounded = part.subarray(0, remaining);
        recording.samples.push(bounded);
        recording.length += bounded.length;
        let power = 0;
        for (const value of bounded) power += value * value;
        setLevel(Math.min(1, Math.sqrt(power / bounded.length) * 8));
      };
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);
      setDevices(
        (await navigator.mediaDevices.enumerateDevices()).filter(
          (item) => item.kind === "audioinput",
        ),
      );
    } catch {
      setMessage(
        "Microphone access failed. Check Windows microphone permissions and your selected input.",
      );
      await window.speech.cancel();
    }
  }
  useEffect(() => {
    const removeStatus = window.speech.onStatus((value) => setStatus(value));
    void window.speech.status().then((value) => {
      setStatus(value);
      setShortcut(value.shortcut);
    });
    if (isOverlay) return removeStatus;
    const removeCapture = window.speech.onCapture((action) => {
      if (action === "start") void start();
      else void stop(action === "cancel");
    });
    const removeText = window.speech.onTranscript(setText);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") void window.speech.cancel();
    };
    window.addEventListener("keydown", escape);
    return () => {
      removeStatus();
      removeCapture();
      removeText();
      window.removeEventListener("keydown", escape);
      void stop(true);
    };
  }, []);
  if (!status)
    return (
      <main>
        <p role="status">Getting Speech ready…</p>
      </main>
    );
  if (isOverlay) {
    document.documentElement.className = "overlay-body";
    document.body.className = "overlay-body";
    return (
      <div className="overlay" role="status">
        <span
          className={
            status.phase === "recording" ? "record-dot live" : "record-dot"
          }
        />
        <span>
          {status.phase === "recording"
            ? "Listening · press shortcut to finish"
            : status.phase === "processing"
              ? "Transcribing on your PC…"
              : status.message}
        </span>
      </div>
    );
  }
  return (
    <main>
      <header>
        <strong className="logo">speech.</strong>
        <span>An AgEX product</span>
      </header>
      <div className="intro">
        <span className="eyebrow">YOUR VOICE. YOUR COMPUTER.</span>
        <h1>
          {status.activated && status.modelReady
            ? "Make room for your voice."
            : "A little setup. Then speak."}
        </h1>
        <p>Local speech-to-text for Windows. Your audio stays on this PC.</p>
      </div>
      {status.development && (
        <p className="notice">
          Local development build · account setup connects to localhost.
        </p>
      )}
      <div className="sections">
      <section>
        <div className="section-title">
          <h2>1. Connect your account</h2>
          <span className={status.activated ? "badge ready" : "badge"}>
            {status.activated ? "Connected" : "Setup required"}
          </span>
        </div>
        {status.activated ? (
          <p>{status.email}</p>
        ) : (
          <>
            <p>
              Reuse the website session you used to download Speech. Confirm the
              matching code in your browser.
            </p>
            {status.confirmationCode && (
              <div className="code">{status.confirmationCode}</div>
            )}
            <button
              disabled={status.busy && !status.confirmationCode}
              onClick={() =>
                perform(() =>
                  status.confirmationCode
                    ? window.speech.cancelActivation()
                    : window.speech.activate(),
                )
              }
            >
              {status.confirmationCode
                ? "Cancel confirmation"
                : "Continue installation in browser"}
            </button>
          </>
        )}
      </section>
      <section>
        <div className="section-title">
          <h2>2. Download your speech model</h2>
          <span className={status.modelReady ? "badge ready" : "badge"}>
            {status.modelReady ? "Verified" : "148 MB"}
          </span>
        </div>
        <p>
          Whisper Base · multilingual · runs on your CPU. The public model
          downloads directly to this PC and is checked before use.
        </p>
        {status.modelProgress !== undefined && (
          <>
            <progress
              value={status.modelProgress}
              max={100}
              aria-label="Model download"
            />
            <p>{status.modelProgress}% downloaded</p>
          </>
        )}
        <button
          disabled={
            !status.activated ||
            (status.busy && status.modelProgress === undefined) ||
            status.phase !== "idle"
          }
          onClick={() =>
            perform(() =>
              status.modelProgress !== undefined
                ? window.speech.cancelModel()
                : window.speech.downloadModel(),
            )
          }
        >
          {status.modelProgress !== undefined
            ? "Cancel download"
            : status.modelReady
              ? "Repair / download model again"
              : "Download model"}
        </button>
      </section>
      {!status.runtimeReady && <section>
        <h2>Windows speech runtime</h2>
        <p>The local engine needs Microsoft’s Visual C++ x64 runtime. Open its bundled installer, finish setup, then click again to check. Windows may request administrator permission.</p>
        <button disabled={status.busy} onClick={() => perform(() => window.speech.installRuntime())}>Install / check Windows runtime</button>
      </section>}
      <section>
        <h2>3. Speak, then keep writing</h2>
        <p>
          Press <kbd>{status.shortcut}</kbd> in your document to start and stop.
          Keep the target app focused. Recording limit: 60 seconds.
        </p>
        <label>
          Microphone
          <select
            value={device}
            onChange={(event) => {
              setDevice(event.target.value);
              deviceRef.current = event.target.value;
            }}
            disabled={status.phase !== "idle"}
          >
            <option value="">System default</option>
            {devices.map((item) => (
              <option key={item.deviceId} value={item.deviceId}>
                {item.label || "Microphone"}
              </option>
            ))}
          </select>
        </label>
        <div className="level" aria-label="Microphone level">
          <progress value={level} max={1} />
        </div>
        <div className="actions">
          <button
            disabled={
              !status.activated ||
              !status.modelReady ||
              !status.runtimeReady ||
              status.phase === "processing" ||
              status.busy
            }
            onClick={() => perform(() => window.speech.toggle())}
          >
            {status.phase === "recording"
              ? "Stop recording"
              : "Test dictation here"}
          </button>
          <button
            className="secondary"
            onClick={() => perform(() => window.speech.hide())}
          >
            Run in tray
          </button>
          {status.phase !== "idle" && (
            <button
              className="secondary"
              onClick={() => perform(() => window.speech.cancel())}
            >
              Cancel
            </button>
          )}
        </div>
        <p className="status" role="status">
          {message || status.message}
        </p>
        {text && (
          <div className="result">
            <h3>Your text</h3>
            <p>{text}</p>
            <button onClick={() => perform(() => window.speech.copy())}>
              Copy text
            </button>
            <p className="small">
              Kept in memory only. Starting another recording or quitting clears
              it. Copying puts text on the Windows clipboard.
            </p>
          </div>
        )}
      </section>
      <section>
        <h2>Preferences</h2>
        <label>
          Global shortcut
          <input
            value={shortcut}
            onChange={(event) => setShortcut(event.target.value)}
            maxLength={60}
          />
        </label>
        <button
          className="secondary"
          disabled={status.phase !== "idle"}
          onClick={() => perform(() => window.speech.shortcut(shortcut))}
        >
          Save shortcut
        </button>
        <p className="small">
          Example: Control+Shift+Space or Control+M. Other applications may
          already use your shortcut. Automatic paste may be blocked by elevated
          applications; use Copy text instead.
        </p>
        {status.activated && (
          <button
            className="secondary"
            disabled={status.busy}
            onClick={() => perform(() => window.speech.signOut())}
          >
            Disconnect this PC
          </button>
        )}
      </section>
      </div>
      <footer>
        Speech {status.version} · An AgEX product · Offline after setup
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
